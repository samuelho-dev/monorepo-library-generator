/**
 * Feature Layers Template Definition
 *
 * Declarative template for generating server/layers.ts in feature libraries.
 * Creates Effect layer compositions for different environments.
 *
 * @module monorepo-library-generator/templates/definitions/feature/layers
 */

import type { TemplateDefinition } from '../../core/types'

/**
 * Feature Layers Template Definition
 *
 * Generates a complete layers.ts file with:
 * - Infrastructure layer compositions (Live, Dev, Test)
 * - Feature layer compositions
 * - Auto layer with environment detection
 *
 * Uses raw content for complex Layer.mergeAll expressions.
 */
export const featureLayersTemplate: TemplateDefinition = {
  id: 'feature/layers',
  meta: {
    title: '{className} Layers',
    description: `Layer composition for {propertyName} feature.

Provides different layer implementations for different environments:
- Live: Production with all infrastructure
- Test: Testing with in-memory infrastructure
- Dev: Development with local infrastructure
- Auto: Automatically selects based on NODE_ENV`,
    module: '{scope}/feature-{fileName}/server'
  },
  imports: [
    { from: 'effect', items: ['Layer'] },
    { from: '{scope}/env', items: ['env'] },
    { from: './service', items: ['{className}Service'] },
    { from: '{scope}/data-access-{fileName}', items: ['{className}Repository'] },
    { from: '{scope}/infra-database', items: ['DatabaseService'] },
    { from: '{scope}/infra-observability', items: ['LoggingService', 'MetricsService'] },
    { from: '{scope}/infra-cache', items: ['CacheService'] },
    { from: '{scope}/infra-pubsub', items: ['PubsubService'] }
  ],
  sections: [
    // Service Layer Notes
    {
      title: 'Service Layer Notes',
      content: {
        type: 'raw',
        value: `/**
 * Service Layer Pattern:
 *
 * Event/job publishing is handled INSIDE the service implementation
 * using inline publish calls. This keeps the layer composition simple
 * and the event logic explicit.
 *
 * @see {className}Service.Live - service implementation with events
 */`
      }
    },

    // Infrastructure Layers Section
    {
      title: 'Composed Infrastructure Layers',
      content: {
        type: 'raw',
        value: `/**
 * Live infrastructure layer
 *
 * Production infrastructure with:
 * - DatabaseService.Live: PostgreSQL/MySQL connection pool
 * - LoggingService.Live: Structured JSON logging
 * - MetricsService.Live: Prometheus metrics
 * - CacheService.Live: Redis caching
 * - PubsubService.Live: Event publishing
 */
export const InfrastructureLive = Layer.mergeAll(
  DatabaseService.Live,
  LoggingService.Live,
  MetricsService.Live,
  CacheService.Live,
  PubsubService.Live
)`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * Development infrastructure layer
 *
 * Local development with verbose logging.
 */
export const InfrastructureDev = Layer.mergeAll(
  DatabaseService.Dev,
  LoggingService.Dev,
  MetricsService.Dev,
  CacheService.Dev,
  PubsubService.Dev
)`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * Test infrastructure layer
 *
 * Testing with mocked infrastructure.
 */
export const InfrastructureTest = Layer.mergeAll(
  DatabaseService.Test,
  LoggingService.Test,
  MetricsService.Test,
  CacheService.Test,
  PubsubService.Test
)`
      }
    },

    // Full Feature Layers Section
    {
      title: 'Full Feature Layers',
      content: {
        type: 'raw',
        value: `/**
 * Full Live Layer for production
 *
 * Includes all {propertyName} feature layers with live infrastructure:
 * - {className}Service.Live (event publishing in service implementation)
 * - {className}Repository.Live
 * - All infrastructure services
 *
 * @example
 * \`\`\`typescript
 * const program = Effect.gen(function*() {
 *   const service = yield* {className}Service;
 *   const entity = yield* service.create({ name: "test" })
 * })
 *
 * program.pipe(Effect.provide({className}FeatureLive))
 * \`\`\`
 */
export const {className}FeatureLive = Layer.mergeAll(
  {className}Service.Live,
  {className}Repository.Live
).pipe(Layer.provide(InfrastructureLive))`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * Full Test Layer for testing
 *
 * Uses {className}Service.Live with test infrastructure.
 * Events are published to test pubsub service.
 *
 * @example
 * \`\`\`typescript
 * describe("{className}Service", () => {
 *   it("should create entity", () =>
 *     Effect.gen(function*() {
 *       const service = yield* {className}Service;
 *       const result = yield* service.create({ name: "test" })
 *       expect(result).toBeDefined()
 *     }).pipe(Effect.provide({className}FeatureTest))
 *   )
 * })
 * \`\`\`
 */
export const {className}FeatureTest = Layer.mergeAll(
  {className}Service.Live,
  {className}Repository.Live
).pipe(Layer.provide(InfrastructureTest))`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * Full Dev Layer for development
 *
 * Uses local services with verbose logging and debugging enabled.
 */
export const {className}FeatureDev = Layer.mergeAll(
  {className}Service.Live,
  {className}Repository.Live
).pipe(Layer.provide(InfrastructureDev))`
      }
    },

    // Auto Layer Section
    {
      title: 'Environment-Aware Layer',
      content: {
        type: 'raw',
        value: `/**
 * Auto-selecting layer based on NODE_ENV
 *
 * Automatically selects the appropriate layer:
 * - "production" → Live layer
 * - "development" → Dev layer
 * - "test" → Test layer
 * - undefined/other → Live layer (default)
 *
 * @example
 * \`\`\`typescript
 * // Uses appropriate layer based on NODE_ENV
 * program.pipe(Effect.provide({className}FeatureAuto))
 * \`\`\`
 */
export const {className}FeatureAuto = Layer.suspend(() => {
  switch (env.NODE_ENV) {
    case "test":
      return {className}FeatureTest
    case "development":
      return {className}FeatureDev
    default:
      return {className}FeatureLive
  }
})`
      }
    }
  ]
}

export default featureLayersTemplate
