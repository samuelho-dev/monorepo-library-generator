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
// Queue Service and Types
// ============================================================================

export type { BoundedQueueHandle, QueueOptions, UnboundedQueueHandle } from './lib/service'
export { QueueService } from './lib/service'

// ============================================================================
// Queue Error Types
// ============================================================================

export type { QueueError, QueueServiceError } from './lib/errors'
export {
  QueueConfigError,
  QueueConnectionError,
  QueueInternalError,
  QueueTimeoutError
} from './lib/errors'

// ============================================================================
// Queue Layers
// ============================================================================

export { QueueRedisLayer, withJobEnqueuing, makePriorityQueueRedis } from './lib/layers'

// ============================================================================
// Job Schemas and Types
// ============================================================================

export { UUID, JobMetadata, JobOperationType, JobDataRecord } from './lib/job-schemas'
export type { BaseJob, JobQueueConfig } from './lib/job-schemas'

// ============================================================================
// Job Errors
// ============================================================================

export { JobValidationError, JobExecutionError, JobTimeoutError } from './lib/job-errors'
export type { JobError } from './lib/job-errors'

// ============================================================================
// Priority Queue
// ============================================================================

export { makePriorityQueue } from './lib/priority-queue'
export type { PriorityQueueHandle } from './lib/priority-queue'
