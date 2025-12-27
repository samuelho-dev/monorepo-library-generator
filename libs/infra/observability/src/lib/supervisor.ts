import { Effect, Exit, FiberId, Layer, Ref, Supervisor } from "effect"
import type { Context, Fiber, Option } from "effect"

/**
 * Observability Fiber Tracking
 *
 * Optional Effect Supervisor for fiber lifecycle tracking.

Provides:
- makeFiberTrackingSupervisor: Create Supervisor with custom config
- withFiberTracking: Layer that enables fiber tracking
- FiberTrackingMinimal: Only track failures
- FiberTrackingFull: Track all fiber lifecycle events

IMPORTANT: Fiber tracking is OPT-IN. Adding it to every span can
create excessive trace data. Use judiciously in production.
 *
 * @module @samuelho-dev/infra-observability/supervisor
 * @see Effect Supervisor documentation
 */
// ============================================================================
// Supervisor Configuration
// ============================================================================
/**
 * Configuration for fiber tracking
 */
export interface SupervisorConfig {
  /**
   * Track fiber start events
   * @default false (to reduce noise)
   */
  readonly trackStart?: boolean

  /**
   * Track fiber end events
   * @default false (to reduce noise)
   */
  readonly trackEnd?: boolean

  /**
   * Track fiber failures (recommended)
   * @default true
   */
  readonly trackFailure?: boolean

  /**
   * Filter which fibers to track by name pattern
   * Only fibers with names matching this pattern will be tracked.
   * @example /^api-/  // Only track fibers starting with "api-"
   */
  readonly filterPattern?: RegExp

  /**
   * Log level for fiber events
   * @default "debug"
   */
  readonly logLevel?: "trace" | "debug" | "info" | "warning" | "error"
}

// ============================================================================
// Supervisor Factory
// ============================================================================
/**
 * Internal: track a fiber event in a queue for later logging
 */
type FiberEvent = { type: "start"; fiberId: string } | { type: "end"; fiberId: string; failed: boolean; cause?: string }

/**
 * Create a Supervisor that tracks fiber lifecycle events
 *
 * This is OPT-IN functionality. Fiber tracking creates additional log entries
 * for every fiber start/end. Use judiciously in production.
 *
 * NOTE: Effect Supervisor callbacks are synchronous void methods.
 * We queue events and process them asynchronously.
 *
 * @param config - Supervisor configuration
 * @returns Effect that yields a Supervisor
 *
 * @example
 * ```typescript
 * const supervisor = yield* makeFiberTrackingSupervisor({
 *   trackStart: false,  // Don't log fiber starts (too noisy)
 *   trackEnd: false,    // Don't log fiber ends (too noisy)
 *   trackFailure: true, // DO log fiber failures (important!)
 * })
 *
 * yield* Effect.supervised(supervisor)(myProgram)
 * ```
 */
export const makeFiberTrackingSupervisor = (
  config: SupervisorConfig = {}
): Effect.Effect<Supervisor.Supervisor<ReadonlyArray<FiberEvent>>> =>
  Effect.gen(function*() {
    const eventsRef = yield* Ref.make<Array<FiberEvent>>([])

    const shouldTrack = (fiberId: FiberId.FiberId) => {
      if (!config.filterPattern) return true
      const name = FiberId.threadName(fiberId)
      return config.filterPattern.test(name)
    }

    class FiberTrackingSupervisor extends Supervisor.AbstractSupervisor<Array<FiberEvent>> {
      override get value() {
        return Ref.get(eventsRef)
      }

      override onStart<A, E, R>(
        _context: Context.Context<R>,
        _effect: Effect.Effect<A, E, R>,
        _parent: Option.Option<Fiber.RuntimeFiber<unknown, unknown>>,
        fiber: Fiber.RuntimeFiber<A, E>
      ): void {
        if (config.trackStart !== false && shouldTrack(fiber.id())) {
          const event: FiberEvent = { type: "start", fiberId: FiberId.threadName(fiber.id()) }
          Effect.runSync(Ref.update(eventsRef, (events) => [...events, event]))
        }
      }

      override onEnd<A, E>(exit: Exit.Exit<A, E>, fiber: Fiber.RuntimeFiber<A, E>): void {
        const fiberId = FiberId.threadName(fiber.id())

        // Track failures if configured (default true)
        if (config.trackFailure !== false && Exit.isFailure(exit) && shouldTrack(fiber.id())) {
          const event: FiberEvent = {
            type: "end",
            fiberId,
            failed: true,
            cause: String(exit.cause)
          }
          Effect.runSync(Ref.update(eventsRef, (events) => [...events, event]))
        }

        // Track normal ends only if explicitly configured
        if (config.trackEnd === true && Exit.isSuccess(exit) && shouldTrack(fiber.id())) {
          const event: FiberEvent = { type: "end", fiberId, failed: false }
          Effect.runSync(Ref.update(eventsRef, (events) => [...events, event]))
        }
      }
    }

    return new FiberTrackingSupervisor()
  })

// ============================================================================
// Layer Factory
// ============================================================================
/**
 * Create a layer that adds fiber tracking to the application
 *
 * Use Supervisor.addSupervisor to add fiber tracking globally:
 *
 * @example
 * ```typescript
 * const AppLayer = Layer.mergeAll(
 *   Observability.Auto,
 *   Observability.withFiberTracking({ trackFailure: true }),
 *   MyService.Live,
 * )
 * ```
 *
 * @param config - Supervisor configuration
 */
export const withFiberTracking = (config?: SupervisorConfig) =>
  Layer.unwrapEffect(
    Effect.map(
      makeFiberTrackingSupervisor(config),
      (supervisor) => Supervisor.addSupervisor(supervisor)
    )
  )

// ============================================================================
// Pre-configured Layers
// ============================================================================
/**
 * Minimal fiber tracking - only track failures
 *
 * Recommended for production. Logs fiber failures for debugging
 * without the noise of tracking every fiber start/end.
 */
export const FiberTrackingMinimal = withFiberTracking({
  trackStart: false,
  trackEnd: false,
  trackFailure: true,
  logLevel: "warning"
})

/**
 * Full fiber tracking - track all lifecycle events
 *
 * Use for debugging or development. Creates significant log volume
 * in production, so use with caution.
 */
export const FiberTrackingFull = withFiberTracking({
  trackStart: true,
  trackEnd: true,
  trackFailure: true,
  logLevel: "debug"
})

/**
 * Debug fiber tracking with filter pattern
 *
 * Only track fibers matching a specific pattern.
 * Useful for debugging specific parts of your application.
 *
 * @example
 * ```typescript
 * // Only track API-related fibers
 * const ApiTracking = FiberTrackingFiltered(/^api-/)
 *
 * // Only track database fibers
 * const DbTracking = FiberTrackingFiltered(/database/i)
 * ```
 */
export const FiberTrackingFiltered = (pattern: RegExp) =>
  withFiberTracking({
    trackStart: true,
    trackEnd: true,
    trackFailure: true,
    filterPattern: pattern,
    logLevel: "debug"
  })
