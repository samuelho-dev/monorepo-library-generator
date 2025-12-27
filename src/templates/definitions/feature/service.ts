/**
 * Feature Service Template Definition
 *
 * Declarative template for generating server/services/service.ts in feature libraries.
 * Creates Context.Tag definition with service implementation.
 *
 * @module monorepo-library-generator/templates/definitions/feature/service
 */

import type { TemplateDefinition } from '../../core/types'

/**
 * Feature Service Template Definition
 *
 * Generates a complete service.ts file with:
 * - Service implementation (createServiceImpl)
 * - Context.Tag with Live, Dev, Test, Auto layers
 * - Event publishing integration
 * - Authentication context (CurrentUser)
 * - Full observability (logging, metrics, tracing)
 *
 * Uses raw content for complex Effect.gen patterns with JavaScript template literals.
 */
export const featureServiceTemplate: TemplateDefinition = {
  id: 'feature/service',
  meta: {
    title: '{className} Service Interface',
    description: `Context.Tag definition for {className}Service.

Includes:
- LoggingService for structured logging
- MetricsService for observability
- Distributed tracing via Effect.withSpan()

Operations are split into separate files for optimal tree-shaking.
Import only the operations you need for smallest bundle size.`,
    module: '{scope}/feature-{fileName}/server/services'
  },
  imports: [
    { from: 'effect', items: ['Effect', 'Layer', 'Context', 'Option', 'Schema'] },
    { from: 'effect/ParseResult', items: ['ParseError'], isTypeOnly: true },
    { from: '{scope}/env', items: ['env'] },
    { from: '{scope}/contract-{fileName}', items: ['{className}NotFoundError'] },
    { from: '{scope}/data-access-{fileName}', items: ['{className}Repository'] },
    { from: '{scope}/infra-database', items: ['DatabaseService'] },
    { from: '{scope}/infra-observability', items: ['LoggingService', 'MetricsService'] },
    { from: '{scope}/infra-pubsub', items: ['PubsubService'] },
    { from: '{scope}/infra-pubsub', items: ['TopicHandle'], isTypeOnly: true },
    { from: '{scope}/contract-auth', items: ['CurrentUser'] },
    {
      from: '{scope}/data-access-{fileName}',
      items: [
        '{className}',
        '{className}CreateInput',
        '{className}UpdateInput',
        '{className}Filter'
      ],
      isTypeOnly: true
    }
  ],
  sections: [
    // Type Re-exports
    {
      title: 'Repository Type Re-exports',
      content: {
        type: 'raw',
        value: `export type { {className}, {className}CreateInput, {className}UpdateInput, {className}Filter }`
      }
    },

    // Event Schema
    {
      title: 'Event Schema',
      content: {
        type: 'raw',
        value: `/**
 * {className} Event Schema
 *
 * Used with PubsubService for type-safe event publishing.
 */
const {className}EventSchema = Schema.Union(
  Schema.Struct({
    type: Schema.Literal("{className}Created"),
    id: Schema.String,
    timestamp: Schema.DateFromSelf
  }),
  Schema.Struct({
    type: Schema.Literal("{className}Updated"),
    id: Schema.String,
    timestamp: Schema.DateFromSelf
  }),
  Schema.Struct({
    type: Schema.Literal("{className}Deleted"),
    id: Schema.String,
    timestamp: Schema.DateFromSelf
  })
)

type {className}Event = Schema.Schema.Type<typeof {className}EventSchema>`
      }
    },

    // Service Implementation
    {
      title: 'Service Implementation',
      content: {
        type: 'raw',
        value: `/**
 * Create service implementation
 *
 * Contract-First Error Handling:
 * - Repository throws domain errors ({className}NotFoundError, etc.) from contract
 * - Repository throws infrastructure errors (TimeoutError, ConnectionError) from data-access
 * - Service layer lets errors bubble up with full type information
 * - Handler layer (RPC) catches and maps to RPC-specific errors
 *
 * Return types are INFERRED - do not add explicit return types as they hide errors.
 */
const createServiceImpl = (
  repo: Context.Tag.Service<typeof {className}Repository>,
  logger: Context.Tag.Service<typeof LoggingService>,
  metrics: Context.Tag.Service<typeof MetricsService>,
  eventTopic: TopicHandle<{className}Event, ParseError>
) => ({
  get: (id: string) =>
    Effect.gen(function*() {
      const histogram = yield* metrics.histogram("{propertyName}_get_duration_seconds")
      const start = Date.now()

      yield* logger.debug("{className}Service.get", { id })

      const result = yield* repo.findById(id)

      if (Option.isNone(result)) {
        yield* logger.debug("{className} not found", { id })
        return yield* Effect.fail(new {className}NotFoundError({
          message: \`{className} not found: \${id}\`,
          {propertyName}Id: id
        }))
      }

      yield* histogram.record((Date.now() - start) / 1000)

      return result.value
    }).pipe(Effect.withSpan("{className}Service.get", { attributes: { id } })),

  findByCriteria: (
    criteria: {className}Filter,
    offset: number,
    limit: number
  ) =>
    Effect.gen(function*() {
      const histogram = yield* metrics.histogram("{propertyName}_list_duration_seconds")
      const start = Date.now()

      yield* logger.debug("{className}Service.findByCriteria", {
        criteria,
        offset,
        limit
      })

      const result = yield* repo.findAll(criteria, { skip: offset, limit }).pipe(
        Effect.map((r) => r.items)
      )

      yield* logger.debug("{className}Service.findByCriteria completed", {
        count: result.length
      })

      yield* histogram.record((Date.now() - start) / 1000)

      return result
    }).pipe(Effect.withSpan("{className}Service.findByCriteria")),

  count: (criteria: {className}Filter) =>
    Effect.gen(function*() {
      yield* logger.debug("{className}Service.count", { criteria })

      return yield* repo.count(criteria)
    }).pipe(Effect.withSpan("{className}Service.count")),

  create: (input: {className}CreateInput) =>
    Effect.gen(function*() {
      const counter = yield* metrics.counter("{propertyName}_created_total")
      const histogram = yield* metrics.histogram("{propertyName}_create_duration_seconds")
      const start = Date.now()

      const currentUser = yield* CurrentUser

      yield* logger.info("{className}Service.create", {
        input,
        userId: currentUser.id
      })

      const result = yield* repo.create(input)

      yield* counter.increment
      yield* logger.info("{className} created", {
        id: result.id,
        userId: currentUser.id
      })

      yield* histogram.record((Date.now() - start) / 1000)
      yield* eventTopic.publish({ type: "{className}Created" as const, id: result.id, timestamp: new Date() }).pipe(
        Effect.catchAll((error) => Effect.logWarning("Event publishing failed", { error }))
      )

      return result
    }).pipe(Effect.withSpan("{className}Service.create")),

  update: (id: string, input: {className}UpdateInput) =>
    Effect.gen(function*() {
      const counter = yield* metrics.counter("{propertyName}_updated_total")
      const histogram = yield* metrics.histogram("{propertyName}_update_duration_seconds")
      const start = Date.now()

      const currentUser = yield* CurrentUser

      yield* logger.info("{className}Service.update", {
        id,
        input,
        userId: currentUser.id
      })

      const existing = yield* repo.findById(id)
      if (Option.isNone(existing)) {
        yield* logger.debug("{className} not found for update", { id })
        return yield* Effect.fail(new {className}NotFoundError({
          message: \`{className} not found: \${id}\`,
          {propertyName}Id: id
        }))
      }

      const result = yield* repo.update(id, input)

      yield* counter.increment
      yield* logger.info("{className} updated", {
        id,
        userId: currentUser.id
      })

      yield* histogram.record((Date.now() - start) / 1000)
      yield* eventTopic.publish({ type: "{className}Updated" as const, id: result.id, timestamp: new Date() }).pipe(
        Effect.catchAll((error) => Effect.logWarning("Event publishing failed", { error }))
      )

      return result
    }).pipe(Effect.withSpan("{className}Service.update", { attributes: { id } })),

  delete: (id: string) =>
    Effect.gen(function*() {
      const counter = yield* metrics.counter("{propertyName}_deleted_total")
      const histogram = yield* metrics.histogram("{propertyName}_delete_duration_seconds")
      const start = Date.now()

      const currentUser = yield* CurrentUser

      yield* logger.info("{className}Service.delete", {
        id,
        userId: currentUser.id
      })

      const existing = yield* repo.findById(id)
      if (Option.isNone(existing)) {
        yield* logger.debug("{className} not found for delete", { id })
        return yield* Effect.fail(new {className}NotFoundError({
          message: \`{className} not found: \${id}\`,
          {propertyName}Id: id
        }))
      }

      yield* repo.delete(id)

      yield* counter.increment
      yield* logger.info("{className} deleted", {
        id,
        userId: currentUser.id
      })

      yield* histogram.record((Date.now() - start) / 1000)
      yield* eventTopic.publish({ type: "{className}Deleted" as const, id, timestamp: new Date() }).pipe(
        Effect.catchAll((error) => Effect.logWarning("Event publishing failed", { error }))
      )
    }).pipe(Effect.withSpan("{className}Service.delete", { attributes: { id } })),

  exists: (id: string) =>
    Effect.gen(function*() {
      yield* logger.debug("{className}Service.exists", { id })

      return yield* repo.exists(id)
    }).pipe(Effect.withSpan("{className}Service.exists", { attributes: { id } }))
})`
      }
    },

    // Service Interface Type
    {
      title: 'Service Interface (Inferred from Implementation)',
      content: {
        type: 'raw',
        value: `/**
 * {className} Service Interface
 *
 * The interface type is INFERRED from the implementation (createServiceImpl).
 * This ensures the interface always matches the actual implementation types,
 * including proper Effect requirements and error types.
 */
export type {className}ServiceInterface = ReturnType<typeof createServiceImpl>`
      }
    },

    // Context.Tag
    {
      title: 'Context.Tag',
      content: {
        type: 'raw',
        value: `/**
 * {className} Service Context.Tag
 *
 * Effect's Context.Tag pattern validates at compile-time that the Layer
 * provides an object matching {className}ServiceInterface.
 *
 * Authentication Context:
 * - CurrentUser is request-scoped and must be yielded inside service methods
 * - DO NOT yield CurrentUser at layer construction (layers are memoized/shared)
 * - Service methods that need CurrentUser will have it in their Effect requirements
 */
export class {className}Service extends Context.Tag("{className}Service")<
  {className}Service,
  {className}ServiceInterface
>() {
  /**
   * Live layer - Production implementation
   *
   * Events are published inline:
   * - create() → {className}Created
   * - update() → {className}Updated
   * - delete() → {className}Deleted
   *
   * Requires: {className}Repository, LoggingService, MetricsService, PubsubService
   */
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function*() {
      const repo = yield* {className}Repository
      const logger = yield* LoggingService
      const metrics = yield* MetricsService
      const pubsub = yield* PubsubService
      const eventTopic = yield* pubsub.topic("{propertyName}-events", {className}EventSchema)

      return createServiceImpl(repo, logger, metrics, eventTopic)
    })
  )

  /**
   * Test layer - Same as Live
   *
   * Testing is done by composing with test infrastructure layers.
   */
  static readonly Test = this.Live

  /**
   * Dev layer - Development with enhanced logging
   *
   * Same as Live - enhanced logging comes from LoggingService.Dev.
   */
  static readonly Dev = this.Live

  /**
   * Auto layer - Environment-aware layer selection
   *
   * Automatically selects based on process.env.NODE_ENV:
   * - "production" → Live layer
   * - "development" → Dev layer
   * - "test" → Test layer
   */
  static readonly Auto = Layer.suspend(() => {
    switch (env.NODE_ENV) {
      case "test":
        return {className}Service.Test
      case "development":
        return {className}Service.Dev
      default:
        return {className}Service.Live
    }
  })

  /**
   * Fully composed layer with all production dependencies
   */
  static readonly Layer = {className}Service.Live.pipe(
    Layer.provide({className}Repository.Live),
    Layer.provide(DatabaseService.Live),
    Layer.provide(LoggingService.Live),
    Layer.provide(MetricsService.Live),
    Layer.provide(PubsubService.Live)
  )

  /**
   * Test composed layer with test infrastructure
   */
  static readonly TestLayer = {className}Service.Test.pipe(
    Layer.provide({className}Repository.Test),
    Layer.provide(DatabaseService.Test),
    Layer.provide(LoggingService.Test),
    Layer.provide(MetricsService.Test),
    Layer.provide(PubsubService.Test)
  )
}`
      }
    }
  ]
}

export default featureServiceTemplate
