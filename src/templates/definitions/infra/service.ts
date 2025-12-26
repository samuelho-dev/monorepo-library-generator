/**
 * Infrastructure Service Template Definition
 *
 * Declarative template for generating service.ts in infra libraries.
 * Uses Effect 3.0+ Context.Tag pattern with inline interface.
 *
 * @module monorepo-library-generator/templates/definitions/infra/service
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Infrastructure Service Template Definition
 *
 * Generates a complete service.ts file with:
 * - Context.Tag with inline interface definition
 * - Static Live, Test, Dev, Auto layers
 * - CRUD operations (get, findByCriteria, create, update, delete)
 * - Health check endpoint
 * - In-memory baseline implementation
 */
export const infraServiceTemplate: TemplateDefinition = {
  id: "infra/service",
  meta: {
    title: "{className} Service",
    description: `Infrastructure service using Effect 3.0+ Context.Tag pattern.

Provides CRUD operations with dependency injection and resource management.
Customize resource initialization, dependencies, and error handling as needed.`,
    module: "{scope}/infra-{fileName}/service"
  },
  imports: [
    { from: "node:crypto", items: ["randomUUID"] },
    { from: "effect", items: ["Effect", "Layer", "Option", "Context"] },
    { from: "./errors", items: ["{className}InternalError", "{className}NotFoundError"] },
    { from: "./errors", items: ["{className}ServiceError"], isTypeOnly: true },
    { from: "{scope}/env", items: ["env"] }
  ],
  sections: [
    // Service Context.Tag Definition
    {
      title: "Service Context.Tag Definition with Inline Interface (Effect 3.0+)",
      content: {
        type: "raw",
        value: `/**
 * {className} Service
 *
 * Infrastructure service with Context.Tag pattern and static layers (Live, Test, Dev).
 * Provides CRUD operations, pagination, and health monitoring.
 */
export class {className}Service extends Context.Tag(
  "{scope}/infra-{fileName}/{className}Service"
)<
  {className}Service,
  {
    /**
     * Get item by ID
     *
     * @param id - Identifier for the item to retrieve
     * @returns Effect that succeeds with Option (None if not found)
     */
    readonly get: (id: string) => Effect.Effect<Option.Option<unknown>, {className}ServiceError, never>

    /**
     * Find items by criteria with pagination support
     *
     * @param criteria - Query criteria object
     * @param skip - Number of items to skip (pagination)
     * @param limit - Maximum items to return
     * @returns Effect that succeeds with array of items
     */
    readonly findByCriteria: (criteria: Record<string, unknown>, skip?: number, limit?: number) => Effect.Effect<readonly unknown[], {className}ServiceError, never>

    /**
     * Create new item
     *
     * @param input - Item data to create
     * @returns Effect that succeeds with created item
     */
    readonly create: (input: Record<string, unknown>) => Effect.Effect<unknown, {className}ServiceError, never>

    /**
     * Update existing item
     *
     * @param id - Item identifier
     * @param input - Updated data
     * @returns Effect that succeeds with updated item
     */
    readonly update: (id: string, input: Record<string, unknown>) => Effect.Effect<unknown, {className}ServiceError, never>

    /**
     * Delete item by ID
     *
     * @param id - Item identifier to delete
     * @returns Effect that succeeds when deleted
     */
    readonly delete: (id: string) => Effect.Effect<void, {className}ServiceError, never>

    /**
     * Health check for monitoring and readiness probes
     *
     * @returns Effect that succeeds with health status
     */
    readonly healthCheck: () => Effect.Effect<boolean, never>
  }
>() {`
      }
    },

    // Static Live Layer
    {
      content: {
        type: "raw",
        value: `  // ${"=".repeat(74)}
  // Static Live Layer (Effect 3.0+ Pattern)
  // ${"=".repeat(74)}

  /**
   * Live Layer - Production implementation
   *
   * Uses Layer.scoped for automatic resource cleanup.
   * Customize dependency injection and resource initialization.
   */
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function*() {
      // In-memory baseline implementation
      // TODO: Replace with actual infrastructure integration
      const store = new Map<string, unknown>()

      return {
        get: (id) =>
          Effect.sync(() => {
            const item = store.get(id)
            return item ? Option.some(item) : Option.none()
          }),

        findByCriteria: (_criteria, skip = 0, limit = 10) =>
          Effect.sync(() => {
            const items = Array.from(store.values())
            return items.slice(skip, skip + limit)
          }),

        create: (input) =>
          Effect.sync(() => {
            const id = randomUUID()
            const item = { id, ...input, createdAt: new Date(), updatedAt: new Date() }
            store.set(id, item)
            return item
          }),

        update: (id, input) =>
          Effect.gen(function*() {
            const existing = store.get(id)
            if (!existing) {
              return yield* Effect.fail(
                {className}NotFoundError.create(id, "Item")
              )
            }
            const updated = { ...(existing as object), ...input, updatedAt: new Date() }
            store.set(id, updated)
            return updated
          }),

        delete: (id) =>
          Effect.gen(function*() {
            if (!store.has(id)) {
              return yield* Effect.fail(
                {className}NotFoundError.create(id, "Item")
              )
            }
            store.delete(id)
          }),

        healthCheck: () => Effect.succeed(true)
      }
    })
  )`
      }
    },

    // Static Test Layer
    {
      content: {
        type: "raw",
        value: `  // ${"=".repeat(74)}
  // Static Test Layer
  // ${"=".repeat(74)}

  /**
   * Test Layer - In-memory implementation for testing
   *
   * Uses Layer.sync for deterministic testing with isolated state.
   */
  static readonly Test = Layer.sync(
    this,
    () => {
      const store = new Map<string, unknown>()
      let idCounter = 0

      return {
        get: (id) =>
          Effect.sync(() => {
            const item = store.get(id)
            return item ? Option.some(item) : Option.none()
          }),

        findByCriteria: (_criteria, skip = 0, limit = 10) =>
          Effect.sync(() => {
            const items = Array.from(store.values())
            return items.slice(skip, skip + limit)
          }),

        create: (input) =>
          Effect.sync(() => {
            const id = \`test-\${++idCounter}\`
            const item = { id, ...input, createdAt: new Date(), updatedAt: new Date() }
            store.set(id, item)
            return item
          }),

        update: (id, input) =>
          Effect.gen(function*() {
            const existing = store.get(id)
            if (!existing) {
              return yield* Effect.fail(
                {className}NotFoundError.create(id, "Item")
              )
            }
            const updated = { ...(existing as object), ...input, updatedAt: new Date() }
            store.set(id, updated)
            return updated
          }),

        delete: (id) =>
          Effect.gen(function*() {
            if (!store.has(id)) {
              return yield* Effect.fail(
                {className}NotFoundError.create(id, "Item")
              )
            }
            store.delete(id)
          }),

        healthCheck: () => Effect.succeed(true)
      }
    }
  )`
      }
    },

    // Static Dev Layer
    {
      content: {
        type: "raw",
        value: `  // ${"=".repeat(74)}
  // Static Dev Layer
  // ${"=".repeat(74)}

  /**
   * Dev Layer - Development with enhanced logging
   *
   * Wraps Live layer with request/response logging for debugging.
   */
  static readonly Dev = Layer.effect(
    this,
    Effect.gen(function*() {
      yield* Effect.logDebug("[{className}] [DEV] Initializing development layer")

      const liveService = yield* {className}Service.Live.pipe(
        Layer.build,
        Effect.map((ctx) => Context.get(ctx, {className}Service))
      )

      return {
        get: (id) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[{className}] [DEV] get called", { id })
            const result = yield* liveService.get(id)
            yield* Effect.logDebug("[{className}] [DEV] get result", { found: Option.isSome(result) })
            return result
          }),

        findByCriteria: (criteria, skip, limit) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[{className}] [DEV] findByCriteria called", { criteria, skip, limit })
            const result = yield* liveService.findByCriteria(criteria, skip, limit)
            yield* Effect.logDebug("[{className}] [DEV] findByCriteria result", { count: result.length })
            return result
          }),

        create: (input) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[{className}] [DEV] create called", { input })
            const result = yield* liveService.create(input)
            yield* Effect.logDebug("[{className}] [DEV] create result", { result })
            return result
          }),

        update: (id, input) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[{className}] [DEV] update called", { id, input })
            const result = yield* liveService.update(id, input)
            yield* Effect.logDebug("[{className}] [DEV] update result", { result })
            return result
          }),

        delete: (id) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[{className}] [DEV] delete called", { id })
            yield* liveService.delete(id)
            yield* Effect.logDebug("[{className}] [DEV] delete completed", { id })
          }),

        healthCheck: () =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[{className}] [DEV] healthCheck called")
            const result = yield* liveService.healthCheck()
            yield* Effect.logDebug("[{className}] [DEV] healthCheck result", { healthy: result })
            return result
          })
      }
    })
  )`
      }
    },

    // Static Auto Layer
    {
      content: {
        type: "raw",
        value: `  // ${"=".repeat(74)}
  // Static Auto Layer
  // ${"=".repeat(74)}

  /**
   * Auto Layer - Environment-aware layer selection
   *
   * Automatically selects the appropriate layer based on NODE_ENV:
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
}`
      }
    }
  ]
}

export default infraServiceTemplate
