import { Data, Effect } from "effect"

/**
 * effect-pubsub - Error Types
 *
 * CRITICAL: Use Data.TaggedError (NOT manual classes)
 * Reference: provider.md lines 716-766
 */


/**
 * Base EffectPubsub Error
 *
 * Pattern: Data.TaggedError with inline properties
 */
export class EffectPubsubError extends Data.TaggedError("EffectPubsubError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * API Error - for Effect.PubSub API failures
 */
export class EffectPubsubApiError extends Data.TaggedError("EffectPubsubApiError")<{
  readonly message: string;
  readonly statusCode?: number;
  readonly errorCode?: string;
  readonly cause?: unknown;
}> {}

/**
 * Connection Error - for network/connectivity failures
 */
export class EffectPubsubConnectionError extends Data.TaggedError("EffectPubsubConnectionError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Rate Limit Error - for API rate limiting
 */
export class EffectPubsubRateLimitError extends Data.TaggedError("EffectPubsubRateLimitError")<{
  readonly message: string;
  readonly retryAfter?: number;
  readonly limit?: number;
  readonly remaining?: number;
}> {}

/**
 * Validation Error - for input validation failures
 */
export class EffectPubsubValidationError extends Data.TaggedError("EffectPubsubValidationError")<{
  readonly message: string;
  readonly field?: string;
  readonly value?: unknown;
}> {}

/**
 * Timeout Error - for request timeouts
 */
export class EffectPubsubTimeoutError extends Data.TaggedError("EffectPubsubTimeoutError")<{
  readonly message: string;
  readonly timeout: number;
}> {}

/**
 * Authentication Error - for auth failures
 */
export class EffectPubsubAuthenticationError extends Data.TaggedError("EffectPubsubAuthenticationError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Not Found Error - for 404 responses
 */
export class EffectPubsubNotFoundError extends Data.TaggedError("EffectPubsubNotFoundError")<{
  readonly message: string;
  readonly resourceId?: string;
  readonly resourceType?: string;
}> {}

/**
 * Conflict Error - for 409 conflicts
 */
export class EffectPubsubConflictError extends Data.TaggedError("EffectPubsubConflictError")<{
  readonly message: string;
  readonly conflictingField?: string;
}> {}

/**
 * Config Error - for configuration failures
 */
export class EffectPubsubConfigError extends Data.TaggedError("EffectPubsubConfigError")<{
  readonly message: string;
  readonly configKey?: string;
}> {}

/**
 * Internal Error - for 5xx server errors
 */
export class EffectPubsubInternalError extends Data.TaggedError("EffectPubsubInternalError")<{
  readonly message: string;
  readonly statusCode?: number;
  readonly cause?: unknown;
}> {}

/**
 * Union of all EffectPubsub service errors
 */
export type EffectPubsubServiceError =
  | EffectPubsubError
  | EffectPubsubApiError
  | EffectPubsubAuthenticationError
  | EffectPubsubRateLimitError
  | EffectPubsubTimeoutError
  | EffectPubsubConnectionError
  | EffectPubsubValidationError
  | EffectPubsubNotFoundError
  | EffectPubsubConflictError
  | EffectPubsubConfigError
  | EffectPubsubInternalError;

/**
 * Error Mapping Function
 *
 * CRITICAL: Use safe property access with Reflect.get
 * NO type coercion or assertions
 */
export function mapEffectPubsubError(error: unknown) {
  // Safe property access with type guard
  const errorObj = typeof error === "object" && error !== null ? error : {};
  const message = Reflect.get(errorObj, "message");
  const statusCode = Reflect.get(errorObj, "statusCode");
  const code = Reflect.get(errorObj, "code");

  // Authentication errors
  if (statusCode === 401 || statusCode === 403) {
    return new EffectPubsubAuthenticationError({
      message: typeof message === "string" ? message : "Authentication failed",
      cause: error,
    });
  }

  // Not found errors
  if (statusCode === 404) {
    const resourceId = Reflect.get(errorObj, "resourceId");
    return new EffectPubsubNotFoundError({
      message: typeof message === "string" ? message : "Resource not found",
      ...(typeof resourceId === "string" && { resourceId }),
    });
  }

  // Conflict errors
  if (statusCode === 409) {
    const conflictingField = Reflect.get(errorObj, "field");
    return new EffectPubsubConflictError({
      message: typeof message === "string" ? message : "Resource conflict",
      ...(typeof conflictingField === "string" && { conflictingField }),
    });
  }

  // Rate limit errors
  if (statusCode === 429) {
    const retryAfter = Reflect.get(errorObj, "retryAfter");
    return new EffectPubsubRateLimitError({
      message: typeof message === "string" ? message : "Rate limit exceeded",
      ...(typeof retryAfter === "number" && { retryAfter }),
    });
  }

  // Timeout errors
  if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT") {
    return new EffectPubsubTimeoutError({
      message: typeof message === "string" ? message : "Request timeout",
      timeout: 20000,
    });
  }

  // Connection errors
  if (code === "ECONNREFUSED" || code === "ENOTFOUND") {
    return new EffectPubsubConnectionError({
      message: typeof message === "string" ? message : "Connection failed",
      cause: error,
    });
  }

  // Internal server errors (5xx)
  if (typeof statusCode === "number" && statusCode >= 500) {
    return new EffectPubsubInternalError({
      message: typeof message === "string" ? message : "Internal server error",
      statusCode,
      cause: error,
    });
  }

  // API errors (other 4xx)
  if (typeof statusCode === "number" && statusCode >= 400) {
    return new EffectPubsubApiError({
      message: typeof message === "string" ? message : "API error",
      statusCode,
      ...(typeof code === "string" && { errorCode: code }),
      cause: error,
    });
  }

  // Generic error
  return new EffectPubsubError({
    message: typeof message === "string" ? message : "Unknown error",
    cause: error,
  });
}

/**
 * Helper: Run Effect.PubSub operation with error mapping
 */
export function runEffectPubsubOperation<A>(
  operation: () => Promise<A>,
) {
  return Effect.tryPromise({
    try: operation,
    catch: mapEffectPubsubError,
  });
}
