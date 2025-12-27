import type { Duration, Schema } from "effect"
import { Context, Effect, Layer, Option } from "effect"

/**
 * User Query Base
 *
 * Base Query class for user CQRS read operations.

Queries represent requests to read system state.
They never modify state and can be cached for performance.

Pattern: Query → QueryBus → Handler → Repository → Result

Usage:
- Extend Query class for each read operation
- Register handlers with QueryBus
- Optional caching via CacheService
 *
 * @module @samuelho-dev/feature-user/server/cqrs/queries
 */

// ============================================================================
// Query Base Class
// ============================================================================

/**
 * Base Query for CQRS read operations
 *
 * Queries represent requests to read system state.
 * They never modify state and can be cached.
 *
 * @typeParam TInput - Schema for query input
 * @typeParam TOutput - Schema for query output (result)
 * @typeParam TError - Union type of possible errors
 * @typeParam TDeps - Context dependencies required by handler
 *
 * @example
 * ```typescript
 * class GetUserByIdQuery extends Query<
 *   typeof UserIdInput,
 *   typeof UserResult,
 *   UserNotFoundError,
 *   DatabaseService
 * > {
 *   readonly _tag = "GetUserByIdQuery";
 *   readonly input = UserIdInput;
 *   readonly output = UserResult;
 *   readonly cacheTTL = Option.some(Duration.minutes(5))
 *
 *   execute(input) {
 *     return Effect.gen(function*() {
 *       const db = yield* DatabaseService;
 *       return yield* db.findById(input.id)
 *     })
 *   }
 * }
 * ```
 */
export abstract class Query<
  TInput extends Schema.Schema.AnyNoContext,
  TOutput extends Schema.Schema.AnyNoContext,
  TError,
  TDeps = never
> {
  /**
   * Unique query tag for routing
   */
  abstract readonly _tag: string

  /**
   * Input schema for validation
   */
  abstract readonly input: TInput

  /**
   * Output schema for response
   */
  abstract readonly output: TOutput

  /**
   * Optional cache TTL for query results
   * Set to Option.none() to disable caching
   */
  readonly cacheTTL: Option.Option<Duration.Duration> = Option.none()

  /**
   * Generate cache key from input
   * Override for custom cache key generation
   */
  cacheKey(input: Schema.Schema.Type<TInput>) {
    return `${this._tag}:${JSON.stringify(input)}`
  }

  /**
   * Execute the query
   *
   * @param input - Validated query input
   * @returns Effect with result or error
   */
  abstract execute(
    input: Schema.Schema.Type<TInput>
  ): Effect.Effect<Schema.Schema.Type<TOutput>, TError, TDeps>
}

// ============================================================================
// QueryBus Interface
// ============================================================================

/**
 * QueryBus Interface
 *
 * Dispatches queries to their handlers with optional caching.
 */
export interface QueryBusInterface {
  /**
   * Dispatch a query to its handler
   *
   * @param query - The query instance to dispatch
   * @param input - The validated input for the query
   */
  readonly dispatch: <
    TInput extends Schema.Schema.AnyNoContext,
    TOutput extends Schema.Schema.AnyNoContext,
    TError,
    TDeps
  >(
    query: Query<TInput, TOutput, TError, TDeps>,
    input: Schema.Schema.Type<TInput>
  ) => Effect.Effect<Schema.Schema.Type<TOutput>, TError, TDeps>

  /**
   * Invalidate cached query results
   *
   * @param query - The query to invalidate
   * @param input - Optional specific input to invalidate
   */
  readonly invalidate: <
    TInput extends Schema.Schema.AnyNoContext,
    TOutput extends Schema.Schema.AnyNoContext,
    TError,
    TDeps
  >(
    query: Query<TInput, TOutput, TError, TDeps>,
    input?: Schema.Schema.Type<TInput>
  ) => Effect.Effect<void>
}

// ============================================================================
// QueryBus Context.Tag
// ============================================================================

/**
 * User QueryBus Context Tag
 *
 * Provides query dispatch capability via Context.
 * Supports optional caching through CacheService integration.
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function*() {
 *   const bus = yield* UserQueryBus;
 *
 *   // First call executes query
 *   const result1 = yield* bus.dispatch(
 *     new GetUserByIdQuery(),
 *     { id: "123" }
 *   )
 *
 *   // Second call may return cached result (if cacheTTL is set)
 *   const result2 = yield* bus.dispatch(
 *     new GetUserByIdQuery(),
 *     { id: "123" }
 *   )
 *
 *   return result1;
 * })
 * ```
 */
export class UserQueryBus extends Context.Tag("UserQueryBus")<
  UserQueryBus,
  QueryBusInterface
>() {
  /**
   * Live layer - dispatches queries directly (no caching)
   *
   * For caching, provide a layer that integrates with CacheService
   */
  static readonly Live = Layer.succeed(
    this,
    {
      dispatch: (query, input) =>
        query.execute(input).pipe(
          Effect.withSpan(`UserQueryBus.dispatch.${query._tag}`)
        ),
      invalidate: () => Effect.void
    }
  )

  /**
   * Test layer - same as Live, suitable for testing
   */
  static readonly Test = this.Live
}
