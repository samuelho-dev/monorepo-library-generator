import { UserRepository } from "../repository.js";
import { Layer } from "effect";

/**
 * User Data Access Layers
 *
 * Effect layer compositions for dependency injection of user repositories.
Provides Live, Test, Dev, and Auto environment-based layer selection.

TODO: Customize this file:
1. Update imports to match actual repository implementation location
2. Compose with infrastructure layers (database, cache, etc.)
3. Add repository-specific configuration if needed
4. Define layer composition order and dependencies
5. Add error handling wrapping if needed

@see https://effect.website/docs/guides/context-management for layer composition
 *
 * @module @custom-repo/data-access-user/server
 */



// ============================================================================
// Environment-Specific Layers
// ============================================================================


/**
 * User Data Access Live Layer
 *
 * Production environment layer using real database connections.
 * Provides UserRepository for data access operations.
 *
 * TODO: Compose with infrastructure layers
 * Example:
 * ```typescript
 * export const UserDataAccessLive = Layer.mergeAll(
 *   UserRepository.Live,
 *   DatabaseLayer,
 *   CacheLayer,
 * ).pipe(Layer.provide(InfrastructureLayer));
 * ```
 */
export const UserDataAccessLive = Layer.mergeAll(
  UserRepository.Live,
  // TODO: Add infrastructure dependencies
  // Example: DatabaseLayer, CacheLayer, LoggingLayer
);

/**
 * User Data Access Test Layer
 *
 * Testing environment layer using in-memory storage.
 * Provides isolated UserRepository for test cases.
 *
 * Usage in tests:
 * ```typescript
 * import { UserDataAccessTest } from "@custom-repo/data-access-user/server";
 *
 * describe("User Repository", () => {
 *   it("should find entity by id", () =>
 *     Effect.gen(function* () {
 *       const repo = yield* UserRepository;
 *       // ... test operations
 *     }).pipe(Effect.provide(UserDataAccessTest))
 *   );
 * });
 * ```
 */
export const UserDataAccessTest = Layer.mergeAll(
  UserRepository.Test,
  // TODO: Add test-specific layers if needed
);

/**
 * User Data Access Dev Layer
 *
 * Development environment layer with logging and debugging.
 * Useful for local development and debugging repository operations.
 *
 * Features:
 * - Operation logging and timing
 * - Error details and stack traces
 * - Query inspection
 */
export const UserDataAccessDev = Layer.mergeAll(
  UserRepository.Dev,
  // TODO: Add development-specific layers
  // Example: DetailedLoggingLayer, PerformanceMonitoringLayer
);

/**
 * User Data Access Auto Layer
 *
 * Automatically selects appropriate layer based on NODE_ENV.
 * - test: Uses in-memory layer for test isolation
 * - development: Uses layer with debugging/logging
 * - production: Uses live layer with real infrastructure
 *
 * Usage:
 * ```typescript
 * // Automatically picks correct layer based on environment
 * Effect.provide(UserDataAccessAuto)
 * ```
 */
export const UserDataAccessAuto = (() => {
  const env = process.env["NODE_ENV"] || "production";

  switch (env) {
    case "test":
      return UserDataAccessTest;
    case "development":
      return UserDataAccessDev;
    default:
      return UserDataAccessLive;
  }
})();

// TODO: Export specific composition for common scenarios
//
// export const UserDataAccessWithCache = Layer.mergeAll(
//   UserDataAccessLive,
//   CacheLayer,
// );
//
// export const UserDataAccessWithTracing = Layer.mergeAll(
//   UserDataAccessLive,
//   DistributedTracingLayer,
// );
