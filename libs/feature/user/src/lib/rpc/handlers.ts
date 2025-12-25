import { Array as EffectArray, DateTime, Effect, Layer, Option } from "effect"

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
// Contract Imports (Single Source of Truth)
// ============================================================================

import {
  UserRpcs,
  UserNotFoundRpcError,
  UserValidationRpcError,
  UserPermissionRpcError,
} from "@samuelho-dev/contract-user";

// ============================================================================
// Infrastructure Imports
// ============================================================================

import {
  // Middleware context (automatically provided based on RouteTag)
  ServiceContext,
  RequestMeta,
  getHandlerContext,
} from "@samuelho-dev/infra-rpc";

// ============================================================================
// Service Layer Import
// ============================================================================

import { UserService } from "../server/services";

// ============================================================================
// Sub-Module Handler Imports
// ============================================================================

import { AuthenticationHandlers } from "../server/services/authentication/handlers";

import { ProfileHandlers } from "../server/services/profile/handlers";


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
 *     return yield* service.findById(id);
 *   })
 * ```
 */
export const UserHandlers = UserRpcs.toLayer({
  /**
   * Get user by ID
   *
   * RouteTag: "public" - No authentication required
   */
  GetUser: ({ id }) =>
    Effect.gen(function*() {
      const service = yield* UserService;
      const meta = yield* RequestMeta;

      yield* Effect.logDebug("Getting user", {
        id,
        requestId: meta.requestId,
      });

      const result = yield* service.get(id).pipe(
        Effect.catchTags({
        "UserNotFoundError": (e) =>
          Effect.fail(new UserNotFoundRpcError({
            message: e.message,
            userId: e.userId
          })),
        "UserValidationError": (e) =>
          Effect.fail(new UserValidationRpcError({
            message: e.message,
            ...(e.field !== undefined && { field: e.field })
          })),
        "UserAlreadyExistsError": (e) =>
          Effect.fail(new UserValidationRpcError({
            message: e.message,
            field: "userId"
          })),
        "UserPermissionError": (e) =>
          Effect.fail(new UserPermissionRpcError({
            message: e.message,
            action: e.operation
          })),
        "UserServiceError": (e) =>
          Effect.fail(new UserValidationRpcError({
            message: `Service error: ${e.message}`,
            field: "service"
          })),
      })
      );

      // Handle Option.none case - return typed RPC error
      if (Option.isNone(result)) {
        return yield* Effect.fail(UserNotFoundRpcError.create(id));
      }

      return result.value;
    }),

  /**
   * List users with pagination
   *
   * RouteTag: "public" - No authentication required
   */
  ListUsers: ({ page, pageSize }) =>
    Effect.gen(function*() {
      const service = yield* UserService;

      const currentPage = page ?? 1;
      const currentPageSize = pageSize ?? 20;
      const offset = (currentPage - 1) * currentPageSize;

      const [items, total] = yield* Effect.all([
        service.findByCriteria({}, offset, currentPageSize).pipe(
          Effect.catchTags({
        "UserNotFoundError": (e) =>
          Effect.fail(new UserNotFoundRpcError({
            message: e.message,
            userId: e.userId
          })),
        "UserValidationError": (e) =>
          Effect.fail(new UserValidationRpcError({
            message: e.message,
            ...(e.field !== undefined && { field: e.field })
          })),
        "UserAlreadyExistsError": (e) =>
          Effect.fail(new UserValidationRpcError({
            message: e.message,
            field: "userId"
          })),
        "UserPermissionError": (e) =>
          Effect.fail(new UserPermissionRpcError({
            message: e.message,
            action: e.operation
          })),
        "UserServiceError": (e) =>
          Effect.fail(new UserValidationRpcError({
            message: `Service error: ${e.message}`,
            field: "service"
          })),
      })
        ),
        service.count({}).pipe(
          Effect.catchTags({
        "UserNotFoundError": (e) =>
          Effect.fail(new UserNotFoundRpcError({
            message: e.message,
            userId: e.userId
          })),
        "UserValidationError": (e) =>
          Effect.fail(new UserValidationRpcError({
            message: e.message,
            ...(e.field !== undefined && { field: e.field })
          })),
        "UserAlreadyExistsError": (e) =>
          Effect.fail(new UserValidationRpcError({
            message: e.message,
            field: "userId"
          })),
        "UserPermissionError": (e) =>
          Effect.fail(new UserPermissionRpcError({
            message: e.message,
            action: e.operation
          })),
        "UserServiceError": (e) =>
          Effect.fail(new UserValidationRpcError({
            message: `Service error: ${e.message}`,
            field: "service"
          })),
      })
        ),
      ]);

      return {
        page: currentPage,
        pageSize: currentPageSize,
        items,
        total,
        hasMore: offset + items.length < total,
      };
    }),

  /**
   * Create a new user
   *
   * RouteTag: "protected" - User authentication required
   */
  CreateUser: (input) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext;
      const service = yield* UserService;

      yield* Effect.logInfo("Creating user", {
        userId: user.id,
        requestId: meta.requestId,
      });

      // RPC input type should match service create input type
      // If types differ, use Schema.decode for transformation at this boundary
      return yield* service.create(input).pipe(
        Effect.catchTags({
        "UserNotFoundError": (e) =>
          Effect.fail(new UserNotFoundRpcError({
            message: e.message,
            userId: e.userId
          })),
        "UserValidationError": (e) =>
          Effect.fail(new UserValidationRpcError({
            message: e.message,
            ...(e.field !== undefined && { field: e.field })
          })),
        "UserAlreadyExistsError": (e) =>
          Effect.fail(new UserValidationRpcError({
            message: e.message,
            field: "userId"
          })),
        "UserPermissionError": (e) =>
          Effect.fail(new UserPermissionRpcError({
            message: e.message,
            action: e.operation
          })),
        "UserServiceError": (e) =>
          Effect.fail(new UserValidationRpcError({
            message: `Service error: ${e.message}`,
            field: "service"
          })),
      })
      );
    }),

  /**
   * Update an existing user
   *
   * RouteTag: "protected" - User authentication required
   */
  UpdateUser: ({ id, data }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext;
      const service = yield* UserService;

      yield* Effect.logInfo("Updating user", {
        id,
        userId: user.id,
        requestId: meta.requestId,
      });

      // RPC data type should match service update input type
      // If types differ, use Schema.decode for transformation at this boundary
      const result = yield* service.update(id, data).pipe(
        Effect.catchTags({
        "UserNotFoundError": (e) =>
          Effect.fail(new UserNotFoundRpcError({
            message: e.message,
            userId: e.userId
          })),
        "UserValidationError": (e) =>
          Effect.fail(new UserValidationRpcError({
            message: e.message,
            ...(e.field !== undefined && { field: e.field })
          })),
        "UserAlreadyExistsError": (e) =>
          Effect.fail(new UserValidationRpcError({
            message: e.message,
            field: "userId"
          })),
        "UserPermissionError": (e) =>
          Effect.fail(new UserPermissionRpcError({
            message: e.message,
            action: e.operation
          })),
        "UserServiceError": (e) =>
          Effect.fail(new UserValidationRpcError({
            message: `Service error: ${e.message}`,
            field: "service"
          })),
      })
      );

      // Handle Option.none case - return typed RPC error
      if (Option.isNone(result)) {
        return yield* Effect.fail(new UserNotFoundRpcError({
          message: `User not found: ${id}`,
          userId: id
        }));
      }

      return result.value;
    }),

  /**
   * Delete a user
   *
   * RouteTag: "protected" - User authentication required
   */
  DeleteUser: ({ id }) =>
    Effect.gen(function*() {
      const { user, meta } = yield* getHandlerContext;
      const service = yield* UserService;

      yield* Effect.logInfo("Deleting user", {
        id,
        userId: user.id,
        requestId: meta.requestId,
      });

      yield* service.delete(id).pipe(
        Effect.catchTags({
        "UserNotFoundError": (e) =>
          Effect.fail(new UserNotFoundRpcError({
            message: e.message,
            userId: e.userId
          })),
        "UserValidationError": (e) =>
          Effect.fail(new UserValidationRpcError({
            message: e.message,
            ...(e.field !== undefined && { field: e.field })
          })),
        "UserAlreadyExistsError": (e) =>
          Effect.fail(new UserValidationRpcError({
            message: e.message,
            field: "userId"
          })),
        "UserPermissionError": (e) =>
          Effect.fail(new UserPermissionRpcError({
            message: e.message,
            action: e.operation
          })),
        "UserServiceError": (e) =>
          Effect.fail(new UserValidationRpcError({
            message: `Service error: ${e.message}`,
            field: "service"
          })),
      })
      );
      return {
        success: true as const,
        deletedAt: DateTime.unsafeNow(),
      };
    }),

  /**
   * Validate user (service-to-service)
   *
   * RouteTag: "service" - Service authentication required
   */
  ValidateUser: ({ userId, validationType }) =>
    Effect.gen(function*() {
      const serviceCtx = yield* ServiceContext;
      const service = yield* UserService;

      yield* Effect.logDebug("Validating user for service", {
        userId,
        validationType,
        callingService: serviceCtx.serviceName,
      });

      const exists = yield* service.exists(userId).pipe(
        Effect.catchTags({
        "UserNotFoundError": (e) =>
          Effect.fail(new UserNotFoundRpcError({
            message: e.message,
            userId: e.userId
          })),
        "UserValidationError": (e) =>
          Effect.fail(new UserValidationRpcError({
            message: e.message,
            ...(e.field !== undefined && { field: e.field })
          })),
        "UserAlreadyExistsError": (e) =>
          Effect.fail(new UserValidationRpcError({
            message: e.message,
            field: "userId"
          })),
        "UserPermissionError": (e) =>
          Effect.fail(new UserPermissionRpcError({
            message: e.message,
            action: e.operation
          })),
        "UserServiceError": (e) =>
          Effect.fail(new UserValidationRpcError({
            message: `Service error: ${e.message}`,
            field: "service"
          })),
      })
      );

      // Build response with proper handling for exactOptionalPropertyTypes
      const baseResponse = {
        valid: exists,
        userId,
        validatedAt: DateTime.unsafeNow(),
      };

      // Use typed constant to avoid type assertion
      const notFoundErrors: ReadonlyArray<string> = ["User not found"];

      return exists
        ? baseResponse
        : { ...baseResponse, errors: notFoundErrors };
    }),

  /**
   * Bulk get users (service-to-service)
   *
   * RouteTag: "service" - Service authentication required
   */
  BulkGetUsers: ({ ids }) =>
    Effect.gen(function*() {
      const service = yield* UserService;

      // Fetch all entities in parallel using individual gets
      const results = yield* Effect.all(
        ids.map((id) => service.get(id).pipe(
          Effect.catchTags({
        "UserNotFoundError": (e) =>
          Effect.fail(new UserNotFoundRpcError({
            message: e.message,
            userId: e.userId
          })),
        "UserValidationError": (e) =>
          Effect.fail(new UserValidationRpcError({
            message: e.message,
            ...(e.field !== undefined && { field: e.field })
          })),
        "UserAlreadyExistsError": (e) =>
          Effect.fail(new UserValidationRpcError({
            message: e.message,
            field: "userId"
          })),
        "UserPermissionError": (e) =>
          Effect.fail(new UserPermissionRpcError({
            message: e.message,
            action: e.operation
          })),
        "UserServiceError": (e) =>
          Effect.fail(new UserValidationRpcError({
            message: `Service error: ${e.message}`,
            field: "service"
          })),
      })
        )),
        { concurrency: "unbounded" }
      );

      // Extract found items (filter out None results)
      const items = EffectArray.getSomes(results);
      const foundIds = new Set(items.map((item) => item.id));
      const notFound = ids.filter((id) => !foundIds.has(id));

      return {
        items,
        notFound,
      };
    }),
});

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
  ...ProfileHandlers,
};

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
);
