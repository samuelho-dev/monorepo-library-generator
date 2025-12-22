import { Data, Effect } from "effect"

/**
 * effect-logger - Error Types
 *
 * CRITICAL: Use Data.TaggedError (NOT manual classes)
 * Reference: provider.md lines 716-766
 */


/**
 * Base EffectLogger Error
 *
 * Pattern: Data.TaggedError with inline properties
 */
export class EffectLoggerError extends Data.TaggedError("EffectLoggerError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * API Error - for Effect.Logger API failures
 */
export class EffectLoggerApiError extends Data.TaggedError("EffectLoggerApiError")<{
  readonly message: string;
  readonly statusCode?: number;
  readonly errorCode?: string;
  readonly cause?: unknown;
}> {}

/**
 * Connection Error - for network/connectivity failures
 */
export class EffectLoggerConnectionError extends Data.TaggedError("EffectLoggerConnectionError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Rate Limit Error - for API rate limiting
 */
export class EffectLoggerRateLimitError extends Data.TaggedError("EffectLoggerRateLimitError")<{
  readonly message: string;
  readonly retryAfter?: number;
  readonly limit?: number;
  readonly remaining?: number;
}> {}

/**
 * Validation Error - for input validation failures
 */
export class EffectLoggerValidationError extends Data.TaggedError("EffectLoggerValidationError")<{
  readonly message: string;
  readonly field?: string;
  readonly value?: unknown;
}> {}

/**
 * Timeout Error - for request timeouts
 */
export class EffectLoggerTimeoutError extends Data.TaggedError("EffectLoggerTimeoutError")<{
  readonly message: string;
  readonly timeout: number;
}> {}

/**
 * Authentication Error - for auth failures
 */
export class EffectLoggerAuthenticationError extends Data.TaggedError("EffectLoggerAuthenticationError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Not Found Error - for 404 responses
 */
export class EffectLoggerNotFoundError extends Data.TaggedError("EffectLoggerNotFoundError")<{
  readonly message: string;
  readonly resourceId?: string;
  readonly resourceType?: string;
}> {}

/**
 * Conflict Error - for 409 conflicts
 */
export class EffectLoggerConflictError extends Data.TaggedError("EffectLoggerConflictError")<{
  readonly message: string;
  readonly conflictingField?: string;
}> {}

/**
 * Config Error - for configuration failures
 */
export class EffectLoggerConfigError extends Data.TaggedError("EffectLoggerConfigError")<{
  readonly message: string;
  readonly configKey?: string;
}> {}

/**
 * Internal Error - for 5xx server errors
 */
export class EffectLoggerInternalError extends Data.TaggedError("EffectLoggerInternalError")<{
  readonly message: string;
  readonly statusCode?: number;
  readonly cause?: unknown;
}> {}

/**
 * Union of all EffectLogger service errors
 */
export type EffectLoggerServiceError =
  | EffectLoggerError
  | EffectLoggerApiError
  | EffectLoggerAuthenticationError
  | EffectLoggerRateLimitError
  | EffectLoggerTimeoutError
  | EffectLoggerConnectionError
  | EffectLoggerValidationError
  | EffectLoggerNotFoundError
  | EffectLoggerConflictError
  | EffectLoggerConfigError
  | EffectLoggerInternalError;

/**
 * Error Mapping Function
 *
 * CRITICAL: Use safe property access with Reflect.get
 * NO type coercion or assertions
 */
export function mapEffectLoggerError(error: unknown) {
  // Safe property access with type guard
  const errorObj = typeof error === "object" && error !== null ? error : {};
  const message = Reflect.get(errorObj, "message");
  const statusCode = Reflect.get(errorObj, "statusCode");
  const code = Reflect.get(errorObj, "code");

  // Authentication errors
  if (statusCode === 401 || statusCode === 403) {
    return new EffectLoggerAuthenticationError({
      message: typeof message === "string" ? message : "Authentication failed",
      cause: error,
    });
  }

  // Not found errors
  if (statusCode === 404) {
    const resourceId = Reflect.get(errorObj, "resourceId");
    return new EffectLoggerNotFoundError({
      message: typeof message === "string" ? message : "Resource not found",
      ...(typeof resourceId === "string" && { resourceId }),
    });
  }

  // Conflict errors
  if (statusCode === 409) {
    const conflictingField = Reflect.get(errorObj, "field");
    return new EffectLoggerConflictError({
      message: typeof message === "string" ? message : "Resource conflict",
      ...(typeof conflictingField === "string" && { conflictingField }),
    });
  }

  // Rate limit errors
  if (statusCode === 429) {
    const retryAfter = Reflect.get(errorObj, "retryAfter");
    return new EffectLoggerRateLimitError({
      message: typeof message === "string" ? message : "Rate limit exceeded",
      ...(typeof retryAfter === "number" && { retryAfter }),
    });
  }

  // Timeout errors
  if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT") {
    return new EffectLoggerTimeoutError({
      message: typeof message === "string" ? message : "Request timeout",
      timeout: 20000,
    });
  }

  // Connection errors
  if (code === "ECONNREFUSED" || code === "ENOTFOUND") {
    return new EffectLoggerConnectionError({
      message: typeof message === "string" ? message : "Connection failed",
      cause: error,
    });
  }

  // Internal server errors (5xx)
  if (typeof statusCode === "number" && statusCode >= 500) {
    return new EffectLoggerInternalError({
      message: typeof message === "string" ? message : "Internal server error",
      statusCode,
      cause: error,
    });
  }

  // API errors (other 4xx)
  if (typeof statusCode === "number" && statusCode >= 400) {
    return new EffectLoggerApiError({
      message: typeof message === "string" ? message : "API error",
      statusCode,
      ...(typeof code === "string" && { errorCode: code }),
      cause: error,
    });
  }

  // Generic error
  return new EffectLoggerError({
    message: typeof message === "string" ? message : "Unknown error",
    cause: error,
  });
}

/**
 * Helper: Run Effect.Logger operation with error mapping
 */
export function runEffectLoggerOperation<A>(
  operation: () => Promise<A>,
) {
  return Effect.tryPromise({
    try: operation,
    catch: mapEffectLoggerError,
  });
}
