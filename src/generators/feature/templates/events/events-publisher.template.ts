/**
 * Feature Events Publisher Template
 *
 * Generates server/events/publisher.ts with domain event publishing via PubsubService.
 *
 * @module monorepo-library-generator/feature/events/events-publisher-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { FeatureTemplateOptions } from "../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

/**
 * Generate server/events/publisher.ts file
 *
 * Creates event publisher for domain events with:
 * - Integration with PubsubService from infra-pubsub
 * - LoggingService for event tracking
 * - MetricsService for event telemetry
 * - Effect.withSpan() for distributed tracing
 */
export function generateEventsPublisherFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, name, propertyName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Event Publisher`,
    description: `Publishes ${name} domain events via PubsubService.

Features:
- Publishes CreatedEvent, UpdatedEvent, DeletedEvent
- Automatic correlation ID propagation
- Metrics and logging for observability
- Distributed tracing via Effect.withSpan()

Usage:
- Inject into service layer for event-driven operations
- All writes should publish corresponding events`,
    module: `${scope}/feature-${fileName}/server/events/publisher`
  })
  builder.addBlankLine()

  builder.addImports([
    { from: "effect", imports: ["Context", "Effect", "Layer", "Schema"] },
    { from: "effect", imports: ["ParseResult"], isTypeOnly: true }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Domain Events")
  builder.addImports([
    {
      from: `${scope}/contract-${fileName}`,
      imports: [`${className}CreatedEvent`, `${className}DeletedEvent`, `${className}UpdatedEvent`]
    },
    { from: `${scope}/contract-${fileName}`, imports: [`${className}DomainEvent`], isTypeOnly: true }
  ])
  builder.addBlankLine()

  builder.addComment("Create Schema.Union for PubSub topic registration")
  builder.addRaw(`const ${className}DomainEventSchema = Schema.Union(
  ${className}CreatedEvent,
  ${className}UpdatedEvent,
  ${className}DeletedEvent
)
`)
  builder.addBlankLine()

  builder.addSectionComment("Infrastructure Services")
  builder.addImports([
    { from: `${scope}/infra-pubsub`, imports: ["PubsubService", "type TopicHandle"] },
    { from: `${scope}/infra-observability`, imports: ["LoggingService", "MetricsService"] }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Publisher Configuration")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Topic configuration for ${name} events
 */
export const ${className}EventTopics = {
  /** Topic for all ${name} events */
  ALL: "${propertyName}.events",

  /** Topic for created events only */
  CREATED: "${propertyName}.events.created",

  /** Topic for updated events only */
  UPDATED: "${propertyName}.events.updated",

  /** Topic for deleted events only */
  DELETED: "${propertyName}.events.deleted"
} as const`)
  builder.addBlankLine()

  builder.addSectionComment("Publisher Interface")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} Event Publisher Interface
 *
 * Provides methods to publish domain events to the message broker.
 */
export interface ${className}EventPublisherInterface {
  /**
   * Publish a created event
   */
  readonly publishCreated: (
    event: ${className}CreatedEvent
  ) => Effect.Effect<void>

  /**
   * Publish an updated event
   */
  readonly publishUpdated: (
    event: ${className}UpdatedEvent
  ) => Effect.Effect<void>

  /**
   * Publish a deleted event
   */
  readonly publishDeleted: (
    event: ${className}DeletedEvent
  ) => Effect.Effect<void>

