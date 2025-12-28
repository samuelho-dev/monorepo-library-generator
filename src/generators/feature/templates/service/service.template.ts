/**
 * Feature Service Template
 *
 * Generates server/services/service.ts with Context.Tag definition
 *
 * @module monorepo-library-generator/feature/service/service-template
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder'
import type { FeatureTemplateOptions } from '../../../../utils/types'
import { WORKSPACE_CONFIG } from '../../../../utils/workspace-config'

/**
 * Generate server/services/service.ts file
 *
 * Creates Context.Tag interface with static layers
 * Includes LoggingService and MetricsService integration
 */
export function generateFeatureServiceFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, name } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Service Interface`,
    description: `Context.Tag definition for ${className}Service.

Includes:
- LoggingService for structured logging
- MetricsService for observability
- Distributed tracing via Effect.withSpan()

Operations are split into separate files for optimal tree-shaking.
Import only the operations you need for smallest bundle size.`,
    module: `${scope}/feature-${fileName}/server/services`
  })

  builder.addImports([
    { from: 'effect', imports: ['Effect', 'Layer', 'Context', 'Option', 'Schema'] },
    { from: 'effect/ParseResult', imports: ['ParseError'], isTypeOnly: true },
    { from: `${scope}/env`, imports: ['env'] }
  ])

  builder.addSectionComment('Error Imports (Contract-First)')
  builder.addComment(
    'Domain errors from contract - only import errors that are thrown by service methods'
  )

  // Domain errors from contract (only NotFoundError is actually thrown by service)
  builder.addImports([
    {
      from: `${scope}/contract-${fileName}`,
      imports: [`${className}NotFoundError`]
    }
  ])

  builder.addSectionComment('Repository Integration')
  builder.addImports([
    { from: `${scope}/data-access-${fileName}`, imports: [`${className}Repository`] },
    { from: `${scope}/infra-database`, imports: ['DatabaseService'] }
  ])

  builder.addSectionComment('Infrastructure Services')
  builder.addImports([
    { from: `${scope}/infra-observability`, imports: ['LoggingService', 'MetricsService'] },
    { from: `${scope}/infra-pubsub`, imports: ['PubsubService'] },
    { from: `${scope}/infra-pubsub`, imports: ['TopicHandle'], isTypeOnly: true }
  ])

  builder.addSectionComment('Authentication Context')
  builder.addComment(
    'CurrentUser is request-scoped - yield inside methods, NOT at layer construction'
  )
  builder.addComment(
    'Service methods that need auth will have CurrentUser in their Effect requirements'
  )
  builder.addComment('RPC middleware provides CurrentUser for protected routes (per-request)')
  builder.addComment('Job processors must provide SystemUserLayer for background processing')
  builder.addImports([{ from: `${scope}/contract-auth`, imports: ['CurrentUser'] }])

  // Note: Environment checking uses process.env directly for Auto layer

  builder.addSectionComment('Repository Type Re-exports')

  builder.addImports([
    {
      from: `${scope}/data-access-${fileName}`,
      imports: [
        `${className}`,
        `${className}CreateInput`,
        `${className}UpdateInput`,
        `${className}Filter`
      ],
      isTypeOnly: true
    }
  ])
  builder.addRaw(`
export type { ${className}, ${className}CreateInput, ${className}UpdateInput, ${className}Filter }
`)

  builder.addSectionComment('Event Schema')

  builder.addRaw(`/**
 * ${className} Event Schema
 *
 * Used with withEventPublishing helper for type-safe event publishing.
 */
const ${className}EventSchema = Schema.Union(
  Schema.Struct({
    type: Schema.Literal("${className}Created"),
    id: Schema.String,
    timestamp: Schema.DateFromSelf
  }),
  Schema.Struct({
    type: Schema.Literal("${className}Updated"),
    id: Schema.String,
    timestamp: Schema.DateFromSelf
  }),
  Schema.Struct({
    type: Schema.Literal("${className}Deleted"),
    id: Schema.String,
    timestamp: Schema.DateFromSelf
  })
)

type ${className}Event = Schema.Schema.Type<typeof ${className}EventSchema>`)

  builder.addSectionComment('Service Implementation')

  builder.addRaw(`/**
 * Create service implementation
 *
 * Contract-First Error Handling:
 * - Repository throws domain errors (${className}NotFoundError, etc.) from contract
 * - Repository throws infrastructure errors (TimeoutError, ConnectionError) from data-access
 * - Service layer lets errors bubble up with full type information
 * - Handler layer (RPC) catches and maps to RPC-specific errors
 *
 * Return types are INFERRED - do not add explicit return types as they hide errors.
 */
