import { Context, Effect, Layer } from 'effect'
import type { Redis as IORedis } from 'ioredis'
import { RedisCommandError } from './errors'
import type { RedisQueueClient } from './types'

/**
 * Redis Queue Sub-Service
 *
 * Queue operations sub-service for the Redis provider.

Uses Redis Lists for queue operations (FIFO pattern):
- LPUSH: Add items to the queue (left side)
- BRPOP: Blocking pop from right (for consumers)
- RPOP: Non-blocking pop from right
- LLEN: Get queue length
- LRANGE: Get items without removing
- LTRIM: Trim queue to size

The LPUSH/BRPOP pattern ensures FIFO ordering.

Used by infra-queue's Redis layer.
 *
 * @module @samuelho-dev/provider-redis/service/queue
 */

// ============================================================================
// Queue Sub-Service Factory
// ============================================================================

/**
 * Create queue sub-service from ioredis client
 *
 * Wraps Redis List commands in Effect types with proper error handling.
 *
 * @param client - The ioredis client instance
 * @returns RedisQueueClient implementation
 *
 * @example
 * ```typescript
 * const redis = yield* Redis;
 * yield* redis.queue.lpush("my-queue", JSON.stringify(job))
 * const [key, value] = yield* redis.queue.brpop("my-queue", 0)
 * ```
 */
export function makeQueueClient(client: IORedis) {
  return {
    lpush: (key: string, value: string) =>
      Effect.tryPromise({
        try: () => client.lpush(key, value),
        catch: (error) =>
          new RedisCommandError({
            message: `LPUSH failed for key: ${key}`,
            command: 'LPUSH',
            args: [key, value],
            cause: error
          })
      }).pipe(Effect.withSpan('Redis.queue.lpush', { attributes: { key } })),

    brpop: (key: string, timeout: number) =>
      Effect.tryPromise({
        try: () => client.brpop(key, timeout),
        catch: (error) =>
          new RedisCommandError({
            message: `BRPOP failed for key: ${key}`,
            command: 'BRPOP',
            args: [key, timeout],
            cause: error
          })
      }).pipe(Effect.withSpan('Redis.queue.brpop', { attributes: { key, timeout } })),

    rpop: (key: string) =>
      Effect.tryPromise({
        try: () => client.rpop(key),
        catch: (error) =>
          new RedisCommandError({
            message: `RPOP failed for key: ${key}`,
            command: 'RPOP',
            args: [key],
            cause: error
          })
      }).pipe(Effect.withSpan('Redis.queue.rpop', { attributes: { key } })),

    llen: (key: string) =>
      Effect.tryPromise({
        try: () => client.llen(key),
        catch: (error) =>
          new RedisCommandError({
            message: `LLEN failed for key: ${key}`,
            command: 'LLEN',
            args: [key],
            cause: error
          })
      }).pipe(Effect.withSpan('Redis.queue.llen', { attributes: { key } })),

    lrange: (key: string, start: number, stop: number) =>
      Effect.tryPromise({
        try: () => client.lrange(key, start, stop),
        catch: (error) =>
          new RedisCommandError({
            message: `LRANGE failed for key: ${key}`,
            command: 'LRANGE',
            args: [key, start, stop],
            cause: error
          })
      }).pipe(Effect.withSpan('Redis.queue.lrange', { attributes: { key, start, stop } })),

    ltrim: (key: string, start: number, stop: number) =>
      Effect.tryPromise({
        try: () => client.ltrim(key, start, stop).then(() => undefined),
        catch: (error) =>
          new RedisCommandError({
            message: `LTRIM failed for key: ${key}`,
            command: 'LTRIM',
            args: [key, start, stop],
            cause: error
          })
      }).pipe(Effect.withSpan('Redis.queue.ltrim', { attributes: { key, start, stop } })),

    del: (key: string) =>
      Effect.tryPromise({
        try: () => client.del(key),
        catch: (error) =>
          new RedisCommandError({
            message: `DEL failed for key: ${key}`,
            command: 'DEL',
            args: [key],
            cause: error
          })
      }).pipe(Effect.withSpan('Redis.queue.del', { attributes: { key } })),

    ping: () =>
      Effect.tryPromise({
        try: () => client.ping(),
        catch: (error) =>
          new RedisCommandError({
            message: 'PING failed',
            command: 'PING',
            cause: error
          })
      }).pipe(Effect.withSpan('Redis.queue.ping')),

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Sorted Set Operations (Priority Queue)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    zadd: (key: string, score: number, member: string) =>
      Effect.tryPromise({
        try: () => client.zadd(key, score, member),
        catch: (error) =>
          new RedisCommandError({
            message: `ZADD failed for key: ${key}`,
            command: 'ZADD',
            args: [key, score, member],
            cause: error
          })
      }).pipe(Effect.withSpan('Redis.queue.zadd', { attributes: { key, score } })),

    bzpopmax: (key: string, timeout: number) =>
      Effect.tryPromise({
        try: () => client.bzpopmax(key, timeout),
        catch: (error) =>
          new RedisCommandError({
            message: `BZPOPMAX failed for key: ${key}`,
            command: 'BZPOPMAX',
            args: [key, timeout],
            cause: error
          })
      }).pipe(Effect.withSpan('Redis.queue.bzpopmax', { attributes: { key, timeout } })),

    zpopmax: (key: string) =>
      Effect.tryPromise({
        try: async () => {
          const result = await client.zpopmax(key)
          if (!result || result.length === 0) return null
          // zpopmax returns [member, score]
          return [result[0], result[1]] as [string, string]
        },
        catch: (error) =>
          new RedisCommandError({
            message: `ZPOPMAX failed for key: ${key}`,
            command: 'ZPOPMAX',
            args: [key],
            cause: error
          })
      }).pipe(Effect.withSpan('Redis.queue.zpopmax', { attributes: { key } })),

    zcard: (key: string) =>
      Effect.tryPromise({
        try: () => client.zcard(key),
        catch: (error) =>
          new RedisCommandError({
            message: `ZCARD failed for key: ${key}`,
            command: 'ZCARD',
            args: [key],
            cause: error
          })
      }).pipe(Effect.withSpan('Redis.queue.zcard', { attributes: { key } })),

    zrange: (key: string, start: number, stop: number, options?: { rev?: boolean }) =>
      Effect.tryPromise({
        try: () =>
          options?.rev
            ? client.zrange(key, start, stop, 'REV')
            : client.zrange(key, start, stop),
        catch: (error) =>
          new RedisCommandError({
            message: `ZRANGE failed for key: ${key}`,
            command: 'ZRANGE',
            args: [key, start, stop, options],
            cause: error
          })
      }).pipe(Effect.withSpan('Redis.queue.zrange', { attributes: { key, start, stop } }))
  }
}

