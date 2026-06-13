import { Schema } from 'effect'

/**
 * Connection error raised by the health-check path.
 */
export class DatabaseConnectionError extends Schema.TaggedErrorClass<DatabaseConnectionError>()(
  'DatabaseConnectionError',
  {
    message: Schema.String,
    target: Schema.String,
    cause: Schema.Defect
  }
) {}

/**
 * Configuration error — service is misconfigured.
 */
export class DatabaseConfigError extends Schema.TaggedErrorClass<DatabaseConfigError>()(
  'DatabaseConfigError',
  {
    message: Schema.String,
    property: Schema.String
  }
) {}

// ============================================================================
// Data Access Infrastructure Errors
// ============================================================================

export class DataAccessConnectionError extends Schema.TaggedErrorClass<DataAccessConnectionError>()(
  'DataAccessConnectionError',
  {
    message: Schema.String,
    target: Schema.String,
    cause: Schema.optional(Schema.Defect)
  }
) {
  static create(target: string, cause?: unknown) {
    return new DataAccessConnectionError({
      message: `Failed to connect to ${target}`,
      target,
      cause
    })
  }
}

export class DataAccessTimeoutError extends Schema.TaggedErrorClass<DataAccessTimeoutError>()(
  'DataAccessTimeoutError',
  {
    message: Schema.String,
    operation: Schema.String,
    timeoutMs: Schema.Number
  }
) {
  static create(operation: string, timeoutMs: number) {
    return new DataAccessTimeoutError({
      message: `Operation "${operation}" timed out after ${timeoutMs}ms`,
      operation,
      timeoutMs
    })
  }
}

export class DataAccessTransactionError extends Schema.TaggedErrorClass<DataAccessTransactionError>()(
  'DataAccessTransactionError',
  {
    message: Schema.String,
    operation: Schema.String,
    phase: Schema.Union([
      Schema.Literal('begin'),
      Schema.Literal('commit'),
      Schema.Literal('rollback')
    ]),
    cause: Schema.optional(Schema.Defect)
  }
) {
  static create(operation: string, phase: 'begin' | 'commit' | 'rollback', cause?: unknown) {
    return new DataAccessTransactionError({
      message: `Transaction ${phase} failed during ${operation}`,
      operation,
      phase,
      cause
    })
  }
}
