import { Context, Effect, Layer } from "effect"
import type { Redis as IORedis } from "ioredis"
import { RedisCommandError } from "./errors"
import type { RedisCacheClient } from "./types"

/**
 * Redis Cache Sub-Service
 *
 * Cache operations sub-service for the Redis provider.

Implements the RedisCacheClient interface for:
- GET: Retrieve cached values
- SET: Store values
- SETEX: Store values with TTL
- DEL: Delete keys
- FLUSHDB: Clear database

Used by infra-cache's Redis layer.
 *
 * @module @samuelho-dev/provider-redis/service/cache
 */

// ============================================================================
// Cache Sub-Service Factory
// ============================================================================

/**
 * Create cache sub-service from ioredis client
 *
 * Wraps ioredis commands in Effect types with proper error handling.
 *
 * @param client - The ioredis client instance
 * @returns RedisCacheClient implementation
 *
 * @example
 * ```typescript
 * const redis = yield* Redis;
 * const value = yield* redis.cache.get("my-key");
 * ```
 */
export function makeCacheClient(client: IORedis) {
  return {
    get: (key: string) =>
      Effect.tryPromise({
        try: () => client.get(key),
        catch: (error) =>
          new RedisCommandError({
            message: `GET failed for key: ${key}`,
            command: "GET",
            args: [key],
            cause: error,
          }),
      }).pipe(Effect.withSpan("Redis.cache.get", { attributes: { key } })),

    set: (key: string, value: string) =>
      Effect.tryPromise({
        try: () => client.set(key, value).then(() => undefined),
        catch: (error) =>
          new RedisCommandError({
            message: `SET failed for key: ${key}`,
            command: "SET",
            args: [key, value],
            cause: error,
          }),
      }).pipe(Effect.withSpan("Redis.cache.set", { attributes: { key } })),

    setex: (key: string, seconds: number, value: string) =>
      Effect.tryPromise({
        try: () => client.setex(key, seconds, value).then(() => undefined),
        catch: (error) =>
          new RedisCommandError({
            message: `SETEX failed for key: ${key}`,
            command: "SETEX",
            args: [key, seconds, value],
            cause: error,
          }),
      }).pipe(Effect.withSpan("Redis.cache.setex", { attributes: { key, seconds } })),

    del: (key: string) =>
      Effect.tryPromise({
        try: () => client.del(key),
        catch: (error) =>
          new RedisCommandError({
            message: `DEL failed for key: ${key}`,
            command: "DEL",
            args: [key],
            cause: error,
          }),
      }).pipe(Effect.withSpan("Redis.cache.del", { attributes: { key } })),

    flushdb: () =>
      Effect.tryPromise({
        try: () => client.flushdb().then(() => undefined),
        catch: (error) =>
          new RedisCommandError({
            message: "FLUSHDB failed",
            command: "FLUSHDB",
            cause: error,
          }),
      }).pipe(Effect.withSpan("Redis.cache.flushdb")),

    ping: () =>
      Effect.tryPromise({
        try: () => client.ping(),
        catch: (error) =>
          new RedisCommandError({
            message: "PING failed",
            command: "PING",
            cause: error,
          }),
      }).pipe(Effect.withSpan("Redis.cache.ping")),
  };
}

// ============================================================================
// Context.Tag
// ============================================================================

/**
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
    ping: () => Effect.succeed("PONG"),
  });

  /**
   * Create a layer from an ioredis client
   */
  static fromClient(client: IORedis) {
    return Layer.succeed(RedisCacheService, makeCacheClient(client));
  }
}