import { UserCreatedEvent, UserDeletedEvent, UserUpdatedEvent } from "@samuelho-dev/contract-user"
import type { UserEvent } from "@samuelho-dev/contract-user"
import { LoggingService, MetricsService } from "@samuelho-dev/infra-observability"
import { PubsubService, type TopicHandle } from "@samuelho-dev/infra-pubsub"
import { Context, Effect, Layer, Schema } from "effect"
import type { ParseResult } from "effect"

/**
 * User Event Publisher
 *
 * Publishes user domain events via PubsubService.

Features:
- Publishes CreatedEvent, UpdatedEvent, DeletedEvent
- Automatic correlation ID propagation
- Metrics and logging for observability
- Distributed tracing via Effect.withSpan()

Usage:
- Inject into service layer for event-driven operations
- All writes should publish corresponding events
 *
 * @module @samuelho-dev/feature-user/server/events/publisher
 */


// ============================================================================
// Domain Events
// ============================================================================

// Create Schema.Union for PubSub topic registration
const UserEventSchema = Schema.Union(
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent
)


// ============================================================================
// Infrastructure Services
// ============================================================================

// ============================================================================
// Publisher Configuration
// ============================================================================

/**
 * Topic configuration for user events
 */
export const UserEventTopics = {
  /** Topic for all user events */
  ALL: "user.events",

  /** Topic for created events only */
  CREATED: "user.events.created",

  /** Topic for updated events only */
  UPDATED: "user.events.updated",

  /** Topic for deleted events only */
  DELETED: "user.events.deleted"
} as const

// ============================================================================
// Publisher Interface
// ============================================================================

/**
 * User Event Publisher Interface
 *
 * Provides methods to publish domain events to the message broker.
 * Methods can fail with ParseError if event schema validation fails.
 */
export interface UserEventPublisherInterface {
  /**
   * Publish a created event
   */
  readonly publishCreated: (
    event: UserCreatedEvent
  ) => Effect.Effect<void, ParseResult.ParseError>

  /**
   * Publish an updated event
   */
  readonly publishUpdated: (
    event: UserUpdatedEvent
  ) => Effect.Effect<void, ParseResult.ParseError>

  /**
   * Publish a deleted event
   */
  readonly publishDeleted: (
    event: UserDeletedEvent
  ) => Effect.Effect<void, ParseResult.ParseError>

  /**
   * Publish any domain event (auto-routes to correct topic)
   */
  readonly publish: (
    event: UserEvent
  ) => Effect.Effect<void, ParseResult.ParseError>
}


// ============================================================================
// Publisher Implementation
// ============================================================================

/**
 * Topic handles for user events
 *
 * Created during layer initialization and stored for publishing.
 * TopicHandle<T, E> where:
 * - T: message type
 * - E: error type (ParseError for Schema validation)
 */
interface UserTopicHandles {
  readonly all: TopicHandle<UserEvent, ParseResult.ParseError>
  readonly created: TopicHandle<UserEvent, ParseResult.ParseError>
  readonly updated: TopicHandle<UserEvent, ParseResult.ParseError>
  readonly deleted: TopicHandle<UserEvent, ParseResult.ParseError>
}

/**
 * Create publisher implementation with topic handles
 */
