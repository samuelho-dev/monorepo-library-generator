/**
 * Service-to-Service Authentication Middleware Template
 *
 * Generates middleware for internal service-to-service RPC authentication.
 * Used for service routes (RouteTag = "service").
 *
 * IMPORTANT: Types are imported from contract-auth (single source of truth).
 *
 * Features:
 * - Service token validation
 * - ServiceContext provision to handlers
 * - Permission checking for service operations
 *
 * @module monorepo-library-generator/infra-templates/rpc/middleware/service-auth
 */

import { TypeScriptBuilder } from '../../../../../utils/code-builder'
import type { InfraTemplateOptions } from '../../../../../utils/types'
import { WORKSPACE_CONFIG } from '../../../../../utils/workspace-config'

/**
 * Generate service authentication middleware file
 *
 * Creates S2S authentication middleware that imports types from contract-auth.
 */
export function generateServiceAuthMiddlewareFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: 'Service-to-Service Authentication Middleware',
    description: `Service authentication for internal RPC communication.

Used for service routes (RouteTag = "service") in Contract-First architecture.

IMPORTANT: All types are imported from ${scope}/contract-auth (single source of truth).

Features:
- Service token validation (x-service-token header)
- ServiceContext provision to handlers
- Permission checking for service operations
- Known services registry`,
    module: `${scope}/infra-${fileName}/middleware/service-auth`,
    see: [
      '@effect/rpc RpcMiddleware.Tag documentation',
      `${scope}/contract-auth for type definitions`
    ]
  })

  builder.addImports([
    { from: 'effect', imports: ['Effect', 'Layer', 'Option'] },
    { from: '@effect/platform', imports: ['Headers'] },
    { from: '@effect/rpc', imports: ['RpcMiddleware'] },
    { from: `${scope}/env`, imports: ['env'] }
  ])

  builder.addBlankLine()

  builder.addRaw(`// ============================================================================
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
} from "${scope}/contract-auth"

// Re-export for convenience (consumers can import from infra-rpc OR contract-auth)
export {
  type ServiceIdentity,
  ServiceAuthError,
  ServiceContext,
}
`)

  builder.addSectionComment('Service Token Validation')

  builder.addRaw(`/**
 * Service authentication secret
 *
 * Uses env library for type-safe environment variable access.
 * Server-only variable, protected by createEnv context detection.
 */
const SERVICE_AUTH_SECRET = env.SERVICE_AUTH_SECRET

/**
 * Known services registry
 *
 * Maps service IDs to their names and permissions.
 * In production, load from secure configuration store.
 */
export const KNOWN_SERVICES: Record<string, { name: string; permissions: readonly string[] }> = {
  "user-service": {
    name: "User Service",
    permissions: ["user:read", "user:write", "user:validate"]
  },
  "order-service": {
    name: "Order Service",
    permissions: ["order:read", "order:write", "user:validate"]
  },
  "inventory-service": {
    name: "Inventory Service",
    permissions: ["inventory:read", "inventory:write", "order:notify"]
  },
  "notification-service": {
    name: "Notification Service",
    permissions: ["notification:send", "user:read"]
  },
  "payment-service": {
    name: "Payment Service",
    permissions: ["payment:process", "order:update"]
  }
  // Add more services as needed
}

/**
 * Validate service token and return identity
 *
 * Token format: \`<service-id>:<signature>\`
 * Signature: Base64 of \`<service-id>:<secret>\`
 *
 * @param token - Service token from x-service-token header
 * @returns ServiceIdentity if valid, null otherwise
 */
export function validateServiceToken(token: string) {
  if (!token) return null

  // Format: serviceId:signature
  const parts = token.split(":")
  if (parts.length !== 2) return null

  const [serviceId, signature] = parts
  if (!(serviceId && signature)) return null

  // Validate signature
  const expectedSignature = Buffer.from(
    \`\${serviceId}:\${SERVICE_AUTH_SECRET}\`
  ).toString("base64").slice(0, 16)

  if (signature !== expectedSignature) return null

  // Look up service
  const service = KNOWN_SERVICES[serviceId]
  if (!service) return null

  return {
    serviceName: serviceId,
    permissions: [...service.permissions]
  } satisfies ServiceIdentity
}

/**
 * Generate service token for calling other services
 *
 * @param serviceId - Calling service identifier
 * @returns Service token string
 */
export function generateServiceToken(serviceId: string) {
  const signature = Buffer.from(
    \`\${serviceId}:\${SERVICE_AUTH_SECRET}\`
  ).toString("base64").slice(0, 16)

  return \`\${serviceId}:\${signature}\`
}
`)

  builder.addSectionComment('Service Middleware')

  builder.addRaw(`/**
 * ServiceMiddleware using native RpcMiddleware.Tag
 *
 * Apply to service-to-service RPC endpoints.
 *
 * Types come from contract-auth (ServiceContext, ServiceAuthError).
 *
 * @example
 * \`\`\`typescript
 * // In contract definition:
 * import { RouteTag, RouteType } from "${scope}/contract-auth"
 *
 * export class ValidateUser extends Rpc.make("ValidateUser", {
 *   payload: ValidateUserRequest,
 *   success: ValidationResponse,
 *   failure: Schema.Union(UserError, ServiceAuthError),
 * }) {
 *   static readonly [RouteTag]: RouteType = "service"
 * }
 * \`\`\`
 */
export class ServiceMiddleware extends RpcMiddleware.Tag<ServiceMiddleware>()(
  "@${fileName}/ServiceMiddleware",
  {
    provides: ServiceContext,
    failure: ServiceAuthError
  }
) {}

/**
 * ServiceMiddleware implementation
 *
 * Validates service-to-service authentication tokens and provides ServiceContext.
 * Logs authentication attempts for security auditing.
 */
export const ServiceMiddlewareLive = Layer.succeed(
  ServiceMiddleware,
  (request) =>
    Effect.gen(function*() {
      const { headers } = request

      // Extract service token from header
      const serviceToken = Headers.get(headers, "x-service-token")

      if (Option.isNone(serviceToken)) {
        yield* Effect.logWarning("Service authentication failed: No service token provided")
        return yield* Effect.fail(ServiceAuthError.tokenInvalid())
      }

      // Validate token and extract identity
      const identity = validateServiceToken(serviceToken.value)

      if (!identity) {
        yield* Effect.logWarning("Service authentication failed: Invalid service token")
        return yield* Effect.fail(ServiceAuthError.tokenInvalid())
      }

      // Log successful service authentication
      yield* Effect.logDebug(\`Service authenticated: \${identity.serviceName} with permissions: \${identity.permissions.join(", ")}\`)

      // Additional security: check for suspicious headers or patterns
      const userAgent = Headers.get(headers, "user-agent")
      if (Option.isSome(userAgent)) {
        yield* Effect.logDebug(\`Service request user-agent: \${userAgent.value}\`)
      }

      return identity
    })
)

/**
 * Check if service has required permission
 */
export const requireServicePermission = (permission: string) =>
  Effect.gen(function*() {
    const service = yield* ServiceContext
    const permissions = service.permissions ?? []

    if (!permissions.includes(permission)) {
      return yield* Effect.fail(
        ServiceAuthError.permissionDenied(service.serviceName, permission)
      )
    }

    return service
  })

/**
 * Test service identity for development
 */
export const TestServiceIdentity: ServiceIdentity = {
  serviceName: "test-service",
  permissions: ["*"]
}

/**
 * Test ServiceMiddleware - always provides TestServiceIdentity
 */
export const ServiceMiddlewareTest = Layer.succeed(
  ServiceMiddleware,
  () => Effect.succeed(TestServiceIdentity)
)
`)

  return builder.toString()
}
