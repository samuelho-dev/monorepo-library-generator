/**
 * @samuelho-dev/infra-queue
 *
 * Queue infrastructure service

Provides Queue functionality using Effect primitives.
Layers are available as static members on the service class.
 *
 * @module @samuelho-dev/infra-queue
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
} from "./lib/service"

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
} from "./lib/errors"

// ============================================================================
// Additional Layers
// ============================================================================

// Redis-backed distributed layer
export {
  QueueRedisLayer,
  RedisQueueClientTag,
  type RedisQueueClient,
  withJobEnqueuing
} from "./lib/layers"
