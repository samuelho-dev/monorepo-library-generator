/**
 * Contract Ports Template Definition
 *
 * Declarative template for generating ports.ts in contract libraries.
 * Contains repository and service interface definitions using Context.Tag.
 *
 * @module monorepo-library-generator/templates/definitions/contract/ports
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Contract Ports Template Definition
 *
 * Generates a complete ports.ts file with:
 * - Supporting types (Filters, Pagination, Sort)
 * - Repository port (Context.Tag with inline interface)
 * - Service port (Context.Tag with inline interface)
 * - Projection repository port (CQRS only, conditional)
 */
export const contractPortsTemplate: TemplateDefinition = {
  id: "contract/ports",
  meta: {
    title: "{className} Ports (Interfaces)",
    description: "Defines repository and service interfaces for {propertyName} domain.",
    module: "{scope}/contract-{fileName}/ports"
  },
  imports: [
    // Import entity type from external package if specified, otherwise from local types
    {
      from: "{entityTypeSource}",
      items: ["{className}Select as {className}"],
      isTypeOnly: true
    },
    // Context is a runtime value (used in extends Context.Tag())
    { from: "effect", items: ["Context"] },
    // Effect and Option are type-only
    { from: "effect", items: ["Effect", "Option"], isTypeOnly: true },
    // Import repository error type
    {
      from: "./errors",
      items: ["{className}RepositoryError"],
      isTypeOnly: true
    }
  ],
  sections: [
    // Supporting Types Section
    {
      title: "Supporting Types",
      content: {
        type: "interface",
        config: {
          name: "{className}Filters",
          jsdoc: "Filter options for querying {propertyName}s",
          exported: true,
          properties: [
            { name: "createdAfter", type: "Date", optional: true, readonly: true, jsdoc: "Filter by creation date range" },
            { name: "createdBefore", type: "Date", optional: true, readonly: true },
            { name: "updatedAfter", type: "Date", optional: true, readonly: true, jsdoc: "Filter by update date range" },
            { name: "updatedBefore", type: "Date", optional: true, readonly: true }
          ]
        }
      }
    },
    {
      content: {
        type: "interface",
        config: {
          name: "OffsetPaginationParams",
          jsdoc: "Offset-based pagination parameters (for repository layer)",
          exported: true,
          properties: [
            { name: "limit", type: "number", readonly: true },
            { name: "offset", type: "number", readonly: true }
          ]
        }
      }
    },
    {
      content: {
        type: "interface",
        config: {
          name: "SortOptions",
          jsdoc: "Sort options",
          exported: true,
          properties: [
            { name: "field", type: "string", readonly: true },
            { name: "direction", type: '"asc" | "desc"', readonly: true }
          ]
        }
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Paginated result with generic item type
 */
export interface PaginatedResult<T> {
  readonly items: ReadonlyArray<T>
  readonly total: number
  readonly limit: number
  readonly offset: number
  readonly hasMore: boolean
}`
      }
    },

    // Repository Port Section
    {
      title: "Repository Port",
      content: {
        type: "contextTag",
        config: {
          serviceName: "{className}Repository",
          tagIdentifier: "{scope}/contract-{fileName}/{className}Repository",
          jsdoc: `{className}Repository Context Tag for dependency injection

Effect 3.0+ pattern: Context.Tag with inline interface definition.
This ensures proper type inference and avoids recursive type issues.`,
          methods: [
            {
              name: "findById",
              params: [{ name: "id", type: "string" }],
              returnType: "Effect.Effect<Option.Option<{className}>, {className}RepositoryError, never>",
              jsdoc: "Find {propertyName} by ID"
            },
            {
              name: "findAll",
              params: [
                { name: "filters", type: "{className}Filters", optional: true },
                { name: "pagination", type: "OffsetPaginationParams", optional: true },
                { name: "sort", type: "SortOptions", optional: true }
              ],
              returnType: "Effect.Effect<PaginatedResult<{className}>, {className}RepositoryError>",
              jsdoc: "Find all {propertyName}s matching filters"
            },
            {
              name: "count",
              params: [{ name: "filters", type: "{className}Filters", optional: true }],
              returnType: "Effect.Effect<number, {className}RepositoryError, never>",
              jsdoc: "Count {propertyName}s matching filters"
            },
            {
              name: "create",
              params: [{ name: "input", type: "Partial<{className}>" }],
              returnType: "Effect.Effect<{className}, {className}RepositoryError, never>",
              jsdoc: "Create a new {propertyName}"
            },
            {
              name: "update",
              params: [
                { name: "id", type: "string" },
                { name: "input", type: "Partial<{className}>" }
              ],
              returnType: "Effect.Effect<{className}, {className}RepositoryError, never>",
              jsdoc: "Update an existing {propertyName}"
            },
            {
              name: "delete",
              params: [{ name: "id", type: "string" }],
              returnType: "Effect.Effect<void, {className}RepositoryError, never>",
              jsdoc: "Delete a {propertyName} permanently"
            },
            {
              name: "exists",
              params: [{ name: "id", type: "string" }],
              returnType: "Effect.Effect<boolean, {className}RepositoryError, never>",
              jsdoc: "Check if {propertyName} exists by ID"
            }
          ]
        }
      }
    },

    // Service Port Section
    {
      title: "Service Port",
      content: {
        type: "contextTag",
        config: {
          serviceName: "{className}Service",
          tagIdentifier: "{scope}/contract-{fileName}/{className}Service",
          jsdoc: `{className}Service Context Tag for dependency injection

Effect 3.0+ pattern: Context.Tag with inline interface definition.`,
          methods: [
            {
              name: "get",
              params: [{ name: "id", type: "string" }],
              returnType: "Effect.Effect<{className}, {className}RepositoryError, never>",
              jsdoc: "Get {propertyName} by ID"
            },
            {
              name: "list",
              params: [
                { name: "filters", type: "{className}Filters", optional: true },
                { name: "pagination", type: "OffsetPaginationParams", optional: true },
                { name: "sort", type: "SortOptions", optional: true }
              ],
              returnType: "Effect.Effect<PaginatedResult<{className}>, {className}RepositoryError, never>",
              jsdoc: "List {propertyName}s with filters and pagination"
            },
            {
              name: "create",
              params: [{ name: "input", type: "Partial<{className}>" }],
              returnType: "Effect.Effect<{className}, {className}RepositoryError, never>",
              jsdoc: "Create a new {propertyName}"
            },
            {
              name: "update",
              params: [
                { name: "id", type: "string" },
                { name: "input", type: "Partial<{className}>" }
              ],
              returnType: "Effect.Effect<{className}, {className}RepositoryError, never>",
              jsdoc: "Update an existing {propertyName}"
            },
            {
              name: "delete",
              params: [{ name: "id", type: "string" }],
              returnType: "Effect.Effect<void, {className}RepositoryError, never>",
              jsdoc: "Delete a {propertyName}"
            }
          ]
        }
      }
    }
  ],

  // Conditional content for CQRS
  conditionals: {
    includeCQRS: {
      imports: [],
      sections: [
        {
          title: "Projection Repository Port (CQRS)",
          content: {
            type: "contextTag",
            config: {
              serviceName: "{className}ProjectionRepository",
              tagIdentifier: "{scope}/contract-{fileName}/{className}ProjectionRepository",
              jsdoc: `{className}ProjectionRepository Context Tag for CQRS read models

Manages projections (denormalized read models) for optimized query performance.`,
              methods: [
                {
                  name: "findProjection",
                  params: [{ name: "id", type: "string" }],
                  returnType: "Effect.Effect<Option.Option<unknown>, {className}RepositoryError, never>",
                  jsdoc: "Find projection by ID"
                },
                {
                  name: "listProjections",
                  params: [
                    { name: "filters", type: "Record<string, unknown>", optional: true },
                    { name: "pagination", type: "OffsetPaginationParams", optional: true }
                  ],
                  returnType: "Effect.Effect<PaginatedResult<unknown>, {className}RepositoryError, never>",
                  jsdoc: "List projections with filters"
                },
                {
                  name: "updateProjection",
                  params: [
                    { name: "id", type: "string" },
                    { name: "data", type: "unknown" }
                  ],
                  returnType: "Effect.Effect<void, {className}RepositoryError, never>",
                  jsdoc: "Update projection (called by event handlers)"
                },
                {
                  name: "rebuildProjection",
                  params: [{ name: "id", type: "string" }],
                  returnType: "Effect.Effect<void, {className}RepositoryError, never>",
                  jsdoc: "Rebuild projection from event stream"
                }
              ]
            }
          }
        }
      ]
    }
  }
}

export default contractPortsTemplate
