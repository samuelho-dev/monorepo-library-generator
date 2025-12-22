import { UserTimeoutError } from "../../shared/errors"
import { Duration, Effect } from "effect"
import type { UserFilter } from "../../shared/types"

/**
 * User Aggregate Operations
 *
 * Implements aggregate operations (count, exists) for User entities.

Bundle optimization: Import this file directly for smallest bundle size:
  import { aggregateOperations } from '@scope/data-access-user/repository/operations/aggregate'
 *
 * @module @myorg/data-access-user/repository/operations
 */




// Infrastructure services - Database for persistence

import { DatabaseService } from "@myorg/infra-database";

// ============================================================================
// Aggregate Operations
// ============================================================================


/**
 * Aggregate operations for User repository
 *
 * Uses DatabaseService for persistence with efficient database-level aggregation.
 * Return types are inferred to preserve Effect's dependency and error tracking.
 *
 * @example
 * ```typescript
 * const count = yield* aggregateOperations.count({ search: "test" });
 * ```
 */
export const aggregateOperations = {
  /**
   * Count User entities matching filter
   */
  count: (filter?: UserFilter) =>
    Effect.gen(function* () {
      const database = yield* DatabaseService;

      yield* Effect.logDebug(`Counting User entities (filter: ${JSON.stringify(filter)})`);

      const count = yield* database.query((db) => {
        let query = db.selectFrom("users").select((eb) => eb.fn.countAll().as("count"));

        // Apply filters if provided
        if (filter?.search) {
          query = query.where((eb) =>
            eb.or([
              eb("name", "ilike", `%${filter.search}%`),
            ])
          );
        }

        return query.executeTakeFirstOrThrow().then((result) => Number(result.count));
      });

      yield* Effect.logDebug(`Counted ${count} User entities`);

      return count;
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () => UserTimeoutError.create("count", 30000)
      }),
      Effect.withSpan("UserRepository.count")
    ),

  /**
   * Check if User entity exists by ID
   */
  exists: (id: string) =>
    Effect.gen(function* () {
      const database = yield* DatabaseService;

      yield* Effect.logDebug(`Checking if User exists: ${id}`);

      const result = yield* database.query((db) =>
        db
          .selectFrom("users")
          .select((eb) => eb.fn.countAll().as("count"))
          .where("id", "=", id)
          .executeTakeFirstOrThrow()
          .then((result) => Number(result.count) > 0)
      );

      yield* Effect.logDebug(`User exists check: ${id} = ${result}`);

      return result;
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () => UserTimeoutError.create("exists", 30000)
      }),
      Effect.withSpan("UserRepository.exists")
    ),
} as const;

/**
 * Type alias for the aggregate operations object
 */
export type AggregateUserOperations = typeof aggregateOperations;