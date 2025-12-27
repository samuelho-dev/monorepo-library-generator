/**
 * Infrastructure Server Layers Template Definition
 *
 * Declarative template for generating lib/layers.ts in infrastructure libraries.
 * Contains server-side layer compositions.
 *
 * @module monorepo-library-generator/templates/definitions/infra/server-layers
 */

import type { TemplateDefinition } from '../../core/types'

/**
 * Infrastructure Server Layers Template Definition
 *
 * Generates a layers.ts file with:
 * - Development layer with extra logging
 * - Auto layer with environment detection
 * - Custom configuration layer factory
 * - Advanced pattern examples
 */
export const infraServerLayersTemplate: TemplateDefinition = {
  id: 'infra/server-layers',
  meta: {
    title: '{className} Service Layers',
    description: `Layer compositions for server-side dependency injection using Effect.
Provides additional layer variants for different environments and use cases.

NOTE: The primary Live and Test layers are now static members of {className}Service
(see ../service/service.ts). This file provides optional additional layer variants.`,
    module: '{scope}/infra-{fileName}/layers'
  },
  imports: [
    { from: 'effect', items: ['Layer', 'Effect', 'Option'] },
    { from: './service', items: ['{className}Service'] },
    { from: '{scope}/env', items: ['env'] }
  ],
  sections: [
    // Primary Layers Comment
    {
      title: 'Primary Layers (Available as Static Members)',
      content: {
        type: 'raw',
        value: `//
// The primary Live and Test layers are defined as static members of {className}Service:
//
// - {className}Service.Live: Production layer with full implementation
// - {className}Service.Test: Test layer with mock implementation
//
// Usage:
// \`\`\`typescript
// const program = Effect.gen(function*() {
//   const service = yield* {className}Service;
//   return yield* service.get("id")
// }).pipe(
//   Effect.provide({className}Service.Live)  // Use static Live layer
// )
// \`\`\``
      }
    },
    // Development Layer
    {
      title: 'Development Layer (Optional)',
      content: {
        type: 'raw',
        value: `/**
 * Development Layer
 *
 * Optional layer with extra logging and debugging for local development.
 * Use this layer during local development to see detailed operation logs.
 *
 * LAYER TYPE SELECTION:
 * - Uses Layer.effect (NOT Layer.scoped) for simple dependency injection
 * - Only use Layer.scoped when you have resources requiring cleanup
 *
 * @example
 * \`\`\`typescript
 * const program = Effect.gen(function*() {
 *   const service = yield* {className}Service
 *   return yield* service.get("id")
 * }).pipe(
 *   Effect.provide({className}ServiceDev)
 * )
 * \`\`\`
 */
export const {className}ServiceDev = Layer.effect(
  {className}Service,
  Effect.gen(function*() {
    yield* Effect.logInfo("[{className}] Development layer initialized")

    return {
      get: (id: string) =>
        Effect.gen(function*() {
          yield* Effect.logDebug(\`[{className}] DEV GET id=\${id}\`)
          return Option.none()
        }),
      findByCriteria: (
        criteria: Record<string, unknown>,
        skip?: number,
        limit?: number
      ) =>
        Effect.gen(function*() {
          yield* Effect.logDebug("[{className}] DEV findByCriteria", { criteria, skip, limit })
          return []
        }),
      create: (input: Record<string, unknown>) =>
        Effect.gen(function*() {
          yield* Effect.logDebug("[{className}] DEV create", input)
          return { id: "dev-id", ...input }
        }),
      update: (id: string, input: Record<string, unknown>) =>
        Effect.gen(function*() {
          yield* Effect.logDebug(\`[{className}] DEV update id=\${id}\`, input)
          return { id, ...input }
        }),
      delete: (id: string) =>
        Effect.gen(function*() {
          yield* Effect.logDebug(\`[{className}] DEV delete id=\${id}\`)
        }),
      healthCheck: () =>
        Effect.gen(function*() {
          yield* Effect.logDebug("[{className}] DEV healthCheck")
          return true
        })
    }
  })
)`
      }
    },
    // Auto Layer
    {
      title: 'Auto Layer (Environment Detection)',
      content: {
        type: 'raw',
        value: `/**
 * Automatic Layer Selection
 *
 * Selects appropriate layer based on NODE_ENV environment variable.
 * Uses Layer.suspend for lazy evaluation.
 *
 * Environment mapping:
 * - NODE_ENV=production → {className}Service.Live
 * - NODE_ENV=test → {className}Service.Test
 * - NODE_ENV=development (default) → {className}ServiceDev
 *
 * @example
 * \`\`\`typescript
 * const program = Effect.gen(function*() {
 *   const service = yield* {className}Service
 *   return yield* service.get("id")
 * }).pipe(
 *   Effect.provide({className}ServiceAuto)
 * )
 * \`\`\`
 */
export const {className}ServiceAuto = Layer.suspend(() => {
  switch (env.NODE_ENV) {
    case "production":
      return {className}Service.Live
    case "test":
      return {className}Service.Test
    default:
      return {className}ServiceDev
  }
})`
      }
    },
    // Custom Configuration Layer
    {
      title: 'Advanced Pattern Examples',
      content: {
        type: 'raw',
        value: `/**
 * Example: Layer with Custom Configuration
 *
 * Shows how to create a layer variant with custom configuration overrides.
 * Useful for testing specific scenarios or non-standard environments.
 */
export const {className}ServiceCustom = (customConfig: {
  timeout?: number
  retries?: number
}) =>
  Layer.scoped(
    {className}Service,
    Effect.gen(function*() {
      const defaults = {
        timeout: 5000,
        retries: 3,
        ...customConfig
      }

      yield* Effect.logInfo("[{className}] Custom layer initialized with", defaults)

      return {
        get: (id: string) =>
          Effect.gen(function*() {
            yield* Effect.logDebug(\`[{className}] GET id=\${id} with \${defaults.timeout}ms timeout\`)
            return Option.none()
          }),
        findByCriteria: (
          criteria: Record<string, unknown>,
          skip?: number,
          limit?: number
        ) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[{className}] findByCriteria", { criteria, skip, limit })
            return []
          }),
        create: (input: Record<string, unknown>) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[{className}] create", input)
            return { id: "custom-id", ...input }
          }),
        update: (id: string, input: Record<string, unknown>) =>
          Effect.gen(function*() {
            yield* Effect.logDebug(\`[{className}] update id=\${id}\`, input)
            return { id, ...input }
          }),
        delete: (id: string) =>
          Effect.gen(function*() {
            yield* Effect.logDebug(\`[{className}] delete id=\${id}\`)
          }),
        healthCheck: () => Effect.succeed(true)
      }
    })
  )`
      }
    }
  ]
}

export default infraServerLayersTemplate
