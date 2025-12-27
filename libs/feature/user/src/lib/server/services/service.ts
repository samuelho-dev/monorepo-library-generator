import { CurrentUser } from "@samuelho-dev/contract-auth"
import { UserNotFoundError } from "@samuelho-dev/contract-user"
import { UserRepository } from "@samuelho-dev/data-access-user"
import type { User, UserCreateInput, UserFilter, UserUpdateInput } from "@samuelho-dev/data-access-user"
import { env } from "@samuelho-dev/env"
import { DatabaseService } from "@samuelho-dev/infra-database"
import { LoggingService, MetricsService } from "@samuelho-dev/infra-observability"
import { PubsubService } from "@samuelho-dev/infra-pubsub"
import type { TopicHandle } from "@samuelho-dev/infra-pubsub"
import { Context, Effect, Layer, Option, Schema } from "effect"
import type { ParseError } from "effect/ParseResult"

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
// Domain errors from contract - only import errors that are thrown by service methods
// ============================================================================
// Repository Integration
// ============================================================================
// ============================================================================
// Infrastructure Services
// ============================================================================
// ============================================================================
// Authentication Context
// ============================================================================
// CurrentUser is request-scoped - yield inside methods, NOT at layer construction
// Service methods that need auth will have CurrentUser in their Effect requirements
// RPC middleware provides CurrentUser for protected routes (per-request)
// Job processors must provide SystemUserLayer for background processing
// ============================================================================
// Repository Type Re-exports
// ============================================================================

export type { User, UserCreateInput, UserUpdateInput, UserFilter }

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
)

type UserEvent = Schema.Schema.Type<typeof UserEventSchema>
// ============================================================================
// Service Implementation
// ============================================================================
/**
 * Create service implementation
 *
 * Contract-First Error Handling:
 * - Repository throws domain errors (UserNotFoundError, etc.) from contract
 * - Repository throws infrastructure errors (TimeoutError, ConnectionError) from data-access
 * - Service layer lets errors bubble up with full type information
 * - Handler layer (RPC) catches and maps to RPC-specific errors
 *
 * Return types are INFERRED - do not add explicit return types as they hide errors.
 */
