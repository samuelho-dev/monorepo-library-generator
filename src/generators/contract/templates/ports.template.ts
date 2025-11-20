/**
 * Contract Ports Template
 *
 * Generates ports.ts file for contract libraries with repository and service
 * interface definitions using Context.Tag pattern with inline interfaces.
 *
 * @module monorepo-library-generator/contract/ports-template
 */

import { TypeScriptBuilder } from '../../../utils/code-generation/typescript-builder';
import type { ContractTemplateOptions } from '../../../utils/shared/types';

/**
 * Generate ports.ts file for contract library
 *
 * Creates repository and service port definitions with:
 * - Supporting types (Filters, Pagination, Sort)
 * - Repository port (Context.Tag with inline interface)
 * - Service port (Context.Tag with inline interface)
 */
export function generatePortsFile(options: ContractTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName, includeCQRS, propertyName } = options;
  const domainName = propertyName;

  // Add file header
  builder.addRaw(createFileHeader(className, domainName, fileName));
  builder.addBlankLine();

  // Add imports
  builder.addImports([
    { from: 'effect', imports: ['Context', 'Effect', 'Option'] },
  ]);

  // TODO: Uncomment when types-database library is available
  // builder.addImports([
  //   {
  //     from: '@custom-repo/types-database',
  //     imports: [
  //       `${className}`,
  //       `Partial<${className}>`,
  //       `Partial<${className}>`,
  //     ],
  //     isTypeOnly: true,
  //   },
  // ]);

  builder.addImports([
    {
      from: './entities',
      imports: [`${className}`],
      isTypeOnly: true,
    },
  ]);

  builder.addImports([
    {
      from: './errors',
      imports: [`${className}RepositoryError`],
      isTypeOnly: true,
    },
  ]);

  builder.addBlankLine();

  // ============================================================================
  // SECTION 1: Supporting Types
  // ============================================================================

  builder.addSectionComment('Supporting Types');
  builder.addBlankLine();

  // Filters interface
  builder.addInterface({
    name: `${className}Filters`,
    exported: true,
    jsdoc: `Filter options for querying ${domainName}s`,
    properties: [
      {
        name: 'createdAfter',
        type: 'Date',
        optional: true,
        readonly: true,
        jsdoc: 'Filter by creation date range',
      },
      { name: 'createdBefore', type: 'Date', optional: true, readonly: true },
      {
        name: 'updatedAfter',
        type: 'Date',
        optional: true,
        readonly: true,
        jsdoc: 'Filter by update date range',
      },
      { name: 'updatedBefore', type: 'Date', optional: true, readonly: true },
    ],
  });

  builder.addComment('TODO: Add domain-specific filters here');
  builder.addComment('Example filters:');
  builder.addComment('');
  builder.addComment('/** Filter by unique slug */');
  builder.addComment('readonly slug?: string;');
  builder.addComment('');
  builder.addComment('/** Filter by status */');
  builder.addComment('readonly status?: string | readonly string[];');
  builder.addComment('');
  builder.addComment('/** Filter by owner */');
  builder.addComment('readonly ownerId?: string;');
  builder.addBlankLine();

  // PaginationParams interface
  builder.addInterface({
    name: 'PaginationParams',
    exported: true,
    jsdoc: 'Pagination parameters',
    properties: [
      { name: 'limit', type: 'number', readonly: true },
      { name: 'offset', type: 'number', readonly: true },
    ],
  });

  // SortOptions interface
  builder.addInterface({
    name: 'SortOptions',
    exported: true,
    jsdoc: 'Sort options',
    properties: [
      { name: 'field', type: 'string', readonly: true },
      { name: 'direction', type: '"asc" | "desc"', readonly: true },
    ],
  });

  // PaginatedResult interface (generic)
  builder.addRaw(`
/**
 * Paginated result with generic item type
 */
export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
}
`);

  // ============================================================================
  // SECTION 2: Repository Port
  // ============================================================================

  builder.addSectionComment('Repository Port');
  builder.addBlankLine();

  // Create repository Context.Tag with inline interface
  const repositoryTag = createRepositoryTag(
    className,
    domainName,
    fileName,
    propertyName,
  );
  builder.addRaw(repositoryTag);
  builder.addBlankLine();

  // ============================================================================
  // SECTION 3: Service Port
  // ============================================================================

  builder.addSectionComment('Service Port');
  builder.addBlankLine();

  // Create service Context.Tag with inline interface
  const serviceTag = createServiceTag(
    className,
    domainName,
    fileName,
    propertyName,
  );
  builder.addRaw(serviceTag);
  builder.addBlankLine();

  // ============================================================================
  // SECTION 4: Projection Repository Port (CQRS only)
  // ============================================================================

  if (includeCQRS) {
    builder.addSectionComment('Projection Repository Port (CQRS)');
    builder.addBlankLine();

    const projectionRepositoryTag = createProjectionRepositoryTag(
      className,
      domainName,
      fileName,
    );
    builder.addRaw(projectionRepositoryTag);
    builder.addBlankLine();
  }

  return builder.toString();
}

/**
 * Create file header with comprehensive documentation
 */
function createFileHeader(
  className: string,
  domainName: string,
  fileName: string,
) {
  return `/**
 * ${className} Ports (Interfaces)
 *
 * Defines repository and service interfaces for ${domainName} domain.
 * These ports are implemented in the data-access layer using Effect's dependency injection.
 *
 * TODO: Customize this file for your domain:
 * 1. Add domain-specific query methods to the repository
 * 2. Add domain-specific filters to ${className}Filters
 * 3. Add business logic methods to the service
 * 4. Consider adding:
 *    - Bulk operations (createMany, updateMany, deleteMany)
 *    - Domain-specific queries (findByStatus, findByOwner, etc.)
 *    - Transaction support for multi-step operations
 *    - Caching strategies
 *
 * @see https://effect.website/docs/guides/context-management for dependency injection
 * @module @custom-repo/contract-${fileName}/ports
 */`;
}

