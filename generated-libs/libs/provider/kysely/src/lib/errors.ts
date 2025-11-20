import { Data, Effect } from "effect";

/**
 * kysely - Error Types
 *
 * CRITICAL: Use Data.TaggedError (NOT manual classes)
 * Reference: provider.md lines 716-766
 */


/**
 * Base Kysely Error
 *
 * Pattern: Data.TaggedError with inline properties
 */
export class KyselyError extends Data.TaggedError("KyselyError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * API Error - for Kysely API failures
 */
export class KyselyApiError extends Data.TaggedError("KyselyApiError")<{
  readonly message: string;
  readonly statusCode?: number;
  readonly errorCode?: string;
  readonly cause?: unknown;
}> {}

/**
 * Connection Error - for network/connectivity failures
 */
export class KyselyConnectionError extends Data.TaggedError("KyselyConnectionError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Rate Limit Error - for API rate limiting
 */
export class KyselyRateLimitError extends Data.TaggedError("KyselyRateLimitError")<{
  readonly message: string;
  readonly retryAfter?: number;
  readonly limit?: number;
  readonly remaining?: number;
}> {}

/**
 * Validation Error - for input validation failures
 */
export class KyselyValidationError extends Data.TaggedError("KyselyValidationError")<{
  readonly message: string;
  readonly field?: string;
  readonly value?: unknown;
}> {}

/**
 * Timeout Error - for request timeouts
 */
export class KyselyTimeoutError extends Data.TaggedError("KyselyTimeoutError")<{
  readonly message: string;
  readonly timeout: number;
}> {}

/**
 * Authentication Error - for auth failures
 */
export class KyselyAuthenticationError extends Data.TaggedError("KyselyAuthenticationError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Error Mapping Function
 *
 * CRITICAL: Use safe property access with Reflect.get
 * NO type coercion or assertions
 */
export function mapKyselyError(error: unknown): KyselyError {
  // Safe property access with type guard
  const errorObj = typeof error === "object" && error !== null ? error : {};
  const message = Reflect.get(errorObj, "message");
  const statusCode = Reflect.get(errorObj, "statusCode");
  const code = Reflect.get(errorObj, "code");

  // Authentication errors
  if (statusCode === 401 || statusCode === 403) {
    return new KyselyAuthenticationError({
      message: typeof message === "string" ? message : "Authentication failed",
      cause: error,
    });
  }

  // Rate limit errors
  if (statusCode === 429) {
    const retryAfter = Reflect.get(errorObj, "retryAfter");
    return new KyselyRateLimitError({
      message: typeof message === "string" ? message : "Rate limit exceeded",
      retryAfter: typeof retryAfter === "number" ? retryAfter : undefined,
    });
  }

  // Timeout errors
  if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT") {
    return new KyselyTimeoutError({
      message: typeof message === "string" ? message : "Request timeout",
      timeout: 20000,
    });
  }

  // Connection errors
  if (code === "ECONNREFUSED" || code === "ENOTFOUND") {
    return new KyselyConnectionError({
      message: typeof message === "string" ? message : "Connection failed",
      cause: error,
    });
  }

  // API errors (4xx/5xx)
  if (typeof statusCode === "number" && statusCode >= 400) {
    return new KyselyApiError({
      message: typeof message === "string" ? message : "API error",
      statusCode,
      errorCode: typeof code === "string" ? code : undefined,
      cause: error,
    });
  }

  // Generic error
  return new KyselyError({
    message: typeof message === "string" ? message : "Unknown error",
    cause: error,
  });
}

/**
 * Helper: Run Kysely operation with error mapping
 */
export function runKyselyOperation<A>(
  operation: () => Promise<A>,
): Effect.Effect<A, KyselyError> {
  return Effect.tryPromise({
    try: operation,
    catch: mapKyselyError,
  });
}
