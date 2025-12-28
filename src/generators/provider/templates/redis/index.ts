/**
 * Redis Provider Templates - Export Index
 *
 * Specialized templates for the Redis provider library.
 * Generates a unified Redis service with sub-services:
 * - Redis: Core service with client management and extended operations
 * - Redis.cache: Cache operations (get/set/setex/del/flushdb)
 * - Redis.pubsub: PubSub operations (publish/subscribe/unsubscribe)
 * - Redis.queue: Queue operations (lpush/brpop/rpop/llen/lrange/ltrim)
 *
 * @module monorepo-library-generator/provider/templates/redis
 */

export { generateRedisCacheServiceFile } from './redis-cache.template'
export { generateRedisErrorsFile } from './redis-errors.template'
export { generateRedisIndexFile } from './redis-index.template'
export { generateRedisPubSubServiceFile } from './redis-pubsub.template'
export { generateRedisQueueServiceFile } from './redis-queue.template'
export { generateRedisServiceFile } from './redis-service.template'
export { generateRedisServiceIndexFile } from './redis-service-index.template'
export { generateRedisSpecFile } from './redis-spec.template'
export { generateRedisTypesFile } from './redis-types.template'
export { generateRedisTypesOnlyFile } from './redis-types-only.template'
