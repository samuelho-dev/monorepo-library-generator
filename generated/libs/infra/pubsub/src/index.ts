/**
 * @myorg/infra-pubsub
 *
 * Pubsub infrastructure service

Provides Pubsub functionality using Effect primitives.
Layers are available as static members on the service class.
 *
 * @module @myorg/infra-pubsub
 */

// ============================================================================
// Service and Types
// ============================================================================

// Service with static layers (Memory, Test, Live)
export {
  PubsubService,
  type TopicHandle,
  type TopicOptions
} from "./lib/service/service"

// ============================================================================
// Error Types
// ============================================================================

// Error types for error handling
export {
  PubsubServiceError,
  PubsubInternalError,
  PubsubConfigError,
  PubsubConnectionError,
  PubsubTimeoutError,
  type PubsubError
} from "./lib/service/errors"

// ============================================================================
// Additional Layers
// ============================================================================

// Redis-backed distributed layer
export {
  PubsubRedisLayer,
  RedisPubSubClientTag,
  type RedisPubSubClient
} from "./lib/layers/redis-layer"
