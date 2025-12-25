import { DatabaseService } from "@samuelho-dev/infra-database"
import { LoggingService, MetricsService } from "@samuelho-dev/infra-observability"
import { Layer } from "effect"

/**
 * User Authentication Layer
 *
 * Layer composition for authentication sub-module within the user feature.

Provides Live and Test layers with proper dependency composition.
All infrastructure dependencies are properly wired.
 *
 * @module @samuelho-dev/feature-user/server/services/authentication
 */
// ============================================================================
// Service Import
// ============================================================================
import { AuthenticationServiceLive } from "./service"

// ============================================================================
// Data Access Import
// ============================================================================
import { AuthenticationRepositoryLive, AuthenticationRepositoryTest } from "@samuelho-dev/data-access-user/authentication"

// ============================================================================
// Infrastructure Imports
// ============================================================================
// ============================================================================
// Live Layer Composition
// ============================================================================
/**
 * AuthenticationLive Layer
 *
 * Full production layer with all dependencies composed:
 * - AuthenticationService (business logic)
 * - AuthenticationRepository (data access)
 * - LoggingService (structured logging)
 * - MetricsService (observability)
 * - DatabaseService (persistence)
 *
 * @example
 * ```typescript
 * import { AuthenticationLive } from "@samuelho-dev/feature-user/server/services/authentication";
 *
 * const program = Effect.gen(function*() {
 *   const service = yield* AuthenticationService;
 *   return yield* service.getById(id);
 * });
 *
 * const result = yield* program.pipe(
 *   Effect.provide(AuthenticationLive)
 * );
 * ```
 */
export const AuthenticationLive = AuthenticationServiceLive.pipe(
  Layer.provide(AuthenticationRepositoryLive),
  Layer.provide(LoggingService.Live),
  Layer.provide(MetricsService.Live),
  Layer.provide(DatabaseService.Live)
)
// ============================================================================
// Test Layer Composition
// ============================================================================
/**
 * AuthenticationTest Layer
 *
 * Test layer with mocked infrastructure:
 * - AuthenticationRepositoryTest (in-memory store)
 * - LoggingService.Test (test logger)
 * - MetricsService.Test (test metrics)
 *
 * @example
 * ```typescript
 * import { AuthenticationTest } from "@samuelho-dev/feature-user/server/services/authentication";
 *
 * const testProgram = Effect.gen(function*() {
 *   const service = yield* AuthenticationService;
 *   const result = yield* service.create({ ... });
 *   // assertions
 * });
 *
 * await Effect.runPromise(testProgram.pipe(
 *   Effect.provide(AuthenticationTest)
 * ));
 * ```
 */
export const AuthenticationTest = AuthenticationServiceLive.pipe(
  Layer.provide(AuthenticationRepositoryTest),
  Layer.provide(LoggingService.Test),
  Layer.provide(MetricsService.Test)
)
// ============================================================================
// Dependencies Layer (for parent composition)
// ============================================================================
/**
 * AuthenticationDependencies Layer
 *
 * Layer that provides just the AuthenticationService.
 * Use this when composing with parent service layers.
 *
 * The parent service should provide:
 * - Repository layer
 * - Infrastructure layers
 */
export const AuthenticationDependencies = AuthenticationServiceLive