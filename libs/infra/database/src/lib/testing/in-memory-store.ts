import { Effect, Option } from 'effect'

/**
 * In-Memory Store
 *
 * A generic Map-based store for testing repository implementations.
 * Provides type-safe CRUD operations with Effect wrappers.
 *
 * @module @samuelho-dev/infra-database/testing
 */

/**
 * Configuration options for the in-memory store
 */
export interface InMemoryStoreOptions<Entity extends { id: string }> {
  /** Initial entities to populate the store with */
  readonly initialData?: readonly Entity[]
}

/**
 * In-memory store interface
 *
 * All operations are infallible (error type is `never`) because in-memory
 * operations cannot fail. This provides strict typing without coercion.
 */
export interface InMemoryStore<Entity extends { id: string }> {
  /** Get an entity by ID - returns None if not found */
  readonly get: (id: string) => Effect.Effect<Option.Option<Entity>, never>
  /** Get all entities */
  readonly getAll: () => Effect.Effect<readonly Entity[], never>
  /** Set an entity (upsert) */
  readonly set: (entity: Entity) => Effect.Effect<Entity, never>
  /** Delete an entity by ID - returns true if entity existed */
  readonly delete: (id: string) => Effect.Effect<boolean, never>
  /** Check if an entity exists */
  readonly has: (id: string) => Effect.Effect<boolean, never>
  /** Get the count of entities */
  readonly count: () => Effect.Effect<number, never>
  /** Clear all entities */
  readonly clear: () => Effect.Effect<void, never>
  /** Find entities matching a predicate */
  readonly findWhere: (
    predicate: (entity: Entity) => boolean
  ) => Effect.Effect<readonly Entity[], never>
  /** Find the first entity matching a predicate */
  readonly findFirst: (
    predicate: (entity: Entity) => boolean
  ) => Effect.Effect<Option.Option<Entity>, never>
  /** Get direct access to the underlying Map (for advanced use cases) */
  readonly _unsafeGetMap: () => Map<string, Entity>
}

/**
 * Creates a new in-memory store
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string
 *   name: string
 *   email: string
 * }
 *
 * const store = createInMemoryStore<User>()
 *
 * // Or with initial data
 * const storeWithData = createInMemoryStore<User>({
 *   initialData: [
 *     { id: "1", name: "Alice", email: "alice@example.com" }
 *   ]
 * })
 * ```
 */
export function createInMemoryStore<Entity extends { id: string }>(
  options: InMemoryStoreOptions<Entity> = {}
): InMemoryStore<Entity> {
  const store = new Map<string, Entity>()

  // Initialize with initial data if provided
  if (options.initialData) {
    for (const entity of options.initialData) {
      store.set(entity.id, entity)
    }
  }

  return {
    get: (id) => Effect.sync(() => Option.fromNullishOr(store.get(id))),

    getAll: () => Effect.sync(() => Array.from(store.values())),

    set: (entity) =>
      Effect.sync(() => {
        store.set(entity.id, entity)
        return entity
      }),

    delete: (id) => Effect.sync(() => store.delete(id)),

    has: (id) => Effect.sync(() => store.has(id)),

    count: () => Effect.sync(() => store.size),

    clear: () =>
      Effect.sync(() => {
        store.clear()
      }),

    findWhere: (predicate) => Effect.sync(() => Array.from(store.values()).filter(predicate)),

    findFirst: (predicate) =>
      Effect.sync(() => Option.fromNullishOr(Array.from(store.values()).find(predicate))),

    _unsafeGetMap: () => store
  }
}

/**
 * Generate a unique ID for testing
 *
 * Uses timestamp + random string for uniqueness
 */
export function generateTestId(prefix = 'test') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Create a timestamp for testing
 *
 * Returns current date or allows fixed date for deterministic tests
 */
export function createTestTimestamp(fixed?: Date) {
  return fixed ?? new Date()
}
