/**
 * CQRS Projections Builder Template
 *
 * Generates server/cqrs/projections/builder.ts with projection building utilities.
 *
 * @module monorepo-library-generator/feature/cqrs/projections-builder-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { FeatureTemplateOptions } from "../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

/**
 * Generate server/cqrs/projections/builder.ts file
 *
 * Creates projection builder for read model updates:
 * - Event-driven projection updates
 * - Materialized view patterns
 * - Integration with PubsubService for event sourcing
 */
export function generateProjectionsBuilderFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, name, propertyName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Projection Builder`,
    description: `Builds and maintains ${name} read model projections.

Projections are read-optimized views of data built from domain events.
They enable efficient queries without impacting write performance.

Pattern: Event → Projection Handler → Read Model

Usage:
- Subscribe to domain events
- Update read models based on event type
- Rebuild projections on demand`,
    module: `${options.packageName}/server/cqrs/projections`
  })
  builder.addBlankLine()

  builder.addImports([{ from: "effect", imports: ["Context", "Effect", "Layer", "Queue", "Schema"] }])
  builder.addBlankLine()

  builder.addSectionComment("Domain Events")
  builder.addImports([
    {
      from: `${scope}/contract-${fileName}`,
      imports: [`${className}CreatedEvent`, `${className}DeletedEvent`, `${className}UpdatedEvent`]
    },
    {
      from: `${scope}/contract-${fileName}`,
      imports: [`${className}Event`],
      isTypeOnly: true
    }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Infrastructure Services")
  builder.addImports([
    { from: `${scope}/infra-pubsub`, imports: ["PubsubService"] },
    { from: `${scope}/infra-observability`, imports: ["LoggingService", "MetricsService"] }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Projection Types")
  builder.addBlankLine()

  builder.addRaw(`/**
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
}`)
  builder.addBlankLine()

  builder.addSectionComment("Projection Builder Interface")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Projection Builder Interface
 *
 * Manages read model projections from domain events.
 */
export interface ProjectionBuilderInterface<TModel> {
  /**
   * Process a domain event and update projections
   */
  readonly processEvent: (event: ${className}Event) => Effect.Effect<void>

  /**
   * Start consuming events from the message broker
   */
  readonly startProjecting: () => Effect.Effect<void>

  /**
   * Rebuild all projections from event history
   */
  readonly rebuild: (events: ReadonlyArray<${className}Event>) => Effect.Effect<void>

  /**
   * Get current projection state
   */
  readonly getProjection: (id: string) => Effect.Effect<TModel | null>
}`)
  builder.addBlankLine()

  builder.addSectionComment("Default Read Model")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Default ${className} read model
 *
 * Customize this type based on your query needs.
 */
export interface ${className}ReadModel {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly version: number;
  readonly data: Record<string, unknown>
}`)
  builder.addBlankLine()

  builder.addSectionComment("Projection Builder Implementation")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Create projection builder with dependencies
 */
const createProjectionBuilderImpl = (
  pubsub: Context.Tag.Service<typeof PubsubService>,
  logger: Context.Tag.Service<typeof LoggingService>,
  metrics: Context.Tag.Service<typeof MetricsService>,
  store: ReadModelStore<${className}ReadModel>
) => {
  const processEvent = (event: ${className}Event) =>
    Effect.gen(function*() {
      const counter = yield* metrics.counter("${name.toLowerCase()}_projections_processed_total")

      yield* logger.debug("Processing projection event", {
        eventType: event.metadata.eventType,
        correlationId: event.metadata.correlationId,
      })

      // Extract ID from event payload - branded string is assignable to string
      const id = String(event.payload.id)
      const current = yield* store.get(id)
      const occurredAt = event.metadata.occurredAt ?? new Date()

      // Use eventType for discrimination
      switch (event.metadata.eventType) {
        case "${className}CreatedEvent":
          yield* store.save(id, {
            id,
            createdAt: occurredAt,
            updatedAt: occurredAt,
            version: event.aggregate.aggregateVersion,
            data: {}
          })
          break;
        case "${className}UpdatedEvent":
          if (current) {
            yield* store.save(id, {
              ...current,
              updatedAt: occurredAt,
              version: event.aggregate.aggregateVersion,
            })
          }
          break;
        case "${className}DeletedEvent":
          yield* store.delete(id)
          break;
      }

      yield* counter.increment
      yield* logger.info("Projection updated", {
        eventType: event.metadata.eventType,
        entityId: id,
      })
    }).pipe(
      Effect.withSpan("${className}Projection.processEvent", {
        attributes: {
          eventType: event.metadata.eventType,
        },
      })
    )

  // Create event schema for topic subscription
  const ${className}EventSchema = Schema.Union(
    ${className}CreatedEvent,
    ${className}UpdatedEvent,
    ${className}DeletedEvent
  )

  return {
    processEvent,

    startProjecting: () =>
      Effect.gen(function*() {
        yield* logger.info("Starting ${className} projection consumer")

        // Create topic and subscribe to events with scoped subscription
        const topic = yield* pubsub.topic("${propertyName}.events", ${className}EventSchema)

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

    rebuild: (events: ReadonlyArray<${className}Event>) =>
      Effect.gen(function*() {
        yield* logger.info(\`Rebuilding projections from \${events.length} events\`)

        for (const event of events) {
          yield* processEvent(event)
        }

        yield* logger.info("Projection rebuild complete")
      }),

    getProjection: (id: string) => store.get(id)
  }
};`)
  builder.addBlankLine()

  builder.addSectionComment("Projection Builder Context.Tag")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} Projection Builder Context Tag
 *
 * Provides projection management via Context.
 *
 * @example
 * \`\`\`typescript
 * const program = Effect.gen(function*() {
 *   const projections = yield* ${className}ProjectionBuilder;
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
 * \`\`\`
 */
export class ${className}ProjectionBuilder extends Context.Tag("${className}ProjectionBuilder")<
  ${className}ProjectionBuilder,
  ProjectionBuilderInterface<${className}ReadModel>
>() {
  /**
   * Create Live layer with custom store
   */
  static Live(store: ReadModelStore<${className}ReadModel>) {
    return Layer.effect(
      this,
      Effect.gen(function*() {
        const pubsub = yield* PubsubService;
        const logger = yield* LoggingService;
        const metrics = yield* MetricsService
        return createProjectionBuilderImpl(pubsub, logger, metrics, store)
      })
    )
  }

  /**
   * In-memory store for testing
   */
  static readonly InMemoryStore: ReadModelStore<${className}ReadModel> = (() => {
    const store = new Map<string, ${className}ReadModel>()
    return {
      get: (id) => Effect.succeed(store.get(id) ?? null),
      save: (id, model) => Effect.sync(() => { store.set(id, model) }),
      delete: (id) => Effect.sync(() => { store.delete(id) }),
    }
  })()

  /**
   * Test layer with in-memory store
   */
  static readonly Test = this.Live(this.InMemoryStore)
}`)

  return builder.toString()
}

/**
 * Generate server/cqrs/projections/index.ts file
 */
export function generateProjectionsIndexFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className } = options

  builder.addFileHeader({
    title: `${className} CQRS Projections Index`,
    description: "Barrel export for CQRS projections.",
    module: `${options.packageName}/server/cqrs/projections`
  })
  builder.addBlankLine()

  builder.addRaw(`export { ${className}ProjectionBuilder } from "./builder"

export type {
  ProjectionHandler,
  ProjectionDefinition,
  ReadModelStore,
  ProjectionBuilderInterface,
  ${className}ReadModel
} from "./builder"`)

  return builder.toString()
}
