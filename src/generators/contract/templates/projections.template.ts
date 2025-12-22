/**
 * Contract Projections Template
 *
 * Generates projections.ts file for contract libraries with CQRS read model
 * definitions using Schema.Class for denormalized query results.
 *
 * @module monorepo-library-generator/contract/projections-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { ContractTemplateOptions } from '../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config';

/**
 * Generate projections.ts file for contract library
 *
 * Creates CQRS projection (read model) definitions with:
 * - List projection (optimized for list views)
 * - Detail projection (optimized for detail views)
 * - Documentation about JOIN-based implementation
 */
export function generateProjectionsFile(options: ContractTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName, propertyName } = options;
  const domainName = propertyName;
  const scope = WORKSPACE_CONFIG.getScope();

  // Add file header
  builder.addRaw(createFileHeader(className, domainName, fileName, scope));
  builder.addBlankLine();

  // Add imports
  builder.addImports([{ from: 'effect', imports: ['Schema'] }]);

  builder.addImports([{ from: './types/database', imports: [`${className}Id`] }]);

  builder.addBlankLine();

  // ============================================================================
  // SECTION 1: Projection Schemas
  // ============================================================================

  builder.addSectionComment('Projection Schemas');
  builder.addBlankLine();

  // List projection
  builder.addRaw(createListProjection(className, propertyName));
  builder.addBlankLine();

  // Detail projection
  builder.addRaw(createDetailProjection(className, propertyName));
  builder.addBlankLine();

  // ============================================================================
  // SECTION 2: Implementation Notes
  // ============================================================================

  builder.addSectionComment('How Projections Work in This System');
  builder.addBlankLine();

  builder.addRaw(createImplementationNotes(className));

  return builder.toString();
}

/**
 * Create file header
 */
function createFileHeader(className: string, domainName: string, fileName: string, scope: string) {
  return `/**
 * ${className} Projections (CQRS Read Models)
 *
 * IMPORTANT: These are TypeScript schemas for query results from JOINs,
 * NOT separate database tables. Projections are denormalized views
 * built by querying existing tables via JOINs and caching the results.
 *
 * Implementation: Use Kysely JOINs on existing tables (e.g., ${domainName}s,
 * related entities) to build projection results, then cache
 * with cache-aside pattern for performance.
 *
 * TODO: Customize for your domain:
 * 1. Add denormalized fields from related tables
 * 2. Add aggregated stats (counts, averages, etc.)
 * 3. Define which tables to JOIN for each projection
 * 4. Implement cache invalidation strategy
 *
 * @module ${scope}/contract-${fileName}/projections
 */`;
}

/**
 * Create List projection
 */
function createListProjection(className: string, propertyName: string) {
  return `/**
 * ${className} List Projection
 *
 * Optimized for listing queries with denormalized data from JOINs.
 * Built from: ${className} table LEFT JOIN related tables
 *
 * NOT a separate table - query result cached with cache-aside pattern.
 */
export class ${className}ListProjection extends Schema.Class<${className}ListProjection>("${className}ListProjection")({
  /** Unique identifier */
  ${propertyName}Id: Schema.UUID,

  /** Name from primary table */
  name: Schema.String,

  /** Created timestamp */
  createdAt: Schema.DateTimeUtc,

  // TODO: Add denormalized fields from JOINs
  // Example denormalized fields (from related tables):
  //
  // /** Related entity info (denormalized from related_entities table) */
  // relatedId: Schema.UUID,
  // relatedName: Schema.String,
  //
  // /** Category info (denormalized from categories table) */
  // categoryId: Schema.UUID,
  // categoryName: Schema.String,
  //
  // /** Aggregated stats */
  // itemCount: Schema.Number,
  // averageRating: Schema.optional(Schema.Number),
}) {}`;
}

/**
 * Create Detail projection
 */
function createDetailProjection(className: string, propertyName: string) {
  return `/**
 * ${className} Detail Projection
 *
 * Optimized for single ${className} detail view with full information.
 * Built from: ${className} table INNER/LEFT JOIN related tables for complete context.
 *
 * NOT a separate table - query result cached with cache-aside pattern.
 */
export class ${className}DetailProjection extends Schema.Class<${className}DetailProjection>("${className}DetailProjection")({
  /** Unique identifier */
  ${propertyName}Id: Schema.UUID,

  /** Name from primary table */
  name: Schema.String,

  /** Description from primary table */
  description: Schema.optional(Schema.String),

  /** Created timestamp */
  createdAt: Schema.DateTimeUtc,

  /** Updated timestamp */
  updatedAt: Schema.DateTimeUtc,

  // TODO: Add full denormalized context from JOINs
  // Example complete denormalized structure:
  //
  // /** Related entity information (from related_entities table) */
  // relatedEntity: Schema.Struct({
  //   id: Schema.UUID,
  //   name: Schema.String,
  //   status: Schema.String,
  // }),
  //
  // /** Category hierarchy (from categories table) */
  // category: Schema.Struct({
  //   id: Schema.UUID,
  //   name: Schema.String,
  //   parentId: Schema.optional(Schema.UUID),
  //   parentName: Schema.optional(Schema.String),
  // }),
  //
  // /** Statistics (aggregated from related tables) */
  // stats: Schema.Struct({
  //   count: Schema.Number,
  //   total: Schema.Number,
  // }),
}) {}`;
}

/**
 * Create implementation notes
 */
function createImplementationNotes(className: string) {
  return `/**
 * Implementation Guide for ${className} Projections
 *
 * 1. QUERY CONSTRUCTION (in data-access layer):
 *    - Use Kysely to JOIN existing tables
 *    - Select and alias fields to match projection schema
 *    - Example:
 *      \`\`\`typescript
 *      db.selectFrom('${className.toLowerCase()}s')
 *        .leftJoin('related_entities', '${className.toLowerCase()}s.related_id', 'related_entities.id')
 *        .select([
 *          '${className.toLowerCase()}s.id as ${className.toLowerCase()}Id',
 *          '${className.toLowerCase()}s.name',
 *          'related_entities.id as relatedId',
 *          'related_entities.name as relatedName',
 *        ])
 *      \`\`\`
 *
 * 2. CACHING STRATEGY (cache-aside pattern):
 *    - Check cache first (Redis/in-memory)
 *    - On cache miss: Execute JOIN query, cache result
 *    - Set appropriate TTL based on data freshness needs
 *
 * 3. CACHE INVALIDATION:
 *    - Invalidate on write operations (Create/Update/Delete)
 *    - Consider using event listeners on domain events
 *    - May need to invalidate related projection caches
 *
 * 4. WHY NOT SEPARATE TABLES:
 *    - Avoids data duplication
 *    - Single source of truth (normalized tables)
 *    - Easier to maintain consistency
 *    - Projections can be rebuilt from source tables
 *    - Simpler schema evolution
 *
 * 5. PERFORMANCE TIPS:
 *    - Add database indexes on JOIN columns
 *    - Use connection pooling
 *    - Batch cache warming for popular projections
 *    - Monitor query performance with database profiling
 */`;
}
