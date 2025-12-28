/**
 * Redis Queue Sub-Service Template
 *
 * Generates the queue operations sub-service for the Redis provider.
 * Implements the RedisQueueClient interface expected by infra-queue.
 *
 * @module monorepo-library-generator/provider/templates/redis/queue
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder'
import type { ProviderTemplateOptions } from '../../../../utils/types'

/**
 * Generate Redis queue sub-service file
 */
export function generateRedisQueueServiceFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { packageName } = options

  builder.addFileHeader({
    title: 'Redis Queue Sub-Service',
    description: `Queue operations sub-service for the Redis provider.

Uses Redis Lists for queue operations (FIFO pattern):
- LPUSH: Add items to the queue (left side)
- BRPOP: Blocking pop from right (for consumers)
- RPOP: Non-blocking pop from right
- LLEN: Get queue length
- LRANGE: Get items without removing
- LTRIM: Trim queue to size

The LPUSH/BRPOP pattern ensures FIFO ordering.

Used by infra-queue's Redis layer.`,
    module: `${packageName}/service/queue`
  })
  builder.addBlankLine()

  // Imports
  builder.addImports([
    { from: 'effect', imports: ['Context', 'Effect', 'Layer'] },
    { from: 'ioredis', imports: [{ name: 'Redis', alias: 'IORedis' }], isTypeOnly: true },
    { from: './errors', imports: ['RedisCommandError'] },
    { from: './types', imports: ['RedisQueueClient'], isTypeOnly: true }
  ])

  // Factory function
  builder.addSectionComment('Queue Sub-Service Factory')
  builder.addBlankLine()

  builder.addRaw(`/**
 * Create queue sub-service from ioredis client
 *
 * Wraps Redis List commands in Effect types with proper error handling.
 *
 * @param client - The ioredis client instance
 * @returns RedisQueueClient implementation
 *
 * @example
 * \`\`\`typescript
 * const redis = yield* Redis;
 * yield* redis.queue.lpush("my-queue", JSON.stringify(job))
 * const [key, value] = yield* redis.queue.brpop("my-queue", 0)
 * \`\`\`
 */
export function makeQueueClient(client: IORedis) {
  return {
    lpush: (key: string, value: string) =>
      Effect.tryPromise({
        try: () => client.lpush(key, value),
        catch: (error) =>
          new RedisCommandError({
            message: \`LPUSH failed for key: \${key}\`,
            command: "LPUSH",
            args: [key, value],
            cause: error
          })
      }).pipe(Effect.withSpan("Redis.queue.lpush", { attributes: { key } })),

    brpop: (key: string, timeout: number) =>
      Effect.tryPromise({
        try: () => client.brpop(key, timeout),
        catch: (error) =>
          new RedisCommandError({
            message: \`BRPOP failed for key: \${key}\`,
            command: "BRPOP",
            args: [key, timeout],
            cause: error
          })
      }).pipe(Effect.withSpan("Redis.queue.brpop", { attributes: { key, timeout } })),

    rpop: (key: string) =>
      Effect.tryPromise({
        try: () => client.rpop(key),
        catch: (error) =>
          new RedisCommandError({
            message: \`RPOP failed for key: \${key}\`,
            command: "RPOP",
            args: [key],
            cause: error
          })
      }).pipe(Effect.withSpan("Redis.queue.rpop", { attributes: { key } })),

    llen: (key: string) =>
      Effect.tryPromise({
        try: () => client.llen(key),
        catch: (error) =>
          new RedisCommandError({
            message: \`LLEN failed for key: \${key}\`,
            command: "LLEN",
            args: [key],
            cause: error
          })
      }).pipe(Effect.withSpan("Redis.queue.llen", { attributes: { key } })),

    lrange: (key: string, start: number, stop: number) =>
      Effect.tryPromise({
        try: () => client.lrange(key, start, stop),
        catch: (error) =>
          new RedisCommandError({
            message: \`LRANGE failed for key: \${key}\`,
            command: "LRANGE",
            args: [key, start, stop],
            cause: error
          })
      }).pipe(Effect.withSpan("Redis.queue.lrange", { attributes: { key, start, stop } })),

    ltrim: (key: string, start: number, stop: number) =>
      Effect.tryPromise({
        try: () => client.ltrim(key, start, stop).then(() => undefined),
        catch: (error) =>
          new RedisCommandError({
            message: \`LTRIM failed for key: \${key}\`,
            command: "LTRIM",
            args: [key, start, stop],
            cause: error
          })
      }).pipe(Effect.withSpan("Redis.queue.ltrim", { attributes: { key, start, stop } })),

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
      }).pipe(Effect.withSpan("Redis.queue.del", { attributes: { key } })),

    ping: () =>
      Effect.tryPromise({
        try: () => client.ping(),
        catch: (error) =>
          new RedisCommandError({
            message: "PING failed",
            command: "PING",
            cause: error
          })
      }).pipe(Effect.withSpan("Redis.queue.ping"))
  }
}`)
  builder.addBlankLine()

  // Context.Tag
  builder.addSectionComment('Context.Tag')
  builder.addBlankLine()

  builder.addRaw(`/**
 * Redis Queue Service Tag
 *
 * Provides independent access to Redis queue operations.
 * Can be used directly or accessed via the aggregate RedisService.
 *
 * Static layers:
 * - RedisQueueService.Test - In-memory mock for testing
 */
export class RedisQueueService extends Context.Tag("RedisQueueService")<
  RedisQueueService,
  RedisQueueClient
>() {
  /**
   * Test layer with in-memory mock
   */
  static readonly Test = Layer.succeed(RedisQueueService, {
    lpush: () => Effect.succeed(1),
    brpop: () => Effect.succeed(null),
    rpop: () => Effect.succeed(null),
    llen: () => Effect.succeed(0),
    lrange: () => Effect.succeed([]),
    ltrim: () => Effect.void,
    del: () => Effect.succeed(0),
    ping: () => Effect.succeed("PONG")
  })

  /**
   * Create a layer from an ioredis client
   */
  static fromClient(client: IORedis) {
    return Layer.succeed(RedisQueueService, makeQueueClient(client))
  }
}`)

  return builder.toString()
}
