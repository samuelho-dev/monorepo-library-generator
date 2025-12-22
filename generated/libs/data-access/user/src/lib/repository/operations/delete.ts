import { Duration, Effect } from "effect";
import { UserTimeoutError } from "../../shared/errors";

/**
 * User Delete Operations
 *
 * Implements delete operations for User entities.

Bundle optimization: Import this file directly for smallest bundle size:
  import { deleteOperations } from '@scope/data-access-user/repository/operations/delete'
 *
 * @module @myorg/data-access-user/repository/operations
 */

// Infrastructure services - Database for persistence

import { DatabaseService } from "@myorg/infra-database";

// ============================================================================
// Delete Operations
// ============================================================================

/**
 * Delete operations for User repository
 *
 * Uses DatabaseService for persistence with type-safe database queries.
 * Return types are inferred to preserve Effect's dependency and error tracking.
 *
 * @example
 * ```typescript
 * yield* deleteOperations.delete("id-123");
 * ```
 */
export const deleteOperations = {
  /**
   * Delete User entity by ID
   */
  delete: (id: string) =>
    Effect.gen(function* () {
      const database = yield* DatabaseService;

      yield* Effect.logDebug(`Deleting User with id: ${id}`);

      const result = yield* database.query((db) =>
        db.deleteFrom("users").where("id", "=", id).executeTakeFirst(),
      );

      const deletedCount = Number(result.numDeletedRows);
      if (deletedCount > 0) {
        yield* Effect.logDebug(`User deleted successfully (id: ${id})`);
      } else {
        yield* Effect.logDebug(`User not found for deletion (id: ${id})`);
      }
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () => UserTimeoutError.create("delete", 30000),
      }),
      Effect.withSpan("UserRepository.delete"),
    ),

  /**
   * Delete multiple User entities by IDs
   */
  deleteMany: (ids: ReadonlyArray<string>) =>
    Effect.gen(function* () {
      const database = yield* DatabaseService;

      yield* Effect.logDebug(`Deleting ${ids.length} User entities`);

      const result = yield* database.query((db) =>
        db.deleteFrom("users").where("id", "in", ids).executeTakeFirst(),
      );

      const deletedCount = Number(result.numDeletedRows);
      yield* Effect.logDebug(`Deleted ${deletedCount}/${ids.length} User entities`);
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () => UserTimeoutError.create("deleteMany", 30000),
      }),
      Effect.withSpan("UserRepository.deleteMany"),
    ),
} as const;

/**
 * Type alias for the delete operations object
 */
export type DeleteUserOperations = typeof deleteOperations;
