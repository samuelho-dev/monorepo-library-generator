/**
 * Feature Schemas Template Definition
 *
 * Declarative template for generating shared/schemas.ts in feature libraries.
 * Contains shared Effect Schema definitions.
 *
 * @module monorepo-library-generator/templates/definitions/feature/schemas
 */

import type { TemplateDefinition } from '../../core/types'

/**
 * Feature Schemas Template Definition
 *
 * Generates a schemas.ts file with:
 * - Result schemas for service operations
 * - Configuration schemas
 * - Common validation schemas
 */
export const featureSchemasTemplate: TemplateDefinition = {
  id: 'feature/schemas',
  meta: {
    title: '{className} Feature Schemas',
    description: `Shared Effect Schema definitions for {propertyName} feature.

Contains validation schemas used across the feature layer.`,
    module: '{scope}/feature-{fileName}/shared/schemas'
  },
  imports: [{ from: 'effect', items: ['Schema'] }],
  sections: [
    // Result Schemas
    {
      title: 'Result Schemas',
      content: {
        type: 'raw',
        value: `/**
 * Service operation result schema
 *
 * Standard result wrapper for service operations.
 */
export const {className}ResultSchema = Schema.Struct({
  success: Schema.Boolean,
  message: Schema.optional(Schema.String),
  data: Schema.optional(Schema.Unknown)
})

export type {className}Result = Schema.Schema.Type<typeof {className}ResultSchema>`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * Bulk operation result schema
 */
export const {className}BulkResultSchema = Schema.Struct({
  processed: Schema.Number,
  succeeded: Schema.Number,
  failed: Schema.Number,
  errors: Schema.Array(Schema.Struct({
    id: Schema.String,
    message: Schema.String
  }))
})

export type {className}BulkResult = Schema.Schema.Type<typeof {className}BulkResultSchema>`
      }
    },
    // Configuration Schemas
    {
      title: 'Configuration Schemas',
      content: {
        type: 'raw',
        value: `/**
 * Service configuration schema
 *
 * Used for validating runtime configuration.
 */
export const {className}ConfigSchema = Schema.Struct({
  enableCache: Schema.optional(Schema.Boolean),
  cacheTtlMs: Schema.optional(Schema.Number.pipe(
    Schema.positive()
  )),
  enableEvents: Schema.optional(Schema.Boolean),
  maxPageSize: Schema.optional(Schema.Number.pipe(
    Schema.positive(),
    Schema.lessThanOrEqualTo(1000)
  ))
})

export type {className}Config = Schema.Schema.Type<typeof {className}ConfigSchema>`
      }
    },
    // Validation Schemas
    {
      title: 'Validation Schemas',
      content: {
        type: 'raw',
        value: `/**
 * Pagination parameters schema
 */
export const PaginationSchema = Schema.Struct({
  offset: Schema.Number.pipe(
    Schema.nonNegative()
  ),
  limit: Schema.Number.pipe(
    Schema.positive(),
    Schema.lessThanOrEqualTo(100)
  )
}).pipe(Schema.brand("Pagination"))

export type Pagination = Schema.Schema.Type<typeof PaginationSchema>`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * Sort direction schema
 */
export const SortDirectionSchema = Schema.Literal("asc", "desc")
export type SortDirection = Schema.Schema.Type<typeof SortDirectionSchema>`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * Generic sort options schema factory
 */
export const createSortSchema = <T extends readonly string[]>(fields: T) =>
  Schema.Struct({
    field: Schema.Literal(...fields),
    direction: SortDirectionSchema
  })`
      }
    }
  ]
}

export default featureSchemasTemplate
