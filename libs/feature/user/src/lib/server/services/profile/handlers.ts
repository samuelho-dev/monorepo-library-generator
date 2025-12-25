import { Profile } from "@samuelho-dev/contract-user"
import { RequestMeta, getHandlerContext } from "@samuelho-dev/infra-rpc"
import { Effect } from "effect"
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
// Handler Implementations
// ============================================================================
/**
 * Profile RPC Handler Implementations
 *
 * Generic CRUD handlers for profile operations.
 * Handler keys must match RPC operation names exactly (e.g., "Profile.Get").
 */
export const ProfileHandlers = Profile.ProfileRpcs.toLayer({
  /**
   * Get by ID
   * RouteTag: "public" - No authentication required
   */
  "Profile.Get": ({ id }) =>
    Effect.gen(function*() {
      const meta = yield* RequestMeta
      const service = yield* ProfileService

      yield* Effect.logDebug("Getting profile", {
        id,
        requestId: meta.requestId
      })

      return yield* service.findById(id)
    }),

  /**
   * List with pagination
   * RouteTag: "public" - No authentication required
   */
  "Profile.List": ({ page, pageSize }) =>
    Effect.gen(function*() {
      const service = yield* ProfileService

      return yield* service.findMany({
        page: page ?? 1,
        pageSize: pageSize ?? 20
      })
    }),

  /**
   * Create new
   * RouteTag: "protected" - User authentication required
   */
  "Profile.Create": (input) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* ProfileService

      yield* Effect.logInfo("Creating profile", {
        userId: user.id,
        requestId: meta.requestId
      })

      return yield* service.create({
        ...input,
        createdBy: user.id
      })
    }),

  /**
   * Update existing
   * RouteTag: "protected" - User authentication required
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

      return yield* service.update(id, {
        ...data,
        updatedBy: user.id
      })
    }),

  /**
   * Delete
   * RouteTag: "protected" - User authentication required
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

      return yield* service.delete(id)
    })
})
