/**
 * Smart Error Tracing Configuration
 *
 * Provides environment-aware error tracing with sampling to avoid log clutter.
 * Uses Effect.tapError for logging without modifying the error channel.
 *
 * @module monorepo-library-generator/shared/errors/tracing
 */

/**
 * Generate tracing configuration and utilities
 *
 * Creates environment-aware error tracing with:
 * - Different log levels per environment (production, development, test)
 * - Sampling to avoid log ingestion limits
 * - Cause chain preservation
 * - Smart defaults to minimize noise
 */
export function generateTracingConfig() {
  return `
/**
 * Error tracing configuration per environment
 *
 * Configuration options:
 * - level: Log level for errors ("error" | "warning" | "debug" | "silent")
 * - includeCause: Whether to include cause chain in logs
 * - debugSampleRate: Fraction of debug-level errors to log (0.0 - 1.0)
 */
export const ErrorTraceConfig = {
  production: {
    level: "error" as const,
    includeCause: true,
    debugSampleRate: 0.01, // Log 1% of debug-level errors
  },
  development: {
    level: "debug" as const,
    includeCause: true,
    debugSampleRate: 1.0, // Log all errors in dev
  },
  test: {
    level: "silent" as const,
    includeCause: true,
    debugSampleRate: 0, // No logging in tests
  },
} as const;

export type TraceLevel = "error" | "warning" | "debug" | "silent";

export interface TraceConfig {
  readonly level: TraceLevel;
  readonly includeCause: boolean;
  readonly debugSampleRate: number;
}

/**
 * Get current trace config based on NODE_ENV
 */
export const getTraceConfig = (): TraceConfig => {
  switch (process.env.NODE_ENV) {
    case "production":
      return ErrorTraceConfig.production;
    case "test":
      return ErrorTraceConfig.test;
    case "development":
    default:
      return ErrorTraceConfig.development;
  }
};
`;
}

/**
 * Generate trace error utility using Effect
 *
 * Creates a traceError function that respects environment configuration
 * and sampling rates.
 */
export function generateTraceErrorUtility() {
  return `
/**
 * Trace an error with environment-aware logging
 *
 * Uses Effect.tapError pattern - logs error without modifying error channel.
 * Respects sampling rate for debug-level errors in production.
 *
 * @example
 * \`\`\`typescript
 * yield* someOperation.pipe(
 *   traceError("UserService.create")
 * );
 * \`\`\`
 */
export const traceError = (operation: string) => <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> =>
  effect.pipe(
    Effect.tapError((error) => {
      const config = getTraceConfig();

      if (config.level === "silent") {
        return Effect.void;
      }

      const errorInfo = extractErrorInfo(error, operation, config.includeCause);

      // Apply sampling for non-error level logs
      if (config.level !== "error" && Math.random() > config.debugSampleRate) {
        return Effect.void;
      }

      switch (config.level) {
        case "error":
          return Effect.logError("Operation failed", errorInfo);
        case "warning":
          return Effect.logWarning("Operation failed", errorInfo);
        case "debug":
          return Effect.logDebug("Operation failed", errorInfo);
        default:
          return Effect.void;
      }
    })
  );

/**
 * Schema for parsing tagged errors
 */
const TaggedErrorSchema = Schema.Struct({
  _tag: Schema.optional(Schema.String),
  message: Schema.optional(Schema.String),
  name: Schema.optional(Schema.String),
  correlationId: Schema.optional(Schema.String),
  code: Schema.optional(Schema.String),
  cause: Schema.optional(Schema.Unknown),
});

/**
 * Schema for parsing cause information
 */
const CauseSchema = Schema.Struct({
  _tag: Schema.optional(Schema.String),
  name: Schema.optional(Schema.String),
  message: Schema.optional(Schema.String),
});

/**
 * Extract cause information from an error using Schema
 *
 * Uses Schema.decodeUnknownOption for type-safe parsing without type guards.
 */
const extractCauseInfo = (cause: unknown): { name?: string; message?: string } | string => {
  const result = Schema.decodeUnknownOption(CauseSchema)(cause);
  if (Option.isSome(result)) {
    const parsed = result.value;
    const name = parsed._tag ?? parsed.name;
    if (name !== undefined || parsed.message !== undefined) {
      return {
        ...(name !== undefined ? { name } : {}),
        ...(parsed.message !== undefined ? { message: parsed.message } : {}),
      };
    }
  }
  return String(cause);
};

/**
 * Extract structured error information for logging
 *
 * Uses Schema.decodeUnknownOption for type-safe parsing without type guards.
 */
const extractErrorInfo = (
  error: unknown,
  operation: string,
  includeCause: boolean
): Record<string, unknown> => {
  const info: Record<string, unknown> = {
    operation,
    timestamp: new Date().toISOString(),
  };

  const result = Schema.decodeUnknownOption(TaggedErrorSchema)(error);
  if (Option.isSome(result)) {
    const parsed = result.value;

    if (parsed._tag !== undefined) {
      info.errorTag = parsed._tag;
    }
    if (parsed.message !== undefined) {
      info.message = parsed.message;
    }
    if (parsed.correlationId !== undefined) {
      info.correlationId = parsed.correlationId;
    }
    if (parsed.code !== undefined) {
      info.code = parsed.code;
    }
    if (includeCause && parsed.cause !== undefined) {
      info.cause = extractCauseInfo(parsed.cause);
    }
  } else {
    info.message = String(error);
  }

  return info;
};
`;
}

/**
 * Generate the complete tracing module
 */
export function generateTracingModule() {
  return `/**
 * Error Tracing Utilities
 *
 * Environment-aware error tracing with smart defaults:
 * - Production: Log errors only, sample 1% of debug-level
 * - Development: Log all errors with full cause chains
 * - Test: Silent (no logging)
 *
 * Uses Effect.tapError pattern to log without modifying error channel.
 *
 * @module tracing
 */

import { Effect, Option } from "effect";
import { Schema } from "@effect/schema";

${generateTracingConfig()}

${generateTraceErrorUtility()}

/**
 * Create operation-scoped tracer
 *
 * Returns a function that traces errors with the operation name pre-filled.
 *
 * @example
 * \`\`\`typescript
 * const trace = createTracer("UserService");
 *
 * yield* someOperation.pipe(trace.error("create"));
 * yield* anotherOperation.pipe(trace.error("update"));
 * \`\`\`
 */
export const createTracer = (serviceName: string) => ({
  error: (operation: string) => traceError(\`\${serviceName}.\${operation}\`),
});
`;
}
