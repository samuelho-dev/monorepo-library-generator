import { Data, Effect } from "effect";

/**
 * effect-cache - Error Types
 *
 * CRITICAL: Use Data.TaggedError (NOT manual classes)
 * Reference: provider.md lines 716-766
 */

/**
 * Base EffectCache Error
 *
 * Pattern: Data.TaggedError with inline properties
 */
export class EffectCacheError extends Data.TaggedError("EffectCacheError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * API Error - for Effect.Cache API failures
 */
export class EffectCacheApiError extends Data.TaggedError("EffectCacheApiError")<{
  readonly message: string;
  readonly statusCode?: number;
  readonly errorCode?: string;
  readonly cause?: unknown;
}> {}

/**
 * Connection Error - for network/connectivity failures
 */
export class EffectCacheConnectionError extends Data.TaggedError("EffectCacheConnectionError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Rate Limit Error - for API rate limiting
 */
export class EffectCacheRateLimitError extends Data.TaggedError("EffectCacheRateLimitError")<{
  readonly message: string;
  readonly retryAfter?: number;
  readonly limit?: number;
  readonly remaining?: number;
}> {}

/**
 * Validation Error - for input validation failures
 */
export class EffectCacheValidationError extends Data.TaggedError("EffectCacheValidationError")<{
  readonly message: string;
  readonly field?: string;
  readonly value?: unknown;
}> {}

/**
 * Timeout Error - for request timeouts
 */
export class EffectCacheTimeoutError extends Data.TaggedError("EffectCacheTimeoutError")<{
  readonly message: string;
  readonly timeout: number;
}> {}

/**
 * Authentication Error - for auth failures
 */
export class EffectCacheAuthenticationError extends Data.TaggedError(
  "EffectCacheAuthenticationError",
)<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Not Found Error - for 404 responses
 */
export class EffectCacheNotFoundError extends Data.TaggedError("EffectCacheNotFoundError")<{
  readonly message: string;
  readonly resourceId?: string;
  readonly resourceType?: string;
}> {}

/**
 * Conflict Error - for 409 conflicts
 */
export class EffectCacheConflictError extends Data.TaggedError("EffectCacheConflictError")<{
  readonly message: string;
  readonly conflictingField?: string;
}> {}

/**
 * Config Error - for configuration failures
 */
export class EffectCacheConfigError extends Data.TaggedError("EffectCacheConfigError")<{
  readonly message: string;
  readonly configKey?: string;
}> {}

/**
 * Internal Error - for 5xx server errors
 */
export class EffectCacheInternalError extends Data.TaggedError("EffectCacheInternalError")<{
  readonly message: string;
  readonly statusCode?: number;
  readonly cause?: unknown;
}> {}

/**
 * Union of all EffectCache service errors
 */
export type EffectCacheServiceError =
  | EffectCacheError
  | EffectCacheApiError
  | EffectCacheAuthenticationError
  | EffectCacheRateLimitError
  | EffectCacheTimeoutError
  | EffectCacheConnectionError
  | EffectCacheValidationError
  | EffectCacheNotFoundError
  | EffectCacheConflictError
  | EffectCacheConfigError
  | EffectCacheInternalError;

/**
 * Error Mapping Function
 *
 * CRITICAL: Use safe property access with Reflect.get
 * NO type coercion or assertions
 */
export function mapEffectCacheError(error: unknown) {
  // Safe property access with type guard
  const errorObj = typeof error === "object" && error !== null ? error : {};
  const message = Reflect.get(errorObj, "message");
  const statusCode = Reflect.get(errorObj, "statusCode");
  const code = Reflect.get(errorObj, "code");

  // Authentication errors
  if (statusCode === 401 || statusCode === 403) {
    return new EffectCacheAuthenticationError({
      message: typeof message === "string" ? message : "Authentication failed",
      cause: error,
    });
  }

  // Not found errors
  if (statusCode === 404) {
    const resourceId = Reflect.get(errorObj, "resourceId");
    return new EffectCacheNotFoundError({
      message: typeof message === "string" ? message : "Resource not found",
      ...(typeof resourceId === "string" && { resourceId }),
    });
  }

  // Conflict errors
  if (statusCode === 409) {
    const conflictingField = Reflect.get(errorObj, "field");
    return new EffectCacheConflictError({
      message: typeof message === "string" ? message : "Resource conflict",
      ...(typeof conflictingField === "string" && { conflictingField }),
    });
  }

  // Rate limit errors
  if (statusCode === 429) {
    const retryAfter = Reflect.get(errorObj, "retryAfter");
    return new EffectCacheRateLimitError({
      message: typeof message === "string" ? message : "Rate limit exceeded",
      ...(typeof retryAfter === "number" && { retryAfter }),
    });
  }

  // Timeout errors
  if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT") {
    return new EffectCacheTimeoutError({
      message: typeof message === "string" ? message : "Request timeout",
      timeout: 20000,
    });
  }

  // Connection errors
  if (code === "ECONNREFUSED" || code === "ENOTFOUND") {
    return new EffectCacheConnectionError({
      message: typeof message === "string" ? message : "Connection failed",
      cause: error,
    });
  }

  // Internal server errors (5xx)
  if (typeof statusCode === "number" && statusCode >= 500) {
    return new EffectCacheInternalError({
      message: typeof message === "string" ? message : "Internal server error",
      statusCode,
      cause: error,
    });
  }

  // API errors (other 4xx)
  if (typeof statusCode === "number" && statusCode >= 400) {
    return new EffectCacheApiError({
      message: typeof message === "string" ? message : "API error",
      statusCode,
      ...(typeof code === "string" && { errorCode: code }),
      cause: error,
    });
  }

  // Generic error
  return new EffectCacheError({
    message: typeof message === "string" ? message : "Unknown error",
    cause: error,
  });
}

/**
 * Helper: Run Effect.Cache operation with error mapping
 */
export function runEffectCacheOperation<A>(operation: () => Promise<A>) {
  return Effect.tryPromise({
    try: operation,
    catch: mapEffectCacheError,
  });
}