// ============================================================================
// Context.Tag
// ============================================================================

/**
 * Redis Queue Service Tag
 *
 * Provides independent access to Redis queue operations.
 * Can be used directly or accessed via the aggregate RedisService.
 *
 * Static layers:
 * - RedisQueueService.Test - In-memory mock for testing
 */
export class RedisQueueService extends Context.Tag('RedisQueueService')<
  RedisQueueService,
  RedisQueueClient
>() {
  /**
   * Test layer with in-memory mock
   */
  static readonly Test = Layer.succeed(RedisQueueService, {
    // List operations
    lpush: () => Effect.succeed(1),
    brpop: () => Effect.succeed(null),
    rpop: () => Effect.succeed(null),
    llen: () => Effect.succeed(0),
    lrange: () => Effect.succeed([]),
    ltrim: () => Effect.void,
    del: () => Effect.succeed(0),
    ping: () => Effect.succeed('PONG'),
    // Sorted set operations
    zadd: () => Effect.succeed(1),
    bzpopmax: () => Effect.succeed(null),
    zpopmax: () => Effect.succeed(null),
    zcard: () => Effect.succeed(0),
    zrange: () => Effect.succeed([])
  })

  /**
   * Create a layer from an ioredis client
   */
  static fromClient(client: IORedis) {
    return Layer.succeed(RedisQueueService, makeQueueClient(client))
  }
}
