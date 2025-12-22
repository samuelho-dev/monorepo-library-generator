import { Data, Effect } from "effect";

/**
 * effect-metrics - Error Types
 *
 * CRITICAL: Use Data.TaggedError (NOT manual classes)
 * Reference: provider.md lines 716-766
 */

/**
 * Base EffectMetrics Error
 *
 * Pattern: Data.TaggedError with inline properties
 */
export class EffectMetricsError extends Data.TaggedError("EffectMetricsError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * API Error - for Effect.Metrics API failures
 */
export class EffectMetricsApiError extends Data.TaggedError("EffectMetricsApiError")<{
  readonly message: string;
  readonly statusCode?: number;
  readonly errorCode?: string;
  readonly cause?: unknown;
}> {}

/**
 * Connection Error - for network/connectivity failures
 */
export class EffectMetricsConnectionError extends Data.TaggedError("EffectMetricsConnectionError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Rate Limit Error - for API rate limiting
 */
export class EffectMetricsRateLimitError extends Data.TaggedError("EffectMetricsRateLimitError")<{
  readonly message: string;
  readonly retryAfter?: number;
  readonly limit?: number;
  readonly remaining?: number;
}> {}

/**
 * Validation Error - for input validation failures
 */
export class EffectMetricsValidationError extends Data.TaggedError("EffectMetricsValidationError")<{
  readonly message: string;
  readonly field?: string;
  readonly value?: unknown;
}> {}

/**
 * Timeout Error - for request timeouts
 */
export class EffectMetricsTimeoutError extends Data.TaggedError("EffectMetricsTimeoutError")<{
  readonly message: string;
  readonly timeout: number;
}> {}

/**
 * Authentication Error - for auth failures
 */
export class EffectMetricsAuthenticationError extends Data.TaggedError(
  "EffectMetricsAuthenticationError",
)<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Not Found Error - for 404 responses
 */
export class EffectMetricsNotFoundError extends Data.TaggedError("EffectMetricsNotFoundError")<{
  readonly message: string;
  readonly resourceId?: string;
  readonly resourceType?: string;
}> {}

/**
 * Conflict Error - for 409 conflicts
 */
export class EffectMetricsConflictError extends Data.TaggedError("EffectMetricsConflictError")<{
  readonly message: string;
  readonly conflictingField?: string;
}> {}

/**
 * Config Error - for configuration failures
 */
export class EffectMetricsConfigError extends Data.TaggedError("EffectMetricsConfigError")<{
  readonly message: string;
  readonly configKey?: string;
}> {}

/**
 * Internal Error - for 5xx server errors
 */
export class EffectMetricsInternalError extends Data.TaggedError("EffectMetricsInternalError")<{
  readonly message: string;
  readonly statusCode?: number;
  readonly cause?: unknown;
}> {}

/**
 * Union of all EffectMetrics service errors
 */
export type EffectMetricsServiceError =
  | EffectMetricsError
  | EffectMetricsApiError
  | EffectMetricsAuthenticationError
  | EffectMetricsRateLimitError
  | EffectMetricsTimeoutError
  | EffectMetricsConnectionError
  | EffectMetricsValidationError
  | EffectMetricsNotFoundError
  | EffectMetricsConflictError
  | EffectMetricsConfigError
  | EffectMetricsInternalError;

/**
 * Error Mapping Function
 *
 * CRITICAL: Use safe property access with Reflect.get
 * NO type coercion or assertions
 */
export function mapEffectMetricsError(error: unknown) {
  // Safe property access with type guard
  const errorObj = typeof error === "object" && error !== null ? error : {};
  const message = Reflect.get(errorObj, "message");
  const statusCode = Reflect.get(errorObj, "statusCode");
  const code = Reflect.get(errorObj, "code");

  // Authentication errors
  if (statusCode === 401 || statusCode === 403) {
    return new EffectMetricsAuthenticationError({
      message: typeof message === "string" ? message : "Authentication failed",
      cause: error,
    });
  }

  // Not found errors
  if (statusCode === 404) {
    const resourceId = Reflect.get(errorObj, "resourceId");
    return new EffectMetricsNotFoundError({
      message: typeof message === "string" ? message : "Resource not found",
      ...(typeof resourceId === "string" && { resourceId }),
    });
  }

  // Conflict errors
  if (statusCode === 409) {
    const conflictingField = Reflect.get(errorObj, "field");
    return new EffectMetricsConflictError({
      message: typeof message === "string" ? message : "Resource conflict",
      ...(typeof conflictingField === "string" && { conflictingField }),
    });
  }

  // Rate limit errors
  if (statusCode === 429) {
    const retryAfter = Reflect.get(errorObj, "retryAfter");
    return new EffectMetricsRateLimitError({
      message: typeof message === "string" ? message : "Rate limit exceeded",
      ...(typeof retryAfter === "number" && { retryAfter }),
    });
  }

  // Timeout errors
  if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT") {
    return new EffectMetricsTimeoutError({
      message: typeof message === "string" ? message : "Request timeout",
      timeout: 20000,
    });
  }

  // Connection errors
  if (code === "ECONNREFUSED" || code === "ENOTFOUND") {
    return new EffectMetricsConnectionError({
      message: typeof message === "string" ? message : "Connection failed",
      cause: error,
    });
  }

  // Internal server errors (5xx)
  if (typeof statusCode === "number" && statusCode >= 500) {
    return new EffectMetricsInternalError({
      message: typeof message === "string" ? message : "Internal server error",
      statusCode,
      cause: error,
    });
  }

  // API errors (other 4xx)
  if (typeof statusCode === "number" && statusCode >= 400) {
    return new EffectMetricsApiError({
      message: typeof message === "string" ? message : "API error",
      statusCode,
      ...(typeof code === "string" && { errorCode: code }),
      cause: error,
    });
  }

  // Generic error
  return new EffectMetricsError({
    message: typeof message === "string" ? message : "Unknown error",
    cause: error,
  });
}

/**
 * Helper: Run Effect.Metrics operation with error mapping
 */
export function runEffectMetricsOperation<A>(operation: () => Promise<A>) {
  return Effect.tryPromise({
    try: operation,
    catch: mapEffectMetricsError,
  });
}
