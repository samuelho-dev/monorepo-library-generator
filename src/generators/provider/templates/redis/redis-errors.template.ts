/**
 * Redis Provider Errors Template
 *
 * Generates error types for the Redis provider library using Data.TaggedError pattern.
 *
 * @module monorepo-library-generator/provider/templates/redis/errors
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder'
import type { ProviderTemplateOptions } from '../../../../utils/types'

/**
 * Generate Redis provider errors file
 */
export function generateRedisErrorsFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { packageName } = options

  builder.addFileHeader({
    title: 'Redis Provider - Error Types',
    description: `Error types for Redis operations using Data.TaggedError pattern.

Includes:
- RedisError: Base error for all Redis operations
- RedisConnectionError: Connection failures
- RedisTimeoutError: Operation timeouts
- RedisCommandError: Command execution failures`,
    module: `${packageName}/service/errors`
  })
  builder.addBlankLine()

  // Imports
  builder.addImports([{ from: 'effect', imports: ['Data', 'Option', 'Schema'] }])
  builder.addBlankLine()

  // Base Error
  builder.addSectionComment('Base Error')
  builder.addBlankLine()

  builder.addRaw(`/**
 * Base Redis Error
 *
 * Pattern: Data.TaggedError with inline properties
 */
export class RedisError extends Data.TaggedError("RedisError")<{
  readonly message: string
  readonly cause?: unknown
}> {}`)
  builder.addBlankLine()

  // Connection Error
  builder.addSectionComment('Connection Errors')
  builder.addBlankLine()

  builder.addRaw(`/**
 * Redis Connection Error
 *
 * Thrown when unable to establish or maintain connection to Redis server.
 */
export class RedisConnectionError extends Data.TaggedError("RedisConnectionError")<{
  readonly message: string
  readonly host?: string
  readonly port?: number
  readonly cause?: unknown
}> {}`)
  builder.addBlankLine()

  // Timeout Error
  builder.addRaw(`/**
 * Redis Timeout Error
 *
 * Thrown when a Redis operation exceeds the configured timeout.
 */
export class RedisTimeoutError extends Data.TaggedError("RedisTimeoutError")<{
  readonly message: string
  readonly timeout: number
  readonly operation?: string
  readonly cause?: unknown
}> {}`)
  builder.addBlankLine()

  // Command Error
  builder.addSectionComment('Command Errors')
  builder.addBlankLine()

  builder.addRaw(`/**
 * Redis Command Error
 *
 * Thrown when a Redis command fails to execute.
 */
export class RedisCommandError extends Data.TaggedError("RedisCommandError")<{
  readonly message: string
  readonly command: string
  readonly args?: readonly unknown[]
  readonly cause?: unknown
}> {}`)
  builder.addBlankLine()

  // Key Error
  builder.addRaw(`/**
 * Redis Key Error
 *
 * Thrown for key-related issues (key not found, wrong type, etc.)
 */
export class RedisKeyError extends Data.TaggedError("RedisKeyError")<{
  readonly message: string
  readonly key: string
  readonly expectedType?: string
  readonly actualType?: string
}> {}`)
  builder.addBlankLine()

  // PubSub Error
  builder.addSectionComment('PubSub Errors')
  builder.addBlankLine()

  builder.addRaw(`/**
 * Redis PubSub Error
 *
 * Thrown for pub/sub related failures.
 */
export class RedisPubSubError extends Data.TaggedError("RedisPubSubError")<{
  readonly message: string
  readonly channel?: string
  readonly cause?: unknown
}> {}`)
  builder.addBlankLine()

  // Union Type
  builder.addSectionComment('Error Union Type')
  builder.addBlankLine()

  builder.addRaw(`/**
 * Union of all Redis provider errors
 */
export type RedisProviderError =
  | RedisError
  | RedisConnectionError
  | RedisTimeoutError
  | RedisCommandError
  | RedisKeyError
  | RedisPubSubError`)
  builder.addBlankLine()

  // SDK Error Schema for parsing unknown errors
  builder.addSectionComment('SDK Error Schema')
  builder.addBlankLine()

  builder.addRaw(`/**
 * Schema for parsing SDK error objects
 *
 * Uses Schema.decodeUnknownOption for type-safe parsing without type guards
 */
const SdkErrorSchema = Schema.Struct({
  message: Schema.optional(Schema.String),
  code: Schema.optional(Schema.String)
})

/**
 * Parse SDK error using Schema
 */
function parseSdkError(error: unknown) {
  const result = Schema.decodeUnknownOption(SdkErrorSchema)(error)
  return Option.isSome(result) ? result.value : { message: undefined, code: undefined }
}`)
  builder.addBlankLine()

  // Error Mapping Function
  builder.addSectionComment('Error Mapping')
  builder.addBlankLine()

  builder.addRaw(`/**
 * Map unknown errors to typed Redis errors
 *
 * Uses Schema.decodeUnknownOption for type-safe parsing
 */
export function mapRedisError(error: unknown, command?: string) {
  const { message, code } = parseSdkError(error)

  // Connection errors
  if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ECONNRESET") {
    return new RedisConnectionError({
      message: message ?? "Connection failed",
      cause: error
    })
  }

  // Timeout errors
  if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT") {
    return new RedisTimeoutError({
      message: message ?? "Operation timed out",
      timeout: 20000,
      ...(command !== undefined ? { operation: command } : {}),
      cause: error
    })
  }

  // Command errors
  if (command !== undefined) {
    return new RedisCommandError({
      message: message ?? "Command failed",
      command,
      cause: error
    })
  }

  // Generic error
  return new RedisError({
    message: message ?? "Unknown Redis error",
    cause: error
  })
}`)

  return builder.toString()
}
