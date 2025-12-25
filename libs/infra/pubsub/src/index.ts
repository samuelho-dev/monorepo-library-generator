/**
 * @samuelho-dev/infra-pubsub
 *
 * Pubsub infrastructure service

Provides Pubsub functionality using Effect primitives.
Layers are available as static members on the service class.
 *
 * @module @samuelho-dev/infra-pubsub
 */
// ============================================================================
// Service and Types
// ============================================================================
// Service with static layers (Memory, Test, Live)
export { PubsubService } from "./lib/service"
export type { TopicHandle, TopicOptions } from "./lib/service"

// ============================================================================
// Error Types
// ============================================================================
// Error types for error handling
export {
  PubsubInternalError,
  PubsubConfigError,
  PubsubConnectionError,
  PubsubTimeoutError,
} from "./lib/errors"
export type { PubsubError, PubsubServiceError } from "./lib/errors"

// ============================================================================
// Additional Layers
// ============================================================================
// Redis-backed distributed layer
export {
  PubsubRedisLayer,
  RedisPubSubClientTag,
  withEventPublishing
} from "./lib/layers"
export type { RedisPubSubClient } from "./lib/layers"
