import { env } from "@samuelho-dev/env"
import { Context, Effect, Layer } from "effect"
import { OtelProvider } from "./provider"

/**
 * Observability Logging Service
 *
 * Logging infrastructure using Effect Logger primitives.

Provides:
- Structured logging with context annotations
- Log levels (trace, debug, info, warn, error, fatal)
- Span-based distributed tracing
- Child loggers with inherited context

Layer Architecture (follows Service + Provider pattern):
- Console: Standalone logging without OTEL export
- WithOtel: Requires OtelProvider dependency
- Live: Console layer (OTEL export handled by SDK layer composition)
- Test: Silent mock for testing
- Dev: Console with debug output
- Auto: Environment-aware selection

Effect Logger Features:
- Automatic span correlation when OTEL SDK layer is provided
- Structured log annotations
- Configurable log levels via LogLevelConfigs
- OpenTelemetry integration via infra-observability
 *
 * @module @samuelho-dev/infra-observability/logging
 * @see https://effect.website/docs/observability/logging
 */
// ============================================================================
// Logging Service Interface
// ============================================================================
/**
 * Log context for structured logging
 */
export type LogContext = Record<string, unknown>

/**
 * Logger operations interface
 *
 * Defined separately to avoid circular type references in the service class.
 */
export interface LoggingOperations {
  /**
   * Log at TRACE level
   */
  readonly trace: (message: string, context?: LogContext) => Effect.Effect<void>

  /**
   * Log at DEBUG level
   */
  readonly debug: (message: string, context?: LogContext) => Effect.Effect<void>

  /**
   * Log at INFO level
   */
  readonly info: (message: string, context?: LogContext) => Effect.Effect<void>

  /**
   * Log at WARN level
   */
  readonly warn: (message: string, context?: LogContext) => Effect.Effect<void>

  /**
   * Log at ERROR level
   */
  readonly error: (message: string, context?: LogContext) => Effect.Effect<void>

  /**
   * Log at FATAL level
   */
  readonly fatal: (message: string, context?: LogContext) => Effect.Effect<void>

  /**
   * Create child logger with inherited context
   */
  readonly child: (context: LogContext) => Effect.Effect<LoggingOperations>

