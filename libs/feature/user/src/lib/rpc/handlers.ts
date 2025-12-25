import { UserNotFoundRpcError, UserRpcs, UserValidationRpcError } from "@samuelho-dev/contract-user"
import { RequestMeta, ServiceContext, getHandlerContext } from "@samuelho-dev/infra-rpc"
import { Array as EffectArray, DateTime, Effect, Layer, Option } from "effect"
import { UserService } from "../server/services"

/**
 * User RPC Handlers
 *
 * Handler implementations for user RPC operations.

Contract-First Architecture:
- RPC definitions imported from @@samuelho-dev/contract-user
- Handlers implement the RPC interface using the service layer
- Middleware (auth, service-auth, request-meta) is applied automatically
  based on RouteTag defined in the contract

Usage:
  The handlers are composed into the RpcGroup and exposed via HTTP transport.
  See router.ts for Next.js/Express integration.
 *
 */
// ============================================================================
// Sub-Module Handler Imports
// ============================================================================
import { AuthenticationHandlers } from "../server/services/authentication/handlers"

import { ProfileHandlers } from "../server/services/profile/handlers"

// ============================================================================
// Handler Implementations
// ============================================================================
/**
 * User RPC Handler Implementations
 *
 * Implements handlers for all RPCs defined in the contract.
 * Each handler:
 * - Receives typed input from the RPC definition
 * - Has access to context based on RouteTag (CurrentUser, ServiceContext, RequestMeta)
 * - Returns typed output or fails with typed errors
 * - Uses Effect.catchTags for precise error type inference (no type widening)
 *
 * @example
 * ```typescript
 * // In a protected handler (RouteTag = "protected")
 * GetUser: ({ id }) =>
 *   Effect.gen(function*() {
 *     const { user, meta } = yield* getHandlerContext;
 *     const service = yield* UserService;
 *     return yield* service.findById(id)
 *   })
 * ```
 */