const createServiceImpl = (
  repo: Context.Tag.Service<typeof ${className}Repository>,
  logger: Context.Tag.Service<typeof LoggingService>,
  metrics: Context.Tag.Service<typeof MetricsService>,
  eventTopic: TopicHandle<${className}Event, ParseError>
) => ({
  get: (id: string) =>
    Effect.gen(function*() {
      const histogram = yield* metrics.histogram("${name.toLowerCase()}_get_duration_seconds")
      const start = Date.now()

      yield* logger.debug("${className}Service.get", { id })

      const result = yield* repo.findById(id)

      if (Option.isNone(result)) {
        yield* logger.debug("${className} not found", { id })
        return yield* Effect.fail(new ${className}NotFoundError({
          message: \`${className} not found: \${id}\`,
          ${name}Id: id
        }))
      }

      // Record duration after successful operation
      yield* histogram.record((Date.now() - start) / 1000)

      return result.value
    }).pipe(Effect.withSpan("${className}Service.get", { attributes: { id } })),

  findByCriteria: (
    criteria: ${className}Filter,
    offset: number,
    limit: number
  ) =>
    Effect.gen(function*() {
      const histogram = yield* metrics.histogram("${name.toLowerCase()}_list_duration_seconds")
      const start = Date.now()

      yield* logger.debug("${className}Service.findByCriteria", {
        criteria,
        offset,
        limit
      })

      // Errors bubble up with full type information
      const result = yield* repo.findAll(criteria, { skip: offset, limit }).pipe(
        Effect.map((r) => r.items)
      )

      yield* logger.debug("${className}Service.findByCriteria completed", {
        count: result.length
      })

      // Record duration after successful operation
      yield* histogram.record((Date.now() - start) / 1000)

      return result
    }).pipe(Effect.withSpan("${className}Service.findByCriteria")),

  count: (criteria: ${className}Filter) =>
    Effect.gen(function*() {
      yield* logger.debug("${className}Service.count", { criteria })

      // Errors bubble up with full type information
      return yield* repo.count(criteria)
    }).pipe(Effect.withSpan("${className}Service.count")),

  create: (input: ${className}CreateInput) =>
    Effect.gen(function*() {
      const counter = yield* metrics.counter("${name.toLowerCase()}_created_total")
      const histogram = yield* metrics.histogram("${name.toLowerCase()}_create_duration_seconds")
      const start = Date.now()

      // CurrentUser is request-scoped - yield it inside the method, not at layer construction
      // RPC middleware provides CurrentUser for protected routes
      // Job processors must provide SystemUserLayer for background processing
      const currentUser = yield* CurrentUser

      yield* logger.info("${className}Service.create", {
        input,
        userId: currentUser.id
      })

      // If your schema has createdBy/updatedBy fields, you can enrich the input:
      // const enrichedInput = { ...input, createdBy: currentUser.id, updatedBy: currentUser.id }

      // Errors bubble up with full type information
      const result = yield* repo.create(input)

      yield* counter.increment
      yield* logger.info("${className} created", {
        id: result.id,
        userId: currentUser.id
      })

      // Record duration and publish event after successful operation
      yield* histogram.record((Date.now() - start) / 1000)
      yield* eventTopic.publish({ type: "${className}Created" as const, id: result.id, timestamp: new Date() }).pipe(
        Effect.catchAll((error) => Effect.logWarning("Event publishing failed", { error }))
      )

      return result
    }).pipe(Effect.withSpan("${className}Service.create")),

  update: (id: string, input: ${className}UpdateInput) =>
    Effect.gen(function*() {
      const counter = yield* metrics.counter("${name.toLowerCase()}_updated_total")
      const histogram = yield* metrics.histogram("${name.toLowerCase()}_update_duration_seconds")
      const start = Date.now()

      // CurrentUser is request-scoped - yield it inside the method
      const currentUser = yield* CurrentUser

      yield* logger.info("${className}Service.update", {
        id,
        input,
        userId: currentUser.id
      })

      // If your schema has updatedBy field, you can enrich the input:
      // const enrichedInput = { ...input, updatedBy: currentUser.id }

      // First check if entity exists - fail with domain error if not found
      const existing = yield* repo.findById(id)
      if (Option.isNone(existing)) {
        yield* logger.debug("${className} not found for update", { id })
        return yield* Effect.fail(new ${className}NotFoundError({
          message: \`${className} not found: \${id}\`,
          ${name}Id: id
        }))
      }

      // Repository update operation
      const result = yield* repo.update(id, input)

      yield* counter.increment
      yield* logger.info("${className} updated", {
        id,
        userId: currentUser.id
      })

      // Record duration and publish event after successful operation
      yield* histogram.record((Date.now() - start) / 1000)
      yield* eventTopic.publish({ type: "${className}Updated" as const, id: result.id, timestamp: new Date() }).pipe(
        Effect.catchAll((error) => Effect.logWarning("Event publishing failed", { error }))
      )

      return result
    }).pipe(Effect.withSpan("${className}Service.update", { attributes: { id } })),

  delete: (id: string) =>
    Effect.gen(function*() {
      const counter = yield* metrics.counter("${name.toLowerCase()}_deleted_total")
      const histogram = yield* metrics.histogram("${name.toLowerCase()}_delete_duration_seconds")
      const start = Date.now()

      // CurrentUser is request-scoped - yield it inside the method
      const currentUser = yield* CurrentUser

      yield* logger.info("${className}Service.delete", {
        id,
        userId: currentUser.id
      })

      // First check if entity exists - fail with domain error if not found
      const existing = yield* repo.findById(id)
      if (Option.isNone(existing)) {
        yield* logger.debug("${className} not found for delete", { id })
        return yield* Effect.fail(new ${className}NotFoundError({
          message: \`${className} not found: \${id}\`,
          ${name}Id: id
        }))
      }

      // Optional: Add authorization check
      // if (currentUser) {
      //   // Check if user has permission to delete this entity
      //   if (existing.value.ownerId !== currentUser.id) {
      //     return yield* Effect.fail(new ${className}PermissionError({
      //       message: "Not authorized to delete this ${name}",
      //       operation: "delete"
      //     }))
      //   }
      // }

      // Repository delete operation
      yield* repo.delete(id)

      yield* counter.increment
      yield* logger.info("${className} deleted", {
        id,
        userId: currentUser.id
      })

      // Record duration and publish event after successful operation
      yield* histogram.record((Date.now() - start) / 1000)
      yield* eventTopic.publish({ type: "${className}Deleted" as const, id, timestamp: new Date() }).pipe(
        Effect.catchAll((error) => Effect.logWarning("Event publishing failed", { error }))
      )
    }).pipe(Effect.withSpan("${className}Service.delete", { attributes: { id } })),

  exists: (id: string) =>
    Effect.gen(function*() {
      yield* logger.debug("${className}Service.exists", { id })

      // Errors bubble up with full type information
      return yield* repo.exists(id)
    }).pipe(Effect.withSpan("${className}Service.exists", { attributes: { id } }))
})`)

  builder.addSectionComment('Service Interface (Inferred from Implementation)')

  builder.addRaw(`/**
 * ${className} Service Interface
 *
 * The interface type is INFERRED from the implementation (createServiceImpl).
 * This ensures the interface always matches the actual implementation types,
 * including proper Effect requirements and error types.
 */
export type ${className}ServiceInterface = ReturnType<typeof createServiceImpl>`)

  builder.addSectionComment('Context.Tag')

  builder.addRaw(`/**
 * ${className} Service Context.Tag
 *
 * Effect's Context.Tag pattern validates at compile-time that the Layer
 * provides an object matching ${className}ServiceInterface.
 *
 * Event publishing is handled inline using withEventPublishing helper.
 */
export class ${className}Service extends Context.Tag("${className}Service")<
  ${className}Service,
  ${className}ServiceInterface
>() {
  /**
   * Live layer - Production implementation
   *
   * Events are published inline using withEventPublishing helper:
   * - create() → ${className}Created
   * - update() → ${className}Updated
   * - delete() → ${className}Deleted
   *
   * Authentication Context:
   * - CurrentUser is request-scoped and must be yielded inside service methods
   * - DO NOT yield CurrentUser at layer construction (layers are memoized/shared)
   * - Service methods that need CurrentUser will have it in their Effect requirements
   *
   * Requires: ${className}Repository, LoggingService, MetricsService, PubsubService
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
      const repo = yield* ${className}Repository
      const logger = yield* LoggingService
      const metrics = yield* MetricsService
      const pubsub = yield* PubsubService
      const eventTopic = yield* pubsub.topic("${name.toLowerCase()}-events", ${className}EventSchema)

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
        return ${className}Service.Test
      case "development":
        return ${className}Service.Dev
      default:
        return ${className}Service.Live
    }
  })

  /**
   * Fully composed layer with all production dependencies
   */
  static readonly Layer = ${className}Service.Live.pipe(
    Layer.provide(${className}Repository.Live),
    Layer.provide(DatabaseService.Live),
    Layer.provide(LoggingService.Live),
    Layer.provide(MetricsService.Live),
    Layer.provide(PubsubService.Live)
  )

  /**
   * Test composed layer with test infrastructure
   */
  static readonly TestLayer = ${className}Service.Test.pipe(
    Layer.provide(${className}Repository.Test),
    Layer.provide(DatabaseService.Test),
    Layer.provide(LoggingService.Test),
    Layer.provide(MetricsService.Test),
    Layer.provide(PubsubService.Test)
  )
}`)

  // NOTE: Sub-module re-exports removed - biome noBarrelFile compliance
  // Consumers should import directly from sub-module directories:
  // import { AuthenticationService } from "./authentication/service"
  // import { ProfileService } from "./profile/service"

  return builder.toString()
}
