import { Effect, Exit, FiberId, Layer, Supervisor } from "effect"
import type { Fiber, Option } from "effect"

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
 * Create a Supervisor that logs fiber lifecycle events
 *
 * This is OPT-IN functionality. Fiber tracking creates additional log entries
 * for every fiber start/end. Use judiciously in production.
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
export const makeFiberTrackingSupervisor = (config: SupervisorConfig = {}) =>
  Effect.sync(() => {
    const shouldTrack = (fiberId: FiberId.FiberId) => {
      if (!config.filterPattern) return true
      const name = FiberId.threadName(fiberId)
      return config.filterPattern.test(name)
    }

    const logEvent = (message: string, data: Record<string, unknown>) => {
      switch (config.logLevel ?? "debug") {
        case "trace":
          return Effect.logTrace(message, data)
        case "debug":
          return Effect.logDebug(message, data)
        case "info":
          return Effect.logInfo(message, data)
        case "warning":
          return Effect.logWarning(message, data)
        case "error":
          return Effect.logError(message, data)
        default:
          return Effect.logDebug(message, data)
      }
    }

    return Supervisor.fromEffect(
      Effect.gen(function*(_) {
        return {
          onStart: <A, E, R>(_context: unknown, _effect: Effect.Effect<A, E, R>, _parent: Option.Option<Fiber.RuntimeFiber<unknown, unknown>>, fiber: Fiber.RuntimeFiber<A, E>) => {
            if (config.trackStart !== false && shouldTrack(fiber.id())) {
              return logEvent("Fiber started", {
                fiberId: FiberId.threadName(fiber.id())
              })
            }
            return Effect.void
          },
          onEnd: <A, E>(exit: Exit.Exit<A, E>, fiber: Fiber.RuntimeFiber<A, E>) => {
            const fiberId = FiberId.threadName(fiber.id())

            // Always track failures if configured (default true)
            if (config.trackFailure !== false && Exit.isFailure(exit) && shouldTrack(fiber.id())) {
              return logEvent("Fiber failed", {
                fiberId,
                failure: Exit.isFailure(exit) ? String(exit.cause) : undefined
              })
            }

            // Track normal ends only if explicitly configured
            if (config.trackEnd === true && Exit.isSuccess(exit) && shouldTrack(fiber.id())) {
              return logEvent("Fiber completed", {
                fiberId
              })
            }

            return Effect.void
          },
          onEffect: () => Effect.void,
          onSuspend: () => Effect.void,
          onResume: () => Effect.void,
        }
      })
    )
  }).pipe(Effect.flatten)

// ============================================================================
// Layer Factory
// ============================================================================
/**
 * Create a layer that adds fiber tracking to the application
 *
 * Use with Layer.mergeAll to add fiber tracking to your app:
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
  Layer.scopedDiscard(
    Effect.gen(function*() {
      const supervisor = yield* makeFiberTrackingSupervisor(config)
      yield* Effect.withSupervisor(supervisor)
    })
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
