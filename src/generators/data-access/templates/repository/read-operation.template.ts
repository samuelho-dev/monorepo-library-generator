/**
 * Repository Read Operations Template
 *
 * Generates repository/operations/read.ts file with read/query operations
 *
 * @module monorepo-library-generator/data-access/repository/read-operation-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { DataAccessTemplateOptions } from "../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

/**
 * Generate repository/operations/read.ts file
 *
 * Creates implementation for entity read/query operations
 */
export function generateRepositoryReadOperationFile(options: DataAccessTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Read Operations`,
    description: `Implements read/query operations for ${className} entities.

Bundle optimization: Import this file directly for smallest bundle size:
  import { readOperations } from '@scope/data-access-${fileName}/repository/operations/read'`,
    module: `${scope}/data-access-${fileName}/repository/operations`
  })
  builder.addBlankLine()

  // Add imports
  builder.addImports([
    { from: "effect", imports: ["Duration", "Effect", "Option"] },
    { from: `${scope}/infra-database`, imports: ["DatabaseService"] },
    { from: "../../shared/errors", imports: [`${className}TimeoutError`] },
    { from: "../../shared/types", imports: [`${className}Filter`, "PaginationOptions"], isTypeOnly: true }
  ])

  // Live implementation
  builder.addSectionComment("Read Operations")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Read operations for ${className} repository
 *
 * Uses DatabaseService for persistence with type-safe database queries.
 * Return types are inferred to preserve Effect's dependency and error tracking.
 *
 * @example
 * \`\`\`typescript
 * const maybeEntity = yield* readOperations.findById("id-123")
 * \`\`\`
 */
export const readOperations = {
  /**
   * Find ${className} entity by ID
   */
  findById: (id: string) =>
    Effect.gen(function*() {
      const database = yield* DatabaseService

      yield* Effect.logDebug(\`Finding ${className} by ID: \${id}\`)

      const entity = yield* database.query((db) =>
        db
          .selectFrom("${fileName}")
          .selectAll()
          .where("id", "=", id)
          .executeTakeFirst()
      )

      if (entity) {
        yield* Effect.logDebug(\`Found ${className}: \${id}\`)
        return Option.some(entity)
      }

      yield* Effect.logDebug(\`${className} not found: \${id}\`)
      return Option.none()
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () => ${className}TimeoutError.create("findById", 30000)
      }),
      Effect.withSpan("${className}Repository.findById")
    ),

  /**
   * Find all ${className} entities matching filters
   */
  findAll: (filter?: ${className}Filter, pagination?: PaginationOptions) =>
    Effect.gen(function*() {
      const database = yield* DatabaseService

      yield* Effect.logDebug(\`Finding all ${className} entities (filter: \${JSON.stringify(filter)})\`)

      const limit = pagination?.limit ?? 50
      const skip = pagination?.skip ?? 0

      // Build query with filtering
      const items = yield* database.query((db) => {
        let query = db.selectFrom("${fileName}").selectAll()

        // Apply filters (basic search implementation)
        // TODO: Implement proper full-text search or specific field filtering
        if (filter?.search) {
          query = query.where((eb) =>
            eb.or([
              // Add searchable fields here based on your schema
              eb("name", "ilike", \`%\${filter.search}%\`)
            ])
          )
        }

        return query.limit(limit).offset(skip).execute()
      })

      // Get total count (without pagination)
      const total = yield* database.query((db) => {
        let query = db.selectFrom("${fileName}").select((eb) => eb.fn.countAll().as("count"))

        if (filter?.search) {
          query = query.where((eb) =>
            eb.or([
              eb("name", "ilike", \`%\${filter.search}%\`)
            ])
          )
        }

        return query.executeTakeFirstOrThrow().then((result) => Number(result.count))
      })

      yield* Effect.logDebug(\`Found \${items.length} ${className} entities (total: \${total})\`)

      return {
        items,
        total,
        hasMore: skip + items.length < total
      }
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () => ${className}TimeoutError.create("findAll", 30000)
      }),
      Effect.withSpan("${className}Repository.findAll")
    ),

  /**
   * Find one ${className} entity matching filter
   */
  findOne: (filter: ${className}Filter) =>
    Effect.gen(function*() {
      const database = yield* DatabaseService

      yield* Effect.logDebug(\`Finding one ${className} entity (filter: \${JSON.stringify(filter)})\`)

      // Build query with filtering
      const entity = yield* database.query((db) => {
        let query = db.selectFrom("${fileName}").selectAll()

        // Apply filters
        if (filter.search) {
          query = query.where((eb) =>
            eb.or([
              eb("name", "ilike", \`%\${filter.search}%\`)
            ])
          )
        }

        return query.limit(1).executeTakeFirst()
      })

      if (entity) {
        yield* Effect.logDebug("Found ${className} matching filter")
        return Option.some(entity)
      }

      yield* Effect.logDebug("No ${className} found matching filter")
      return Option.none()
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () => ${className}TimeoutError.create("findOne", 30000)
      }),
      Effect.withSpan("${className}Repository.findOne")
    )
} as const

/**
 * Type alias for the read operations object
 */
export type Read${className}Operations = typeof readOperations
`)

  return builder.toString()
}
