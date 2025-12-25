import { Context, Effect, Layer } from "effect"

/**
 * User Aggregate Root
 *
 * Aggregate root service that coordinates all User sub-module repositories.

The aggregate root pattern provides:
- Unified access to all sub-module repositories
- Cross-sub-module transaction coordination
- Domain-level invariant enforcement

Sub-modules:
- AuthenticationRepository: authentication operations
- ProfileRepository: profile operations
 *
 * @module @samuelho-dev/data-access-user/aggregate
 */



// ============================================================================
// Sub-Module Repository Imports
// ============================================================================

import { AuthenticationRepository, AuthenticationRepositoryLive } from "./authentication";
import { ProfileRepository, ProfileRepositoryLive } from "./profile";

// ============================================================================
// Infrastructure Imports
// ============================================================================

import { DatabaseService } from "@samuelho-dev/infra-database";
import { LoggingService } from "@samuelho-dev/infra-observability";

// ============================================================================
// Aggregate Interface
// ============================================================================


/**
 * UserAggregate interface
 *
 * Provides unified access to all User sub-module repositories.
 * Use this for operations that span multiple sub-modules.
 */
export interface UserAggregateInterface {
    readonly authentication: Context.Tag.Service<typeof AuthenticationRepository>;
    readonly profile: Context.Tag.Service<typeof ProfileRepository>;

  /**
   * Execute operation across all repositories within a transaction
   *
   * @example
   * ```typescript
   * const aggregate = yield* UserAggregate;
   * yield* aggregate.withTransaction((repos) =>
   *   Effect.gen(function*() {
   *     yield* repos.cart.clear(cartId);
   *     yield* repos.management.create({ ... });
   *   })
   * );
   * ```
   */
  readonly withTransaction: <R, E, A>(
    fn: (repos: Omit<UserAggregateInterface, "withTransaction">) => Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E, R>;
}

// ============================================================================
// Context.Tag Definition
// ============================================================================


/**
 * UserAggregate Context.Tag
 *
 * Use this to access the aggregate root in your Effect programs:
 * ```typescript
 * const aggregate = yield* UserAggregate;
 * const cart = yield* aggregate.cart.getById(cartId);
 * ```
 */
export class UserAggregate extends Context.Tag("UserAggregate")<
  UserAggregate,
  UserAggregateInterface
>() {}

// ============================================================================
// Live Layer Implementation
// ============================================================================


/**
 * UserAggregateLive Layer
 *
 * Live implementation that yields all sub-module repositories.
 * Provides transaction support via withTransaction method.
 */
export const UserAggregateLive = Layer.effect(
  UserAggregate,
  Effect.gen(function*() {
    const logger = yield* LoggingService;
    const authentication = yield* AuthenticationRepository;
    const profile = yield* ProfileRepository;

    yield* logger.debug("UserAggregate initialized", {
      subModules: ["authentication", "profile"],
    });

    return {
      authentication,
      profile,

      withTransaction: (fn) =>
        Effect.gen(function*() {
          yield* logger.debug("UserAggregate.withTransaction started");

          // TODO: Wrap in actual database transaction when available
          // For now, execute sequentially
          const result = yield* fn({
      authentication,
      profile,
          });

          yield* logger.debug("UserAggregate.withTransaction completed");
          return result;
        }),
    };
  })
);

// ============================================================================
// Composed Layers
// ============================================================================


/**
 * Full UserAggregate layer with all dependencies
 *
 * Includes all sub-module repository layers.
 */
export const UserAggregateLayer = UserAggregateLive.pipe(
  Layer.provide(AuthenticationRepositoryLive),
  Layer.provide(ProfileRepositoryLive),
  Layer.provide(DatabaseService.Live),
  Layer.provide(LoggingService.Live)
);

/**
 * Test layer with mocked infrastructure
 */
export const UserAggregateTestLayer = UserAggregateLive.pipe(
  Layer.provide(AuthenticationRepositoryLive),
  Layer.provide(ProfileRepositoryLive),
  Layer.provide(DatabaseService.Test),
  Layer.provide(LoggingService.Test)
);