const createPublisherImpl = (
  topics: UserTopicHandles,
  logger: Context.Tag.Service<typeof LoggingService>,
  metrics: Context.Tag.Service<typeof MetricsService>
) => {
  const publishToTopic = (
    topic: TopicHandle<UserEvent, ParseResult.ParseError>,
    topicName: string,
    event: UserEvent
  ) =>
    Effect.gen(function*() {
      const counter = yield* metrics.counter("user_events_published_total")

      yield* logger.debug("Publishing user event", {
        eventType: event.metadata.eventType,
        topic: topicName,
        correlationId: event.metadata.correlationId
      })

      // Publish to specific topic
      yield* topic.publish(event)

      // Also publish to the "all events" topic for aggregators
      if (topic !== topics.all) {
        yield* topics.all.publish(event)
      }

      yield* counter.increment

      yield* logger.info("User event published", {
        eventType: event.metadata.eventType,
        topic: topicName,
        correlationId: event.metadata.correlationId
      })
    }).pipe(
      Effect.withSpan("UserEventPublisher.publish", {
        attributes: {
          topic: topicName,
          eventType: event.metadata.eventType
        }
      })
    )

  return {
    publishCreated: (event: UserCreatedEvent) =>
      publishToTopic(topics.created, UserEventTopics.CREATED, event),

    publishUpdated: (event: UserUpdatedEvent) =>
      publishToTopic(topics.updated, UserEventTopics.UPDATED, event),

    publishDeleted: (event: UserDeletedEvent) =>
      publishToTopic(topics.deleted, UserEventTopics.DELETED, event),

    publish: (event: UserEvent) => {
      // Use eventType field for discrimination (defined in EventMetadata schema)
      switch (event.metadata.eventType) {
        case "UserCreatedEvent":
          return publishToTopic(topics.created, UserEventTopics.CREATED, event)
        case "UserUpdatedEvent":
          return publishToTopic(topics.updated, UserEventTopics.UPDATED, event)
        case "UserDeletedEvent":
          return publishToTopic(topics.deleted, UserEventTopics.DELETED, event)
        default:
          // Fallback for any future event types
          return publishToTopic(topics.all, UserEventTopics.ALL, event)
      }
    }
  }
}

// ============================================================================
// Context.Tag
// ============================================================================

/**
 * User Event Publisher Context Tag
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function*() {
 *   const publisher = yield* UserEventPublisher;
 *
 *   // Publish a created event
 *   const event = new UserCreatedEvent({
 *     metadata: {
 *       eventType: "UserCreatedEvent",
 *       eventVersion: "1.0",
 *       occurredAt: new Date()
 *     },
 *     aggregate: {
 *       aggregateId: "uuid-123" as any,
 *       aggregateVersion: 1
 *     },
 *     payload: {
 *       id: "uuid-123" as any,
 *       createdAt: new Date()
 *     }
 *   })
 *
 *   yield* publisher.publishCreated(event)
 * })
 *
 * program.pipe(Effect.provide(UserEventPublisher.Live))
 * ```
 */
export class UserEventPublisher extends Context.Tag("UserEventPublisher")<
  UserEventPublisher,
  UserEventPublisherInterface
>() {
  /**
   * Live layer with PubsubService dependency
   *
   * Creates topic handles during initialization for type-safe publishing.
   */
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function*() {
      const pubsub = yield* PubsubService
      const logger = yield* LoggingService
      const metrics = yield* MetricsService

      // Create topic handles during layer initialization
      const topics: UserTopicHandles = {
        all: yield* pubsub.topic(UserEventTopics.ALL, UserEventSchema),
        created: yield* pubsub.topic(UserEventTopics.CREATED, UserEventSchema),
        updated: yield* pubsub.topic(UserEventTopics.UPDATED, UserEventSchema),
        deleted: yield* pubsub.topic(UserEventTopics.DELETED, UserEventSchema)
      }

      return createPublisherImpl(topics, logger, metrics)
    })
  )

  /**
   * Test layer (same as Live, but uses test infrastructure)
   */
  static readonly Test = this.Live
}

// ============================================================================
// Event Subscriber Helpers
// ============================================================================

/**
 * Create a subscription to user events
 *
 * Helper function to create event subscriptions with proper typing.
 * Uses the topic-based PubSub API.
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function*() {
 *   const pubsub = yield* PubsubService;
 *
 *   // Create topic handle and subscribe to all events
 *   const topic = yield* pubsub.topic(
 *     UserEventTopics.ALL,
 *     UserEventSchema
 *   )
 *
 *   yield* topic.subscribe((event) =>
 *     Effect.gen(function*() {
 *       console.log("Received event:", event.metadata.eventType)
 *     })
 *   )
 * })
 * ```
 */
export function createUserEventSubscription(
  pubsub: Context.Tag.Service<typeof PubsubService>,
  topicName: string = UserEventTopics.ALL
) {
  return pubsub.topic(topicName, UserEventSchema)
}
