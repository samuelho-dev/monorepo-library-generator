import { UserAlreadyExistsError, UserNotFoundError, UserServiceError, UserValidationError } from "../../shared/errors"
import { UserRepository } from "@samuelho-dev/data-access-user"
import { DatabaseService } from "@samuelho-dev/infra-database"
import { LoggingService, MetricsService } from "@samuelho-dev/infra-observability"
import { PubsubService, withEventPublishing } from "@samuelho-dev/infra-pubsub"
import { Context, Effect, Layer, Option, Schema } from "effect"
import type { UserFeatureError } from "../../shared/errors"
import type { UserConflictRepositoryError, UserDatabaseRepositoryError, UserNotFoundRepositoryError, UserValidationRepositoryError } from "@samuelho-dev/contract-user"
import type { User, UserConnectionError, UserCreateInput, UserFilter, UserTimeoutError, UserTransactionError, UserUpdateInput } from "@samuelho-dev/data-access-user"
import type { DatabaseConfigError, DatabaseConnectionError, DatabaseError, DatabaseInternalError, DatabaseTimeoutError } from "@samuelho-dev/infra-database"
import type { TopicHandle } from "@samuelho-dev/infra-pubsub"

/**
 * User Service Interface
 *
 * Context.Tag definition for UserService.

Includes:
- LoggingService for structured logging
- MetricsService for observability
- Distributed tracing via Effect.withSpan()

Operations are split into separate files for optimal tree-shaking.
Import only the operations you need for smallest bundle size.
 *
 * @module @samuelho-dev/feature-user/server/services
 */



// ============================================================================
// Error Imports (Contract-First)
// ============================================================================

// Domain errors pass through unchanged

// Infrastructure errors are caught and mapped to ServiceError





// ============================================================================
// Repository Integration
// ============================================================================


// ============================================================================
// Infrastructure Services
// ============================================================================


// ============================================================================
// Environment Configuration
// ============================================================================

import { env } from "@samuelho-dev/env";

// ============================================================================
// Repository Type Re-exports
// ============================================================================



export type { User, UserCreateInput, UserUpdateInput, UserFilter };

// ============================================================================
// Event Schema
// ============================================================================


/**
 * User Event Schema
 *
 * Used with withEventPublishing helper for type-safe event publishing.
 */
const UserEventSchema = Schema.Union(
  Schema.Struct({
    type: Schema.Literal("UserCreated"),
    id: Schema.String,
    timestamp: Schema.DateFromSelf
  }),
  Schema.Struct({
    type: Schema.Literal("UserUpdated"),
    id: Schema.String,
    timestamp: Schema.DateFromSelf
  }),
  Schema.Struct({
    type: Schema.Literal("UserDeleted"),
    id: Schema.String,
    timestamp: Schema.DateFromSelf
  })
);

type UserEvent = Schema.Schema.Type<typeof UserEventSchema>;

// ============================================================================
// Service Implementation
// ============================================================================


/**
 * Repository error type union (from data-access layer)
 *
 * This is the complete set of errors that repository operations can produce.
 * Each error type is explicitly listed (not using union type aliases) because
 * Effect.catchTags requires specific tagged error types to work properly.
 */
type UserRepoError =
  // Repository-specific errors (from contract)
  | UserNotFoundRepositoryError
  | UserValidationRepositoryError
  | UserConflictRepositoryError
  | UserDatabaseRepositoryError
  // Infrastructure errors (from data-access)
  | UserTimeoutError
  | UserConnectionError
  | UserTransactionError
  // Database service errors (from infra-database)
  | DatabaseError
  | DatabaseInternalError
  | DatabaseConfigError
  | DatabaseConnectionError
  | DatabaseTimeoutError;

/**
 * Map repository errors to feature errors
 *
 * ERROR TRANSLATION:
 * - Repository NotFound → Domain NotFound
 * - Repository Validation → Domain Validation
 * - Repository Conflict → Domain AlreadyExists
 * - Repository Database → Service dependency error
 * - Infrastructure errors → Service dependency/internal errors
 *
 * Uses Effect.catchTags for type-safe, exhaustive error handling.
 */
