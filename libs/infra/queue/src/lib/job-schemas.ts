import { Schema } from 'effect'

/**
 * Job Processing Schemas
 *
 * Shared schemas for job processing infrastructure.
 * These are feature-agnostic and can be used by any job queue.
 *
 * @module @samuelho-dev/infra-queue/job-schemas
 */

// ============================================================================
// UUID Schema (Schema.UUID doesn't exist in Effect)
// ============================================================================

/**
 * UUID brand type
 *
 * Validates UUID v4 format and brands the type for type safety.
 * Use this instead of Schema.UUID which doesn't exist in Effect.
 *
 * @example
 * ```typescript
 * const jobId = yield* Schema.decode(UUID)('550e8400-e29b-41d4-a716-446655440000')
 * ```
 */
export const UUID = Schema.String.pipe(
  Schema.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  Schema.brand('UUID')
)

/** UUID type extracted from schema */
export type UUID = typeof UUID.Type

// ============================================================================
// Job Metadata Schema
// ============================================================================

/**
 * Base job metadata - all jobs inherit these fields
 *
 * Provides common fields for job tracking:
 * - jobId: Unique identifier for the job
 * - correlationId: Optional ID to correlate related jobs
 * - attempt: Current retry attempt (0 = first attempt)
 * - priority: Job priority (higher = more urgent)
 * - enqueuedAt: Timestamp when job was enqueued
 *
 * @example
 * ```typescript
 * class MyJob extends Schema.Class<MyJob>('MyJob')({
 *   ...JobMetadata.fields,
 *   type: Schema.Literal('my-operation'),
 *   payload: Schema.Unknown
 * }) {}
 * ```
 */
export const JobMetadata = Schema.Struct({
  /** Unique identifier for the job */
  jobId: UUID,
  /** Optional correlation ID for related jobs */
  correlationId: Schema.optional(UUID),
  /** Current retry attempt (0 = first attempt) */
  attempt: Schema.optionalWith(Schema.Number, { default: () => 0 }),
  /** Job priority (higher = more urgent, default 0) */
  priority: Schema.optionalWith(Schema.Number, { default: () => 0 }),
  /** Timestamp when job was enqueued */
  enqueuedAt: Schema.optionalWith(Schema.DateFromSelf, { default: () => new Date() })
})

/** JobMetadata type extracted from schema */
export type JobMetadata = typeof JobMetadata.Type

// ============================================================================
// Job Operation Type Schema
// ============================================================================

/**
 * Operation type for CRUD jobs
 *
 * Standard operation types for entity-based jobs.
 * Use this for jobs that perform CRUD operations.
 */
export const JobOperationType = Schema.Union(
  Schema.Literal('create'),
  Schema.Literal('update'),
  Schema.Literal('delete')
)

/** JobOperationType type extracted from schema */
export type JobOperationType = typeof JobOperationType.Type

// ============================================================================
// Job Data Record Schema
// ============================================================================

/**
 * Generic data record for job payloads
 *
 * Flexible schema for job data that allows any key-value pairs.
 * Use this when you need a generic payload structure.
 */
export const JobDataRecord = Schema.Record({
  key: Schema.String,
  value: Schema.Unknown
})

/** JobDataRecord type extracted from schema */
export type JobDataRecord = typeof JobDataRecord.Type

// ============================================================================
// Type Interfaces
// ============================================================================

/**
 * Base job interface constraint
 *
 * All jobs must have at least these fields.
 * Use this as a type constraint for generic job processing.
 */
export interface BaseJob {
  readonly jobId: string
  readonly type: string
}

/**
 * Job queue configuration
 *
 * Configuration options for job queue behavior.
 */
export interface JobQueueConfig {
  /** Name of the queue */
  readonly queueName: string
  /** Maximum queue capacity */
  readonly capacity: number
  /** Default number of retries for failed jobs */
  readonly defaultRetries: number
  /** Delay between retries in milliseconds */
  readonly retryDelayMs: number
  /** Job timeout in milliseconds */
  readonly jobTimeoutMs: number
}
