import { Context, Effect, Layer, Option } from "effect"

/**
 * User Profile Repository
 *
 * Repository for profile operations within the user domain.

Uses Effect Context.Tag pattern for dependency injection and
provides standard CRUD operations plus domain-specific queries.
 *
 * @module @samuelho-dev/data-access-user/profile
 */

// ============================================================================
// Contract Imports
// ============================================================================

import type { ProfileId } from "@samuelho-dev/contract-user/profile"

// ============================================================================
// Infrastructure Imports
// ============================================================================

import { DatabaseService } from "@samuelho-dev/infra-database"
import { LoggingService } from "@samuelho-dev/infra-observability"

// ============================================================================
// Repository Error Types
// ============================================================================

/**
 * Profile repository error
 */
export class ProfileRepositoryError {
  readonly _tag = "ProfileRepositoryError"
  constructor(
    readonly message: string,
    readonly code: "NOT_FOUND" | "DUPLICATE" | "VALIDATION" | "DATABASE",
    readonly cause?: unknown
  ) {}
}

/**
 * Profile not found error
 */
export class ProfileNotFoundError extends ProfileRepositoryError {
  constructor(id: string) {
    super(`Profile not found: ${id}`, "NOT_FOUND")
  }
}

// ============================================================================
// Repository Interface
// ============================================================================

/**
 * ProfileRepository interface
 *
 * Provides data access operations for profile within user domain.
 */
export interface ProfileRepositoryInterface {
  /** Find by ID */
  readonly findById: (id: ProfileId) => Effect.Effect<Option.Option<unknown>, ProfileRepositoryError>

  /** Find all with optional criteria and pagination */
  readonly findAll: (
    criteria?: Record<string, unknown>,
    pagination?: { skip?: number; limit?: number }
  ) => Effect.Effect<{ items: Array<unknown>; total: number }, ProfileRepositoryError>

  /** Create new entity */
  readonly create: (input: unknown) => Effect.Effect<unknown, ProfileRepositoryError>

  /** Update existing entity */
  readonly update: (id: ProfileId, input: unknown) => Effect.Effect<unknown, ProfileRepositoryError>

  /** Delete entity */
  readonly delete: (id: ProfileId) => Effect.Effect<void, ProfileRepositoryError>

  /** Check if entity exists */
  readonly exists: (id: ProfileId) => Effect.Effect<boolean, ProfileRepositoryError>

  /** Count entities */
  readonly count: (criteria?: Record<string, unknown>) => Effect.Effect<number, ProfileRepositoryError>
}

// ============================================================================
// Context.Tag Definition
// ============================================================================

/**
 * ProfileRepository Context.Tag
 *
 * Use this to access the repository in your Effect programs:
 * ```typescript
 * const repo = yield* ProfileRepository;
 * const item = yield* repo.findById(id);
 * ```
 */
export class ProfileRepository extends Context.Tag("ProfileRepository")<
  ProfileRepository,
  ProfileRepositoryInterface
>() {}

// ============================================================================
// Live Layer Implementation
// ============================================================================

/**
 * ProfileRepositoryLive Layer
 *
 * Live implementation using DatabaseService and LoggingService.
 */
export const ProfileRepositoryLive = Layer.effect(
  ProfileRepository,
  Effect.gen(function*() {
    const db = yield* DatabaseService
    const logger = yield* LoggingService

    yield* logger.debug("ProfileRepository initialized")

    return {
      findById: (id) =>
        Effect.gen(function*() {
          yield* logger.debug("ProfileRepository.findById", { id })
          // TODO: Replace with actual database query using db
          yield* db.healthCheck().pipe(Effect.ignore)
          return Option.none()
        }).pipe(Effect.withSpan("ProfileRepository.findById")),

      findAll: (criteria, pagination) =>
        Effect.gen(function*() {
          const skip = pagination?.skip ?? 0
          const limit = pagination?.limit ?? 20
          yield* logger.debug("ProfileRepository.findAll", { criteria, skip, limit })
          // TODO: Replace with actual database query using db with skip/limit
          yield* db.healthCheck().pipe(Effect.ignore)
          return { items: [], total: 0 }
        }).pipe(Effect.withSpan("ProfileRepository.findAll")),

      create: (input) =>
        Effect.gen(function*() {
          yield* logger.info("ProfileRepository.create", { input })
          // TODO: Replace with actual database insert using db
          yield* db.healthCheck().pipe(Effect.ignore)
          const id = crypto.randomUUID()
          return { id, ...input, createdAt: new Date(), updatedAt: new Date() }
        }).pipe(Effect.withSpan("ProfileRepository.create")),

      update: (id, input) =>
        Effect.gen(function*() {
          yield* logger.info("ProfileRepository.update", { id, input })
          // TODO: Replace with actual database update using db
          yield* db.healthCheck().pipe(Effect.ignore)
          return { id, ...input, updatedAt: new Date() }
        }).pipe(Effect.withSpan("ProfileRepository.update")),

      delete: (id) =>
        Effect.gen(function*() {
          yield* logger.info("ProfileRepository.delete", { id })
          // TODO: Replace with actual database delete using db
          yield* db.healthCheck().pipe(Effect.ignore)
        }).pipe(Effect.withSpan("ProfileRepository.delete")),

      exists: (id) =>
        Effect.gen(function*() {
          yield* logger.debug("ProfileRepository.exists", { id })
          // TODO: Replace with actual database check using db
          yield* db.healthCheck().pipe(Effect.ignore)
          return false
        }).pipe(Effect.withSpan("ProfileRepository.exists")),

      count: (criteria) =>
        Effect.gen(function*() {
          yield* logger.debug("ProfileRepository.count", { criteria })
          // TODO: Replace with actual database count using db
          yield* db.healthCheck().pipe(Effect.ignore)
          return 0
        }).pipe(Effect.withSpan("ProfileRepository.count"))
    }
  })
)

// ============================================================================
// Test Layer
// ============================================================================

/**
 * ProfileRepositoryTest Layer
 *
 * In-memory implementation for testing.
 */
export const ProfileRepositoryTest = Layer.effect(
  ProfileRepository,
  Effect.gen(function*() {
    const logger = yield* LoggingService
    const store = new Map<string, unknown>()

    yield* logger.debug("ProfileRepository (Test) initialized")

    return {
      findById: (id) =>
        Effect.sync(() => {
          const item = store.get(id)
          return item ? Option.some(item) : Option.none()
        }),

      findAll: (criteria, pagination) =>
        Effect.sync(() => {
          const items = Array.from(store.values())
          const skip = pagination?.skip ?? 0
          const limit = pagination?.limit ?? 20
          return {
            items: items.slice(skip, skip + limit),
            total: items.length
          }
        }),

      create: (input) =>
        Effect.sync(() => {
          const id = crypto.randomUUID()
          const item = { id, ...input, createdAt: new Date(), updatedAt: new Date() }
          store.set(id, item)
          return item
        }),

      update: (id, input) =>
        Effect.gen(function*() {
          const existing = store.get(id) | undefined
          if (!existing) {
            return yield* Effect.fail(new ProfileNotFoundError(id))
          }
          const updated = { ...existing, ...input, updatedAt: new Date() }
          store.set(id, updated)
          return updated
        }),

      delete: (id) =>
        Effect.gen(function*() {
          if (!store.has(id)) {
            return yield* Effect.fail(new ProfileNotFoundError(id))
          }
          store.delete(id)
        }),

      exists: (id) => Effect.succeed(store.has(id)),

      count: () => Effect.succeed(store.size)
    }
  })
)
