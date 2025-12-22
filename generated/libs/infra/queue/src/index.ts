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
  type BoundedQueueHandle,
  type QueueOptions,
  QueueService,
  type UnboundedQueueHandle,
} from "./lib/service/service";

// ============================================================================
// Error Types
// ============================================================================

// Error types for error handling
export {
  QueueConfigError,
  QueueConnectionError,
  type QueueError,
  QueueInternalError,
  QueueServiceError,
  QueueTimeoutError,
} from "./lib/service/errors";

// ============================================================================
// Additional Layers
// ============================================================================

// Redis-backed distributed layer
export {
  QueueRedisLayer,
  type RedisQueueClient,
  RedisQueueClientTag,
} from "./lib/layers/redis-layer";