  /**
   * Execute effect within a named span for distributed tracing
   */
  readonly withSpan: <A, E, R>(
    name: string,
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E, R>

  /**
   * Execute effect with additional log annotations
   */
  readonly withContext: <A, E, R>(
    context: LogContext,
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E, R>
}

/**
 * Logging Service
 *
 * Logging infrastructure using Effect Logger primitives.
 * Provides structured logging with span correlation and OpenTelemetry support.
 *
 * @example
 * ```typescript
 * import { LoggingService } from "@samuelho-dev/infra-observability";
 *
 * const program = Effect.gen(function*() {
 *   const logger = yield* LoggingService;
 *   yield* logger.info("Application started", { version: "1.0.0" })
 * }).pipe(Effect.provide(LoggingService.Live))
 * ```
 */
export class LoggingService extends Context.Tag(
  "@samuelho-dev/infra-observability/LoggingService"
)<
  LoggingService,
  LoggingOperations
>() {
  // ===========================================================================
  // Helper: Make Logger Instance
  // ===========================================================================

  /**
   * Create logger instance with optional base context
   */
  static makeLogger(baseContext: LogContext) {
    const log = (level: "trace" | "debug" | "info" | "warn" | "error" | "fatal") =>
      (message: string, context?: LogContext) => {
        const mergedContext = { ...baseContext, ...context }
        const logFn = {
          trace: Effect.logTrace,
          debug: Effect.logDebug,
          info: Effect.logInfo,
          warn: Effect.logWarning,
          error: Effect.logError,
          fatal: Effect.logFatal
        }[level]

        return Object.keys(mergedContext).length > 0
          ? logFn(message).pipe(Effect.annotateLogs(mergedContext))
          : logFn(message)
      }

    return {
      trace: log("trace"),
      debug: log("debug"),
      info: log("info"),
      warn: log("warn"),
      error: log("error"),
      fatal: log("fatal"),

      child: (context: LogContext) =>
        Effect.succeed(LoggingService.makeLogger({ ...baseContext, ...context })),

      withSpan: <A, E, R>(name: string, effect: Effect.Effect<A, E, R>) =>
        effect.pipe(Effect.withSpan(name)),

      withContext: <A, E, R>(context: LogContext, effect: Effect.Effect<A, E, R>) =>
        effect.pipe(Effect.annotateLogs({ ...baseContext, ...context }))
    }
  }

  // ===========================================================================
  // Console Layer (Standalone - No OTEL)
  // ===========================================================================

  /**
   * Console Layer - Standalone logging without OTEL provider
   *
   * Uses Effect's built-in logging. Logs go to console but are not
   * exported via OpenTelemetry. Use for simple applications or when
   * OTEL infrastructure is not available.
   */
  static readonly Console = Layer.succeed(LoggingService, LoggingService.makeLogger({}))

  // ===========================================================================
  // WithOtel Layer (Requires OtelProvider)
  // ===========================================================================

  /**
   * WithOtel Layer - Logging with OTEL provider dependency
   *
   * Requires OtelProvider to be provided. Use this when you want to
   * compose with a custom OtelProvider configuration.
   *
   * @example
   * ```typescript
   * const customLayer = Layer.provide(
   *   LoggingService.WithOtel,
   *   OtelProvider.make({ serviceName: "custom" })
   * )
   * ```
   */
  static readonly WithOtel = Layer.effect(
    LoggingService,
    Effect.gen(function*() {
      const otel = yield* OtelProvider
      // Create logger with OTEL context
      return LoggingService.makeLogger({
        "otel.service.name": otel.serviceName,
        "otel.service.version": otel.serviceVersion,
      })
    })
  )

  // ===========================================================================
  // Static Live Layer
  // ===========================================================================

  /**
   * Live Layer - Production logging with OTEL
   *
   * Uses Console logger but when composed with OtelProvider.Live in the
   * application layer, Effect's logging will be exported via OTEL.
   *
   * Note: The OTEL SDK layer (from OtelProvider) handles the actual export.
   * This layer just provides the logging interface.
   */
  static readonly Live = Layer.provide(
    LoggingService.WithOtel,
    OtelProvider.Live
  )

  // ===========================================================================
  // Static Test Layer
  // ===========================================================================

  /**
   * Test Layer - Silent logging for tests
   *
   * Logs are suppressed by default. Use Test layer when you don't want
   * logs cluttering test output.
   */
  static readonly Test = Layer.succeed(LoggingService, {
    trace: () => Effect.void,
    debug: () => Effect.void,
    info: () => Effect.void,
    warn: () => Effect.void,
    error: () => Effect.void,
    fatal: () => Effect.void,
    child: (context: LogContext) =>
      Effect.succeed(LoggingService.makeLogger(context)),
    withSpan: <A, E, R>(
      _name: string,
      effect: Effect.Effect<A, E, R>
    ) => effect,
    withContext: <A, E, R>(
      _context: LogContext,
      effect: Effect.Effect<A, E, R>
    ) => effect
  })

  // ===========================================================================
  // Static Dev Layer
  // ===========================================================================

  /**
   * Dev Layer - Development logging with OTEL
   *
   * Uses OTEL provider for local development. Attempts to connect to
   * localhost OTEL collector but won't fail if unavailable.
   */
  static readonly Dev = Layer.provide(
    LoggingService.WithOtel,
    OtelProvider.Dev
  )

  // ===========================================================================
  // Auto Layer
  // ===========================================================================

  /**
   * Auto Layer - Environment-aware layer selection
   *
   * Selects appropriate layer based on NODE_ENV:
   * - "production" → Live (with OtelProvider.Live)
   * - "development" → Dev (with OtelProvider.Dev)
   * - "test" → Test (silent, no OTEL)
   * - default → Dev
   */
  static readonly Auto = Layer.suspend(() => {
    switch (env.NODE_ENV) {
      case "production":
        return LoggingService.Live
      case "test":
        return LoggingService.Test
      default:
        // "development" and other environments use Dev
        return LoggingService.Dev
    }
  })
}
