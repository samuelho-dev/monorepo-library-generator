/**
 * Contract Ports Template
 *
 * Generates ports.ts file for contract libraries with repository and service
 * interface definitions using Context.Tag pattern with inline interfaces.
 *
 * @module monorepo-library-generator/contract/ports-template
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import type { ContractTemplateOptions } from "../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"

/**
 * Generate ports.ts file for contract library
 *
 * Creates repository and service port definitions with:
 * - Supporting types (Filters, Pagination, Sort)
 * - Repository port (Context.Tag with inline interface)
 * - Service port (Context.Tag with inline interface)
 */
export function generatePortsFile(options: ContractTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, includeCQRS, propertyName } = options
  const domainName = propertyName
  const scope = WORKSPACE_CONFIG.getScope()

  // Add file header
  builder.addRaw(createFileHeader(className, domainName, fileName, scope))
  builder.addBlankLine()

  // Add imports
  // Import entity type from external package if specified, otherwise from local types
  // Note: prisma-effect-kysely generates UserSelect as the type (User is the schema object)
  const entityTypeSource = options.typesDatabasePackage
    ? options.typesDatabasePackage
    : "./types/database"

  // External package imports must come before effect package
  builder.addImports([
    {
      from: entityTypeSource,
      imports: [`${className}Select as ${className}`],
      isTypeOnly: true
    },
    // Context is a runtime value (used in extends Context.Tag()), Effect and Option are type-only
    { from: "effect", imports: ["Context"] },
    { from: "effect", imports: ["Effect", "Option"], isTypeOnly: true }
  ])

  builder.addImports([
    {
      from: "./errors",
      imports: [`${className}RepositoryError`],
      isTypeOnly: true
    }
  ])

  // ============================================================================
  // SECTION 1: Supporting Types
  // ============================================================================

  builder.addSectionComment("Supporting Types")
  builder.addBlankLine()

  // Filters interface
  builder.addInterface({
    name: `${className}Filters`,
    exported: true,
    jsdoc: `Filter options for querying ${domainName}s`,
    properties: [
      {
        name: "createdAfter",
        type: "Date",
        optional: true,
        readonly: true,
        jsdoc: "Filter by creation date range"
      },
      { name: "createdBefore", type: "Date", optional: true, readonly: true },
      {
        name: "updatedAfter",
        type: "Date",
        optional: true,
        readonly: true,
        jsdoc: "Filter by update date range"
      },
      { name: "updatedBefore", type: "Date", optional: true, readonly: true }
    ]
  })

  builder.addBlankLine()

  // OffsetPaginationParams interface (for repository-level pagination)
  // Note: RPC uses page-based PaginationParams, repository uses offset-based
  builder.addInterface({
    name: "OffsetPaginationParams",
    exported: true,
    jsdoc: "Offset-based pagination parameters (for repository layer)",
    properties: [
      { name: "limit", type: "number", readonly: true },
      { name: "offset", type: "number", readonly: true }
    ]
  })

  // SortOptions interface
  builder.addInterface({
    name: "SortOptions",
    exported: true,
    jsdoc: "Sort options",
    properties: [
      { name: "field", type: "string", readonly: true },
      { name: "direction", type: "\"asc\" | \"desc\"", readonly: true }
    ]
  })

  // PaginatedResult interface (generic)
  builder.addRaw(`
/**
 * Paginated result with generic item type
 */
export interface PaginatedResult<T> {
  readonly items: ReadonlyArray<T>
  readonly total: number
  readonly limit: number
  readonly offset: number
  readonly hasMore: boolean
}
`)

  // ============================================================================
  // SECTION 2: Repository Port
  // ============================================================================

  builder.addSectionComment("Repository Port")
  builder.addBlankLine()

  // Create repository Context.Tag with inline interface
  const repositoryTag = createRepositoryTag(className, domainName, fileName, scope)
  builder.addRaw(repositoryTag)

  // ============================================================================
  // SECTION 3: Service Port
  // ============================================================================

  builder.addSectionComment("Service Port")
  builder.addBlankLine()

  // Create service Context.Tag with inline interface
  const serviceTag = createServiceTag(className, domainName, fileName, scope)
  builder.addRaw(serviceTag)

  // ============================================================================
  // SECTION 4: Projection Repository Port (CQRS only)
  // ============================================================================

  if (includeCQRS) {
    builder.addSectionComment("Projection Repository Port (CQRS)")
    builder.addBlankLine()

    const projectionRepositoryTag = createProjectionRepositoryTag(className, fileName, scope)
    builder.addRaw(projectionRepositoryTag)
  }

  return builder.toString()
}

/**
 * Create file header with comprehensive documentation
 */
function createFileHeader(className: string, domainName: string, fileName: string, scope: string) {
  return `/**
 * ${className} Ports (Interfaces)
 *
 * Defines repository and service interfaces for ${domainName} domain.
 * These ports are implemented in the data-access layer using Effect's dependency injection.
 *
 * @see https://effect.website/docs/guides/context-management for dependency injection
 * @module ${scope}/contract-${fileName}/ports
 */`
}

/**
 * Create repository Context.Tag definition
 */
