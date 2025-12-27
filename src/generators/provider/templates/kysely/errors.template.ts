/**
 * Kysely Provider Errors Template
 *
 * Specialized error types for the Kysely database query builder provider.
 *
 * @module monorepo-library-generator/provider/templates/kysely/errors
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder'
import type { ProviderTemplateOptions } from '../../../../utils/types'

/**
 * Generate Kysely provider errors file
 */
export function generateKyselyErrorsFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { packageName } = options

  builder.addFileHeader({
    title: 'Database Provider Errors',
    description: `Error types for Kysely database provider using Data.TaggedError.

Uses Data.TaggedError for internal provider errors (not serializable).
Schema.TaggedError is reserved for RPC boundary errors only.`,
    module: `${packageName}/errors`
  })
  builder.addBlankLine()

  builder.addImports([{ from: 'effect', imports: ['Data'] }])
  builder.addBlankLine()

  builder.addSectionComment('Error Types')
  builder.addBlankLine()

  builder.addRaw(`/**
 * Connection error - failure to connect to database
 */
export class DatabaseConnectionError extends Data.TaggedError(
  "DatabaseConnectionError"
)<{
  readonly message: string
  readonly cause?: unknown
  readonly host?: string
  readonly port?: number
  readonly database?: string
}> {}

/**
 * Query error - query execution failed
 */
export class DatabaseQueryError extends Data.TaggedError(
  "DatabaseQueryError"
)<{
  readonly operation: string
  readonly message: string
  readonly query?: string
  readonly cause?: unknown
}> {}

/**
 * Transaction error - transaction failed
 */
export class DatabaseTransactionError extends Data.TaggedError(
  "DatabaseTransactionError"
)<{
  readonly message: string
  readonly cause?: unknown
}> {}`)
  builder.addBlankLine()

  builder.addSectionComment('Error Type Union')
  builder.addBlankLine()

  builder.addRaw(`/**
 * Union of all database error types
 */
export type DatabaseError =
  | DatabaseConnectionError
  | DatabaseQueryError
  | DatabaseTransactionError`)

  return builder.toString()
}
