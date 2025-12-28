/**
 * Feature Types Template Definition
 *
 * Declarative template for generating shared/types.ts in feature libraries.
 * Contains service configuration and shared type definitions.
 *
 * @module monorepo-library-generator/templates/definitions/feature/types
 */

import type { TemplateDefinition } from '../../core/types'

/**
 * Feature Types Template Definition
 *
 * Generates a types.ts file with:
 * - Service configuration interface
 * - Re-exports from contract library
 * - Feature-specific type aliases
 */
export const featureTypesTemplate: TemplateDefinition = {
  id: 'feature/types',
  meta: {
    title: '{className} Feature Types',
    description: `Shared types for {propertyName} feature.

Re-exports entity types from contract library and adds feature-specific configuration.`,
    module: '{scope}/feature-{fileName}/shared/types'
  },
  imports: [
    {
      from: '{scope}/contract-{fileName}',
      items: [
        '{className}',
        '{className}Id',
        '{className}CreateInput',
        '{className}UpdateInput',
        '{className}Filter'
      ],
      isTypeOnly: true
    }
  ],
  sections: [
    // Type Re-exports
    {
      title: 'Contract Type Re-exports',
      content: {
        type: 'raw',
        value: `/**
 * Re-export entity types from contract library
 *
 * Import from contract library directly when possible.
 * These re-exports exist for convenience within the feature.
 */
export type {
  {className},
  {className}Id,
  {className}CreateInput,
  {className}UpdateInput,
  {className}Filter
}`
      }
    },
    // Service Configuration
    {
      title: 'Service Configuration',
      content: {
        type: 'raw',
        value: `/**
 * {className} Service Configuration
 *
 * Configuration options for the {className}Service.
 * These are resolved at service layer construction.
 */
export interface {className}ServiceConfig {
  /**
   * Enable caching for read operations
   * @default true
   */
  readonly enableCache?: boolean

  /**
   * Cache TTL in milliseconds
   * @default 300000 (5 minutes)
   */
  readonly cacheTtlMs?: number

  /**
   * Enable event publishing for mutations
   * @default true
   */
  readonly enableEvents?: boolean

  /**
   * Maximum items per page for list operations
   * @default 100
   */
  readonly maxPageSize?: number
}`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * Default service configuration
 */
export const DEFAULT_{constantName}_CONFIG: Required<{className}ServiceConfig> = {
  enableCache: true,
  cacheTtlMs: 300_000,
  enableEvents: true,
  maxPageSize: 100
}`
      }
    },
    // Pagination Types
    {
      title: 'Pagination Types',
      content: {
        type: 'raw',
        value: `/**
 * Paginated result wrapper
 */
export interface {className}PaginatedResult<T> {
  readonly items: readonly T[]
  readonly total: number
  readonly offset: number
  readonly limit: number
  readonly hasMore: boolean
}`
      }
    }
  ]
}

export default featureTypesTemplate
