import { env } from "@samuelho-dev/env"
import { CacheService } from "@samuelho-dev/infra-cache"
import { DatabaseService } from "@samuelho-dev/infra-database"
import { LoggingService, MetricsService } from "@samuelho-dev/infra-observability"
import { Layer } from "effect"
import { UserRepository } from "../repository"

/**
 * User Data Access Layers
 *
 * Effect layer compositions for user data access.

Provides different layer implementations for different environments:
- Live: Production with all infrastructure
- Dev: Development with local infrastructure
- Test: Testing with in-memory/mock infrastructure
- Auto: Automatically selects based on NODE_ENV

Infrastructure included:
- DatabaseService: Data persistence
- LoggingService: Structured logging
- MetricsService: Observability
- CacheService: Read-through caching
 *
 * @module @samuelho-dev/data-access-user/server
 */


// ============================================================================
// Repository
// ============================================================================

// ============================================================================
// Infrastructure Layers
// ============================================================================

// ============================================================================
// Environment Configuration
// ============================================================================

// ============================================================================
// Infrastructure Layer Compositions
// ============================================================================

/**
 * Live Infrastructure Layer
 *
 * Production infrastructure for data access.
 */
export const InfrastructureLive = Layer.mergeAll(
  DatabaseService.Live,
  LoggingService.Live,
  MetricsService.Live,
  CacheService.Live
)

/**
 * Test Infrastructure Layer
 *
 * Testing infrastructure with in-memory implementations.
 */
export const InfrastructureTest = Layer.mergeAll(
  DatabaseService.Test,
  LoggingService.Test,
  MetricsService.Test,
  CacheService.Test
)

/**
 * Dev Infrastructure Layer
 *
 * Development infrastructure with local services.
 */
export const InfrastructureDev = Layer.mergeAll(
  DatabaseService.Dev,
  LoggingService.Dev,
  MetricsService.Dev,
  CacheService.Dev
)

// ============================================================================
// Data Access Layer Compositions
// ============================================================================

/**
 * User DataAccess Live Layer
 *
 * Production layer with all services.
 * Includes all infrastructure dependencies.
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const repo = yield* UserRepository
 *   const entity = yield* repo.findById("id-123")
 * })
 *
 * program.pipe(Effect.provide(UserDataAccessLive))
 * ```
 */
export const UserDataAccessLive = Layer.mergeAll(
  UserRepository.Live
).pipe(Layer.provide(InfrastructureLive))

/**
 * User DataAccess Test Layer
 *
 * Testing layer with in-memory infrastructure.
 *
 * @example
 * ```typescript
 * describe("UserRepository", () => {
 *   it("should create entity", () =>
 *     Effect.gen(function* () {
 *       const repo = yield* UserRepository
 *       const result = yield* repo.create({ name: "test" })
 *       expect(result).toBeDefined()
 *     }).pipe(Effect.provide(UserDataAccessTest))
 *   )
 * })
 * ```
 */
export const UserDataAccessTest = Layer.mergeAll(
  UserRepository.Live
).pipe(Layer.provide(InfrastructureTest))

/**
 * User DataAccess Dev Layer
 *
 * Development layer with local infrastructure.
 * Verbose logging and debugging enabled.
 */
export const UserDataAccessDev = Layer.mergeAll(
  UserRepository.Live
).pipe(Layer.provide(InfrastructureDev))

// ============================================================================
// Auto-selecting Layer
// ============================================================================

/**
 * Auto layer - automatically selects based on NODE_ENV
 *
 * - "test": Uses UserDataAccessTest
 * - "development": Uses UserDataAccessDev
 * - "production": Uses UserDataAccessLive
 */
export const UserDataAccessAuto = Layer.suspend(() => {
  switch (env.NODE_ENV) {
    case "test":
      return UserDataAccessTest
    case "development":
      return UserDataAccessDev
    default:
      return UserDataAccessLive
  }
})
