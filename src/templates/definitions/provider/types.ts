/**
 * Provider Types Template Definition
 *
 * Declarative template for generating lib/types.ts in provider libraries.
 * Contains configuration, resource, and common type definitions.
 *
 * @module monorepo-library-generator/templates/definitions/provider/types
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Provider Types Template Definition
 *
 * Generates a types.ts file with:
 * - Configuration interface
 * - Resource types
 * - Pagination types
 * - Query options
 *
 * Provider type variations:
 * - sdk: SDK wrapper types
 * - http: HTTP client types with Schema
 * - graphql: GraphQL client types with Schema
 * - cli: CLI wrapper types
 */
export const providerTypesTemplate: TemplateDefinition = {
  id: "provider/types",
  meta: {
    title: "{className} - Type Definitions",
    description: "Common types used across the provider service",
    module: "{scope}/provider-{fileName}/lib/types"
  },
  imports: [{ from: "effect", items: ["Schema"] }],
  sections: [
    // Configuration
    {
      title: "Configuration",
      content: {
        type: "raw",
        value: `/**
 * {className} Configuration
 */
export interface {className}Config {
  readonly apiKey: string
  readonly baseUrl?: string
  readonly timeout?: number
}`
      }
    },
    // Resource Types
    {
      title: "Resource Types",
      content: {
        type: "raw",
        value: `/**
 * Resource Schema - customize based on your API
 *
 * Date fields use Schema.DateTimeUtc for automatic ISO 8601 string ↔ Date conversion.
 * This handles serialization over HTTP/GraphQL automatically.
 */
export const ResourceSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc
})

export type Resource = Schema.Schema.Type<typeof ResourceSchema>`
      }
    },
    // Pagination Types
    {
      title: "Pagination Types",
      content: {
        type: "raw",
        value: `/**
 * List Parameters
 */
export interface ListParams {
  readonly page?: number
  readonly limit?: number
}

/**
 * Paginated Result
 */
export interface PaginatedResult<T> {
  readonly data: readonly T[]
  readonly page: number
  readonly limit: number
  readonly total: number
}`
      }
    },
    // Health Check
    {
      content: {
        type: "raw",
        value: `/**
 * Health Check Result
 */
export interface HealthCheckResult {
  readonly status: "healthy" | "unhealthy"
  readonly timestamp?: Date
}`
      }
    },
    // Service Metadata
    {
      title: "Service Metadata",
      content: {
        type: "raw",
        value: `/**
 * Service Metadata
 */
export interface ServiceMetadata {
  /** Service name */
  readonly name: string
  /** Service version */
  readonly version: string
  /** Environment */
  readonly environment: "production" | "development" | "test"
}`
      }
    },
    // Query Options
    {
      title: "Query Options",
      content: {
        type: "raw",
        value: `/**
 * Pagination Options
 */
export interface PaginationOptions {
  /** Maximum number of items to return */
  readonly limit?: number
  /** Number of items to skip */
  readonly offset?: number
  /** Cursor for cursor-based pagination */
  readonly cursor?: string
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  /** Data items */
  readonly data: readonly T[]
  /** Total number of items */
  readonly total: number
  /** Whether there are more items */
  readonly hasMore: boolean
  /** Cursor for next page */
  readonly nextCursor?: string
}

/**
 * Sort Options
 */
export interface SortOptions {
  /** Field to sort by */
  readonly field: string
  /** Sort direction */
  readonly direction: "asc" | "desc"
}

/**
 * Filter Options
 */
export interface FilterOptions {
  /** Dynamic filter fields */
  [key: string]: unknown
}

/**
 * Query Options
 */
export interface QueryOptions {
  /** Pagination options */
  readonly pagination?: PaginationOptions
  /** Sort options */
  readonly sort?: SortOptions
  /** Filter options */
  readonly filters?: FilterOptions
}`
      }
    }
  ]
}

export default providerTypesTemplate
