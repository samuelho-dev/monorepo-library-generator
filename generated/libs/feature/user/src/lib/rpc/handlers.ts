import { Effect, Option } from "effect";
import { UserService } from "../server/service";
import { UserError } from "../shared/errors";
import { UserRpcs } from "./rpc";

/**
 * User RPC Handlers
 *
 * Handler implementations for user RPC operations.

Uses RpcGroup.toLayer pattern - input types flow from RPC definitions.
No explicit type annotations needed on handler parameters.

Context Access:
- CurrentUser: Authenticated user (for protected routes)
- RequestMetaTag: Request metadata (requestId, etc.)
- AuthMethodTag: Auth method used
 *
 */

// Context services from infra-auth
import { AuthMethodTag, CurrentUser, RequestMetaTag } from "@myorg/infra-auth";

/**
 * Entity type for mapping service results to RPC responses
 */
interface UserEntity {
  readonly id: string;
  readonly name?: string;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
  readonly [key: string]: unknown;
}

// ============================================================================
// Handler Layer
// ============================================================================

/**
 * User RPC Handlers Layer
 *
 * Implements handlers for UserRpcs using RpcGroup.toLayer.
 * Input types are inferred from RPC definitions - no annotations needed.
 *
 * @example
 * ```typescript
 * import { UserHandlersLayer } from "@myorg/feature-user/rpc";
 * import { Layer } from "effect";
 *
 * // Compose with service layers
 * const appLayer = Layer.mergeAll(
 *   UserHandlersLayer,
 *   UserService.Live,
 *   AuthMiddlewareLive,
 * );
 * ```
 */
export const UserHandlersLayer = UserRpcs.toLayer({
  /**
   * Get user by ID (Public)
   */
  GetUser: (input) =>
    Effect.gen(function* () {
      const meta = yield* RequestMetaTag;

      yield* Effect.logDebug("GetUser request", {
        id: input.id,
        requestId: meta.requestId,
      });

      const service = yield* UserService;
      const result = yield* service.get(input.id);

      if (Option.isNone(result)) {
        return yield* new UserError({
          message: `user not found: ${input.id}`,
          code: "NOT_FOUND",
        });
      }

      const entity = result.value as UserEntity;
      return {
        id: entity.id,
        name: entity.name ?? "user",
        createdAt: entity.createdAt ?? new Date(),
      };
    }),

  /**
   * List users with pagination (Public)
   */
  ListUser: (input) =>
    Effect.gen(function* () {
      const meta = yield* RequestMetaTag;

      yield* Effect.logDebug("ListUser request", {
        page: input.page,
        pageSize: input.pageSize,
        requestId: meta.requestId,
      });

      const service = yield* UserService;
      const offset = ((input.page ?? 1) - 1) * (input.pageSize ?? 20);
      const limit = input.pageSize ?? 20;

      const items = yield* service.findByCriteria({}, offset, limit);
      const total = yield* service.count({});

      return {
        items: items.map((item: unknown) => {
          const entity = item as UserEntity;
          return {
            id: entity.id,
            name: entity.name ?? "user",
            createdAt: entity.createdAt ?? new Date(),
          };
        }),
        total,
        page: input.page ?? 1,
        pageSize: limit,
      };
    }),

  /**
   * Create user (Protected - requires CurrentUser)
   */
  CreateUser: (input) =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;
      const authMethod = yield* AuthMethodTag;

      yield* Effect.logInfo(`CreateUser by user ${user.id} (${user.email}) via ${authMethod}`);

      const service = yield* UserService;
      const result = yield* service.create({
        name: input.name,
        createdBy: user.id,
      });

      const created = result as UserEntity;
      return {
        id: created.id,
        name: created.name ?? input.name,
        createdAt: created.createdAt ?? new Date(),
      };
    }),

  /**
   * Update user (Protected)
   */
  UpdateUser: (input) =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;

      yield* Effect.logInfo(`UpdateUser ${input.id} by user ${user.id}`);

      const service = yield* UserService;
      const updated = yield* service.update(input.id, {
        name: input.name,
        updatedBy: user.id,
      });

      if (Option.isNone(updated)) {
        return yield* new UserError({
          message: `user not found: ${input.id}`,
          code: "NOT_FOUND",
        });
      }

      const entity = updated.value as UserEntity;
      return {
        id: entity.id,
        name: entity.name ?? input.name,
        createdAt: entity.createdAt ?? new Date(),
      };
    }),

  /**
   * Delete user (Protected)
   */
  DeleteUser: (input) =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;

      yield* Effect.logInfo(`DeleteUser ${input.id} by user ${user.id}`);

      const service = yield* UserService;
      yield* service.delete(input.id);

      return { success: true as const };
    }),
});

// ============================================================================
// Type Export
// ============================================================================

/**
 * Type for User handlers layer
 */
export type UserHandlersLayerType = typeof UserHandlersLayer;
