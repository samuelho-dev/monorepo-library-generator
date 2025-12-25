/**
 * Redis Provider Index Template
 *
 * Generates the main barrel export for the Redis provider library.
 *
 * @module monorepo-library-generator/provider/templates/redis/index
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { ProviderTemplateOptions } from "../../../../utils/types"

/**
 * Generate Redis provider index.ts file
 */
export function generateRedisIndexFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { packageName } = options

  builder.addFileHeader({
    title: "Redis Provider Library",
    description: `Redis SDK provider with Effect integration.

This library wraps the ioredis SDK in Effect types for:
- Cache operations (GET/SET/SETEX/DEL)
- PubSub operations (PUBLISH/SUBSCRIBE)
- Queue operations (LPUSH/BRPOP/RPOP)
- Extended operations (EXISTS/EXPIRE/TTL/KEYS/SCAN)
- Raw client access for advanced usage

Effect 3.0+ Pattern:
  - Services extend Context.Tag
  - Access layers via static members: Redis.Test, Redis.Live

Usage:
  import { Redis } from '${packageName}'  const program = Effect.gen(function*() {
    const redis = yield* Redis;
    yield* redis.cache.set("key", "value")
    const value = yield* redis.cache.get("key")
    return value
  }).pipe(Effect.provide(Redis.Live))`
  })
  builder.addBlankLine()

  // Error exports
  builder.addSectionComment("Error Types")
  builder.addBlankLine()

  builder.addRaw(`export {
  // Base error
  RedisError,
  // Connection/timeout errors
  RedisConnectionError,
  RedisTimeoutError,
  // Operation errors
  RedisCommandError,
  RedisKeyError,
  RedisPubSubError,
  // Error mapping utility
  mapRedisError,
} from "./lib/errors"
export type { RedisProviderError } from "./lib/errors"`)
  builder.addBlankLine()

  // Type exports
  builder.addSectionComment("Types")
  builder.addBlankLine()

  builder.addRaw(`export type {
  // Configuration
  RedisConfig,
  RedisOptions,
  ScanOptions,
  ScanResult,
  // Sub-service interfaces
  RedisCacheClient,
  RedisPubSubClient,
  RedisQueueClient,
} from "./lib/types"`)
  builder.addBlankLine()

  // Service exports
  builder.addSectionComment("Service")
  builder.addBlankLine()

  builder.addComment("Redis - Main service with sub-services")
  builder.addComment("")
  builder.addComment("Effect 3.0+ Pattern: Context.Tag with static layer members")
  builder.addComment("  - Redis.Live (ioredis with env config)")
  builder.addComment("  - Redis.Test (in-memory mock)")
  builder.addComment("  - Redis.Dev (debug logging)")
  builder.addComment("  - Redis.make(config) (custom configuration)")
  builder.addComment("")
  builder.addComment("Sub-services (matching infra library interfaces):")
  builder.addComment("  - redis.cache: RedisCacheClient (for infra-cache)")
  builder.addComment("  - redis.pubsub: RedisPubSubClient (for infra-pubsub)")
  builder.addComment("  - redis.queue: RedisQueueClient (for infra-queue)")
  builder.addBlankLine()

  builder.addRaw(`export {
  Redis,
  RedisService,
  type RedisServiceInterface,
} from "./lib/redis"`)
  builder.addBlankLine()

  // Sub-service Context.Tags
  builder.addSectionComment("Sub-Service Context.Tags")
  builder.addBlankLine()

  builder.addComment("Independent access to Redis sub-services")
  builder.addComment("Each can be used separately for fine-grained dependency injection")
  builder.addBlankLine()

  builder.addRaw(`export { RedisCacheService } from "./lib/cache"
export { RedisPubSubService } from "./lib/pubsub"
export { RedisQueueService } from "./lib/queue"`)
  builder.addBlankLine()

  // Sub-service factory exports
  builder.addSectionComment("Sub-Service Factories")
  builder.addBlankLine()

  builder.addComment("These are exported for advanced use cases where you need")
  builder.addComment("to create sub-services with custom ioredis instances.")
  builder.addBlankLine()

  builder.addRaw(`export { makeCacheClient } from "./lib/cache"
export { makePubSubClient } from "./lib/pubsub"
export { makeQueueClient } from "./lib/queue"`)
  builder.addBlankLine()

  // Usage examples
  builder.addComment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  builder.addComment("Usage Examples")
  builder.addComment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  builder.addComment("")
  builder.addComment("import { Effect, Layer } from 'effect';")
  builder.addComment(`import { Redis } from '${packageName}';`)
  builder.addComment("")
  builder.addComment("// Cache operations")
  builder.addComment("const cacheProgram = Effect.gen(function*() {")
  builder.addComment("  const redis = yield* Redis;")
  builder.addComment("  yield* redis.cache.set(\"user:1\", JSON.stringify({ name: \"Alice\" }))")
  builder.addComment("  const user = yield* redis.cache.get(\"user:1\")")
  builder.addComment("  return user;")
  builder.addComment("})")
  builder.addComment("")
  builder.addComment("// PubSub operations")
  builder.addComment("const pubsubProgram = Effect.gen(function*() {")
  builder.addComment("  const redis = yield* Redis;")
  builder.addComment("  yield* redis.pubsub.subscribe(\"events\", (msg) => console.log(msg))")
  builder.addComment("  yield* redis.pubsub.publish(\"events\", \"Hello!\")")
  builder.addComment("})")
  builder.addComment("")
  builder.addComment("// Queue operations")
  builder.addComment("const queueProgram = Effect.gen(function*() {")
  builder.addComment("  const redis = yield* Redis;")
  builder.addComment("  yield* redis.queue.lpush(\"jobs\", JSON.stringify({ task: \"process\" }))")
  builder.addComment("  const [key, value] = yield* redis.queue.brpop(\"jobs\", 0)")
  builder.addComment("  return value;")
  builder.addComment("})")
  builder.addComment("")
  builder.addComment("// Extended operations")
  builder.addComment("const extendedProgram = Effect.gen(function*() {")
  builder.addComment("  const redis = yield* Redis;")
  builder.addComment("  yield* redis.expire(\"user:1\", 3600)")
  builder.addComment("  const ttl = yield* redis.ttl(\"user:1\")")
  builder.addComment("  const exists = yield* redis.exists(\"user:1\")")
  builder.addComment("  return { ttl, exists };")
  builder.addComment("})")
  builder.addComment("")
  builder.addComment("// Run with layer")
  builder.addComment("const result = Effect.runPromise(")
  builder.addComment("  cacheProgram.pipe(Effect.provide(Redis.Live))")
  builder.addComment(")")
  builder.addComment("")
  builder.addComment("// Testing")
  builder.addComment("const testResult = Effect.runSync(")
  builder.addComment("  cacheProgram.pipe(Effect.provide(Redis.Test))")
  builder.addComment(")")
  builder.addComment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

  return builder.toString()
}
