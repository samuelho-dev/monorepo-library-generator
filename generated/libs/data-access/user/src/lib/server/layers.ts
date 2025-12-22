import { DatabaseService } from "@myorg/infra-database";
import { Layer } from "effect";
import { UserRepository } from "../repository";

/**
 * User Data Access Layers
 *
 * Effect layer compositions for dependency injection of user repositories.

@see https://effect.website/docs/guides/context-management for layer composition
 *
 * @module @myorg/data-access-user/server
 */

// ============================================================================
// Layer Compositions
// ============================================================================

/**
 * User Repository Live Layer
 *
 * Production layer with DatabaseService dependency.
 * Compose with DatabaseService.Live for production use.
 *
 * @example
 * ```typescript
 * const RepositoryLayer = UserRepositoryLive.pipe(
 *   Layer.provide(DatabaseService.Live)
 * );
 * ```
 */
export const UserRepositoryLive = UserRepository.Live;

/**
 * User Repository with Database Layer
 *
 * Fully composed layer for production use.
 * Includes DatabaseService.Live dependency.
 */
export const UserRepositoryLayer = UserRepository.Live.pipe(Layer.provide(DatabaseService.Live));

/**
 * User Repository Test Layer
 *
 * For testing, compose with DatabaseService.Test:
 *
 * @example
 * ```typescript
 * const TestLayer = UserRepository.Live.pipe(
 *   Layer.provide(DatabaseService.Test)
 * );
 *
 * it.scoped("should work", () =>
 *   Effect.gen(function* () {
 *     const repo = yield* UserRepository;
 *     // test operations
 *   }).pipe(Effect.provide(TestLayer))
 * );
 * ```
 */
export const UserRepositoryTestLayer = UserRepository.Live.pipe(
  Layer.provide(DatabaseService.Test),
);
