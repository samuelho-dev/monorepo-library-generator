import { Duration, Effect } from "effect";
import { UserTimeoutError } from "../../shared/errors";
import type { UserCreateInput } from "../../shared/types";

/**
 * User Create Operations
 *
 * Implements create operations for User entities.

Bundle optimization: Import this file directly for smallest bundle size:
  import { createOperations } from '@scope/data-access-user/repository/operations/create'
 *
 * @module @myorg/data-access-user/repository/operations
 */

// Infrastructure services - Database for persistence

import { DatabaseService } from "@myorg/infra-database";

// ============================================================================
// Create Operations
// ============================================================================

/**
 * Create operations for User repository
 *
 * Uses DatabaseService for persistence with type-safe database queries.
 * Return types are inferred to preserve Effect's dependency and error tracking.
 *
 * @example
 * ```typescript
 * const entity = yield* createOperations.create({ name: "example" });
 * ```
 */
export const createOperations = {
  /**
   * Create a new User entity
   */
  create: (input: UserCreateInput) =>
    Effect.gen(function* () {
      const database = yield* DatabaseService;

      yield* Effect.logDebug(`Creating User: ${JSON.stringify(input)}`);

      const entity = yield* database.query((db) =>
        db
          .insertInto("users")
          .values({
            ...input,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returningAll()
          .executeTakeFirstOrThrow(),
      );

      yield* Effect.logDebug("User created successfully");

      return entity;
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () => UserTimeoutError.create("create", 30000),
      }),
      Effect.withSpan("UserRepository.create"),
    ),

  /**
   * Create multiple User entities in batch
   */
  createMany: (inputs: ReadonlyArray<UserCreateInput>) =>
    Effect.gen(function* () {
      const database = yield* DatabaseService;

      yield* Effect.logDebug(`Creating ${inputs.length} User entities`);

      const entities = yield* database.query((db) =>
        db
          .insertInto("users")
          .values(
            inputs.map((input) => ({
              ...input,
              created_at: new Date(),
              updated_at: new Date(),
            })),
          )
          .returningAll()
          .execute(),
      );

      yield* Effect.logDebug(`Created ${entities.length} User entities successfully`);

      return entities;
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () => UserTimeoutError.create("createMany", 30000),
      }),
      Effect.withSpan("UserRepository.createMany"),
    ),
} as const;

/**
 * Type alias for the create operations object
 */
export type CreateUserOperations = typeof createOperations;
