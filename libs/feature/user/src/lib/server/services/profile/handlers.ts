import { Profile } from "@samuelho-dev/contract-user"
import { ProfileNotFoundRpcError, ProfileRpcError, ProfileValidationRpcError } from "@samuelho-dev/contract-user/profile"
import type { ProfileError } from "@samuelho-dev/contract-user/profile"
import { RequestMeta, getHandlerContext } from "@samuelho-dev/infra-rpc"
import { DateTime, Effect, Option } from "effect"
import { ProfileService } from "./service"

/**
 * Profile RPC Handlers
 *
 * Handler implementations for profile RPC operations.

Contract-First Architecture:
- RPC definitions imported from @@samuelho-dev/contract-user (profile sub-module)
- Handlers implement the RPC interface using the ProfileService
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
const mapToRpcError = (error: ProfileError): ProfileRpcError => {
  switch (error._tag) {
    case "ProfileNotFoundError":
      return ProfileNotFoundRpcError.create(error.id)
    case "ProfileValidationError":
      return ProfileValidationRpcError.create({
        message: error.message,
        field: error.field
      })
    case "ProfileOperationError":
      // Map operation errors to validation errors with operation context
      return ProfileValidationRpcError.create({
        message: `Operation failed: ${error.operation} - ${error.message}`
      })
  }
}

// ============================================================================
// Handler Implementations
// ============================================================================
/**
 * Profile RPC Handler Implementations
 *
 * Generic CRUD handlers for profile operations.
 * Handler keys must match RPC operation names exactly (e.g., "Profile.Get").
 *
 * Type-Safety Patterns:
 * - Option.match for unwrapping Option returns (no Option in RPC responses)
 * - mapToRpcError for domain-to-RPC error transformation
 * - Success objects for delete/void operations (RPC requires serializable response)
 * - Input passed directly without adding assumed fields
 */
export const ProfileHandlers = Profile.ProfileRpcs.toLayer({
  /**
   * Get by ID
   * RouteTag: "public" - No authentication required
   *
   * Unwraps Option<Entity> to Entity or fails with NotFoundRpcError
   */
  "Profile.Get": ({ id }) =>
    Effect.gen(function*() {
      const meta = yield* RequestMeta
      const service = yield* ProfileService

      yield* Effect.logDebug("Getting profile", {
        id,
        requestId: meta.requestId
      })

      const result = yield* service.getById(id).pipe(
        Effect.mapError(mapToRpcError)
      )

      // Effect-idiomatic Option unwrapping with proper RPC error
      return yield* Option.match(result, {
        onNone: () => Effect.fail(ProfileNotFoundRpcError.create(id)),
        onSome: (entity) => Effect.succeed(entity)
      })
    }),

  /**
   * List with pagination
   * RouteTag: "public" - No authentication required
   *
   * Returns paginated response matching RPC contract shape
   */
  "Profile.List": ({ page, pageSize }) =>
    Effect.gen(function*() {
      const service = yield* ProfileService

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
  "Profile.Create": (input) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ProfileService

      yield* Effect.logInfo("Creating profile", {
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
  "Profile.Update": ({ id, data }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ProfileService

      yield* Effect.logInfo("Updating profile", {
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
  "Profile.Delete": ({ id }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ProfileService

      yield* Effect.logInfo("Deleting profile", {
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