export const UserHandlers = UserRpcs.toLayer({
  /**
   * Get user by ID
   *
   * RouteTag: "public" - No authentication required
   * Errors: NotFoundError, TimeoutError
   */
  GetUser: ({ id }) =>
    Effect.gen(function*() {
      const service = yield* UserService;
      const meta = yield* RequestMeta;

      yield* Effect.logDebug("Getting user", {
        id,
        requestId: meta.requestId
      })

      // Service throws UserNotFoundError which is caught by catchTags
      return yield* service.get(id)
    }).pipe(Effect.catchTags({
        "UserNotFoundError": (e) =>
          Effect.fail(new UserNotFoundRpcError({
            userId: e.userId,
            message: e.message
          })),
        "UserTimeoutError": (e) =>
          Effect.fail(new UserValidationRpcError({
            field: "timeout",
            message: `Operation timed out after ${e.timeoutMs}ms`
          })),
        "DatabaseInternalError": (e) =>
          Effect.fail(new UserValidationRpcError({
            field: "database",
            message: e.message
          }))
      })),

  /**
   * List users with pagination
   *
   * RouteTag: "public" - No authentication required
   * Errors: TimeoutError
   */
  ListUsers: ({ page, pageSize }) =>
    Effect.gen(function*() {
      const service = yield* UserService

      const currentPage = page ?? 1
      const currentPageSize = pageSize ?? 20
      const offset = (currentPage - 1) * currentPageSize

      const [items, total] = yield* Effect.all([
        service.findByCriteria({}, offset, currentPageSize),
        service.count({})
      ])

      return {
        page: currentPage,
        pageSize: currentPageSize,
        items,
        total,
        hasMore: offset + items.length < total
      }
    }).pipe(Effect.catchTags({
        "UserTimeoutError": (e) =>
          Effect.fail(new UserValidationRpcError({
            field: "timeout",
            message: `Operation timed out after ${e.timeoutMs}ms`
          })),
        "DatabaseInternalError": (e) =>
          Effect.fail(new UserValidationRpcError({
            field: "database",
            message: e.message
          }))
      })),

  /**
   * Create a new user
   *
   * RouteTag: "protected" - User authentication required
   * Errors: TimeoutError
   */
  CreateUser: (input) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* UserService

      yield* Effect.logInfo("Creating user", {
        userId: user.id,
        requestId: meta.requestId
      })

      // RPC input type should match service create input type
      // If types differ, use Schema.decode for transformation at this boundary
      return yield* service.create(input)
    }).pipe(Effect.catchTags({
        "UserTimeoutError": (e) =>
          Effect.fail(new UserValidationRpcError({
            field: "timeout",
            message: `Operation timed out after ${e.timeoutMs}ms`
          })),
        "DatabaseInternalError": (e) =>
          Effect.fail(new UserValidationRpcError({
            field: "database",
            message: e.message
          }))
      })),

  /**
   * Update an existing user
   *
   * RouteTag: "protected" - User authentication required
   * Errors: NotFoundError, TimeoutError
   */
  UpdateUser: ({ id, data }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* UserService

      yield* Effect.logInfo("Updating user", {
        id,
        userId: user.id,
        requestId: meta.requestId
      })

      // RPC data type should match service update input type
      // If types differ, use Schema.decode for transformation at this boundary
      // Service throws UserNotFoundError which is caught by catchTags
      return yield* service.update(id, data)
    }).pipe(Effect.catchTags({
        "UserNotFoundError": (e) =>
          Effect.fail(new UserNotFoundRpcError({
            userId: e.userId,
            message: e.message
          })),
        "UserTimeoutError": (e) =>
          Effect.fail(new UserValidationRpcError({
            field: "timeout",
            message: `Operation timed out after ${e.timeoutMs}ms`
          })),
        "DatabaseInternalError": (e) =>
          Effect.fail(new UserValidationRpcError({
            field: "database",
            message: e.message
          }))
      })),

  /**
   * Delete a user
   *
   * RouteTag: "protected" - User authentication required
   * Errors: NotFoundError, TimeoutError
   */
  DeleteUser: ({ id }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext
      const service = yield* UserService

      yield* Effect.logInfo("Deleting user", {
        id,
        userId: user.id,
        requestId: meta.requestId
      })

      yield* service.delete(id)
      return {
        success: true as const,
        deletedAt: DateTime.unsafeNow()
      }
    }).pipe(Effect.catchTags({
        "UserNotFoundError": (e) =>
          Effect.fail(new UserNotFoundRpcError({
            userId: e.userId,
            message: e.message
          })),
        "UserTimeoutError": (e) =>
          Effect.fail(new UserValidationRpcError({
            field: "timeout",
            message: `Operation timed out after ${e.timeoutMs}ms`
          })),
        "DatabaseInternalError": (e) =>
          Effect.fail(new UserValidationRpcError({
            field: "database",
            message: e.message
          }))
      })),

  /**
   * Validate user (service-to-service)
   *
   * RouteTag: "service" - Service authentication required
   * Errors: TimeoutError
   */
  ValidateUser: ({ userId, validationType }) =>
    Effect.gen(function*() {
      const serviceCtx = yield* ServiceContext
      const service = yield* UserService

      yield* Effect.logDebug("Validating user for service", {
        userId,
        validationType,
        callingService: serviceCtx.serviceName
      })

      const exists = yield* service.exists(userId)

      // Build response with proper handling for exactOptionalPropertyTypes
      const baseResponse = {
        valid: exists,
        userId,
        validatedAt: DateTime.unsafeNow()
      }

      // Use typed constant to avoid type assertion
      const notFoundErrors: ReadonlyArray<string> = ["User not found"]

      return exists
        ? baseResponse
        : { ...baseResponse, errors: notFoundErrors }
    }).pipe(Effect.catchTags({
        "UserTimeoutError": (e) =>
          Effect.fail(new UserValidationRpcError({
            field: "timeout",
            message: `Operation timed out after ${e.timeoutMs}ms`
          })),
        "DatabaseInternalError": (e) =>
          Effect.fail(new UserValidationRpcError({
            field: "database",
            message: e.message
          }))
      })),

  /**
   * Bulk get users (service-to-service)
   *
   * RouteTag: "service" - Service authentication required
   * Errors: TimeoutError (NotFoundError is handled per-id internally)
   */
  BulkGetUsers: ({ ids }) =>
    Effect.gen(function*() {
      const service = yield* UserService

      // Fetch all entities in parallel, catching NotFoundError per-id
      // Use Effect.option to convert NotFoundError to Option.none
      const results = yield* Effect.all(
        ids.map((id) =>
          service.get(id).pipe(
            Effect.asSome,
            Effect.catchTag("UserNotFoundError", () =>
              Effect.succeed(Option.none())
            )
          )
        ),
        { concurrency: "unbounded" }
      )

      // Extract found items using EffectArray.getSomes
      const items = EffectArray.getSomes(results)
      const foundIds = new Set(items.map((item) => item.id))
      const notFound = ids.filter((id) => !foundIds.has(id))

      return {
        items,
        notFound
      }
    }).pipe(Effect.catchTags({
        "UserTimeoutError": (e) =>
          Effect.fail(new UserValidationRpcError({
            field: "timeout",
            message: `Operation timed out after ${e.timeoutMs}ms`
          })),
        "DatabaseInternalError": (e) =>
          Effect.fail(new UserValidationRpcError({
            field: "database",
            message: e.message
          }))
      }))
})

// ============================================================================
// Combined Handlers (with Sub-Modules)
// ============================================================================
/**
 * Combined handlers including all sub-modules
 *
 * Merges the main User handlers with sub-module handlers.
 */
export const AllUserHandlers = {
  ...UserHandlers,
  ...AuthenticationHandlers,
  ...ProfileHandlers
}

// ============================================================================
// Handler Layer
// ============================================================================
/**
 * Handler dependencies layer
 *
 * Provides all dependencies needed by the handlers.
 * This is composed with middleware layers at the router level.
 */
export const UserHandlersLayer = Layer.mergeAll(
  UserService.Live
  // Add other service layers as needed
)
