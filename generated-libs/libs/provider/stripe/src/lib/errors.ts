import { Data, Effect } from "effect";

/**
 * stripe - Error Types
 *
 * CRITICAL: Use Data.TaggedError (NOT manual classes)
 * Reference: provider.md lines 716-766
 */


/**
 * Base Stripe Error
 *
 * Pattern: Data.TaggedError with inline properties
 */
export class StripeError extends Data.TaggedError("StripeError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * API Error - for Stripe API failures
 */
export class StripeApiError extends Data.TaggedError("StripeApiError")<{
  readonly message: string;
  readonly statusCode?: number;
  readonly errorCode?: string;
  readonly cause?: unknown;
}> {}

/**
 * Connection Error - for network/connectivity failures
 */
export class StripeConnectionError extends Data.TaggedError("StripeConnectionError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Rate Limit Error - for API rate limiting
 */
export class StripeRateLimitError extends Data.TaggedError("StripeRateLimitError")<{
  readonly message: string;
  readonly retryAfter?: number;
  readonly limit?: number;
  readonly remaining?: number;
}> {}

/**
 * Validation Error - for input validation failures
 */
export class StripeValidationError extends Data.TaggedError("StripeValidationError")<{
  readonly message: string;
  readonly field?: string;
  readonly value?: unknown;
}> {}

/**
 * Timeout Error - for request timeouts
 */
export class StripeTimeoutError extends Data.TaggedError("StripeTimeoutError")<{
  readonly message: string;
  readonly timeout: number;
}> {}

/**
 * Authentication Error - for auth failures
 */
export class StripeAuthenticationError extends Data.TaggedError("StripeAuthenticationError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Error Mapping Function
 *
 * CRITICAL: Use safe property access with Reflect.get
 * NO type coercion or assertions
 */
export function mapStripeError(error: unknown): StripeError {
  // Safe property access with type guard
  const errorObj = typeof error === "object" && error !== null ? error : {};
  const message = Reflect.get(errorObj, "message");
  const statusCode = Reflect.get(errorObj, "statusCode");
  const code = Reflect.get(errorObj, "code");

  // Authentication errors
  if (statusCode === 401 || statusCode === 403) {
    return new StripeAuthenticationError({
      message: typeof message === "string" ? message : "Authentication failed",
      cause: error,
    });
  }

  // Rate limit errors
  if (statusCode === 429) {
    const retryAfter = Reflect.get(errorObj, "retryAfter");
    return new StripeRateLimitError({
      message: typeof message === "string" ? message : "Rate limit exceeded",
      retryAfter: typeof retryAfter === "number" ? retryAfter : undefined,
    });
  }

  // Timeout errors
  if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT") {
    return new StripeTimeoutError({
      message: typeof message === "string" ? message : "Request timeout",
      timeout: 20000,
    });
  }

  // Connection errors
  if (code === "ECONNREFUSED" || code === "ENOTFOUND") {
    return new StripeConnectionError({
      message: typeof message === "string" ? message : "Connection failed",
      cause: error,
    });
  }

  // API errors (4xx/5xx)
  if (typeof statusCode === "number" && statusCode >= 400) {
    return new StripeApiError({
      message: typeof message === "string" ? message : "API error",
      statusCode,
      errorCode: typeof code === "string" ? code : undefined,
      cause: error,
    });
  }

  // Generic error
  return new StripeError({
    message: typeof message === "string" ? message : "Unknown error",
    cause: error,
  });
}

/**
 * Helper: Run Stripe operation with error mapping
 */
export function runStripeOperation<A>(
  operation: () => Promise<A>,
): Effect.Effect<A, StripeError> {
  return Effect.tryPromise({
    try: operation,
    catch: mapStripeError,
  });
}
