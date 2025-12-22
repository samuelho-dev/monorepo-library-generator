/**
 * @myorg/infra-queue
 *
 * Queue infrastructure service

Provides Queue functionality using Effect primitives.
Layers are available as static members on the service class.
 *
 * @module @myorg/infra-queue
 */

// ============================================================================
// Service and Types
// ============================================================================

// Service with static layers (Memory, Test, Live)
export {
  QueueService,
  type BoundedQueueHandle,
  type UnboundedQueueHandle,
  type QueueOptions
} from "./lib/service/service"

// ============================================================================
// Error Types
// ============================================================================

// Error types for error handling
export {
  QueueServiceError,
  QueueInternalError,
  QueueConfigError,
  QueueConnectionError,
  QueueTimeoutError,
  type QueueError
} from "./lib/service/errors"

// ============================================================================
// Additional Layers
// ============================================================================

// Redis-backed distributed layer
export {
  QueueRedisLayer,
  RedisQueueClientTag,
  type RedisQueueClient
} from "./lib/layers/redis-layer"
