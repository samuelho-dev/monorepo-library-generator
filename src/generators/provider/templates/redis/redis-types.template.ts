/**
 * Redis Provider Types Template
 *
 * Generates configuration and interface types for the Redis provider library.
 *
 * @module monorepo-library-generator/provider/templates/redis/types
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { ProviderTemplateOptions } from "../../../../utils/types"

/**
 * Generate Redis provider types file
 */
export function generateRedisTypesFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { packageName } = options

  builder.addFileHeader({
    title: "Redis Provider - Types",
    description: `Configuration and interface types for Redis provider.

Includes:
- RedisConfig: Connection configuration
- ScanOptions/ScanResult: For SCAN operations
- Sub-service interfaces for cache, pubsub, queue`,
    module: `${packageName}/service/types`
  })
  builder.addBlankLine()

  // Imports
  builder.addImports([
    { from: "effect", imports: ["Effect"], isTypeOnly: true },
    { from: "./errors", imports: ["RedisCommandError", "RedisPubSubError"], isTypeOnly: true }
  ])

  // Configuration - re-export from native SDK
  builder.addSectionComment("Configuration")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Redis Configuration
 *
 * Re-exported from ioredis for native SDK type compatibility.
 * Use RedisOptions for full configuration options.
 */
export type { RedisOptions } from "ioredis"

/**
 * Simplified Redis config for common use cases
 *
 * Note: Password should be passed as plain string. If you have a Redacted<string>,
 * use Redacted.value() to unwrap it before passing to the config.
 */
export interface RedisConfig {
  readonly host?: string
  readonly port?: number
  /** Password as plain string (use Redacted.value() to unwrap if needed) */
  readonly password?: string
  readonly db?: number
  readonly tls?: boolean | object
  readonly connectTimeout?: number
  readonly commandTimeout?: number
  readonly retryDelayMs?: number
  readonly maxRetriesPerRequest?: number
}`)
  builder.addBlankLine()

  // Scan types
  builder.addSectionComment("Scan Types")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Options for SCAN operations
 */
export interface ScanOptions {
  /** Pattern to match keys */
  readonly match?: string
  /** Number of keys to return per iteration */
  readonly count?: number
  /** Key type filter */
  readonly type?: "string" | "list" | "set" | "zset" | "hash" | "stream"
}

/**
 * Result of a SCAN operation
 */
export interface ScanResult {
  /** Cursor for next iteration (0 = iteration complete) */
  readonly cursor: number
  /** Keys found in this iteration */
  readonly keys: ReadonlyArray<string>
}`)
  builder.addBlankLine()

  // Cache sub-service interface
  builder.addSectionComment("Cache Sub-Service Interface")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Redis Cache Client Interface
 *
 * Matches the RedisClient interface expected by infra-cache.
 * Used for get/set/setex/del/flushdb operations.
 */
export interface RedisCacheClient {
  /**
   * Get value by key
   */
  readonly get: (key: string) => Effect.Effect<string | null, RedisCommandError>

  /**
   * Set value with key
   */
  readonly set: (key: string, value: string) => Effect.Effect<void, RedisCommandError>

  /**
   * Set value with expiration in seconds
   */
  readonly setex: (key: string, seconds: number, value: string) => Effect.Effect<void, RedisCommandError>

  /**
   * Delete key
   */
  readonly del: (key: string) => Effect.Effect<number, RedisCommandError>

  /**
   * Flush database
   */
  readonly flushdb: () => Effect.Effect<void, RedisCommandError>

  /**
   * Health check ping
   */
  readonly ping: () => Effect.Effect<string, RedisCommandError>
}`)
  builder.addBlankLine()

  // PubSub sub-service interface
  builder.addSectionComment("PubSub Sub-Service Interface")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Redis PubSub Client Interface
 *
 * Matches the RedisPubSubClient interface expected by infra-pubsub.
 * Used for publish/subscribe/unsubscribe operations.
 *
 * Note: Redis pub/sub requires separate connections for subscribe operations.
 */
export interface RedisPubSubClient {
  /**
   * Publish message to channel
   * @returns Number of subscribers that received the message
   */
  readonly publish: (channel: string, message: string) => Effect.Effect<number, RedisPubSubError>

  /**
   * Subscribe to channel
   * Calls handler for each message received
   */
  readonly subscribe: (
    channel: string,
    handler: (message: string) => void
  ) => Effect.Effect<void, RedisPubSubError>

  /**
   * Unsubscribe from channel
   */
  readonly unsubscribe: (channel: string) => Effect.Effect<void, RedisPubSubError>

  /**
   * Health check ping
   */
  readonly ping: () => Effect.Effect<string, RedisPubSubError>
}`)
  builder.addBlankLine()

  // Queue sub-service interface
  builder.addSectionComment("Queue Sub-Service Interface")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Redis Queue Client Interface
 *
 * Matches the RedisQueueClient interface expected by infra-queue.
 * Uses Redis Lists for queue operations (LPUSH/BRPOP pattern).
 */
export interface RedisQueueClient {
  /**
   * Push item to left of list (LPUSH)
   */
  readonly lpush: (key: string, value: string) => Effect.Effect<number, RedisCommandError>

  /**
   * Pop item from right of list with blocking (BRPOP)
   * @param timeout - Timeout in seconds (0 = block indefinitely)
   * @returns [key, value] tuple or null if timeout
   */
  readonly brpop: (key: string, timeout: number) => Effect.Effect<[string, string] | null, RedisCommandError>

  /**
   * Pop item from right of list (RPOP)
   */
  readonly rpop: (key: string) => Effect.Effect<string | null, RedisCommandError>

  /**
   * Get list length (LLEN)
   */
  readonly llen: (key: string) => Effect.Effect<number, RedisCommandError>

  /**
   * Get range of list items (LRANGE)
   */
  readonly lrange: (key: string, start: number, stop: number) => Effect.Effect<Array<string>, RedisCommandError>

  /**
   * Trim list to specified range (LTRIM)
   */
  readonly ltrim: (key: string, start: number, stop: number) => Effect.Effect<void, RedisCommandError>

  /**
   * Delete key (DEL)
   */
  readonly del: (key: string) => Effect.Effect<number, RedisCommandError>

  /**
   * Health check ping
   */
  readonly ping: () => Effect.Effect<string, RedisCommandError>
}`)

  return builder.toString()
}
