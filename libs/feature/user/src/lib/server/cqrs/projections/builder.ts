import { UserCreatedEvent, UserDeletedEvent, UserUpdatedEvent } from "@samuelho-dev/contract-user"
import type { UserEvent } from "@samuelho-dev/contract-user"
import { LoggingService, MetricsService } from "@samuelho-dev/infra-observability"
import { PubsubService } from "@samuelho-dev/infra-pubsub"
import { Context, Effect, Layer, Queue, Schema } from "effect"

/**
 * User Projection Builder
 *
 * Builds and maintains user read model projections.

Projections are read-optimized views of data built from domain events.
They enable efficient queries without impacting write performance.

Pattern: Event → Projection Handler → Read Model

Usage:
- Subscribe to domain events
- Update read models based on event type
- Rebuild projections on demand
 *
 * @module @samuelho-dev/feature-user/server/cqrs/projections
 */

// ============================================================================
// Domain Events
// ============================================================================

// ============================================================================
// Infrastructure Services
// ============================================================================

// ============================================================================
// Projection Types
// ============================================================================

/**
 * Projection handler function type
 */
export type ProjectionHandler<TEvent, TModel> = (
  event: TEvent,
  currentModel: TModel | null
) => Effect.Effect<TModel>

/**
 * Projection definition
 */
export interface ProjectionDefinition<TEvent, TModel> {
  /** Unique projection name */
  readonly name: string
  /** Event type this projection handles */
  readonly eventType: string
  /** Handler function */
  readonly handler: ProjectionHandler<TEvent, TModel>
}

/**
 * Read model storage interface
 */
export interface ReadModelStore<T> {
  /** Get a model by ID */
  readonly get: (id: string) => Effect.Effect<T | null>

  /** Save a model */
  readonly save: (id: string, model: T) => Effect.Effect<void>

  /** Delete a model */
  readonly delete: (id: string) => Effect.Effect<void>
}

// ============================================================================
// Projection Builder Interface
// ============================================================================

/**
 * Projection Builder Interface
 *
 * Manages read model projections from domain events.
 */
export interface ProjectionBuilderInterface<TModel> {
  /**
   * Process a domain event and update projections
   */
  readonly processEvent: (event: UserEvent) => Effect.Effect<void>

  /**
   * Start consuming events from the message broker
   */
  readonly startProjecting: () => Effect.Effect<void>

  /**
   * Rebuild all projections from event history
   */
  readonly rebuild: (events: ReadonlyArray<UserEvent>) => Effect.Effect<void>

  /**
   * Get current projection state
   */
  readonly getProjection: (id: string) => Effect.Effect<TModel | null>
}

// ============================================================================
// Default Read Model
// ============================================================================

/**
 * Default User read model
 *
 * Customize this type based on your query needs.
 */
export interface UserReadModel {
  readonly id: string
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly version: number
  readonly data: Record<string, unknown>
}

// ============================================================================
// Projection Builder Implementation
// ============================================================================

/**
 * Create projection builder with dependencies
 */
const createProjectionBuilderImpl = (
  pubsub: Context.Tag.Service<typeof PubsubService>,
  logger: Context.Tag.Service<typeof LoggingService>,
  metrics: Context.Tag.Service<typeof MetricsService>,
  store: ReadModelStore<UserReadModel>
) => {
  const processEvent = (event: UserEvent) =>
    Effect.gen(function*() {
      const counter = yield* metrics.counter("user_projections_processed_total")

      yield* logger.debug("Processing projection event", {
        eventType: event.metadata.eventType,
        correlationId: event.metadata.correlationId
      })

      // Extract ID from event payload
      const id = event.payload.id as string
      const current = yield* store.get(id)
      const occurredAt = event.metadata.occurredAt ?? new Date()

      // Use eventType for discrimination
      switch (event.metadata.eventType) {
        case "UserCreatedEvent":
          yield* store.save(id, {
            id,
            createdAt: occurredAt,
            updatedAt: occurredAt,
            version: event.aggregate.aggregateVersion,
            data: {}
          })
          break
        case "UserUpdatedEvent":
          if (current) {
            yield* store.save(id, {
              ...current,
              updatedAt: occurredAt,
              version: event.aggregate.aggregateVersion
            })
          }
          break
        case "UserDeletedEvent":
          yield* store.delete(id)
          break
      }

      yield* counter.increment
      yield* logger.info("Projection updated", {
        eventType: event.metadata.eventType,
        entityId: id
      })
    }).pipe(
      Effect.withSpan("UserProjection.processEvent", {
        attributes: {
          eventType: event.metadata.eventType
        }
      })
    )

  // Create event schema for topic subscription
  const UserEventSchema = Schema.Union(
    UserCreatedEvent,
    UserUpdatedEvent,
    UserDeletedEvent
  )

  return {
    processEvent,

    startProjecting: () =>
      Effect.gen(function*() {
        yield* logger.info("Starting User projection consumer")

        // Create topic and subscribe to events with scoped subscription
        const topic = yield* pubsub.topic("user.events", UserEventSchema)

        // Use Effect.scoped to handle the Scope requirement internally
        yield* Effect.scoped(
          Effect.gen(function*() {
            const subscription = yield* topic.subscribe

            // Process events in background
            yield* Effect.forkDaemon(
              Effect.forever(
                Effect.gen(function*() {
                  const event = yield* Queue.take(subscription)
                  yield* processEvent(event)
                })
              )
            )
          })
        )
      }),

    rebuild: (events: ReadonlyArray<UserEvent>) =>
      Effect.gen(function*() {
        yield* logger.info(`Rebuilding projections from ${events.length} events`)

        for (const event of events) {
          yield* processEvent(event)
        }

        yield* logger.info("Projection rebuild complete")
      }),

    getProjection: (id: string) => store.get(id)
  }
}

// ============================================================================
// Projection Builder Context.Tag
// ============================================================================

/**
 * User Projection Builder Context Tag
 *
 * Provides projection management via Context.
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function*() {
 *   const projections = yield* UserProjectionBuilder;
 *
 *   // Start consuming events
 *   yield* projections.startProjecting()
 *
 *   // Or manually process an event
 *   yield* projections.processEvent(event)
 *
 *   // Query the projection
 *   const model = yield* projections.getProjection("entity-123")
 * })
 * ```
 */
export class UserProjectionBuilder extends Context.Tag("UserProjectionBuilder")<
  UserProjectionBuilder,
  ProjectionBuilderInterface<UserReadModel>
>() {
  /**
   * Create Live layer with custom store
   */
  static Live(store: ReadModelStore<UserReadModel>) {
    return Layer.effect(
      this,
      Effect.gen(function*() {
        const pubsub = yield* PubsubService
        const logger = yield* LoggingService
        const metrics = yield* MetricsService
        return createProjectionBuilderImpl(pubsub, logger, metrics, store)
      })
    )
  }

  /**
   * In-memory store for testing
   */
  static readonly InMemoryStore: ReadModelStore<UserReadModel> = (() => {
    const store = new Map<string, UserReadModel>()
    return {
      get: (id) => Effect.succeed(store.get(id) ?? null),
      save: (id, model) =>
        Effect.sync(() => {
          store.set(id, model)
        }),
      delete: (id) =>
        Effect.sync(() => {
          store.delete(id)
        })
    }
  })()

  /**
   * Test layer with in-memory store
   */
  static readonly Test = this.Live(this.InMemoryStore)
}
