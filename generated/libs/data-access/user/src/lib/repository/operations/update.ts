import { UserNotFoundError, UserTimeoutError } from "../../shared/errors"
import { Duration, Effect } from "effect"
import type { UserUpdateInput } from "../../shared/types"

/**
 * User Update Operations
 *
 * Implements update operations for User entities.

Bundle optimization: Import this file directly for smallest bundle size:
  import { updateOperations } from '@scope/data-access-user/repository/operations/update'
 *
 * @module @myorg/data-access-user/repository/operations
 */




// Infrastructure services - Database for persistence

import { DatabaseService } from "@myorg/infra-database";

// ============================================================================
// Update Operations
// ============================================================================


/**
 * Update operations for User repository
 *
 * Uses DatabaseService for persistence with type-safe database queries.
 * Return types are inferred to preserve Effect's dependency and error tracking.
 *
 * @example
 * ```typescript
 * const updated = yield* updateOperations.update("id-123", { name: "new name" });
 * ```
 */
export const updateOperations = {
  /**
   * Update User entity by ID
   */
  update: (id: string, input: UserUpdateInput) =>
    Effect.gen(function* () {
      const database = yield* DatabaseService;

      yield* Effect.logDebug(`Updating User with id: ${id}`);

      const updated = yield* database.query((db) =>
        db
          .updateTable("users")
          .set({
            ...input,
            updated_at: new Date(),
          })
          .where("id", "=", id)
          .returningAll()
          .executeTakeFirst()
      );

      if (!updated) {
        yield* Effect.logWarning(`User not found: ${id}`);
        return yield* Effect.fail(UserNotFoundError.create(id));
      }

      yield* Effect.logDebug(`User updated successfully (id: ${id})`);

      return updated;
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () => UserTimeoutError.create("update", 30000)
      }),
      Effect.withSpan("UserRepository.update")
    ),
} as const;

/**
 * Type alias for the update operations object
 */
export type UpdateUserOperations = typeof updateOperations;