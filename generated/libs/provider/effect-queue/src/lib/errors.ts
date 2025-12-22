import { Data, Effect } from "effect"

/**
 * effect-queue - Error Types
 *
 * CRITICAL: Use Data.TaggedError (NOT manual classes)
 * Reference: provider.md lines 716-766
 */


/**
 * Base EffectQueue Error
 *
 * Pattern: Data.TaggedError with inline properties
 */
export class EffectQueueError extends Data.TaggedError("EffectQueueError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * API Error - for Effect.Queue API failures
 */
export class EffectQueueApiError extends Data.TaggedError("EffectQueueApiError")<{
  readonly message: string;
  readonly statusCode?: number;
  readonly errorCode?: string;
  readonly cause?: unknown;
}> {}

/**
 * Connection Error - for network/connectivity failures
 */
export class EffectQueueConnectionError extends Data.TaggedError("EffectQueueConnectionError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Rate Limit Error - for API rate limiting
 */
export class EffectQueueRateLimitError extends Data.TaggedError("EffectQueueRateLimitError")<{
  readonly message: string;
  readonly retryAfter?: number;
  readonly limit?: number;
  readonly remaining?: number;
}> {}

/**
 * Validation Error - for input validation failures
 */
export class EffectQueueValidationError extends Data.TaggedError("EffectQueueValidationError")<{
  readonly message: string;
  readonly field?: string;
  readonly value?: unknown;
}> {}

/**
 * Timeout Error - for request timeouts
 */
export class EffectQueueTimeoutError extends Data.TaggedError("EffectQueueTimeoutError")<{
  readonly message: string;
  readonly timeout: number;
}> {}

/**
 * Authentication Error - for auth failures
 */
export class EffectQueueAuthenticationError extends Data.TaggedError("EffectQueueAuthenticationError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Not Found Error - for 404 responses
 */
export class EffectQueueNotFoundError extends Data.TaggedError("EffectQueueNotFoundError")<{
  readonly message: string;
  readonly resourceId?: string;
  readonly resourceType?: string;
}> {}

/**
 * Conflict Error - for 409 conflicts
 */
export class EffectQueueConflictError extends Data.TaggedError("EffectQueueConflictError")<{
  readonly message: string;
  readonly conflictingField?: string;
}> {}

/**
 * Config Error - for configuration failures
 */
export class EffectQueueConfigError extends Data.TaggedError("EffectQueueConfigError")<{
  readonly message: string;
  readonly configKey?: string;
}> {}

/**
 * Internal Error - for 5xx server errors
 */
export class EffectQueueInternalError extends Data.TaggedError("EffectQueueInternalError")<{
  readonly message: string;
  readonly statusCode?: number;
  readonly cause?: unknown;
}> {}

/**
 * Union of all EffectQueue service errors
 */
export type EffectQueueServiceError =
  | EffectQueueError
  | EffectQueueApiError
  | EffectQueueAuthenticationError
  | EffectQueueRateLimitError
  | EffectQueueTimeoutError
  | EffectQueueConnectionError
  | EffectQueueValidationError
  | EffectQueueNotFoundError
  | EffectQueueConflictError
  | EffectQueueConfigError
  | EffectQueueInternalError;

/**
 * Error Mapping Function
 *
 * CRITICAL: Use safe property access with Reflect.get
 * NO type coercion or assertions
 */
export function mapEffectQueueError(error: unknown) {
  // Safe property access with type guard
  const errorObj = typeof error === "object" && error !== null ? error : {};
  const message = Reflect.get(errorObj, "message");
  const statusCode = Reflect.get(errorObj, "statusCode");
  const code = Reflect.get(errorObj, "code");

  // Authentication errors
  if (statusCode === 401 || statusCode === 403) {
    return new EffectQueueAuthenticationError({
      message: typeof message === "string" ? message : "Authentication failed",
      cause: error,
    });
  }

  // Not found errors
  if (statusCode === 404) {
    const resourceId = Reflect.get(errorObj, "resourceId");
    return new EffectQueueNotFoundError({
      message: typeof message === "string" ? message : "Resource not found",
      ...(typeof resourceId === "string" && { resourceId }),
    });
  }

  // Conflict errors
  if (statusCode === 409) {
    const conflictingField = Reflect.get(errorObj, "field");
    return new EffectQueueConflictError({
      message: typeof message === "string" ? message : "Resource conflict",
      ...(typeof conflictingField === "string" && { conflictingField }),
    });
  }

  // Rate limit errors
  if (statusCode === 429) {
    const retryAfter = Reflect.get(errorObj, "retryAfter");
    return new EffectQueueRateLimitError({
      message: typeof message === "string" ? message : "Rate limit exceeded",
      ...(typeof retryAfter === "number" && { retryAfter }),
    });
  }

  // Timeout errors
  if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT") {
    return new EffectQueueTimeoutError({
      message: typeof message === "string" ? message : "Request timeout",
      timeout: 20000,
    });
  }

  // Connection errors
  if (code === "ECONNREFUSED" || code === "ENOTFOUND") {
    return new EffectQueueConnectionError({
      message: typeof message === "string" ? message : "Connection failed",
      cause: error,
    });
  }

  // Internal server errors (5xx)
  if (typeof statusCode === "number" && statusCode >= 500) {
    return new EffectQueueInternalError({
      message: typeof message === "string" ? message : "Internal server error",
      statusCode,
      cause: error,
    });
  }

  // API errors (other 4xx)
  if (typeof statusCode === "number" && statusCode >= 400) {
    return new EffectQueueApiError({
      message: typeof message === "string" ? message : "API error",
      statusCode,
      ...(typeof code === "string" && { errorCode: code }),
      cause: error,
    });
  }

  // Generic error
  return new EffectQueueError({
    message: typeof message === "string" ? message : "Unknown error",
    cause: error,
  });
}

/**
 * Helper: Run Effect.Queue operation with error mapping
 */
export function runEffectQueueOperation<A>(
  operation: () => Promise<A>,
) {
  return Effect.tryPromise({
    try: operation,
    catch: mapEffectQueueError,
  });
}