/**
 * Create repository Context.Tag definition
 */
function createRepositoryTag(
  className: string,
  domainName: string,
  fileName: string,
  _propertyName: string,
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
 * const service = Effect.gen(function* () {
 *   const repo = yield* ${className}Repository;
 *   const entity = yield* repo.findById("id");
 *   return entity;
 * });
 * \`\`\`
 */
export class ${className}Repository extends Context.Tag(
  "@custom-repo/contract-${fileName}/${className}Repository"
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
    >;

    /**
     * Find all ${domainName}s matching filters
     */
    readonly findAll: (
      filters?: ${className}Filters,
      pagination?: PaginationParams,
      sort?: SortOptions
    ) => Effect.Effect<PaginatedResult<${className}>, ${className}RepositoryError>;

    /**
     * Count ${domainName}s matching filters
     */
    readonly count: (
      filters?: ${className}Filters
    ) => Effect.Effect<number, ${className}RepositoryError>;

    /**
     * Create a new ${domainName}
     */
    readonly create: (
      input: Partial<${className}>
    ) => Effect.Effect<${className}, ${className}RepositoryError>;

    /**
     * Update an existing ${domainName}
     */
    readonly update: (
      id: string,
      input: Partial<${className}>
    ) => Effect.Effect<${className}, ${className}RepositoryError>;

    /**
     * Delete a ${domainName} permanently
     */
    readonly delete: (
      id: string
    ) => Effect.Effect<void, ${className}RepositoryError>;

    /**
     * Check if ${domainName} exists by ID
     */
    readonly exists: (
      id: string
    ) => Effect.Effect<boolean, ${className}RepositoryError>;

    // TODO: Add domain-specific repository methods here
  }
>() {}`;
}

/**
 * Create service Context.Tag definition
 */
function createServiceTag(
  className: string,
  domainName: string,
  fileName: string,
  _propertyName: string,
) {
  return `/**
 * ${className}Service Context Tag for dependency injection
 *
 * Effect 3.0+ pattern: Context.Tag with inline interface definition.
 * This ensures proper type inference and avoids recursive type issues.
 *
 * @example
 * \`\`\`typescript
 * // In tRPC router or API handler:
 * const handler = Effect.gen(function* () {
 *   const service = yield* ${className}Service;
 *   const entity = yield* service.get("id");
 *   return entity;
 * });
 * \`\`\`
 */
export class ${className}Service extends Context.Tag(
  "@custom-repo/contract-${fileName}/${className}Service"
)<
  ${className}Service,
  {
    /**
     * Get ${domainName} by ID
     */
    readonly get: (
      id: string
    ) => Effect.Effect<${className}, ${className}RepositoryError>;

    /**
     * List ${domainName}s with filters and pagination
     */
    readonly list: (
      filters?: ${className}Filters,
      pagination?: PaginationParams,
      sort?: SortOptions
    ) => Effect.Effect<PaginatedResult<${className}>, ${className}RepositoryError>;

    /**
     * Create a new ${domainName}
     */
    readonly create: (
      input: Partial<${className}>
    ) => Effect.Effect<${className}, ${className}RepositoryError>;

    /**
     * Update an existing ${domainName}
     */
    readonly update: (
      id: string,
      input: Partial<${className}>
    ) => Effect.Effect<${className}, ${className}RepositoryError>;

    /**
     * Delete a ${domainName}
     */
    readonly delete: (
      id: string
    ) => Effect.Effect<void, ${className}RepositoryError>;

    // TODO: Add domain-specific service methods here
  }
>() {}`;
}

/**
 * Create projection repository Context.Tag definition (CQRS only)
 */
function createProjectionRepositoryTag(
  className: string,
  domainName: string,
  fileName: string,
) {
  return `/**
 * ${className}ProjectionRepository Context Tag for CQRS read models
 *
 * Manages projections (denormalized read models) for optimized query performance.
 * Projections are materialized views updated by event handlers.
 *
 * @example
 * \`\`\`typescript
 * const projection = Effect.gen(function* () {
 *   const repo = yield* ${className}ProjectionRepository;
 *   const view = yield* repo.findProjection("id");
 *   return view;
 * });
 * \`\`\`
 */
export class ${className}ProjectionRepository extends Context.Tag(
  "@custom-repo/contract-${fileName}/${className}ProjectionRepository"
)<
  ${className}ProjectionRepository,
  {
    /**
     * Find projection by ID
     */
    readonly findProjection: (
      id: string
    ) => Effect.Effect<Option.Option<unknown>, ${className}RepositoryError>;

    /**
     * List projections with filters
     */
    readonly listProjections: (
      filters?: Record<string, unknown>,
      pagination?: PaginationParams
    ) => Effect.Effect<PaginatedResult<unknown>, ${className}RepositoryError>;

    /**
     * Update projection (called by event handlers)
     */
    readonly updateProjection: (
      id: string,
      data: unknown
    ) => Effect.Effect<void, ${className}RepositoryError>;

    /**
     * Rebuild projection from event stream
     */
    readonly rebuildProjection: (
      id: string
    ) => Effect.Effect<void, ${className}RepositoryError>;

    // TODO: Add domain-specific projection methods
  }
>() {}`;
}
