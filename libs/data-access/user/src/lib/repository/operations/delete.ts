import { UserNotFoundError } from "@samuelho-dev/contract-user"
import { DatabaseService } from "@samuelho-dev/infra-database"
import { Duration, Effect } from "effect"
import { UserTimeoutError } from "../../shared/errors"

/**
 * User Delete Operations
 *
 * Implements delete operations for User entities.

Bundle optimization: Import this file directly for smallest bundle size:
  import { deleteOperations } from '@scope/data-access-user/repository/operations/delete'
 *
 * @module @samuelho-dev/data-access-user/repository/operations
 */

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
 * yield* deleteOperations.delete("id-123")
 * ```
 */
export const deleteOperations = {
  /**
   * Delete User entity by ID
   */
  delete: (id: string) =>
    Effect.gen(function*() {
      const database = yield* DatabaseService

      yield* Effect.logDebug(`Deleting User with id: ${id}`)

      const result = yield* database.query((db) =>
        db
          .deleteFrom("user")
          .where("id", "=", id)
          .executeTakeFirst()
      )

      const deletedCount = Number(result.numDeletedRows)
      if (deletedCount === 0) {
        // Throw NotFoundError when record doesn't exist
        // This ensures callers can distinguish "deleted" from "nothing to delete"
        return yield* Effect.fail(new UserNotFoundError({
          message: `User not found: ${id}`,
          userId: id
        }))
      }

      yield* Effect.logDebug(`User deleted successfully (id: ${id})`)
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () => UserTimeoutError.create("delete", 30000)
      }),
      Effect.withSpan("UserRepository.delete")
    ),

  /**
   * Delete multiple User entities by IDs
   *
   * Note: This operation is idempotent for batch deletes - it does not fail
   * if some records don't exist. Returns the count of actually deleted records.
   * Use `delete` for single-record deletion with strict existence checking.
   *
   * @returns The number of records that were actually deleted
   */
  deleteMany: (ids: ReadonlyArray<string>) =>
    Effect.gen(function*() {
      const database = yield* DatabaseService

      if (ids.length === 0) {
        return 0
      }

      yield* Effect.logDebug(`Deleting ${ids.length} User entities`)

      const result = yield* database.query((db) =>
        db
          .deleteFrom("user")
          .where("id", "in", ids)
          .executeTakeFirst()
      )

      const deletedCount = Number(result.numDeletedRows)
      yield* Effect.logDebug(`Deleted ${deletedCount}/${ids.length} User entities`)

      return deletedCount
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () => UserTimeoutError.create("deleteMany", 30000)
      }),
      Effect.withSpan("UserRepository.deleteMany")
    )
} as const

/**
 * Type alias for the delete operations object
 */
export type DeleteUserOperations = typeof deleteOperations