const mapRepoErrors = <A, R>(
  effect: Effect.Effect<A, UserRepoError, R>,
  operation: string
): Effect.Effect<A, UserFeatureError, R> =>
  effect.pipe(
    // Map repository errors to domain errors
    Effect.catchTags({
      "UserNotFoundRepositoryError": (error) =>
        Effect.fail(new UserNotFoundError({
          message: error.message,
          userId: error.userId
        })),
      "UserValidationRepositoryError": (error) =>
        Effect.fail(new UserValidationError({
          message: error.message,
          field: error.field
        })),
      "UserConflictRepositoryError": (error) =>
        Effect.fail(new UserAlreadyExistsError({
          message: error.message,
          identifier: error.identifier
        })),
      "UserDatabaseRepositoryError": (error) =>
        Effect.fail(UserServiceError.dependency(operation, error.message, error)),
    }),
    // Map infrastructure errors to service errors
    Effect.catchTags({
      "UserTimeoutError": (error) =>
        Effect.fail(UserServiceError.dependency(
          operation,
          `Operation timed out after ${error.timeoutMs}ms`,
          error
        )),
      "UserConnectionError": (error) =>
        Effect.fail(UserServiceError.dependency(
          operation,
          `Connection to ${error.target} failed`,
          error
        )),
      "UserTransactionError": (error) =>
        Effect.fail(UserServiceError.dependency(
          operation,
          `Transaction ${error.phase} failed`,
          error
        )),
    }),
    // Map database service errors
    Effect.catchTags({
      "DatabaseError": (error) =>
        Effect.fail(UserServiceError.dependency(operation, "Database operation failed", error)),
      "DatabaseInternalError": (error) =>
        Effect.fail(UserServiceError.internal(operation, "Database internal error", error)),
      "DatabaseConfigError": (error) =>
        Effect.fail(UserServiceError.dependency(operation, "Database configuration error", error)),
      "DatabaseConnectionError": (error) =>
        Effect.fail(UserServiceError.dependency(operation, "Database connection failed", error)),
      "DatabaseTimeoutError": (error) =>
        Effect.fail(UserServiceError.dependency(operation, "Database operation timed out", error)),
    }),
    // Log errors for observability
    Effect.tapError((error) =>
      Effect.logWarning(`${operation} failed`, {
        errorTag: error._tag,
        operation,
      })
    )
  );

/**
 * Create service implementation
 *
 * Note: Return type is inferred by TypeScript. The Context.Tag ensures
 * the implementation matches UserServiceInterface.
 */
const createServiceImpl = (
  repo: Context.Tag.Service<typeof UserRepository>,
  logger: Context.Tag.Service<typeof LoggingService>,
  metrics: Context.Tag.Service<typeof MetricsService>,
  eventTopic: TopicHandle<UserEvent>
) => ({
  get: (id: string) =>
    Effect.gen(function*() {
      const histogram = yield* metrics.histogram("user_get_duration_seconds");

      return yield* histogram.timer(
        Effect.gen(function*() {
          yield* logger.debug("UserService.get", { id });

          const result = yield* mapRepoErrors(
            repo.findById(id),
            "get"
          );

          if (Option.isNone(result)) {
            yield* logger.debug("User not found", { id });
          }

          return result;
        })
      );
    }).pipe(Effect.withSpan("UserService.get", { attributes: { id } })),

  findByCriteria: (
    criteria: UserFilter,
    offset: number,
    limit: number
  ) =>
    Effect.gen(function*() {
      const histogram = yield* metrics.histogram("user_list_duration_seconds");

      return yield* histogram.timer(
        Effect.gen(function*() {
          yield* logger.debug("UserService.findByCriteria", {
            criteria,
            offset,
            limit,
          });

          const result = yield* mapRepoErrors(
            repo.findAll(criteria, { skip: offset, limit }).pipe(
              Effect.map((result) => result.items)
            ),
            "findByCriteria"
          );

          yield* logger.debug("UserService.findByCriteria completed", {
            count: result.length,
          });

          return result;
        })
      );
    }).pipe(Effect.withSpan("UserService.findByCriteria")),

  count: (criteria: UserFilter) =>
    Effect.gen(function*() {
      yield* logger.debug("UserService.count", { criteria });

      return yield* mapRepoErrors(
        repo.count(criteria),
        "count"
      );
    }).pipe(Effect.withSpan("UserService.count")),

  create: (input: UserCreateInput) =>
    Effect.gen(function*() {
      const counter = yield* metrics.counter("user_created_total");
      const histogram = yield* metrics.histogram("user_create_duration_seconds");

      return yield* histogram.timer(
        withEventPublishing(
          Effect.gen(function*() {
            yield* logger.info("UserService.create", { input });

            const result = yield* mapRepoErrors(
              repo.create(input),
              "create"
            );

            yield* counter.increment;
            yield* logger.info("User created", { id: result.id });

            return result;
          }),
          (result) => ({ type: "UserCreated" as const, id: result.id, timestamp: new Date() }),
          eventTopic
        )
      );
    }).pipe(Effect.withSpan("UserService.create")),

  update: (id: string, input: UserUpdateInput) =>
    Effect.gen(function*() {
      const counter = yield* metrics.counter("user_updated_total");
      const histogram = yield* metrics.histogram("user_update_duration_seconds");

      return yield* histogram.timer(
        withEventPublishing(
          Effect.gen(function*() {
            yield* logger.info("UserService.update", { id, input });

            const result = yield* mapRepoErrors(
              repo.update(id, input).pipe(Effect.map(Option.some)),
              "update"
            );

            yield* counter.increment;
            yield* logger.info("User updated", { id });

            return result;
          }),
          () => ({ type: "UserUpdated" as const, id, timestamp: new Date() }),
          eventTopic
        )
      );
    }).pipe(Effect.withSpan("UserService.update", { attributes: { id } })),

  delete: (id: string) =>
    Effect.gen(function*() {
      const counter = yield* metrics.counter("user_deleted_total");
      const histogram = yield* metrics.histogram("user_delete_duration_seconds");

      return yield* histogram.timer(
        withEventPublishing(
          Effect.gen(function*() {
            yield* logger.info("UserService.delete", { id });

            yield* mapRepoErrors(
              repo.delete(id),
              "delete"
            );

            yield* counter.increment;
            yield* logger.info("User deleted", { id });
          }),
          () => ({ type: "UserDeleted" as const, id, timestamp: new Date() }),
          eventTopic
        )
      );
    }).pipe(Effect.withSpan("UserService.delete", { attributes: { id } })),

  exists: (id: string) =>
    Effect.gen(function*() {
      yield* logger.debug("UserService.exists", { id });

      return yield* mapRepoErrors(
        repo.exists(id),
        "exists"
      );
    }).pipe(Effect.withSpan("UserService.exists", { attributes: { id } })),
});

