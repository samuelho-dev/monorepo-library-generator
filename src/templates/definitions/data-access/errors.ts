/**
 * Data Access Errors Template Definition
 *
 * Declarative template for generating errors.ts in data-access libraries.
 * Defines infrastructure-specific errors only - domain errors come from contract.
 *
 * @module monorepo-library-generator/templates/definitions/data-access/errors
 */

import type { TemplateDefinition } from '../../core/types'

/**
 * Data Access Errors Template Definition
 *
 * Generates a complete errors.ts file with:
 * - Infrastructure errors (Connection, Timeout, Transaction)
 * - Union type for infrastructure errors
 * - Combined data access error type (Repository + Infrastructure)
 *
 * Uses raw content sections because the error classes have complex static methods
 * with JavaScript template literals that shouldn't be interpolated.
 */
export const dataAccessErrorsTemplate: TemplateDefinition = {
  id: 'data-access/errors',
  meta: {
    title: '{className} Data Access Infrastructure Errors',
    description: `Infrastructure-specific errors for data-access layer operations.

CONTRACT-FIRST ARCHITECTURE:
Domain errors are defined in {scope}/contract-{fileName} - import directly from there.
This file only contains infrastructure errors specific to data-access operations.`,
    module: '{scope}/data-access-{fileName}/errors'
  },
  imports: [
    {
      from: '{scope}/contract-{fileName}',
      items: ['{className}RepositoryError'],
      isTypeOnly: true
    },
    { from: 'effect', items: ['Data'] }
  ],
  sections: [
    // Contract-first architecture documentation
    {
      content: {
        type: 'raw',
        value: `/**
 * CONTRACT-FIRST ARCHITECTURE:
 * ============================
 *
 * Domain errors are in {scope}/contract-{fileName} - import directly from there.
 * This file only defines infrastructure-specific errors (Connection, Timeout, Transaction).
 * NO re-exports to comply with biome noBarrelFile rule.
 *
 * For domain errors, import from contract:
 *   import { {className}NotFoundError, {className}ValidationError } from "{scope}/contract-{fileName}"
 *
 * Infrastructure Errors (defined here):
 *   - {className}ConnectionError - Database connection failure
 *   - {className}TimeoutError - Operation timeout
 *   - {className}TransactionError - Transaction failure
 */`
      }
    },

    // Connection Error
    {
      title: 'Infrastructure Errors (Data-Access Specific)',
      content: {
        type: 'raw',
        value: `/**
 * Error thrown when database connection fails
 */
export class {className}ConnectionError extends Data.TaggedError(
  "{className}ConnectionError"
)<{
  /** Human-readable error message */
  readonly message: string
  /** Underlying connection error */
  readonly cause?: string
}> {
  static create(cause?: string) {
    return new {className}ConnectionError({
      message: cause
        ? \`Database connection failed: \${cause}\`
        : "Database connection failed",
      ...(cause !== undefined && { cause })
    })
  }
}`
      }
    },

    // Timeout Error
    {
      content: {
        type: 'raw',
        value: `/**
 * Error thrown when database operation times out
 */
export class {className}TimeoutError extends Data.TaggedError(
  "{className}TimeoutError"
)<{
  /** Human-readable error message */
  readonly message: string
  /** Operation that timed out */
  readonly operation: string
  /** Timeout duration in milliseconds */
  readonly timeoutMs?: number
}> {
  static create(params: {
    operation: string
    timeoutMs?: number
  }) {
    return new {className}TimeoutError({
      message: params.timeoutMs
        ? \`Operation '\${params.operation}' timed out after \${params.timeoutMs}ms\`
        : \`Operation '\${params.operation}' timed out\`,
      operation: params.operation,
      ...(params.timeoutMs !== undefined && { timeoutMs: params.timeoutMs })
    })
  }
}`
      }
    },

    // Transaction Error
    {
      content: {
        type: 'raw',
        value: `/**
 * Error thrown when database transaction fails
 */
export class {className}TransactionError extends Data.TaggedError(
  "{className}TransactionError"
)<{
  /** Human-readable error message */
  readonly message: string
  /** Transaction operation that failed */
  readonly operation: string
  /** Underlying transaction error */
  readonly cause?: string
}> {
  static create(params: {
    operation: string
    cause?: string
  }) {
    return new {className}TransactionError({
      message: params.cause
        ? \`Transaction failed during '\${params.operation}': \${params.cause}\`
        : \`Transaction failed during '\${params.operation}'\`,
      operation: params.operation,
      ...(params.cause !== undefined && { cause: params.cause })
    })
  }
}`
      }
    },

    // Infrastructure Error Union Type
    {
      title: 'Infrastructure Error Union Type',
      content: {
        type: 'raw',
        value: `/**
 * Union of infrastructure-specific errors
 *
 * These errors are specific to data-access operations and do not
 * appear in the contract layer. They should be caught and mapped
 * to repository errors at the data-access boundary.
 */
export type {className}InfrastructureError =
  | {className}ConnectionError
  | {className}TimeoutError
  | {className}TransactionError`
      }
    },

    // Combined Data Access Error Type
    {
      title: 'Combined Data Access Error Type',
      content: {
        type: 'raw',
        value: `/**
 * All possible data-access layer errors
 *
 * Use this type for repository method signatures:
 *
 * @example
 * \`\`\`typescript
 * import { {className}NotFoundError } from "{scope}/contract-{fileName}"
 *
 * export interface {className}Repository {
 *   readonly findById: (id: string) => Effect.Effect<
 *     Option.Option<{className}>,
 *     {className}DataAccessError
 *   >
 * }
 * \`\`\`
 */
export type {className}DataAccessError = {className}RepositoryError | {className}InfrastructureError`
      }
    }
  ]
}

export default dataAccessErrorsTemplate
