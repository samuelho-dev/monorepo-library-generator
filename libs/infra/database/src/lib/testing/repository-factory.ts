import type { Context } from 'effect'
import { Effect, Layer, Option } from 'effect'
import { createInMemoryStore, createTestTimestamp, generateTestId } from './in-memory-store'

/**
 * Repository Factory
 *
 * Generic factory for creating in-memory repository implementations for testing.
 * Eliminates duplication across data-access library tests.
 *
 * All types are strict - no coercion, no type narrowing, no explicit return types.
 * Operations that cannot fail have `never` as error type.
 * Only operations that can fail (e.g., create with duplicate check) have the error type.
 *
 * @module @samuelho-dev/infra-database/testing
 */

/**
 * Standard repository interface with strict types
 *
 * - findById, findAll, update, delete: infallible (error = never)
 * - create: can fail with DuplicateError (when duplicate check is configured)
 */
export interface StandardRepositoryInterface<
  Entity extends { id: string },
  CreateInput,
  UpdateInput,
  DuplicateError = never
> {
  readonly findById: (id: string) => Effect.Effect<Option.Option<Entity>, never>
  readonly findAll: () => Effect.Effect<readonly Entity[], never>
  readonly create: (input: CreateInput) => Effect.Effect<Entity, DuplicateError>
  readonly update: (id: string, input: UpdateInput) => Effect.Effect<Option.Option<Entity>, never>
  readonly delete: (id: string) => Effect.Effect<boolean, never>
}

/**
 * Options for creating an in-memory repository
 */
export interface CreateInMemoryRepositoryOptions<
  Entity extends { id: string },
  CreateInput,
  UpdateInput,
  DuplicateError = never
> {
  /**
   * The Context.Tag for the repository
   */
  readonly tag: Context.Service<
    unknown,
    StandardRepositoryInterface<Entity, CreateInput, UpdateInput, DuplicateError>
  >

  /**
   * Function to create a new entity from input data
   * Should generate ID and timestamps
   */
  readonly createEntity: (input: CreateInput) => Entity

  /**
   * Function to update an existing entity with new data
   * Should update the updatedAt timestamp if present
   */
  readonly updateEntity: (existing: Entity, input: UpdateInput) => Entity

  /**
   * Optional duplicate check before creating
   * Return true if a duplicate exists (will prevent creation)
   */
  readonly duplicateCheck?: (store: Map<string, Entity>, input: CreateInput) => boolean

  /**
   * Error to throw when duplicate is detected
   * Must be an Effect-compatible error (e.g., Schema.TaggedError)
   */
  readonly duplicateError?: (input: CreateInput) => DuplicateError

  /**
   * Initial entities to populate the store with
   */
  readonly initialData?: readonly Entity[]
}

/**
 * Creates an in-memory repository layer for testing
 *
 * @example
 * ```typescript
 * interface UserEntity {
 *   id: string
 *   name: string
 *   email: string
 *   createdAt: Date
 *   updatedAt: Date
 * }
 *
 * type UserCreateInput = Omit<UserEntity, "id" | "createdAt" | "updatedAt">
 * type UserUpdateInput = Partial<UserCreateInput>
 *
 * class UserRepository extends Context.Service<UserRepository,
 *   StandardRepositoryInterface<UserEntity, UserCreateInput, UserUpdateInput, UserAlreadyExistsError>
 * >()("UserRepository") {}
 *
 * const TestUserRepository = createInMemoryRepository({
 *   tag: UserRepository,
 *   createEntity: (input) => ({
 *     id: generateTestId("user"),
 *     ...input,
 *     createdAt: new Date(),
 *     updatedAt: new Date()
 *   }),
 *   updateEntity: (existing, input) => ({
 *     ...existing,
 *     ...input,
 *     updatedAt: new Date()
 *   }),
 *   duplicateCheck: (store, input) =>
 *     Array.from(store.values()).some(u => u.email === input.email),
 *   duplicateError: (input) =>
 *     new UserAlreadyExistsError({ email: input.email })
 * })
 *
 * // Use in tests
 * it.effect("should create a user", () =>
 *   Effect.gen(function*() {
 *     const repo = yield* UserRepository
 *     const user = yield* repo.create({ name: "Alice", email: "alice@test.com" })
 *     expect(user.name).toBe("Alice")
 *   }).pipe(Effect.provide(Layer.fresh(TestUserRepository)))
 * )
 * ```
 */
export function createInMemoryRepository<
  Entity extends { id: string },
  CreateInput,
  UpdateInput,
  DuplicateError = never
