import { Duration, Effect, Option } from "effect";
import { UserTimeoutError } from "../../shared/errors";
import type { PaginationOptions, UserFilter } from "../../shared/types";

/**
 * User Read Operations
 *
 * Implements read/query operations for User entities.

Bundle optimization: Import this file directly for smallest bundle size:
  import { readOperations } from '@scope/data-access-user/repository/operations/read'
 *
 * @module @myorg/data-access-user/repository/operations
 */

// Infrastructure services - Database for persistence

import { DatabaseService } from "@myorg/infra-database";

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Read operations for User repository
 *
 * Uses DatabaseService for persistence with type-safe database queries.
 * Return types are inferred to preserve Effect's dependency and error tracking.
 *
 * NOTE: For caching, use CacheService.makeSimple() to create a cache handle
 * and implement cache-aside pattern in your service layer.
 *
 * @example
 * ```typescript
 * const maybeEntity = yield* readOperations.findById("id-123");
 * ```
 */
export const readOperations = {
  /**
   * Find User entity by ID
   */
  findById: (id: string) =>
    Effect.gen(function* () {
      const database = yield* DatabaseService;

      yield* Effect.logDebug(`Finding User by ID: ${id}`);

      const entity = yield* database.query((db) =>
        db.selectFrom("users").selectAll().where("id", "=", id).executeTakeFirst(),
      );

      if (entity) {
        yield* Effect.logDebug(`Found User: ${id}`);
        return Option.some(entity);
      }

      yield* Effect.logDebug(`User not found: ${id}`);
      return Option.none();
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () => UserTimeoutError.create("findById", 30000),
      }),
      Effect.withSpan("UserRepository.findById"),
    ),

  /**
   * Find all User entities matching filters
   */
  findAll: (filter?: UserFilter, pagination?: PaginationOptions) =>
    Effect.gen(function* () {
      const database = yield* DatabaseService;

      yield* Effect.logDebug(`Finding all User entities (filter: ${JSON.stringify(filter)})`);

      const limit = pagination?.limit ?? 50;
      const skip = pagination?.skip ?? 0;

      // Build query with filtering
      const items = yield* database.query((db) => {
        let query = db.selectFrom("users").selectAll();

        // Apply filters (basic search implementation)
        // TODO: Implement proper full-text search or specific field filtering
        if (filter?.search) {
          query = query.where((eb) =>
            eb.or([
              // Add searchable fields here based on your schema
              eb("name", "ilike", `%${filter.search}%`),
            ]),
          );
        }

        return query.limit(limit).offset(skip).execute();
      });

      // Get total count (without pagination)
      const total = yield* database.query((db) => {
        let query = db.selectFrom("users").select((eb) => eb.fn.countAll().as("count"));

        if (filter?.search) {
          query = query.where((eb) => eb.or([eb("name", "ilike", `%${filter.search}%`)]));
        }

        return query.executeTakeFirstOrThrow().then((result) => Number(result.count));
      });

      yield* Effect.logDebug(`Found ${items.length} User entities (total: ${total})`);

      return {
        items,
        total,
        hasMore: skip + items.length < total,
      };
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () => UserTimeoutError.create("findAll", 30000),
      }),
      Effect.withSpan("UserRepository.findAll"),
    ),

  /**
   * Find one User entity matching filter
   */
  findOne: (filter: UserFilter) =>
    Effect.gen(function* () {
      const database = yield* DatabaseService;

      yield* Effect.logDebug(`Finding one User entity (filter: ${JSON.stringify(filter)})`);

      // Build query with filtering
      const entity = yield* database.query((db) => {
        let query = db.selectFrom("users").selectAll();

        // Apply filters
        if (filter.search) {
          query = query.where((eb) => eb.or([eb("name", "ilike", `%${filter.search}%`)]));
        }

        return query.limit(1).executeTakeFirst();
      });

      if (entity) {
        yield* Effect.logDebug("Found User matching filter");
        return Option.some(entity);
      }

      yield* Effect.logDebug("No User found matching filter");
      return Option.none();
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () => UserTimeoutError.create("findOne", 30000),
      }),
      Effect.withSpan("UserRepository.findOne"),
    ),
} as const;

/**
 * Type alias for the read operations object
 */
export type ReadUserOperations = typeof readOperations;
