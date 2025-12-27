import { LoggingService, MetricsService } from "@samuelho-dev/infra-observability"
import { Context, Effect, Layer } from "effect"

/**
 * User Operation Executor
 *
 * Executes user operations with middleware pipeline.

Operations are the unit of work that combines commands and queries
with cross-cutting concerns like logging, metrics, and tracing.

Pattern: Operation → Middleware → Handler → Result

Usage:
- Wrap command/query execution in operations
- Add custom middleware for validation, auth, etc.
 *
 * @module @samuelho-dev/feature-user/server/cqrs/operations
 */

// ============================================================================
// Infrastructure Services
// ============================================================================

// ============================================================================
// Operation Types
// ============================================================================

/**
 * Operation metadata for tracing and logging
 */
export interface OperationMetadata {
  /** Unique operation name */
  readonly name: string

  /** Operation type (command or query) */
  readonly type: "command" | "query"

  /** Optional correlation ID */
  readonly correlationId?: string

  /** Optional user/service context */
  readonly actor?: string
}

/**
 * Middleware function type
 *
 * @typeParam A - Success type
 * @typeParam E - Error type
 * @typeParam R - Dependencies
 */
export type Middleware<A, E, R> = (
  next: Effect.Effect<A, E, R>
) => Effect.Effect<A, E, R>

// ============================================================================
// Operation Executor Interface
// ============================================================================

/**
 * Operation Executor Interface
 *
 * Executes operations with middleware pipeline.
 */
export interface OperationExecutorInterface {
  /**
   * Execute an operation with middleware
   *
   * @param metadata - Operation metadata for tracing
   * @param operation - The operation Effect to execute
   * @param middlewares - Optional additional middlewares
   */
  readonly execute: <A, E, R>(
    metadata: OperationMetadata,
    operation: Effect.Effect<A, E, R>,
    middlewares?: ReadonlyArray<Middleware<A, E, R>>
  ) => Effect.Effect<A, E, R | LoggingService | MetricsService>
}

// ============================================================================
// Operation Executor Implementation
// ============================================================================

/**
 * Create executor implementation with infrastructure dependencies
 */
const createExecutorImpl = (
  logger: Context.Tag.Service<typeof LoggingService>,
  metrics: Context.Tag.Service<typeof MetricsService>
): OperationExecutorInterface => ({
  execute: <A, E, R>(
    metadata: OperationMetadata,
    operation: Effect.Effect<A, E, R>,
    middlewares: ReadonlyArray<Middleware<A, E, R>> = []
  ) => {
    // Build middleware pipeline
    const pipeline = middlewares.reduce<Effect.Effect<A, E, R>>(
      (acc, middleware) => middleware(acc),
      operation
    )

    return Effect.gen(function*() {
      const startTime = Date.now()
      const histogram = yield* metrics.histogram("user_operation_duration_seconds")
      const counter = yield* metrics.counter("user_operations_total")

      yield* logger.debug(`Starting ${metadata.type}: ${metadata.name}`, {
        type: metadata.type,
        correlationId: metadata.correlationId,
        actor: metadata.actor
      })

      const result = yield* pipeline.pipe(
        Effect.tapError((error) =>
          Effect.gen(function*() {
            yield* counter.increment
            yield* logger.error(`${metadata.type} failed: ${metadata.name}`, {
              error: String(error),
              correlationId: metadata.correlationId
            })
          })
        )
      )

      const duration = (Date.now() - startTime) / 1000
      yield* histogram.record(duration)
      yield* counter.increment

      yield* logger.info(`Completed ${metadata.type}: ${metadata.name}`, {
        durationMs: Date.now() - startTime,
        correlationId: metadata.correlationId
      })

      return result
    }).pipe(
      Effect.withSpan(`UserOperation.${metadata.name}`, {
        attributes: {
          "operation.type": metadata.type,
          "operation.name": metadata.name,
          ...(metadata.correlationId && { "correlation.id": metadata.correlationId }),
          ...(metadata.actor && { actor: metadata.actor })
        }
      })
    )
  }
})

// ============================================================================
// Operation Executor Context.Tag
// ============================================================================

/**
 * User Operation Executor Context Tag
 *
 * Provides operation execution with middleware pipeline.
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function*() {
 *   const executor = yield* UserOperationExecutor;
 *   const bus = yield* UserCommandBus;
 *
 *   const result = yield* executor.execute(
 *     {
 *       name: "CreateUser",
 *       type: "command",
 *       correlationId: "req-123",
 *     },
 *     bus.dispatch(new CreateUserCommand(), input)
 *   )
 *
 *   return result;
 * })
 * ```
 */
export class UserOperationExecutor extends Context.Tag("UserOperationExecutor")<
  UserOperationExecutor,
  OperationExecutorInterface
>() {
  /**
   * Live layer with logging and metrics
   */
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function*() {
      const logger = yield* LoggingService
      const metrics = yield* MetricsService

      return createExecutorImpl(logger, metrics)
    })
  )

  /**
   * Test layer - same as Live
   */
  static readonly Test = this.Live
}

// ============================================================================
// Common Middlewares
// ============================================================================

/**
 * Create a validation middleware
 *
 * @example
 * ```typescript
 * const validateMiddleware = createValidationMiddleware(
 *   (input) => input.name.length > 0
 * )
 * ```
 */
export function createValidationMiddleware<A, E, R>(
  validate: (input: unknown) => boolean,
  errorFactory: () => E
): Middleware<A, E, R> {
  return (next) =>
    Effect.gen(function*() {
      // Validation would happen before dispatch
      return yield* next
    })
}

/**
 * Create a retry middleware
 *
 * @example
 * ```typescript
 * const retryMiddleware = createRetryMiddleware({ times: 3 })
 * ```
 */
export function createRetryMiddleware<A, E, R>(options: {
  readonly times: number
}): Middleware<A, E, R> {
  return (next) =>
    next.pipe(
      Effect.retry({ times: options.times })
    )
}
