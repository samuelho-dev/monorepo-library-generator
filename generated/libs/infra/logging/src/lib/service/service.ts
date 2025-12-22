import { Context, Effect, Layer } from "effect";

/**
 * Logging Service
 *
 * Logging infrastructure using Effect Logger primitives.

Provides:
- Structured logging with context annotations
- Log levels (trace, debug, info, warn, error, fatal)
- Span-based distributed tracing
- Child loggers with inherited context

Effect Logger Features:
- Automatic span correlation
- Structured log annotations
- Configurable log levels
- OpenTelemetry integration
 *
 * @module @myorg/infra-logging/service
 * @see EFFECT_PATTERNS.md for logging patterns
 */

// ============================================================================
// Logging Service Interface (Effect Logger Wrapper)
// ============================================================================

/**
 * Log context for structured logging
 */
export type LogContext = Record<string, unknown>;

/**
 * Logger operations interface
 *
 * Defined separately to avoid circular type references in the service class.
 */
export interface LoggingOperations {
  /**
   * Log at TRACE level
   */
  readonly trace: (message: string, context?: LogContext) => Effect.Effect<void>;

  /**
   * Log at DEBUG level
   */
  readonly debug: (message: string, context?: LogContext) => Effect.Effect<void>;

  /**
   * Log at INFO level
   */
  readonly info: (message: string, context?: LogContext) => Effect.Effect<void>;

  /**
   * Log at WARN level
   */
  readonly warn: (message: string, context?: LogContext) => Effect.Effect<void>;

  /**
   * Log at ERROR level
   */
  readonly error: (message: string, context?: LogContext) => Effect.Effect<void>;

  /**
   * Log at FATAL level
   */
  readonly fatal: (message: string, context?: LogContext) => Effect.Effect<void>;

  /**
   * Create child logger with inherited context
   */
  readonly child: (context: LogContext) => Effect.Effect<LoggingOperations>;

  /**
   * Execute effect within a named span for distributed tracing
   */
  readonly withSpan: <A, E, R>(
    name: string,
    effect: Effect.Effect<A, E, R>,
  ) => Effect.Effect<A, E, R>;

  /**
   * Execute effect with additional log annotations
   */
  readonly withContext: <A, E, R>(
    context: LogContext,
    effect: Effect.Effect<A, E, R>,
  ) => Effect.Effect<A, E, R>;
}

/**
 * Logging Service
 *
 * Logging infrastructure using Effect Logger primitives.
 * Provides structured logging with span correlation and OpenTelemetry support.
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const logger = yield* LoggingService;
 *   yield* logger.info("Application started", { version: "1.0.0" });
 * }).pipe(Effect.provide(LoggingService.Live));
 * ```
 */
export class LoggingService extends Context.Tag("@myorg/infra-logging/LoggingService")<
  LoggingService,
  LoggingOperations
>() {
  // ===========================================================================
  // Static Live Layer (Effect Logger)
  // ===========================================================================

  /**
   * Live Layer - Production logging using Effect Logger
   *
   * Uses Effect's built-in logging with structured annotations.
   * Integrates with OpenTelemetry when OTEL layer is provided.
   */
  static readonly Live = Layer.succeed(this, LoggingService.makeLogger({}));

  // ===========================================================================
  // Static Test Layer
  // ===========================================================================

  /**
   * Test Layer - Silent logging for tests
   *
   * Logs are suppressed by default. Use Test layer when you don't want
   * logs cluttering test output.
   */
  static readonly Test = Layer.succeed(this, {
    trace: (_message: string, _context?: LogContext) => Effect.void,
    debug: (_message: string, _context?: LogContext) => Effect.void,
    info: (_message: string, _context?: LogContext) => Effect.void,
    warn: (_message: string, _context?: LogContext) => Effect.void,
    error: (_message: string, _context?: LogContext) => Effect.void,
    fatal: (_message: string, _context?: LogContext) => Effect.void,
    child: (context: LogContext) => Effect.succeed(LoggingService.makeLogger(context)),
    withSpan: <A, E, R>(_name: string, effect: Effect.Effect<A, E, R>) => effect,
    withContext: <A, E, R>(_context: LogContext, effect: Effect.Effect<A, E, R>) => effect,
  });

  // ===========================================================================
  // Static Dev Layer
  // ===========================================================================

  /**
   * Dev Layer - Pretty-printed console logging
   *
   * Formats logs for human readability during development.
   */
  static readonly Dev = Layer.succeed(this, LoggingService.makeLogger({}));

  // ===========================================================================
  // Helper: Make Logger Instance
  // ===========================================================================

  /**
   * Create logger instance with optional base context
   */
  static makeLogger(baseContext: LogContext): LoggingOperations {
    const log =
      (level: "trace" | "debug" | "info" | "warn" | "error" | "fatal") =>
      (message: string, context?: LogContext) => {
        const mergedContext = { ...baseContext, ...context };
        const logFn = {
          trace: Effect.logTrace,
          debug: Effect.logDebug,
          info: Effect.logInfo,
          warn: Effect.logWarning,
          error: Effect.logError,
          fatal: Effect.logFatal,
        }[level];

        return Object.keys(mergedContext).length > 0
          ? logFn(message).pipe(Effect.annotateLogs(mergedContext))
          : logFn(message);
      };

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
        effect.pipe(Effect.annotateLogs({ ...baseContext, ...context })),
    };
  }
}