>(options: CreateInMemoryRepositoryOptions<Entity, CreateInput, UpdateInput, DuplicateError>) {
  const store = createInMemoryStore<Entity>(
    options.initialData ? { initialData: options.initialData } : {}
  )

  const implementation: StandardRepositoryInterface<
    Entity,
    CreateInput,
    UpdateInput,
    DuplicateError
  > = {
    findById: (id) => store.get(id),

    findAll: () => store.getAll(),

    create: (input) =>
      Effect.gen(function* () {
        // Check for duplicates if configured
        if (options.duplicateCheck && options.duplicateError) {
          const map = store._unsafeGetMap()
          if (options.duplicateCheck(map, input)) {
            return yield* Effect.fail(options.duplicateError(input))
          }
        }

        const entity = options.createEntity(input)
        return yield* store.set(entity)
      }),

    update: (id, input) =>
      Effect.gen(function* () {
        const existing = yield* store.get(id)

        if (Option.isNone(existing)) {
          return Option.none()
        }

        const updated = options.updateEntity(existing.value, input)
        yield* store.set(updated)
        return Option.some(updated)
      }),

    delete: (id) => store.delete(id)
  }

  return Layer.succeed(options.tag, implementation)
}

/**
 * Extended repository interface with additional query methods
 *
 * All operations are infallible except create (which can fail with duplicate error)
 */
export interface ExtendedRepositoryInterface<
  Entity extends { id: string },
  CreateInput,
  UpdateInput,
  DuplicateError = never
> extends StandardRepositoryInterface<Entity, CreateInput, UpdateInput, DuplicateError> {
  readonly findWhere: (
    predicate: (entity: Entity) => boolean
  ) => Effect.Effect<readonly Entity[], never>
  readonly findFirst: (
    predicate: (entity: Entity) => boolean
  ) => Effect.Effect<Option.Option<Entity>, never>
  readonly count: () => Effect.Effect<number, never>
  readonly exists: (id: string) => Effect.Effect<boolean, never>
}

/**
 * Options for creating an extended in-memory repository
 */
export interface CreateExtendedInMemoryRepositoryOptions<
  Entity extends { id: string },
  CreateInput,
  UpdateInput,
  DuplicateError = never
> {
  /**
   * The Context.Tag for the repository
   */
  readonly tag: Context.Service<
    unknown,
    ExtendedRepositoryInterface<Entity, CreateInput, UpdateInput, DuplicateError>
  >

  /**
   * Function to create a new entity from input data
   * Should generate ID and timestamps
   */
  readonly createEntity: (input: CreateInput) => Entity

  /**
   * Function to update an existing entity with new data
   * Should update the updatedAt timestamp if present
   */
  readonly updateEntity: (existing: Entity, input: UpdateInput) => Entity

  /**
   * Optional duplicate check before creating
   * Return true if a duplicate exists (will prevent creation)
   */
  readonly duplicateCheck?: (store: Map<string, Entity>, input: CreateInput) => boolean

  /**
   * Error to throw when duplicate is detected
   * Must be an Effect-compatible error (e.g., Schema.TaggedError)
   */
  readonly duplicateError?: (input: CreateInput) => DuplicateError

  /**
   * Initial entities to populate the store with
   */
  readonly initialData?: readonly Entity[]
}

/**
 * Creates an extended in-memory repository with additional query methods
 *
 * Includes findWhere, findFirst, count, and exists in addition to standard CRUD
 */
export function createExtendedInMemoryRepository<
  Entity extends { id: string },
  CreateInput,
  UpdateInput,
  DuplicateError = never
>(
  options: CreateExtendedInMemoryRepositoryOptions<Entity, CreateInput, UpdateInput, DuplicateError>
) {
  const store = createInMemoryStore<Entity>(
    options.initialData ? { initialData: options.initialData } : {}
  )

  const implementation: ExtendedRepositoryInterface<
    Entity,
    CreateInput,
    UpdateInput,
    DuplicateError
  > = {
    findById: (id) => store.get(id),

    findAll: () => store.getAll(),

    create: (input) =>
      Effect.gen(function* () {
        if (options.duplicateCheck && options.duplicateError) {
          const map = store._unsafeGetMap()
          if (options.duplicateCheck(map, input)) {
            return yield* Effect.fail(options.duplicateError(input))
          }
        }

        const entity = options.createEntity(input)
        return yield* store.set(entity)
      }),

    update: (id, input) =>
      Effect.gen(function* () {
        const existing = yield* store.get(id)

        if (Option.isNone(existing)) {
          return Option.none()
        }

        const updated = options.updateEntity(existing.value, input)
        yield* store.set(updated)
        return Option.some(updated)
      }),

    delete: (id) => store.delete(id),

    findWhere: (predicate) => store.findWhere(predicate),

    findFirst: (predicate) => store.findFirst(predicate),

    count: () => store.count(),

    exists: (id) => store.has(id)
  }

  return Layer.succeed(options.tag, implementation)
}

// Re-export utilities for convenience
export { createTestTimestamp, generateTestId }
