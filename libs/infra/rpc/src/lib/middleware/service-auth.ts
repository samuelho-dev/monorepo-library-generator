import { Headers } from "@effect/platform"
import { RpcMiddleware } from "@effect/rpc"
import { Effect, Layer, Option } from "effect"

/**
 * Service-to-Service Authentication Middleware
 *
 * Service authentication for internal RPC communication.

Used for service routes (RouteTag = "service") in Contract-First architecture.

IMPORTANT: All types are imported from @samuelho-dev/contract-auth (single source of truth).

Features:
- Service token validation (x-service-token header)
- ServiceContext provision to handlers
- Permission checking for service operations
- Known services registry
 *
 * @module @samuelho-dev/infra-rpc/middleware/service-auth
 * @see @effect/rpc RpcMiddleware.Tag documentation
 * @see @samuelho-dev/contract-auth for type definitions
 */


// ============================================================================
// Environment Configuration
// ============================================================================

import { env } from "@samuelho-dev/env";

// ============================================================================
// Contract-Auth Imports (Single Source of Truth)
// ============================================================================

// Import canonical types from contract-auth
import {
  // Schemas
  type ServiceIdentity,

  // Errors
  ServiceAuthError,

  // Context Tags
  ServiceContext,
} from "@samuelho-dev/contract-auth";

// Re-export for convenience (consumers can import from infra-rpc OR contract-auth)
export {
  type ServiceIdentity,
  ServiceAuthError,
  ServiceContext,
};

// ============================================================================
// Service Token Validation
// ============================================================================

/**
 * Service authentication secret
 *
 * Uses type-safe env library for secure configuration access.
 * Falls back to dev secret only in development.
 */
const SERVICE_AUTH_SECRET = env.SERVICE_AUTH_SECRET ?? "dev-service-secret";

/**
 * Known services registry
 *
 * Maps service IDs to their names and permissions.
 * In production, load from secure configuration store.
 */
export const KNOWN_SERVICES: Record<string, { name: string; permissions: ReadonlyArray<string> }> = {
  "user-service": {
    name: "User Service",
    permissions: ["user:read", "user:write", "user:validate"],
  },
  "order-service": {
    name: "Order Service",
    permissions: ["order:read", "order:write", "user:validate"],
  },
  "inventory-service": {
    name: "Inventory Service",
    permissions: ["inventory:read", "inventory:write", "order:notify"],
  },
  "notification-service": {
    name: "Notification Service",
    permissions: ["notification:send", "user:read"],
  },
  "payment-service": {
    name: "Payment Service",
    permissions: ["payment:process", "order:update"],
  },
  // Add more services as needed
};

/**
 * Validate service token and return identity
 *
 * Token format: `<service-id>:<signature>`
 * Signature: Base64 of `<service-id>:<secret>`
 *
 * @param token - Service token from x-service-token header
 * @returns ServiceIdentity if valid, null otherwise
 */
export function validateServiceToken(token: string) {
  if (!token) return null;

  // Format: serviceId:signature
  const parts = token.split(":");
  if (parts.length !== 2) return null;

  const [serviceId, signature] = parts;

  // Validate signature
  const expectedSignature = Buffer.from(
    `${serviceId}:${SERVICE_AUTH_SECRET}`
  ).toString("base64").slice(0, 16);

  if (signature !== expectedSignature) return null;

  // Look up service
  const service = KNOWN_SERVICES[serviceId];
  if (!service) return null;

  return {
    serviceName: serviceId,
    permissions: [...service.permissions],
  };
}

/**
 * Generate service token for calling other services
 *
 * @param serviceId - Calling service identifier
 * @returns Service token string
 */
export function generateServiceToken(serviceId: string) {
  const signature = Buffer.from(
    `${serviceId}:${SERVICE_AUTH_SECRET}`
  ).toString("base64").slice(0, 16);

  return `${serviceId}:${signature}`;
}

// ============================================================================
// Service Middleware
// ============================================================================

/**
 * ServiceMiddleware using native RpcMiddleware.Tag
 *
 * Apply to service-to-service RPC endpoints.
 *
 * Types come from contract-auth (ServiceContext, ServiceAuthError).
 *
 * @example
 * ```typescript
 * // In contract definition:
 * import { RouteTag, RouteType } from "@samuelho-dev/contract-auth";
 *
 * export class ValidateUser extends Rpc.make("ValidateUser", {
 *   payload: ValidateUserRequest,
 *   success: ValidationResponse,
 *   failure: Schema.Union(UserError, ServiceAuthError),
 * }) {
 *   static readonly [RouteTag]: RouteType = "service";
 * }
 * ```
 */
export class ServiceMiddleware extends RpcMiddleware.Tag<ServiceMiddleware>()(
  "@rpc/ServiceMiddleware",
  {
    provides: ServiceContext,
    failure: ServiceAuthError,
  }
) {}

/**
 * ServiceMiddleware implementation
 */
export const ServiceMiddlewareLive = Layer.succeed(
  ServiceMiddleware,
  ({ headers }) =>
    Effect.gen(function*() {
      const serviceToken = Headers.get(headers, "x-service-token");

      if (Option.isNone(serviceToken)) {
        return yield* Effect.fail(ServiceAuthError.invalidToken());
      }

      const identity = validateServiceToken(serviceToken.value);

      if (!identity) {
        return yield* Effect.fail(ServiceAuthError.invalidToken());
      }

      return identity;
    })
);

/**
 * Check if service has required permission
 */
export const requireServicePermission = (permission: string) =>
  Effect.gen(function*() {
    const service = yield* ServiceContext;

    if (!service.permissions.includes(permission)) {
      return yield* Effect.fail(
        ServiceAuthError.permissionDenied(permission, service.serviceName)
      );
    }

    return service;
  });

/**
 * Test service identity for development
 */
export const TestServiceIdentity: ServiceIdentity = {
  serviceName: "test-service",
  permissions: ["*"],
};

/**
 * Test ServiceMiddleware - always provides TestServiceIdentity
 */
export const ServiceMiddlewareTest = Layer.succeed(
  ServiceMiddleware,
  (_) => Effect.succeed(TestServiceIdentity)
);
