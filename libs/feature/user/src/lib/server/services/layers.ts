import { UserRepository } from "@samuelho-dev/data-access-user"
import { env } from "@samuelho-dev/env"
import { CacheService } from "@samuelho-dev/infra-cache"
import { DatabaseService } from "@samuelho-dev/infra-database"
import { LoggingService, MetricsService } from "@samuelho-dev/infra-observability"
import { PubsubService } from "@samuelho-dev/infra-pubsub"
import { QueueService } from "@samuelho-dev/infra-queue"
import { Layer } from "effect"
import { AuthenticationLive, AuthenticationTest } from "./authentication"
import { ProfileLive, ProfileTest } from "./profile"
import { UserService } from "./service"

/**
 * User Layers
 *
 * Layer composition for user feature.

Provides different layer implementations for different environments:
- Live: Production with all infrastructure
- Test: Testing with in-memory infrastructure
- Dev: Development with local infrastructure
- Auto: Automatically selects based on NODE_ENV

Event publishing is done IN the service implementation using helpers:
- withEventPublishing(effect, buildEvent, topic)
- withJobEnqueuing(effect, buildJob, queue)
 *
 */

// ============================================================================
// Service Layer Notes
// ============================================================================

/**
 * Service Layer Pattern:
 *
 * Event/job publishing is handled INSIDE the service implementation
 * using the withEventPublishing/withJobEnqueuing helpers. This keeps
 * the layer composition simple and the event logic explicit.
 *
 * @see UserService.Live - service implementation with events
 */

// ============================================================================
// Composed Infrastructure Layers
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
  CacheService.Live,
  PubsubService.Live,
  QueueService.Live
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
  CacheService.Test,
  PubsubService.Test,
  QueueService.Test
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
  CacheService.Dev,
  PubsubService.Dev,
  QueueService.Dev
)

// ============================================================================
// Full Feature Layers
// ============================================================================

/**
 * Full Live Layer for production
 *
 * Includes all user feature layers with live infrastructure:
 * - UserService.Live (event publishing in service implementation)
 * - UserRepository.Live
 * - Sub-module services: Authentication, Profile
 * - All infrastructure services
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function*() {
 *   const service = yield* UserService;
 *   const entity = yield* service.create({ name: "test" });
 * });
 *
 * program.pipe(Effect.provide(UserFeatureLive));
 * ```
 */
export const UserFeatureLive = Layer.mergeAll(
  UserService.Live,
  UserRepository.Live,
  AuthenticationLive,
  ProfileLive
).pipe(Layer.provide(InfrastructureLive))

/**
 * Full Test Layer for testing
 *
 * Uses UserService.Live directly (no event publishing) for isolated unit tests.
 * Events are NOT published in test mode.
 *
 * @example
 * ```typescript
 * describe("UserService", () => {
 *   it("should create entity", () =>
 *     Effect.gen(function*() {
 *       const service = yield* UserService;
 *       const result = yield* service.create({ name: "test" });
 *       // No events published - isolated unit test
 *       expect(result).toBeDefined();
 *     }).pipe(Effect.provide(UserFeatureTest))
 *   );
 * });
 * ```
 */
export const UserFeatureTest = Layer.mergeAll(
  UserService.Live,
  UserRepository.Live,
  AuthenticationTest,
  ProfileTest
).pipe(Layer.provide(InfrastructureTest))

/**
 * Full Dev Layer for development
 *
 * Uses local services with verbose logging and debugging enabled.
 */
export const UserFeatureDev = Layer.mergeAll(
  UserService.Live,
  UserRepository.Live,
  AuthenticationLive,
  ProfileLive
).pipe(Layer.provide(InfrastructureDev))

// ============================================================================
// Auto-selecting Layer
// ============================================================================

/**
 * Auto layer - automatically selects based on NODE_ENV
 *
 * - "test": Uses UserFeatureTest
 * - "development": Uses UserFeatureDev
 * - "production": Uses UserFeatureLive
 */
export const UserFeatureAuto = Layer.suspend(() => {
  switch (env.NODE_ENV) {
    case "test":
      return UserFeatureTest
    case "development":
      return UserFeatureDev
    default:
      return UserFeatureLive
  }
})