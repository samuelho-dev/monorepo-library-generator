/**
 * Data Access Layers Template Definition
 *
 * Declarative template for generating server/layers.ts in data-access libraries.
 * Creates Effect layer compositions with infrastructure dependencies.
 *
 * @module monorepo-library-generator/templates/definitions/data-access/layers
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Data Access Layers Template Definition
 *
 * Generates a complete layers.ts file with:
 * - Infrastructure layer compositions (Live, Dev, Test)
 * - Domain layer compositions (Repository layers)
 * - Auto layer with environment detection
 *
 * Uses raw content for complex Layer.mergeAll expressions.
 */
export const dataAccessLayersTemplate: TemplateDefinition = {
  id: "data-access/layers",
  meta: {
    title: "{className} Data Access Layers",
    description: `Effect layer compositions for {propertyName} data access.

Provides different layer implementations for different environments:
- Live: Production with all infrastructure
- Dev: Development with local infrastructure
- Test: Testing with in-memory/mock infrastructure
- Auto: Automatically selects based on NODE_ENV`,
    module: "{scope}/data-access-{fileName}/server"
  },
  imports: [
    { from: "effect", items: ["Layer"] },
    { from: "{scope}/env", items: ["env"] },
    { from: "{scope}/infra-database", items: ["DatabaseService"] },
    { from: "{scope}/infra-observability", items: ["LoggingService", "MetricsService"] },
    { from: "{scope}/infra-cache", items: ["CacheService"] },
    { from: "./{fileName}-repository", items: ["{className}Repository"] }
  ],
  sections: [
    // Infrastructure Layers Section
    {
      title: "Infrastructure Layers",
      content: {
        type: "raw",
        value: `/**
 * Live infrastructure layer
 *
 * Production infrastructure with:
 * - DatabaseService.Live: PostgreSQL/MySQL connection pool
 * - LoggingService.Live: Structured JSON logging
 * - MetricsService.Live: Prometheus metrics
 * - CacheService.Live: Redis caching
 */
export const InfrastructureLive = Layer.mergeAll(
  DatabaseService.Live,
  LoggingService.Live,
  MetricsService.Live,
  CacheService.Live
)`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Development infrastructure layer
 *
 * Local development with verbose logging:
 * - DatabaseService.Dev: Local database
 * - LoggingService.Dev: Pretty console logging
 * - MetricsService.Dev: Console metrics
 * - CacheService.Dev: In-memory cache
 */
export const InfrastructureDev = Layer.mergeAll(
  DatabaseService.Dev,
  LoggingService.Dev,
  MetricsService.Dev,
  CacheService.Dev
)`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Test infrastructure layer
 *
 * Testing with mocked infrastructure:
 * - DatabaseService.Test: In-memory SQLite
 * - LoggingService.Test: Silent logging
 * - MetricsService.Test: No-op metrics
 * - CacheService.Test: In-memory cache
 */
export const InfrastructureTest = Layer.mergeAll(
  DatabaseService.Test,
  LoggingService.Test,
  MetricsService.Test,
  CacheService.Test
)`
      }
    },

    // Domain Layers Section
    {
      title: "Domain Layers",
      content: {
        type: "raw",
        value: `/**
 * Live data access layer
 *
 * Production repository with live infrastructure.
 *
 * @example
 * \`\`\`typescript
 * const program = Effect.gen(function*() {
 *   const repo = yield* {className}Repository
 *   const entity = yield* repo.findById("123")
 * })
 *
 * program.pipe(Effect.provide({className}DataAccessLive))
 * \`\`\`
 */
export const {className}DataAccessLive = Layer.mergeAll(
  {className}Repository.Live
).pipe(Layer.provide(InfrastructureLive))`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Development data access layer
 *
 * Repository with dev infrastructure (local database, verbose logging).
 */
export const {className}DataAccessDev = Layer.mergeAll(
  {className}Repository.Live
).pipe(Layer.provide(InfrastructureDev))`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Test data access layer
 *
 * Repository with test infrastructure (in-memory database).
 *
 * @example
 * \`\`\`typescript
 * describe("{className}Repository", () => {
 *   it("should find by id", () =>
 *     Effect.gen(function*() {
 *       const repo = yield* {className}Repository
 *       const result = yield* repo.findById("123")
 *       expect(result).toBeDefined()
 *     }).pipe(Effect.provide({className}DataAccessTest))
 *   )
 * })
 * \`\`\`
 */
export const {className}DataAccessTest = Layer.mergeAll(
  {className}Repository.Live
).pipe(Layer.provide(InfrastructureTest))`
      }
    },

    // Auto Layer Section
    {
      title: "Environment-Aware Layer",
      content: {
        type: "raw",
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
 * program.pipe(Effect.provide({className}DataAccessAuto))
 * \`\`\`
 */
export const {className}DataAccessAuto = Layer.suspend(() => {
  switch (env.NODE_ENV) {
    case "test":
      return {className}DataAccessTest
    case "development":
      return {className}DataAccessDev
    default:
      return {className}DataAccessLive
  }
})`
      }
    }
  ]
}

export default dataAccessLayersTemplate
