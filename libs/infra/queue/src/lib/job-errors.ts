import { Data } from 'effect'

/**
 * Job Processing Errors
 *
 * Generic error types for job processing infrastructure.
 * These are feature-agnostic and can be used by any job queue.
 *
 * Uses Data.TaggedError for:
 * - Discriminated union types (pattern matching with Effect.catchTag)
 * - Non-serializable (stays within service boundaries)
 *
 * @module @samuelho-dev/infra-queue/job-errors
 * @see Effect documentation for Data.TaggedError patterns
 */

// ============================================================================
// Job Error Types
// ============================================================================

/**
 * Error thrown when job data fails schema validation
 *
 * Raised when the job payload doesn't match the expected schema.
 * Contains the original parse error as cause for debugging.
 */
export class JobValidationError extends Data.TaggedError('JobValidationError')<{
  /** Human-readable error message */
  readonly message: string
  /** Unique identifier of the job that failed validation */
  readonly jobId: string
  /** Type of job (e.g., "create", "update", "delete") */
  readonly jobType: string
  /** Optional underlying cause (typically ParseError) */
  readonly cause?: unknown
}> {}

/**
 * Error thrown when job execution fails
 *
 * Raised when the job processing logic throws an error.
 * The underlying error is captured in cause for debugging.
 */
export class JobExecutionError extends Data.TaggedError('JobExecutionError')<{
  /** Human-readable error message */
  readonly message: string
  /** Unique identifier of the job that failed */
  readonly jobId: string
  /** Type of job that failed execution */
  readonly jobType: string
  /** Underlying error that caused the failure */
  readonly cause: unknown
}> {}

/**
 * Error thrown when job execution times out
 *
 * Raised when a job exceeds its configured timeout duration.
 * Jobs that timeout may be retried or moved to dead letter queue.
 */
export class JobTimeoutError extends Data.TaggedError('JobTimeoutError')<{
  /** Human-readable error message */
  readonly message: string
  /** Unique identifier of the job that timed out */
  readonly jobId: string
  /** Type of job that timed out */
  readonly jobType: string
  /** Timeout duration as string (e.g., "5 minutes") */
  readonly timeout: string
}> {}

// ============================================================================
// Error Type Union
// ============================================================================

/**
 * Union of all job processing error types
 *
 * Use for comprehensive error handling:
 * @example
 * ```typescript
 * Effect.catchTag("JobValidationError", (err) =>
 *   Effect.logError("Validation failed", { jobId: err.jobId })
 * )
 * Effect.catchTag("JobExecutionError", (err) =>
 *   Effect.logError("Execution failed", { cause: err.cause })
 * )
 * Effect.catchTag("JobTimeoutError", (err) =>
 *   Effect.logError("Job timed out", { timeout: err.timeout })
 * )
 * ```
 */
export type JobError = JobValidationError | JobExecutionError | JobTimeoutError
