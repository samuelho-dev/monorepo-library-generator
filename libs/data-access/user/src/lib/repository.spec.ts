import { describe, expect, it } from "@effect/vitest"
import { Context, Effect, Layer, Option } from "effect"

/**
 * User Repository Tests
 *
 * Tests verify that the repository correctly fulfills contract interface requirements.
Uses @effect/vitest with it.scoped for resource management and minimal inline mocking.

Testing Guidelines:
- Test repository behavior (does it fulfill the contract interface?)
- Use it.scoped for repository tests (they need Scope)
- Create inline mocks with Layer.succeed
- Focus on contract compliance, not implementation details
- Keep ALL tests in this ONE file
 *
 * @module @samuelho-dev/data-access-user
 */

/**
 * Test entity type for repository tests
 */
interface UserEntity {
  readonly id: string
  readonly name: string
  readonly createdAt: Date
  readonly updatedAt: Date
}

/**
 * Repository interface for testing
 */
class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    readonly findById: (id: string) => Effect.Effect<Option.Option<UserEntity>>
    readonly findAll: () => Effect.Effect<ReadonlyArray<UserEntity>>
    readonly create: (
      data: Omit<UserEntity, "id" | "createdAt" | "updatedAt">
    ) => Effect.Effect<UserEntity>
    readonly update: (
      id: string,
      data: Partial<Omit<UserEntity, "id" | "createdAt" | "updatedAt">>
    ) => Effect.Effect<Option.Option<UserEntity>>
    readonly delete: (id: string) => Effect.Effect<boolean>
  }
>() {}

/**
 * Creates an in-memory repository for testing
 */
function createInMemoryUserRepository() {
  const store = new Map<string, UserEntity>()

  return Layer.succeed(UserRepository, {
    findById: (id) =>
      Effect.sync(() => Option.fromNullable(store.get(id))),

    findAll: () =>
      Effect.sync(() => Array.from(store.values())),
    create: (data) =>
      Effect.sync(() => {
        const entity: UserEntity = {
          id: `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: data.name,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        store.set(entity.id, entity)
        return entity
      }),
    update: (id, data) =>
      Effect.sync(() => {
        const existing = store.get(id)
        if (!existing) return Option.none()

        const updated: UserEntity = {
          ...existing,
          ...data,
          updatedAt: new Date()
        }
        store.set(id, updated)
        return Option.some(updated)
      }),
    delete: (id) =>
      Effect.sync(() => store.delete(id))
  })
}

describe("User Repository", () => {
  describe("CRUD Operations", () => {
    it.scoped("should create and retrieve an entity", () =>
      Effect.gen(function*() {
        const repo = yield* UserRepository

        const created = yield* repo.create({ name: "Test Entity" })
        expect(created.id).toBeDefined()
        expect(created.name).toBe("Test Entity")

        const found = yield* repo.findById(created.id)
        expect(Option.isSome(found)).toBe(true)
        if (Option.isSome(found)) {
          expect(found.value.id).toBe(created.id)
        }
      }).pipe(Effect.provide(Layer.fresh(createInMemoryUserRepository()))))

    it.scoped("should return None for non-existent entity", () =>
      Effect.gen(function*() {
        const repo = yield* UserRepository

        const found = yield* repo.findById("non-existent-id")
        expect(Option.isNone(found)).toBe(true)
      }).pipe(Effect.provide(Layer.fresh(createInMemoryUserRepository()))))

    it.scoped("should list all entities", () =>
      Effect.gen(function*() {
        const repo = yield* UserRepository

        yield* repo.create({ name: "Entity 1" })
        yield* repo.create({ name: "Entity 2" })
        yield* repo.create({ name: "Entity 3" })

        const all = yield* repo.findAll()
        expect(all.length).toBe(3)
      }).pipe(Effect.provide(Layer.fresh(createInMemoryUserRepository()))))

    it.scoped("should update an entity", () =>
      Effect.gen(function*() {
        const repo = yield* UserRepository

        const created = yield* repo.create({ name: "Original Name" })
        const updated = yield* repo.update(created.id, { name: "Updated Name" })

        expect(Option.isSome(updated)).toBe(true)
        if (Option.isSome(updated)) {
          expect(updated.value.name).toBe("Updated Name")
        }
      }).pipe(Effect.provide(Layer.fresh(createInMemoryUserRepository()))))

    it.scoped("should return None when updating non-existent entity", () =>
      Effect.gen(function*() {
        const repo = yield* UserRepository

        const updated = yield* repo.update("non-existent", { name: "New Name" })
        expect(Option.isNone(updated)).toBe(true)
      }).pipe(Effect.provide(Layer.fresh(createInMemoryUserRepository()))))

    it.scoped("should delete an entity", () =>
      Effect.gen(function*() {
        const repo = yield* UserRepository

        const created = yield* repo.create({ name: "To Delete" })
        const deleted = yield* repo.delete(created.id)
        expect(deleted).toBe(true)

        const found = yield* repo.findById(created.id)
        expect(Option.isNone(found)).toBe(true)
      }).pipe(Effect.provide(Layer.fresh(createInMemoryUserRepository()))))

    it.scoped("should return false when deleting non-existent entity", () =>
      Effect.gen(function*() {
        const repo = yield* UserRepository

        const deleted = yield* repo.delete("non-existent")
        expect(deleted).toBe(false)
      }).pipe(Effect.provide(Layer.fresh(createInMemoryUserRepository()))))
  })

  describe("Layer Isolation", () => {
    it.scoped("should isolate state between tests", () =>
      Effect.gen(function*() {
        const repo = yield* UserRepository

        yield* repo.create({ name: "Isolated Item" })
        const all = yield* repo.findAll()

        expect(all.length).toBe(1)
      }).pipe(Effect.provide(Layer.fresh(createInMemoryUserRepository()))))

    it.scoped("should not see items from other tests", () =>
      Effect.gen(function*() {
        const repo = yield* UserRepository

        const all = yield* repo.findAll()
        expect(all.length).toBe(0)
      }).pipe(Effect.provide(Layer.fresh(createInMemoryUserRepository()))))
  })
})
