import { DatabaseService } from "@samuelho-dev/infra-database"
import { LoggingService, MetricsService } from "@samuelho-dev/infra-observability"
import { Layer } from "effect"

/**
 * User Profile Layer
 *
 * Layer composition for profile sub-module within the user feature.

Provides Live and Test layers with proper dependency composition.
All infrastructure dependencies are properly wired.
 *
 * @module @samuelho-dev/feature-user/server/services/profile
 */



// ============================================================================
// Service Import
// ============================================================================

import { ProfileServiceLive } from "./service";

// ============================================================================
// Data Access Import
// ============================================================================

import { ProfileRepositoryLive, ProfileRepositoryTest } from "@samuelho-dev/data-access-user/profile";

// ============================================================================
// Infrastructure Imports
// ============================================================================


// ============================================================================
// Re-export Service Components
// ============================================================================


export {
  ProfileService,
  ProfileServiceLive,
  type ProfileServiceInterface,
  ProfileServiceError,
} from "./service";

// ============================================================================
// Live Layer Composition
// ============================================================================


/**
 * ProfileLive Layer
 *
 * Full production layer with all dependencies composed:
 * - ProfileService (business logic)
 * - ProfileRepository (data access)
 * - LoggingService (structured logging)
 * - MetricsService (observability)
 * - DatabaseService (persistence)
 *
 * @example
 * ```typescript
 * import { ProfileLive } from "@samuelho-dev/feature-user/server/services/profile";
 *
 * const program = Effect.gen(function*() {
 *   const service = yield* ProfileService;
 *   return yield* service.getById(id);
 * });
 *
 * const result = yield* program.pipe(
 *   Effect.provide(ProfileLive)
 * );
 * ```
 */
export const ProfileLive = ProfileServiceLive.pipe(
  Layer.provide(ProfileRepositoryLive),
  Layer.provide(LoggingService.Live),
  Layer.provide(MetricsService.Live),
  Layer.provide(DatabaseService.Live)
);

// ============================================================================
// Test Layer Composition
// ============================================================================


/**
 * ProfileTest Layer
 *
 * Test layer with mocked infrastructure:
 * - ProfileRepositoryTest (in-memory store)
 * - LoggingService.Test (test logger)
 * - MetricsService.Test (test metrics)
 *
 * @example
 * ```typescript
 * import { ProfileTest } from "@samuelho-dev/feature-user/server/services/profile";
 *
 * const testProgram = Effect.gen(function*() {
 *   const service = yield* ProfileService;
 *   const result = yield* service.create({ ... });
 *   // assertions
 * });
 *
 * await Effect.runPromise(testProgram.pipe(
 *   Effect.provide(ProfileTest)
 * ));
 * ```
 */
export const ProfileTest = ProfileServiceLive.pipe(
  Layer.provide(ProfileRepositoryTest),
  Layer.provide(LoggingService.Test),
  Layer.provide(MetricsService.Test)
);

// ============================================================================
// Dependencies Layer (for parent composition)
// ============================================================================


/**
 * ProfileDependencies Layer
 *
 * Layer that provides just the ProfileService.
 * Use this when composing with parent service layers.
 *
 * The parent service should provide:
 * - Repository layer
 * - Infrastructure layers
 */
export const ProfileDependencies = ProfileServiceLive;
