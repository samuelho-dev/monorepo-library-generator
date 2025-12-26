/**
 * Provider Service Template Definition
 *
 * Declarative template for generating service.ts in provider libraries.
 * External service provider using Effect 3.0+ Context.Tag pattern.
 *
 * @module monorepo-library-generator/templates/definitions/provider/service
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Provider Service Template Definition
 *
 * Generates a complete service.ts file with:
 * - Service interface for external service integration
 * - Context.Tag with Static Live, Test, Dev, Auto layers
 * - CRUD operations (get, list, create, update, delete)
 * - Health check endpoint
 * - In-memory baseline implementation for testing
 */
export const providerServiceTemplate: TemplateDefinition = {
  id: "provider/service",
  meta: {
    title: "{className} Service Interface",
    description: `Context.Tag definition for {className} provider service.

External Service: {externalService}

Operations are split into separate files for optimal tree-shaking.
Import only the operations you need for smallest bundle size.`,
    module: "{scope}/provider-{fileName}/service"
  },
  imports: [
    { from: "effect", items: ["Context", "Effect", "Layer", "Redacted"] },
    { from: "./types", items: ["{className}Config", "Resource", "ListParams", "PaginatedResult", "HealthCheckResult"], isTypeOnly: true },
    { from: "./errors", items: ["{className}ServiceError"], isTypeOnly: true },
    { from: "./errors", items: ["{className}NotFoundError"] },
    { from: "{scope}/env", items: ["env"] }
  ],
  sections: [
    // Service Interface
    {
      title: "Service Interface",
      content: {
        type: "raw",
        value: `/**
 * {className} Service Interface
 *
 * Provider: External service adapter for {externalService}
 *
 * Operations:
 * - Health check and configuration
 * - CRUD operations for external service resources
 * - Pagination support for list operations
 * - Retry logic with exponential backoff
 */
export interface {className}ServiceInterface {
  /**
   * Service configuration (read-only)
   */
  readonly config: {className}Config

  /**
   * Health check - verifies service connectivity
   */
  readonly healthCheck: Effect.Effect<
    HealthCheckResult,
    {className}ServiceError
  >

  /**
   * List resources with pagination support
   */
  readonly list: (
    params?: ListParams
  ) => Effect.Effect<PaginatedResult<Resource>, {className}ServiceError>

  /**
   * Get resource by ID
   */
  readonly get: (
    id: string
  ) => Effect.Effect<Resource, {className}ServiceError>

  /**
   * Create new resource
   */
  readonly create: (
    data: Omit<Resource, "id" | "createdAt" | "updatedAt">
  ) => Effect.Effect<Resource, {className}ServiceError>

  /**
   * Update existing resource
   */
  readonly update: (
    id: string,
    data: Partial<Omit<Resource, "id" | "createdAt" | "updatedAt">>
  ) => Effect.Effect<Resource, {className}ServiceError>

  /**
   * Delete resource
   */
  readonly delete: (
    id: string
  ) => Effect.Effect<void, {className}ServiceError>
}`
      }
    },

    // Context.Tag
    {
      title: "Context.Tag",
      content: {
        type: "raw",
        value: `/**
 * {className} Service Tag
 *
 * Access via: yield* {className}
 *
 * Static layers:
 * - {className}.Live - Production with real {externalService} SDK
 * - {className}.Test - In-memory for testing
 * - {className}.Dev - Development with logging
 */
export class {className} extends Context.Tag("{className}")<
  {className},
  {className}ServiceInterface
>() {`
      }
    },

    // Live Layer
    {
      content: {
        type: "raw",
        value: `  /**
   * Live Layer - Production implementation
   *
   * Currently uses in-memory baseline. Replace with {externalService} SDK integration:
   *
   * @example
   * \`\`\`typescript
   * // 1. Install SDK: pnpm add {externalService}-sdk
   * // 2. Replace in-memory store with SDK calls
   * \`\`\`
   */
  static readonly Live = Layer.effect(
    {className},
    Effect.gen(function*() {
      // In-memory baseline implementation
      // TODO: Replace with {externalService} SDK integration
      const store = new Map<string, Resource>()
      let idCounter = 0

      // Configuration from environment variables
      const config: {className}Config = {
        apiKey: Redacted.value(env.{constantName}_API_KEY) ?? "fallback_api_key",
        timeout: env.{constantName}_TIMEOUT ?? 20000,
      }

      return {
        config,

        healthCheck: Effect.succeed({ status: "healthy" as const }),

        list: (params) =>
          Effect.sync(() => {
            const page = params?.page ?? 1
            const limit = params?.limit ?? 10
            const items = Array.from(store.values())
            const start = (page - 1) * limit
            const end = start + limit
            return {
              data: items.slice(start, end),
              page,
              limit,
              total: items.length,
            }
          }),

        get: (id) =>
          Effect.gen(function*() {
            const item = store.get(id)
            if (!item) {
              return yield* Effect.fail(
                new {className}NotFoundError({
                  message: \`Resource \${id} not found\`,
                  resourceId: id,
                  resourceType: "Resource",
                })
              )
            }
            return item
          }),

        create: (data) =>
          Effect.sync(() => {
            const id = \`live-\${++idCounter}\`
            const now = new Date()
            const item: Resource = {
              id,
              ...data,
              createdAt: now,
              updatedAt: now
            }
            store.set(id, item)
            return item
          }),

        update: (id, data) =>
          Effect.gen(function*() {
            const item = store.get(id)
            if (!item) {
              return yield* Effect.fail(
                new {className}NotFoundError({
                  message: \`Resource \${id} not found\`,
                  resourceId: id,
                  resourceType: "Resource",
                })
              )
            }
            const updated: Resource = {
              ...item,
              ...data,
              id,
              createdAt: item.createdAt,
              updatedAt: new Date()
            }
            store.set(id, updated)
            return updated
          }),

        delete: (id) =>
          Effect.gen(function*() {
            const existed = store.delete(id)
            if (!existed) {
              return yield* Effect.fail(
                new {className}NotFoundError({
                  message: \`Resource \${id} not found\`,
                  resourceId: id,
                  resourceType: "Resource",
                })
              )
            }
          })
      }
    })
  )`
      }
    },

    // Test Layer
    {
      content: {
        type: "raw",
        value: `  /**
   * Test Layer - In-memory implementation for testing
   *
   * Uses Layer.sync for deterministic testing with isolated state.
   */
  static readonly Test = Layer.sync(
    {className},
    () => {
      const store = new Map<string, Resource>()
      let idCounter = 0

      return {
        config: { apiKey: "test-key", timeout: 1000 },

        healthCheck: Effect.succeed({ status: "healthy" as const }),

        list: (params) =>
          Effect.sync(() => {
            const page = params?.page ?? 1
            const limit = params?.limit ?? 10
            const items = Array.from(store.values())
            const start = (page - 1) * limit
            const end = start + limit
            return {
              data: items.slice(start, end),
              page,
              limit,
              total: items.length,
            }
          }),

        get: (id) =>
          Effect.gen(function*() {
            const item = store.get(id)
            if (!item) {
              return yield* Effect.fail(
                new {className}NotFoundError({
                  message: \`Resource \${id} not found\`,
                  resourceId: id,
                  resourceType: "Resource",
                })
              )
            }
            return item
          }),

        create: (data) =>
          Effect.sync(() => {
            const id = \`test-\${++idCounter}\`
            const now = new Date()
            const item: Resource = {
              id,
              ...data,
              createdAt: now,
              updatedAt: now
            }
            store.set(id, item)
            return item
          }),

        update: (id, data) =>
          Effect.gen(function*() {
            const item = store.get(id)
            if (!item) {
              return yield* Effect.fail(
                new {className}NotFoundError({
                  message: \`Resource \${id} not found\`,
                  resourceId: id,
                  resourceType: "Resource",
                })
              )
            }
            const updated: Resource = {
              ...item,
              ...data,
              id,
              createdAt: item.createdAt,
              updatedAt: new Date()
            }
            store.set(id, updated)
            return updated
          }),

        delete: (id) =>
          Effect.gen(function*() {
            const existed = store.delete(id)
            if (!existed) {
              return yield* Effect.fail(
                new {className}NotFoundError({
                  message: \`Resource \${id} not found\`,
                  resourceId: id,
                  resourceType: "Resource",
                })
              )
            }
          })
      }
    }
  )`
      }
    },

    // Dev Layer
    {
      content: {
        type: "raw",
        value: `  /**
   * Dev Layer - Development with enhanced logging
   *
   * Wraps Live layer with request/response logging for debugging.
   */
  static readonly Dev = Layer.effect(
    {className},
    Effect.gen(function*() {
      yield* Effect.logDebug("[{className}] [DEV] Initializing development layer")

      const liveService = yield* {className}.Live.pipe(
        Layer.build,
        Effect.map((ctx) => Context.get(ctx, {className}))
      )

      return {
        config: liveService.config,

        healthCheck: Effect.gen(function*() {
          yield* Effect.logDebug("[{className}] [DEV] healthCheck called")
          const result = yield* liveService.healthCheck
          yield* Effect.logDebug("[{className}] [DEV] healthCheck result", { result })
          return result
        }),

        list: (params) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[{className}] [DEV] list called", { params })
            const result = yield* liveService.list(params)
            yield* Effect.logDebug("[{className}] [DEV] list result", { count: result.data.length, total: result.total })
            return result
          }),

        get: (id) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[{className}] [DEV] get called", { id })
            const result = yield* liveService.get(id)
            yield* Effect.logDebug("[{className}] [DEV] get result", { result })
            return result
          }),

        create: (data) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[{className}] [DEV] create called", { data })
            const result = yield* liveService.create(data)
            yield* Effect.logDebug("[{className}] [DEV] create result", { result })
            return result
          }),

        update: (id, data) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[{className}] [DEV] update called", { id, data })
            const result = yield* liveService.update(id, data)
            yield* Effect.logDebug("[{className}] [DEV] update result", { result })
            return result
          }),

        delete: (id) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[{className}] [DEV] delete called", { id })
            yield* liveService.delete(id)
            yield* Effect.logDebug("[{className}] [DEV] delete completed", { id })
          })
      }
    })
  )`
      }
    },

    // Auto Layer
    {
      content: {
        type: "raw",
        value: `  /**
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
        return {className}.Test
      case "development":
        return {className}.Dev
      case "production":
      default:
        return {className}.Live
    }
  })
}`
      }
    }
  ]
}

export default providerServiceTemplate
