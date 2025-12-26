import { Authentication } from "@samuelho-dev/contract-user"
import { AuthenticationNotFoundRpcError, AuthenticationRpcError, AuthenticationValidationRpcError } from "@samuelho-dev/contract-user/authentication"
import type { AuthenticationError } from "@samuelho-dev/contract-user/authentication"
import { RequestMeta, getHandlerContext } from "@samuelho-dev/infra-rpc"
import { DateTime, Effect, Option } from "effect"
import { AuthenticationService } from "./service"

/**
 * Authentication RPC Handlers
 *
 * Handler implementations for authentication RPC operations.

Contract-First Architecture:
- RPC definitions imported from @@samuelho-dev/contract-user (authentication sub-module)
- Handlers implement the RPC interface using the AuthenticationService
- Middleware (auth, service-auth, request-meta) is applied automatically
  based on RouteTag defined in the contract
 *
 */
// ============================================================================
// Contract Imports
// ============================================================================
// ============================================================================
// Infrastructure Imports
// ============================================================================
// ============================================================================
// Service Import
// ============================================================================
// ============================================================================
// Error Mapping
// ============================================================================
/**
 * Map domain errors to RPC errors
 *
 * Domain errors (Data.TaggedError) must be transformed to RPC errors
 * (Schema.TaggedError) for network serialization.
 *
 * Contract-First Pattern:
 * - Service layer uses domain errors for business logic
 * - Handler layer maps to RPC errors for client responses
 * - RPC errors are JSON-serializable via Schema.TaggedError
 */
const mapToRpcError = (error: AuthenticationError): AuthenticationRpcError => {
  switch (error._tag) {
    case "AuthenticationNotFoundError":
      return AuthenticationNotFoundRpcError.create(error.id)
    case "AuthenticationValidationError":
      return AuthenticationValidationRpcError.create({
        message: error.message,
        field: error.field
      })
    case "AuthenticationOperationError":
      // Map operation errors to validation errors with operation context
      return AuthenticationValidationRpcError.create({
        message: `Operation failed: ${error.operation} - ${error.message}`
      })
  }
}

// ============================================================================
// Handler Implementations
// ============================================================================
/**
 * Authentication RPC Handler Implementations
 *
 * Generic CRUD handlers for authentication operations.
 * Handler keys must match RPC operation names exactly (e.g., "Authentication.Get").
 *
 * Type-Safety Patterns:
 * - Option.match for unwrapping Option returns (no Option in RPC responses)
 * - mapToRpcError for domain-to-RPC error transformation
 * - Success objects for delete/void operations (RPC requires serializable response)
 * - Input passed directly without adding assumed fields
 */
export const AuthenticationHandlers = Authentication.AuthenticationRpcs.toLayer({
  /**
   * Get by ID
   * RouteTag: "public" - No authentication required
   *
   * Unwraps Option<Entity> to Entity or fails with NotFoundRpcError
   */
  "Authentication.Get": ({ id }) =>
    Effect.gen(function*() {
      const meta = yield* RequestMeta
      const service = yield* AuthenticationService

      yield* Effect.logDebug("Getting authentication", {
        id,
        requestId: meta.requestId
      })

      const result = yield* service.getById(id).pipe(
        Effect.mapError(mapToRpcError)
      )

      // Effect-idiomatic Option unwrapping with proper RPC error
      return yield* Option.match(result, {
        onNone: () => Effect.fail(AuthenticationNotFoundRpcError.create(id)),
        onSome: (entity) => Effect.succeed(entity)
      })
    }),

  /**
   * List with pagination
   * RouteTag: "public" - No authentication required
   *
   * Returns paginated response matching RPC contract shape
   */
  "Authentication.List": ({ page, pageSize }) =>
    Effect.gen(function*() {
      const service = yield* AuthenticationService

      // Service returns paginated response matching RPC contract
      return yield* service.list(undefined, {
        page: page ?? 1,
        pageSize: pageSize ?? 20
      }).pipe(Effect.mapError(mapToRpcError))
    }),

  /**
   * Create new
   * RouteTag: "protected" - User authentication required
   *
   * Input is passed directly - schema validation ensures type safety
   * Do NOT add fields that may not exist in the entity schema
   */
  "Authentication.Create": (input) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* AuthenticationService

      yield* Effect.logInfo("Creating authentication", {
        userId: user.id,
        requestId: meta.requestId
      })

      // Pass input directly - schema validation ensures type safety
      return yield* service.create(input).pipe(
        Effect.mapError(mapToRpcError)
      )
    }),

  /**
   * Update existing
   * RouteTag: "protected" - User authentication required
   *
   * Data is passed directly without adding assumed fields
   */
  "Authentication.Update": ({ id, data }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* AuthenticationService

      yield* Effect.logInfo("Updating authentication", {
        id,
        userId: user.id,
        requestId: meta.requestId
      })

      // Pass data directly - do not add fields that may not exist
      return yield* service.update(id, data).pipe(
        Effect.mapError(mapToRpcError)
      )
    }),

  /**
   * Delete
   * RouteTag: "protected" - User authentication required
   *
   * Returns success object per RPC contract (void not allowed in JSON-RPC)
   */
  "Authentication.Delete": ({ id }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* AuthenticationService

      yield* Effect.logInfo("Deleting authentication", {
        id,
        userId: user.id,
        requestId: meta.requestId
      })

      yield* service.delete(id).pipe(
        Effect.mapError(mapToRpcError)
      )

      // Return success object per RPC contract
      return {
        success: true as const,
        deletedAt: DateTime.unsafeNow()
      }
    })
})
