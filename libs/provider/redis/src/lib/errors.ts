import { Schema } from "@effect/schema"
import { Data, Option } from "effect"

/**
 * Redis Provider - Error Types
 *
 * Error types for Redis operations using Data.TaggedError pattern.

Includes:
- RedisError: Base error for all Redis operations
- RedisConnectionError: Connection failures
- RedisTimeoutError: Operation timeouts
- RedisCommandError: Command execution failures
 *
 * @module @samuelho-dev/provider-redis/service/errors
 */



// ============================================================================
// Base Error
// ============================================================================


/**
 * Base Redis Error
 *
 * Pattern: Data.TaggedError with inline properties
 */
export class RedisError extends Data.TaggedError("RedisError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// ============================================================================
// Connection Errors
// ============================================================================


/**
 * Redis Connection Error
 *
 * Thrown when unable to establish or maintain connection to Redis server.
 */
export class RedisConnectionError extends Data.TaggedError("RedisConnectionError")<{
  readonly message: string;
  readonly host?: string;
  readonly port?: number;
  readonly cause?: unknown;
}> {}

/**
 * Redis Timeout Error
 *
 * Thrown when a Redis operation exceeds the configured timeout.
 */
export class RedisTimeoutError extends Data.TaggedError("RedisTimeoutError")<{
  readonly message: string;
  readonly timeout: number;
  readonly operation?: string;
  readonly cause?: unknown;
}> {}

// ============================================================================
// Command Errors
// ============================================================================


/**
 * Redis Command Error
 *
 * Thrown when a Redis command fails to execute.
 */
export class RedisCommandError extends Data.TaggedError("RedisCommandError")<{
  readonly message: string;
  readonly command: string;
  readonly args?: ReadonlyArray<unknown>;
  readonly cause?: unknown;
}> {}

/**
 * Redis Key Error
 *
 * Thrown for key-related issues (key not found, wrong type, etc.)
 */
export class RedisKeyError extends Data.TaggedError("RedisKeyError")<{
  readonly message: string;
  readonly key: string;
  readonly expectedType?: string;
  readonly actualType?: string;
}> {}

// ============================================================================
// PubSub Errors
// ============================================================================


/**
 * Redis PubSub Error
 *
 * Thrown for pub/sub related failures.
 */
export class RedisPubSubError extends Data.TaggedError("RedisPubSubError")<{
  readonly message: string;
  readonly channel?: string;
  readonly cause?: unknown;
}> {}

// ============================================================================
// Error Union Type
// ============================================================================


/**
 * Union of all Redis provider errors
 */
export type RedisProviderError =
  | RedisError
  | RedisConnectionError
  | RedisTimeoutError
  | RedisCommandError
  | RedisKeyError
  | RedisPubSubError;

// ============================================================================
// SDK Error Schema
// ============================================================================


/**
 * Schema for parsing SDK error objects
 *
 * Uses Schema.decodeUnknownOption for type-safe parsing without type guards
 */
const SdkErrorSchema = Schema.Struct({
  message: Schema.optional(Schema.String),
  code: Schema.optional(Schema.String),
});

/**
 * Parse SDK error using Schema
 */
function parseSdkError(error: unknown) {
  const result = Schema.decodeUnknownOption(SdkErrorSchema)(error);
  return Option.isSome(result) ? result.value : { message: undefined, code: undefined };
}

// ============================================================================
// Error Mapping
// ============================================================================


/**
 * Map unknown errors to typed Redis errors
 *
 * Uses Schema.decodeUnknownOption for type-safe parsing
 */
export function mapRedisError(error: unknown, command?: string) {
  const { message, code } = parseSdkError(error);

  // Connection errors
  if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ECONNRESET") {
    return new RedisConnectionError({
      message: message ?? "Connection failed",
      cause: error,
    });
  }

  // Timeout errors
  if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT") {
    return new RedisTimeoutError({
      message: message ?? "Operation timed out",
      timeout: 20000,
      ...(command !== undefined ? { operation: command } : {}),
      cause: error,
    });
  }

  // Command errors
  if (command !== undefined) {
    return new RedisCommandError({
      message: message ?? "Command failed",
      command,
      cause: error,
    });
  }

  // Generic error
  return new RedisError({
    message: message ?? "Unknown Redis error",
    cause: error,
  });
}