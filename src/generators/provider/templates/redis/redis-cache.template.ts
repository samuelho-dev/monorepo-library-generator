/**
 * Redis Cache Sub-Service Template
 *
 * Generates the cache operations sub-service for the Redis provider.
 * Implements the RedisCacheClient interface expected by infra-cache.
 *
 * @module monorepo-library-generator/provider/templates/redis/cache
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder'
import type { ProviderTemplateOptions } from '../../../../utils/types'

/**
 * Generate Redis cache sub-service file
 */
export function generateRedisCacheServiceFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { packageName } = options

  builder.addFileHeader({
    title: 'Redis Cache Sub-Service',
    description: `Cache operations sub-service for the Redis provider.

Implements the RedisCacheClient interface for:
- GET: Retrieve cached values
- SET: Store values
- SETEX: Store values with TTL
- DEL: Delete keys
- FLUSHDB: Clear database

Used by infra-cache's Redis layer.`,
    module: `${packageName}/service/cache`
  })
  builder.addBlankLine()

  // Imports
  builder.addImports([
    { from: 'effect', imports: ['Context', 'Effect', 'Layer'] },
    { from: 'ioredis', imports: [{ name: 'Redis', alias: 'IORedis' }], isTypeOnly: true },
    { from: './errors', imports: ['RedisCommandError'] },
    { from: './types', imports: ['RedisCacheClient'], isTypeOnly: true }
  ])

  // Factory function
  builder.addSectionComment('Cache Sub-Service Factory')
  builder.addBlankLine()

  builder.addRaw(`/**
 * Create cache sub-service from ioredis client
 *
 * Wraps ioredis commands in Effect types with proper error handling.
 *
 * @param client - The ioredis client instance
 * @returns RedisCacheClient implementation
 *
 * @example
 * \`\`\`typescript
 * const redis = yield* Redis;
 * const value = yield* redis.cache.get("my-key")
 * \`\`\`
 */
export function makeCacheClient(client: IORedis) {
  return {
    get: (key: string) =>
      Effect.tryPromise({
        try: () => client.get(key),
        catch: (error) =>
          new RedisCommandError({
            message: \`GET failed for key: \${key}\`,
            command: "GET",
            args: [key],
            cause: error
          })
      }).pipe(Effect.withSpan("Redis.cache.get", { attributes: { key } })),

    set: (key: string, value: string) =>
      Effect.tryPromise({
        try: () => client.set(key, value).then(() => undefined),
        catch: (error) =>
          new RedisCommandError({
            message: \`SET failed for key: \${key}\`,
            command: "SET",
            args: [key, value],
            cause: error
          })
      }).pipe(Effect.withSpan("Redis.cache.set", { attributes: { key } })),

    setex: (key: string, seconds: number, value: string) =>
      Effect.tryPromise({
        try: () => client.setex(key, seconds, value).then(() => undefined),
        catch: (error) =>
          new RedisCommandError({
            message: \`SETEX failed for key: \${key}\`,
            command: "SETEX",
            args: [key, seconds, value],
            cause: error
          })
      }).pipe(Effect.withSpan("Redis.cache.setex", { attributes: { key, seconds } })),

    del: (key: string) =>
      Effect.tryPromise({
        try: () => client.del(key),
        catch: (error) =>
          new RedisCommandError({
            message: \`DEL failed for key: \${key}\`,
            command: "DEL",
            args: [key],
            cause: error
          })
      }).pipe(Effect.withSpan("Redis.cache.del", { attributes: { key } })),

    flushdb: () =>
      Effect.tryPromise({
        try: () => client.flushdb().then(() => undefined),
        catch: (error) =>
          new RedisCommandError({
            message: "FLUSHDB failed",
            command: "FLUSHDB",
            cause: error
          })
      }).pipe(Effect.withSpan("Redis.cache.flushdb")),

    ping: () =>
      Effect.tryPromise({
        try: () => client.ping(),
        catch: (error) =>
          new RedisCommandError({
            message: "PING failed",
            command: "PING",
            cause: error
          })
      }).pipe(Effect.withSpan("Redis.cache.ping"))
  }
}`)
  builder.addBlankLine()

  // Context.Tag
  builder.addSectionComment('Context.Tag')
  builder.addBlankLine()

  builder.addRaw(`/**
 * Redis Cache Service Tag
 *
 * Provides independent access to Redis cache operations.
 * Can be used directly or accessed via the aggregate RedisService.
 *
 * Static layers:
 * - RedisCacheService.Live - Requires RedisConnection
 * - RedisCacheService.Test - In-memory mock for testing
 */
export class RedisCacheService extends Context.Tag("RedisCacheService")<
  RedisCacheService,
  RedisCacheClient
>() {
  /**
   * Test layer with in-memory mock
   */
  static readonly Test = Layer.succeed(RedisCacheService, {
    get: () => Effect.succeed(null),
    set: () => Effect.void,
    setex: () => Effect.void,
    del: () => Effect.succeed(0),
    flushdb: () => Effect.void,
    ping: () => Effect.succeed("PONG")
  })

  /**
   * Create a layer from an ioredis client
   */
  static fromClient(client: IORedis) {
    return Layer.succeed(RedisCacheService, makeCacheClient(client))
  }
}`)

  return builder.toString()
}
