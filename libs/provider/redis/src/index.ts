/**
 * Redis Provider Library
 *
 * Redis SDK provider with Effect integration.

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
  import { Redis } from '@samuelho-dev/provider-redis'  const program = Effect.gen(function*() {
    const redis = yield* Redis;
    yield* redis.cache.set("key", "value")
    const value = yield* redis.cache.get("key")
    return value
  }).pipe(Effect.provide(Redis.Live))
 *
 */

// ============================================================================
// Error Types
// ============================================================================

export {
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
export type { RedisProviderError } from "./lib/errors"

// ============================================================================
// Types
// ============================================================================

export type {
  // Configuration
  RedisConfig,
  RedisOptions,
  ScanOptions,
  ScanResult,
  // Sub-service interfaces
  RedisCacheClient,
  RedisPubSubClient,
  RedisQueueClient,
} from "./lib/types"

// ============================================================================
// Service
// ============================================================================

// Redis - Main service with sub-services
// 
// Effect 3.0+ Pattern: Context.Tag with static layer members
//   - Redis.Live (ioredis with env config)
//   - Redis.Test (in-memory mock)
//   - Redis.Dev (debug logging)
//   - Redis.make(config) (custom configuration)
// 
// Sub-services (matching infra library interfaces):
//   - redis.cache: RedisCacheClient (for infra-cache)
//   - redis.pubsub: RedisPubSubClient (for infra-pubsub)
//   - redis.queue: RedisQueueClient (for infra-queue)

export {
  Redis,
  RedisService,
  type RedisServiceInterface,
} from "./lib/redis"

// ============================================================================
// Sub-Service Context.Tags
// ============================================================================

// Independent access to Redis sub-services
// Each can be used separately for fine-grained dependency injection

export { RedisCacheService } from "./lib/cache"
export { RedisPubSubService } from "./lib/pubsub"
export { RedisQueueService } from "./lib/queue"

// ============================================================================
// Sub-Service Factories
// ============================================================================

// These are exported for advanced use cases where you need
// to create sub-services with custom ioredis instances.

export { makeCacheClient } from "./lib/cache"
export { makePubSubClient } from "./lib/pubsub"
export { makeQueueClient } from "./lib/queue"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Usage Examples
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 
// import { Effect, Layer } from 'effect';
// import { Redis } from '@samuelho-dev/provider-redis';
// 
// // Cache operations
// const cacheProgram = Effect.gen(function*() {
//   const redis = yield* Redis;
//   yield* redis.cache.set("user:1", JSON.stringify({ name: "Alice" }))
//   const user = yield* redis.cache.get("user:1")
//   return user;
// })
// 
// // PubSub operations
// const pubsubProgram = Effect.gen(function*() {
//   const redis = yield* Redis;
//   yield* redis.pubsub.subscribe("events", (msg) => console.log(msg))
//   yield* redis.pubsub.publish("events", "Hello!")
// })
// 
// // Queue operations
// const queueProgram = Effect.gen(function*() {
//   const redis = yield* Redis;
//   yield* redis.queue.lpush("jobs", JSON.stringify({ task: "process" }))
//   const [key, value] = yield* redis.queue.brpop("jobs", 0)
//   return value;
// })
// 
// // Extended operations
// const extendedProgram = Effect.gen(function*() {
//   const redis = yield* Redis;
//   yield* redis.expire("user:1", 3600)
//   const ttl = yield* redis.ttl("user:1")
//   const exists = yield* redis.exists("user:1")
//   return { ttl, exists };
// })
// 
// // Run with layer
// const result = Effect.runPromise(
//   cacheProgram.pipe(Effect.provide(Redis.Live))
// )
// 
// // Testing
// const testResult = Effect.runSync(
//   cacheProgram.pipe(Effect.provide(Redis.Test))
// )
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━