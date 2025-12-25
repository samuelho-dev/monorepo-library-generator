import { Context, Effect, Layer } from "effect"

/**
 * Redis PubSub Sub-Service
 *
 * PubSub operations sub-service for the Redis provider.

Implements the RedisPubSubClient interface for:
- PUBLISH: Send messages to channels
- SUBSCRIBE: Listen to channels
- UNSUBSCRIBE: Stop listening to channels

IMPORTANT: Redis requires separate connections for pub/sub operations.
The subscriber connection cannot execute other commands while subscribed.

Used by infra-pubsub's Redis layer.
 *
 * @module @samuelho-dev/provider-redis/service/pubsub
 */

import type { Redis as IORedis } from "ioredis"
import { RedisPubSubError } from "./errors"
import type { RedisPubSubClient } from "./types"

// ============================================================================
// PubSub Sub-Service Factory
// ============================================================================

/**
 * Create pubsub sub-service from ioredis clients
 *
 * Requires two separate ioredis connections:
 * - pubClient: For PUBLISH commands (can also do other operations)
 * - subClient: Dedicated for SUBSCRIBE (cannot do other commands while subscribed)
 *
 * @param pubClient - The ioredis client for publishing
 * @param subClient - The dedicated ioredis client for subscribing
 * @returns RedisPubSubClient implementation
 *
 * @example
 * ```typescript
 * const redis = yield* Redis;
 * yield* redis.pubsub.publish("my-channel", "hello");
 * ```
 */
export function makePubSubClient(pubClient: IORedis, subClient: IORedis) {
  // Track active subscriptions and handlers for proper lifecycle management
  const channelHandlers = new Map<string, (message: string) => void>()
  let messageListenerRegistered = false

  // Centralized message handler that routes to channel-specific handlers
  const onMessage = (channel: string, message: string) => {
    const handler = channelHandlers.get(channel)
    if (handler) {
      // Effect-idiomatic error handling with logging instead of silent swallowing
      Effect.try(() => handler(message)).pipe(
        Effect.catchAll((error) => Effect.logWarning("PubSub handler error", { channel, error })),
        Effect.runPromise
      )
    }
  }

  return {
    publish: (channel: string, message: string) =>
      Effect.tryPromise({
        try: () => pubClient.publish(channel, message),
        catch: (error) =>
          new RedisPubSubError({
            message: `PUBLISH failed for channel: ${channel}`,
            channel,
            cause: error
          })
      }).pipe(Effect.withSpan("Redis.pubsub.publish", { attributes: { channel } })),

    subscribe: (channel: string, handler: (message: string) => void) =>
      Effect.gen(function*() {
        // Register the global message listener once
        if (!messageListenerRegistered) {
          subClient.on("message", onMessage)
          messageListenerRegistered = true
        }

        // Store the handler for this channel
        channelHandlers.set(channel, handler)

        // Subscribe to the channel
        yield* Effect.tryPromise({
          try: () => subClient.subscribe(channel),
          catch: (error) =>
            new RedisPubSubError({
              message: `SUBSCRIBE failed for channel: ${channel}`,
              channel,
              cause: error
            })
        })
      }).pipe(Effect.withSpan("Redis.pubsub.subscribe", { attributes: { channel } })),

    unsubscribe: (channel: string) =>
      Effect.gen(function*() {
        // Remove the handler for this channel
        channelHandlers.delete(channel)

        // Unsubscribe from the channel
        yield* Effect.tryPromise({
          try: () => subClient.unsubscribe(channel).then(() => undefined),
          catch: (error) =>
            new RedisPubSubError({
              message: `UNSUBSCRIBE failed for channel: ${channel}`,
              channel,
              cause: error
            })
        })

        // Clean up global listener if no more subscriptions
        if (channelHandlers.size === 0 && messageListenerRegistered) {
          subClient.removeListener("message", onMessage)
          messageListenerRegistered = false
        }
      }).pipe(Effect.withSpan("Redis.pubsub.unsubscribe", { attributes: { channel } })),

    ping: () =>
      Effect.tryPromise({
        try: () => pubClient.ping(),
        catch: (error) =>
          new RedisPubSubError({
            message: "PING failed",
            cause: error
          })
      }).pipe(Effect.withSpan("Redis.pubsub.ping"))
  }
}

// ============================================================================
// Context.Tag
// ============================================================================

/**
 * Redis PubSub Service Tag
 *
 * Provides independent access to Redis pub/sub operations.
 * Can be used directly or accessed via the aggregate RedisService.
 *
 * Static layers:
 * - RedisPubSubService.Test - In-memory mock for testing
 */
export class RedisPubSubService extends Context.Tag("RedisPubSubService")<
  RedisPubSubService,
  RedisPubSubClient
>() {
  /**
   * Test layer with in-memory mock
   */
  static readonly Test = Layer.succeed(RedisPubSubService, {
    publish: () => Effect.succeed(0),
    subscribe: () => Effect.void,
    unsubscribe: () => Effect.void,
    ping: () => Effect.succeed("PONG")
  })

  /**
   * Create a layer from ioredis clients
   */
  static fromClients(pubClient: IORedis, subClient: IORedis) {
    return Layer.succeed(RedisPubSubService, makePubSubClient(pubClient, subClient))
  }
}
