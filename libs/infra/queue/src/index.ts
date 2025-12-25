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
export { QueueService } from "./lib/service"
export type { BoundedQueueHandle, QueueOptions, UnboundedQueueHandle } from "./lib/service"

// ============================================================================
// Error Types
// ============================================================================
// Error types for error handling
export {
  QueueInternalError,
  QueueConfigError,
  QueueConnectionError,
  QueueTimeoutError,
} from "./lib/errors"
export type { QueueError, QueueServiceError } from "./lib/errors"

// ============================================================================
// Additional Layers
// ============================================================================
// Redis-backed distributed layer
export {
  QueueRedisLayer,
  RedisQueueClientTag,
  withJobEnqueuing
} from "./lib/layers"
export type { RedisQueueClient } from "./lib/layers"