  /**
   * Publish any domain event (auto-routes to correct topic)
   */
  readonly publish: (
    event: ${className}DomainEvent
  ) => Effect.Effect<void>
}
`)
  builder.addBlankLine()

  builder.addSectionComment("Publisher Implementation")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Topic handles for ${name} events
 *
 * Created during layer initialization and stored for publishing.
 * TopicHandle<T, E, R> where:
 * - T: message type
 * - E: error type (ParseError for Schema validation)
 * - R: context requirements (never for in-memory)
 */
interface ${className}TopicHandles {
  readonly all: TopicHandle<${className}DomainEvent, ParseResult.ParseError, never>
  readonly created: TopicHandle<${className}DomainEvent, ParseResult.ParseError, never>
  readonly updated: TopicHandle<${className}DomainEvent, ParseResult.ParseError, never>
  readonly deleted: TopicHandle<${className}DomainEvent, ParseResult.ParseError, never>
}

/**
 * Create publisher implementation with topic handles
 */
const createPublisherImpl = (
  topics: ${className}TopicHandles,
  logger: Context.Tag.Service<typeof LoggingService>,
  metrics: Context.Tag.Service<typeof MetricsService>
) => {
  const publishToTopic = (
    topic: TopicHandle<${className}DomainEvent, ParseResult.ParseError, never>,
    topicName: string,
    event: ${className}DomainEvent
  ) =>
    Effect.gen(function*() {
      const counter = yield* metrics.counter("${name.toLowerCase()}_events_published_total")

      yield* logger.debug("Publishing ${name} event", {
        eventType: event.eventType,
        topic: topicName,
        correlationId: event.correlationId
      })

      // Publish to specific topic
      yield* topic.publish(event)

      // Also publish to the "all events" topic for aggregators
      if (topic !== topics.all) {
        yield* topics.all.publish(event)
      }

      yield* counter.increment

      yield* logger.info("${className} event published", {
        eventType: event.eventType,
        topic: topicName,
        correlationId: event.correlationId
      })
    }).pipe(
      Effect.withSpan("${className}EventPublisher.publish", {
        attributes: {
          topic: topicName,
          eventType: event.eventType
        }
      })
    )

  return {
    publishCreated: (event: ${className}CreatedEvent) =>
      publishToTopic(topics.created, ${className}EventTopics.CREATED, event),

    publishUpdated: (event: ${className}UpdatedEvent) =>
      publishToTopic(topics.updated, ${className}EventTopics.UPDATED, event),

    publishDeleted: (event: ${className}DeletedEvent) =>
      publishToTopic(topics.deleted, ${className}EventTopics.DELETED, event),

    publish: (event: ${className}DomainEvent) => {
      // Use _tag discriminated union instead of instanceof
      switch (event._tag) {
        case "${className}CreatedEvent":
          return publishToTopic(topics.created, ${className}EventTopics.CREATED, event)
        case "${className}UpdatedEvent":
          return publishToTopic(topics.updated, ${className}EventTopics.UPDATED, event)
        case "${className}DeletedEvent":
          return publishToTopic(topics.deleted, ${className}EventTopics.DELETED, event)
        default:
          // Fallback for any future event types
          return publishToTopic(topics.all, ${className}EventTopics.ALL, event)
      }
    }
  }
}`)
  builder.addBlankLine()

  builder.addSectionComment("Context.Tag")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} Event Publisher Context Tag
 *
 * @example
 * \`\`\`typescript
 * const program = Effect.gen(function*() {
 *   const publisher = yield* ${className}EventPublisher;
 *
 *   // Publish a created event
 *   const event = ${className}CreatedEvent.create({
 *     ${propertyName}Id: "uuid-123",
 *     createdBy: "user-456",
 *   });
 *
 *   yield* publisher.publishCreated(event);
 * });
 *
 * program.pipe(Effect.provide(${className}EventPublisher.Live));
 * \`\`\`
 */
export class ${className}EventPublisher extends Context.Tag("${className}EventPublisher")<
  ${className}EventPublisher,
  ${className}EventPublisherInterface
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
      const topics: ${className}TopicHandles = {
        all: yield* pubsub.topic(${className}EventTopics.ALL, ${className}DomainEventSchema),
        created: yield* pubsub.topic(${className}EventTopics.CREATED, ${className}DomainEventSchema),
        updated: yield* pubsub.topic(${className}EventTopics.UPDATED, ${className}DomainEventSchema),
        deleted: yield* pubsub.topic(${className}EventTopics.DELETED, ${className}DomainEventSchema)
      }

      return createPublisherImpl(topics, logger, metrics)
    })
  )

  /**
   * Test layer (same as Live, but uses test infrastructure)
   */
  static readonly Test = this.Live
}`)
  builder.addBlankLine()

  builder.addSectionComment("Event Subscriber Helpers")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Create a subscription to ${name} events
 *
 * Helper function to create event subscriptions with proper typing.
 * Uses the topic-based PubSub API.
 *
 * @example
 * \`\`\`typescript
 * const program = Effect.gen(function*() {
 *   const pubsub = yield* PubsubService;
 *
 *   // Create topic handle and subscribe to all events
 *   const topic = yield* pubsub.topic(
 *     ${className}EventTopics.ALL,
 *     ${className}DomainEventSchema
 *   );
 *
 *   yield* topic.subscribe((event) =>
 *     Effect.gen(function*() {
 *       console.log("Received event:", event.eventType);
 *     })
 *   );
 * });
 * \`\`\`
 */
export function create${className}EventSubscription(
  pubsub: Context.Tag.Service<typeof PubsubService>,
  topicName: string = ${className}EventTopics.ALL
) {
  return pubsub.topic(topicName, ${className}DomainEventSchema)
}
`)

  return builder.toString()
}