function createRepositoryTag(
  className: string,
  domainName: string,
  fileName: string,
  scope: string
) {
  return `/**
 * ${className}Repository Context Tag for dependency injection
 *
 * Effect 3.0+ pattern: Context.Tag with inline interface definition.
 * This ensures proper type inference and avoids recursive type issues.
 *
 * WHY INLINE INTERFACE:
 * - Preserves complete type information in Context
 * - Allows TypeScript to infer method signatures correctly
 * - Avoids circular reference when interface and tag share same name
 * - Follows Effect 3.0+ best practices
 *
 * @example
 * \`\`\`typescript
 * // In service implementation:
 * const service = Effect.gen(function*() {
 *   const repo = yield* ${className}Repository;
 *   const entity = yield* repo.findById("id")
 *   return entity;
 * })
 * \`\`\`
 */
export class ${className}Repository extends Context.Tag(
  "${scope}/contract-${fileName}/${className}Repository"
)<
  ${className}Repository,
  {
    /**
     * Find ${domainName} by ID
     *
     * Returns Option<T> to represent the presence or absence of a value:
     * - Option.some(entity) when found
     * - Option.none() when not found
     */
    readonly findById: (
      id: string
    ) => Effect.Effect<
      Option.Option<${className}>,
      ${className}RepositoryError,
      never
    >

    /**
     * Find all ${domainName}s matching filters
     */
    readonly findAll: (
      filters?: ${className}Filters,
      pagination?: OffsetPaginationParams,
      sort?: SortOptions
    ) => Effect.Effect<PaginatedResult<${className}>, ${className}RepositoryError>

    /**
     * Count ${domainName}s matching filters
     */
    readonly count: (
      filters?: ${className}Filters
    ) => Effect.Effect<number, ${className}RepositoryError, never>

    /**
     * Create a new ${domainName}
     */
    readonly create: (
      input: Partial<${className}>
    ) => Effect.Effect<${className}, ${className}RepositoryError, never>

    /**
     * Update an existing ${domainName}
     */
    readonly update: (
      id: string,
      input: Partial<${className}>
    ) => Effect.Effect<${className}, ${className}RepositoryError, never>

    /**
     * Delete a ${domainName} permanently
     */
    readonly delete: (
      id: string
    ) => Effect.Effect<void, ${className}RepositoryError, never>

    /**
     * Check if ${domainName} exists by ID
     */
    readonly exists: (
      id: string
    ) => Effect.Effect<boolean, ${className}RepositoryError, never>
  }
>() {}`
}

/**
 * Create service Context.Tag definition
 */
function createServiceTag(className: string, domainName: string, fileName: string, scope: string) {
  return `/**
 * ${className}Service Context Tag for dependency injection
 *
 * Effect 3.0+ pattern: Context.Tag with inline interface definition.
 * This ensures proper type inference and avoids recursive type issues.
 *
 * @example
 * \`\`\`typescript
 * // In tRPC router or API handler:
 * const handler = Effect.gen(function*() {
 *   const service = yield* ${className}Service;
 *   const entity = yield* service.get("id")
 *   return entity;
 * })
 * \`\`\`
 */
export class ${className}Service extends Context.Tag(
  "${scope}/contract-${fileName}/${className}Service"
)<
  ${className}Service,
  {
    /**
     * Get ${domainName} by ID
     */
    readonly get: (
      id: string
    ) => Effect.Effect<${className}, ${className}RepositoryError, never>

    /**
     * List ${domainName}s with filters and pagination
     */
    readonly list: (
      filters?: ${className}Filters,
      pagination?: OffsetPaginationParams,
      sort?: SortOptions
    ) => Effect.Effect<PaginatedResult<${className}>, ${className}RepositoryError, never>

    /**
     * Create a new ${domainName}
     */
    readonly create: (
      input: Partial<${className}>
    ) => Effect.Effect<${className}, ${className}RepositoryError, never>

    /**
     * Update an existing ${domainName}
     */
    readonly update: (
      id: string,
      input: Partial<${className}>
    ) => Effect.Effect<${className}, ${className}RepositoryError, never>

    /**
     * Delete a ${domainName}
     */
    readonly delete: (
      id: string
    ) => Effect.Effect<void, ${className}RepositoryError, never>
  }
>() {}`
}

/**
 * Create projection repository Context.Tag definition (CQRS only)
 */
function createProjectionRepositoryTag(className: string, fileName: string, scope: string) {
  return `/**
 * ${className}ProjectionRepository Context Tag for CQRS read models
 *
 * Manages projections (denormalized read models) for optimized query performance.
 * Projections are materialized views updated by event handlers.
 *
 * @example
 * \`\`\`typescript
 * const projection = Effect.gen(function*() {
 *   const repo = yield* ${className}ProjectionRepository;
 *   const view = yield* repo.findProjection("id")
 *   return view;
 * })
 * \`\`\`
 */
export class ${className}ProjectionRepository extends Context.Tag(
  "${scope}/contract-${fileName}/${className}ProjectionRepository"
)<
  ${className}ProjectionRepository,
  {
    /**
     * Find projection by ID
     */
    readonly findProjection: (
      id: string
    ) => Effect.Effect<Option.Option<unknown>, ${className}RepositoryError, never>

    /**
     * List projections with filters
     */
    readonly listProjections: (
      filters?: Record<string, unknown>,
      pagination?: PaginationParams
    ) => Effect.Effect<PaginatedResult<unknown>, ${className}RepositoryError, never>

    /**
     * Update projection (called by event handlers)
     */
    readonly updateProjection: (
      id: string,
      data: unknown
    ) => Effect.Effect<void, ${className}RepositoryError, never>

    /**
     * Rebuild projection from event stream
     */
    readonly rebuildProjection: (
      id: string
    ) => Effect.Effect<void, ${className}RepositoryError, never>
  }
>() {}`
}
