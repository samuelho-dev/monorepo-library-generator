import { env } from "@samuelho-dev/env"
import { Chunk, Context, Effect, Layer, Option, Stream } from "effect"
import { aggregateOperations } from "./operations/aggregate"
import { createOperations } from "./operations/create"
import { deleteOperations } from "./operations/delete"
import { readOperations } from "./operations/read"
import { updateOperations } from "./operations/update"

/**
 * User Repository
 *
 * Context.Tag definition for UserRepository.

ARCHITECTURE PATTERN:
- Operations split into separate files for bundle optimization
- Return types are inferred to preserve Effect's dependency tracking
- Use repository.streamAll() for large datasets
- Tests provide DatabaseService.Test, not a separate Repository.Test

@see repository/operations/* for implementation details
 *
 * @module @samuelho-dev/data-access-user/repository
 */

// ============================================================================
// Repository Context.Tag
// ============================================================================

/**
 * User Repository implementation
 *
 * Combines all CRUD + aggregate operations into a single repository object.
 * Operations require DatabaseService which is provided via Layer composition.
 */
const repositoryImpl = {
  ...createOperations,
  ...readOperations,
  ...updateOperations,
  ...deleteOperations,
  ...aggregateOperations,

  streamAll: (options?: { batchSize?: number }) => {
    const batchSize = options?.batchSize ?? 100
    return Stream.paginateChunkEffect(0, (offset) =>
      readOperations.findAll(undefined, { skip: offset, limit: batchSize }).pipe(
        Effect.map((result) => {
          const chunk = Chunk.fromIterable(result.items)
          const next = result.hasMore ? Option.some(offset + batchSize) : Option.none()
          return [chunk, next] as const
        })
      )
    )
  }
} as const

export type UserRepositoryInterface = typeof repositoryImpl

/**
 * User Repository Tag
 *
 * Access via: yield* UserRepository
 *
 * Static layers:
 * - UserRepository.Live - Production layer (requires DatabaseService.Live)
 * - UserRepository.Test - Test layer (alias to Live, compose with DatabaseService.Test)
 * - UserRepository.Dev - Development layer with enhanced logging
 * - UserRepository.Auto - Environment-aware layer selection
 *
 * @example
 * ```typescript
 * // Production usage
 * Effect.provide(UserRepository.Live.pipe(
 *   Layer.provide(DatabaseService.Live)
 * ))
 *
 * // Testing - compose with test database
 * Effect.provide(UserRepository.Test.pipe(
 *   Layer.provide(DatabaseService.Test)
 * ))
 *
 * // Auto-select based on NODE_ENV
 * Effect.provide(UserRepository.Auto)
 * ```
 */
export class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  UserRepositoryInterface
>() {
  /**
   * Live layer - Production implementation
   *
   * Use for production deployments with real external services.
   */
  static readonly Live = Layer.succeed(
    this,
    repositoryImpl
  )

  /**
   * Test layer - Same as Live
   *
   * Testing is done by composing with test infrastructure layers
   * (e.g., DatabaseService.Test) rather than a separate implementation.
   */
  static readonly Test = this.Live

  /**
   * Dev layer - Development with enhanced logging
   *
   * Wraps Live layer operations with Effect logging
   * for debugging during development.
   */
  static readonly Dev = Layer.effect(
    this,
    Effect.gen(function*() {
      const liveService = yield* UserRepository.Live.pipe(
        Layer.build,
        Effect.map(Context.unsafeGet(UserRepository))
      )

      // Return wrapped service with logging
      // TODO: Add method-level logging wrappers using Effect.log()
      return liveService
    })
  )

  /**
   * Auto layer - Environment-aware layer selection
   *
   * Automatically selects the appropriate layer based on process.env.NODE_ENV:
   * - "test" → Test layer
   * - "development" → Dev layer (with logging)
   * - "production" or other → Live layer (default)
   */
  static readonly Auto = Layer.suspend(() => {
    switch (process.env["NODE_ENV"]) {
      case "test":
        return UserRepository.Test
      case "development":
        return UserRepository.Dev
      default:
        return UserRepository.Live
    }
  })
}