// ============================================================================
// Service Interface (Inferred from Implementation)
// ============================================================================


/**
 * User Service Interface
 *
 * The interface type is INFERRED from the implementation (createServiceImpl).
 * This ensures the interface always matches the actual implementation types,
 * including proper Effect requirements and error types.
 */
export type UserServiceInterface = ReturnType<typeof createServiceImpl>

// ============================================================================
// Context.Tag
// ============================================================================


/**
 * User Service Context.Tag
 *
 * Effect's Context.Tag pattern validates at compile-time that the Layer
 * provides an object matching UserServiceInterface.
 *
 * Event publishing is handled inline using withEventPublishing helper.
 */
export class UserService extends Context.Tag("UserService")<
  UserService,
  UserServiceInterface
>() {
  /**
   * Live layer - Production implementation
   *
   * Events are published inline using withEventPublishing helper:
   * - create() → UserCreated
   * - update() → UserUpdated
   * - delete() → UserDeleted
   *
   * Requires: UserRepository, LoggingService, MetricsService, PubsubService
   */
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function*() {
      const repo = yield* UserRepository
      const logger = yield* LoggingService
      const metrics = yield* MetricsService
      const pubsub = yield* PubsubService
      const eventTopic = yield* pubsub.topic("user-events", UserEventSchema)

      return createServiceImpl(repo, logger, metrics, eventTopic)
    })
  )

  /**
   * Test layer - Same as Live
   *
   * Testing is done by composing with test infrastructure layers
   * (e.g., DatabaseService.Test, LoggingService.Test) rather than
   * a separate implementation.
   */
  static readonly Test = this.Live;

  /**
   * Dev layer - Development with enhanced logging
   *
   * Same as Live - enhanced logging comes from LoggingService.Dev
   * when composing layers for development environment.
   */
  static readonly Dev = this.Live;

  /**
   * Auto layer - Environment-aware layer selection
   *
   * Automatically selects the appropriate layer based on env.NODE_ENV:
   * - "production" → Live layer
   * - "development" → Dev layer (with logging)
   * - "test" → Test layer
   * - undefined/other → Live layer (default)
   *
   * Requires: import { env } from "@scope/env";
   */
  static readonly Auto = Layer.suspend(() => {
    switch (env.NODE_ENV) {
      case "test":
        return UserService.Test;
      case "development":
        return UserService.Dev;
      default:
        return UserService.Live;
    }
  });

  /**
   * Fully composed layer with all production dependencies
   */
  static readonly Layer = UserService.Live.pipe(
    Layer.provide(UserRepository.Live),
    Layer.provide(DatabaseService.Live),
    Layer.provide(LoggingService.Live),
    Layer.provide(MetricsService.Live),
    Layer.provide(PubsubService.Live)
  )

  /**
   * Test composed layer with test infrastructure
   */
  static readonly TestLayer = UserService.Test.pipe(
    Layer.provide(UserRepository.Test),
    Layer.provide(DatabaseService.Test),
    Layer.provide(LoggingService.Test),
    Layer.provide(MetricsService.Test),
    Layer.provide(PubsubService.Test)
  )
}

// ============================================================================
// Sub-Module Re-exports
// ============================================================================


// Re-export sub-module services for convenient access
// Use these for direct sub-module access or parent service composition

export { AuthenticationService, AuthenticationLive, AuthenticationTest } from "./authentication";
export { ProfileService, ProfileLive, ProfileTest } from "./profile";