const createServiceImpl = (
  repo: Context.Tag.Service<typeof UserRepository>,
  logger: Context.Tag.Service<typeof LoggingService>,
  metrics: Context.Tag.Service<typeof MetricsService>,
  eventTopic: TopicHandle<UserEvent, ParseError>
) => ({
  get: (id: string) =>
    Effect.gen(function*() {
      const histogram = yield* metrics.histogram("user_get_duration_seconds")
      const start = Date.now()

      yield* logger.debug("UserService.get", { id })

      const result = yield* repo.findById(id)

      if (Option.isNone(result)) {
        yield* logger.debug("User not found", { id })
        return yield* Effect.fail(new UserNotFoundError({
          message: `User not found: ${id}`,
          userId: id
        }))
      }

      // Record duration after successful operation
      yield* histogram.record((Date.now() - start) / 1000)

      return result.value
    }).pipe(Effect.withSpan("UserService.get", { attributes: { id } })),

  findByCriteria: (
    criteria: UserFilter,
    offset: number,
    limit: number
  ) =>
    Effect.gen(function*() {
      const histogram = yield* metrics.histogram("user_list_duration_seconds")
      const start = Date.now()

      yield* logger.debug("UserService.findByCriteria", {
        criteria,
        offset,
        limit
      })

      // Errors bubble up with full type information
      const result = yield* repo.findAll(criteria, { skip: offset, limit }).pipe(
        Effect.map((r) => r.items)
      )

      yield* logger.debug("UserService.findByCriteria completed", {
        count: result.length
      })

      // Record duration after successful operation
      yield* histogram.record((Date.now() - start) / 1000)

      return result
    }).pipe(Effect.withSpan("UserService.findByCriteria")),

  count: (criteria: UserFilter) =>
    Effect.gen(function*() {
      yield* logger.debug("UserService.count", { criteria })

      // Errors bubble up with full type information
      return yield* repo.count(criteria)
    }).pipe(Effect.withSpan("UserService.count")),

  create: (input: UserCreateInput) =>
    Effect.gen(function*() {
      const counter = yield* metrics.counter("user_created_total")
      const histogram = yield* metrics.histogram("user_create_duration_seconds")
      const start = Date.now()

      // CurrentUser is request-scoped - yield it inside the method, not at layer construction
      // RPC middleware provides CurrentUser for protected routes
      // Job processors must provide SystemUserLayer for background processing
      const currentUser = yield* CurrentUser

      yield* logger.info("UserService.create", {
        input,
        userId: currentUser.id
      })

      // If your schema has createdBy/updatedBy fields, you can enrich the input:
      // const enrichedInput = { ...input, createdBy: currentUser.id, updatedBy: currentUser.id }

      // Errors bubble up with full type information
      const result = yield* repo.create(input)

      yield* counter.increment
      yield* logger.info("User created", {
        id: result.id,
        userId: currentUser.id
      })

      // Record duration and publish event after successful operation
      yield* histogram.record((Date.now() - start) / 1000)
      yield* eventTopic.publish({ type: "UserCreated" as const, id: result.id, timestamp: new Date() }).pipe(
        Effect.catchAll((error) => Effect.logWarning("Event publishing failed", { error }))
      )

      return result
    }).pipe(Effect.withSpan("UserService.create")),

  update: (id: string, input: UserUpdateInput) =>
    Effect.gen(function*() {
      const counter = yield* metrics.counter("user_updated_total")
      const histogram = yield* metrics.histogram("user_update_duration_seconds")
      const start = Date.now()

      // CurrentUser is request-scoped - yield it inside the method
      const currentUser = yield* CurrentUser

      yield* logger.info("UserService.update", {
        id,
        input,
        userId: currentUser.id
      })

      // If your schema has updatedBy field, you can enrich the input:
      // const enrichedInput = { ...input, updatedBy: currentUser.id }

      // First check if entity exists - fail with domain error if not found
      const existing = yield* repo.findById(id)
      if (Option.isNone(existing)) {
        yield* logger.debug("User not found for update", { id })
        return yield* Effect.fail(new UserNotFoundError({
          message: `User not found: ${id}`,
          userId: id
        }))
      }

      // Repository update operation
      const result = yield* repo.update(id, input)

      yield* counter.increment
      yield* logger.info("User updated", {
        id,
        userId: currentUser.id
      })

      // Record duration and publish event after successful operation
      yield* histogram.record((Date.now() - start) / 1000)
      yield* eventTopic.publish({ type: "UserUpdated" as const, id: result.id, timestamp: new Date() }).pipe(
        Effect.catchAll((error) => Effect.logWarning("Event publishing failed", { error }))
      )

      return result
    }).pipe(Effect.withSpan("UserService.update", { attributes: { id } })),

  delete: (id: string) =>
    Effect.gen(function*() {
      const counter = yield* metrics.counter("user_deleted_total")
      const histogram = yield* metrics.histogram("user_delete_duration_seconds")
      const start = Date.now()

      // CurrentUser is request-scoped - yield it inside the method
      const currentUser = yield* CurrentUser

      yield* logger.info("UserService.delete", {
        id,
        userId: currentUser.id
      })

      // First check if entity exists - fail with domain error if not found
      const existing = yield* repo.findById(id)
      if (Option.isNone(existing)) {
        yield* logger.debug("User not found for delete", { id })
        return yield* Effect.fail(new UserNotFoundError({
          message: `User not found: ${id}`,
          userId: id
        }))
      }

      // Optional: Add authorization check
      // if (currentUser) {
      //   // Check if user has permission to delete this entity
      //   if (existing.value.ownerId !== currentUser.id) {
      //     return yield* Effect.fail(new UserPermissionError({
      //       message: "Not authorized to delete this user",
      //       operation: "delete"
      //     }))
      //   }
      // }

      // Repository delete operation
      yield* repo.delete(id)

      yield* counter.increment
      yield* logger.info("User deleted", {
        id,
        userId: currentUser.id
      })

      // Record duration and publish event after successful operation
      yield* histogram.record((Date.now() - start) / 1000)
      yield* eventTopic.publish({ type: "UserDeleted" as const, id, timestamp: new Date() }).pipe(
        Effect.catchAll((error) => Effect.logWarning("Event publishing failed", { error }))
      )
    }).pipe(Effect.withSpan("UserService.delete", { attributes: { id } })),

  exists: (id: string) =>
    Effect.gen(function*() {
      yield* logger.debug("UserService.exists", { id })

      // Errors bubble up with full type information
      return yield* repo.exists(id)
    }).pipe(Effect.withSpan("UserService.exists", { attributes: { id } }))
})
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
   * Authentication Context:
   * - CurrentUser is request-scoped and must be yielded inside service methods
   * - DO NOT yield CurrentUser at layer construction (layers are memoized/shared)
   * - Service methods that need CurrentUser will have it in their Effect requirements
   *
   * Requires: UserRepository, LoggingService, MetricsService, PubsubService
   *
   * Service method requirements (inferred):
   * - create/update/delete: Effect<Entity, Errors, CurrentUser | DatabaseService>
   * - get/findByCriteria/count: Effect<Entity, Errors, DatabaseService>
   *
   * CurrentUser is provided at call site by:
   * - RPC middleware for protected HTTP routes (per-request)
   * - SystemUserLayer for background job processing
   */
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function*() {
      const repo = yield* UserRepository
      const logger = yield* LoggingService
      const metrics = yield* MetricsService
      const pubsub = yield* PubsubService
      const eventTopic = yield* pubsub.topic("user-events", UserEventSchema)

      // DO NOT yield CurrentUser here - it's request-scoped, not application-scoped
      // Service methods yield CurrentUser inside to get fresh context per call
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
  static readonly Test = this.Live

  /**
   * Dev layer - Development with enhanced logging
   *
   * Same as Live - enhanced logging comes from LoggingService.Dev
   * when composing layers for development environment.
   */
  static readonly Dev = this.Live

  /**
   * Auto layer - Environment-aware layer selection
   *
   * Automatically selects the appropriate layer based on env.NODE_ENV:
   * - "production" → Live layer
   * - "development" → Dev layer (with logging)
   * - "test" → Test layer
   * - undefined/other → Live layer (default)
   */
  static readonly Auto = Layer.suspend(() => {
    switch (env.NODE_ENV) {
      case "test":
        return UserService.Test
      case "development":
        return UserService.Dev
      default:
        return UserService.Live
    }
  })

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