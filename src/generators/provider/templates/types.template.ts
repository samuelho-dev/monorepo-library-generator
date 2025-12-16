/**
 * Provider Generator - Types Template
 *
 * Generates common type definitions for provider libraries.
 * Includes pagination, sorting, filtering, and metadata types.
 *
 * @module monorepo-library-generator/provider/templates/types
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { ProviderTemplateOptions } from "../../../utils/shared/types"

/**
 * Generate types.ts file for provider library
 *
 * Creates common type definitions used across the service.
 *
 * @param options - Provider template options
 * @returns Generated TypeScript code
 */
export function generateTypesFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, name: projectClassName, providerType = "sdk" } = options

  // File header
  builder.addRaw("/**")
  builder.addRaw(` * ${projectClassName} - Type Definitions`)
  builder.addRaw(" *")
  builder.addRaw(" * Common types used across the service")
  builder.addRaw(" */")
  builder.addBlankLine()

  // Add Schema import for HTTP/GraphQL providers
  if (providerType === "http" || providerType === "graphql") {
    builder.addImport("effect", "Schema")
    builder.addBlankLine()
  }

  // Add provider-type-specific configuration
  if (providerType === "cli") {
    // CLI-specific types
    builder.addRaw("/**")
    builder.addRaw(" * Command Result")
    builder.addRaw(" */")
    builder.addRaw("export interface CommandResult {")
    builder.addRaw("  readonly output: string;")
    builder.addRaw("  readonly exitCode: number;")
    builder.addRaw("}")
    builder.addBlankLine()

    builder.addRaw("/**")
    builder.addRaw(` * ${className} Configuration`)
    builder.addRaw(" */")
    builder.addRaw(`export interface ${className}Config {`)
    builder.addRaw("  readonly commandPath?: string;")
    builder.addRaw("  readonly defaultTimeout?: number;")
    builder.addRaw("  readonly env?: Record<string, string>;")
    builder.addRaw("}")
    builder.addBlankLine()

    // Return early for CLI - no pagination types needed
    return builder.toString()
  }

  if (providerType === "http" || providerType === "graphql") {
    // HTTP/GraphQL-specific types
    builder.addRaw("/**")
    builder.addRaw(` * ${className} Configuration`)
    builder.addRaw(" */")
    builder.addRaw(`export interface ${className}Config {`)
    builder.addRaw("  readonly baseUrl: string;")
    builder.addRaw("  readonly apiKey: string;")
    builder.addRaw("  readonly timeout?: number;")
    builder.addRaw("}")
    builder.addBlankLine()

    // Resource schema for HTTP/GraphQL
    builder.addRaw("/**")
    builder.addRaw(" * Resource Schema - customize based on your API")
    builder.addRaw(" *")
    builder.addRaw(" * Date fields use Schema.DateTimeUtc for automatic ISO 8601 string ↔ Date conversion.")
    builder.addRaw(" * This handles serialization over HTTP/GraphQL automatically.")
    builder.addRaw(" */")
    builder.addRaw("export const ResourceSchema = Schema.Struct({")
    builder.addRaw("  id: Schema.String,")
    builder.addRaw("  name: Schema.String,")
    builder.addRaw("  createdAt: Schema.DateTimeUtc,")
    builder.addRaw("  updatedAt: Schema.DateTimeUtc,")
    builder.addRaw("});")
    builder.addBlankLine()

    builder.addRaw("export type Resource = Schema.Schema.Type<typeof ResourceSchema>;")
    builder.addBlankLine()

    // List params for pagination
    builder.addRaw("/**")
    builder.addRaw(" * List Parameters")
    builder.addRaw(" */")
    builder.addRaw("export interface ListParams {")
    builder.addRaw("  readonly page?: number;")
    builder.addRaw("  readonly limit?: number;")
    builder.addRaw("}")
    builder.addBlankLine()

    // Paginated result
    builder.addRaw("/**")
    builder.addRaw(" * Paginated Result")
    builder.addRaw(" */")
    builder.addRaw("export interface PaginatedResult<T> {")
    builder.addRaw("  readonly data: readonly T[];")
    builder.addRaw("  readonly page: number;")
    builder.addRaw("  readonly limit: number;")
    builder.addRaw("  readonly total: number;")
    builder.addRaw("}")
    builder.addBlankLine()

    // Health check result
    builder.addRaw("/**")
    builder.addRaw(" * Health Check Result")
    builder.addRaw(" */")
    builder.addRaw("export interface HealthCheckResult {")
    builder.addRaw("  readonly status: \"healthy\" | \"unhealthy\";")
    builder.addRaw("  readonly timestamp?: Date;")
    builder.addRaw("}")
    builder.addBlankLine()

    return builder.toString()
  }

  // SDK-specific types (original implementation)
  builder.addRaw("/**")
  builder.addRaw(` * ${className} Configuration`)
  builder.addRaw(" */")
  builder.addRaw(`export interface ${className}Config {`)
  builder.addRaw("  readonly apiKey: string;")
  builder.addRaw("  readonly timeout?: number;")
  builder.addRaw("}")
  builder.addBlankLine()

  // Resource type for SDK
  builder.addRaw("/**")
  builder.addRaw(" * Resource - customize based on your service")
  builder.addRaw(" */")
  builder.addRaw("export interface Resource {")
  builder.addRaw("  readonly id: string;")
  builder.addRaw("  readonly name: string;")
  builder.addRaw("  readonly createdAt: Date;")
  builder.addRaw("  readonly updatedAt: Date;")
  builder.addRaw("}")
  builder.addBlankLine()

  // List params
  builder.addRaw("/**")
  builder.addRaw(" * List Parameters")
  builder.addRaw(" */")
  builder.addRaw("export interface ListParams {")
  builder.addRaw("  readonly page?: number;")
  builder.addRaw("  readonly limit?: number;")
  builder.addRaw("}")
  builder.addBlankLine()

  // Paginated result
  builder.addRaw("/**")
  builder.addRaw(" * Paginated Result")
  builder.addRaw(" */")
  builder.addRaw("export interface PaginatedResult<T> {")
  builder.addRaw("  readonly data: readonly T[];")
  builder.addRaw("  readonly page: number;")
  builder.addRaw("  readonly limit: number;")
  builder.addRaw("  readonly total: number;")
  builder.addRaw("}")
  builder.addBlankLine()

  // Health check result
  builder.addRaw("/**")
  builder.addRaw(" * Health Check Result")
  builder.addRaw(" */")
  builder.addRaw("export interface HealthCheckResult {")
  builder.addRaw("  readonly status: \"healthy\" | \"unhealthy\";")
  builder.addRaw("  readonly timestamp?: Date;")
  builder.addRaw("}")
  builder.addBlankLine()

  // Continue with the original SDK types below...

  // Service Metadata
  builder.addInterface({
    name: "ServiceMetadata",
    exported: true,
    jsdoc: "Service Metadata",
    properties: [
      { name: "name", type: "string", readonly: true, jsdoc: "Service name" },
      {
        name: "version",
        type: "string",
        readonly: true,
        jsdoc: "Service version"
      },
      {
        name: "environment",
        type: "\"production\" | \"development\" | \"test\"",
        readonly: true,
        jsdoc: "Environment"
      }
    ]
  })

  // Pagination Options
  builder.addInterface({
    name: "PaginationOptions",
    exported: true,
    jsdoc: "Pagination Options",
    properties: [
      {
        name: "limit",
        type: "number",
        readonly: true,
        optional: true,
        jsdoc: "Maximum number of items to return"
      },
      {
        name: "offset",
        type: "number",
        readonly: true,
        optional: true,
        jsdoc: "Number of items to skip"
      },
      {
        name: "cursor",
        type: "string",
        readonly: true,
        optional: true,
        jsdoc: "Cursor for cursor-based pagination"
      }
    ]
  })

  // Paginated Response
  builder.addInterface({
    name: "PaginatedResponse",
    exported: true,
    jsdoc: "Paginated Response",
    properties: [
      {
        name: "data",
        type: "readonly T[]",
        readonly: true,
        jsdoc: "Data items"
      },
      {
        name: "total",
        type: "number",
        readonly: true,
        jsdoc: "Total number of items"
      },
      {
        name: "hasMore",
        type: "boolean",
        readonly: true,
        jsdoc: "Whether there are more items"
      },
      {
        name: "nextCursor",
        type: "string",
        readonly: true,
        optional: true,
        jsdoc: "Cursor for next page"
      }
    ]
  })

  // Add generic type parameter to PaginatedResponse
  const content = builder.toString()
  const updatedContent = content.replace(
    "export interface PaginatedResponse {",
    "export interface PaginatedResponse<T> {"
  )

  builder.clear()
  builder.addRaw(updatedContent)

  // Sort Options
  builder.addInterface({
    name: "SortOptions",
    exported: true,
    jsdoc: "Sort Options",
    properties: [
      {
        name: "field",
        type: "string",
        readonly: true,
        jsdoc: "Field to sort by"
      },
      {
        name: "direction",
        type: "\"asc\" | \"desc\"",
        readonly: true,
        jsdoc: "Sort direction"
      }
    ]
  })

  // Filter Options
  builder.addInterface({
    name: "FilterOptions",
    exported: true,
    jsdoc: "Filter Options",
    properties: [
      {
        name: "[key: string]",
        type: "unknown",
        jsdoc: "Dynamic filter fields"
      }
    ]
  })

  // Query Options
  builder.addInterface({
    name: "QueryOptions",
    exported: true,
    jsdoc: "Query Options",
    properties: [
      {
        name: "pagination",
        type: "PaginationOptions",
        readonly: true,
        optional: true,
        jsdoc: "Pagination options"
      },
      {
        name: "sort",
        type: "SortOptions",
        readonly: true,
        optional: true,
        jsdoc: "Sort options"
      },
      {
        name: "filters",
        type: "FilterOptions",
        readonly: true,
        optional: true,
        jsdoc: "Filter options"
      }
    ]
  })

  return builder.toString()
}
