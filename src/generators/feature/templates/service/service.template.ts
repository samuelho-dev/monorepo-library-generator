/**
 * Feature Service Template
 *
 * Generates server/service/service.ts with Context.Tag definition
 *
 * @module monorepo-library-generator/feature/service/service-template
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder';
import type { FeatureTemplateOptions } from '../../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../../utils/workspace-config';

/**
 * Generate server/service/service.ts file
 *
 * Creates Context.Tag interface with static layers
 */
export function generateFeatureServiceFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  builder.addFileHeader({
    title: `${className} Service Interface`,
    description: `Context.Tag definition for ${className}Service.

Operations are split into separate files for optimal tree-shaking.
Import only the operations you need for smallest bundle size.

Bundle optimization:
  - Granular import: import { createOperations } from './operations/create-${fileName}'
  - Full service: import { ${className}Service } from './interface'`,
    module: `${scope}/feature-${fileName}/server/service`,
  });
  builder.addBlankLine();

  // Add imports
  builder.addImports([{ from: 'effect', imports: ['Effect', 'Layer', 'Context', 'Option'] }]);
  builder.addBlankLine();

  // Import shared errors
  builder.addImports([
    {
      from: '../../shared/errors',
      imports: [`${className}Error`],
    },
  ]);
  builder.addBlankLine();

  // Repository integration - pre-wired for data-access library
  builder.addSectionComment('Repository Integration');
  builder.addRaw(`import { ${className}Repository } from "${scope}/data-access-${fileName}";`);
  builder.addBlankLine();

  // Service implementation - types are inferred from implementation
  builder.addSectionComment('Service Implementation');
  builder.addBlankLine();

  builder.addRaw(`/**
 * Service implementation factory
 *
 * Creates the service operations using the provided repository.
 * Types are inferred from implementation - no explicit interface needed.
 */
const createServiceImpl = (repo: Effect.Effect.Success<typeof ${className}Repository>) => ({
  /**
   * Get a single ${fileName} by ID
   *
   * @param id - The ${fileName} ID
   * @returns Option of ${fileName} entity
   */
  get: (id: string) =>
    repo.findById(id).pipe(
      Effect.mapError((error) =>
        new ${className}Error({
          message: \`Failed to get ${fileName}: \${id}\`,
          cause: error,
        })
      )
    ),

  /**
   * Find ${fileName} records by criteria with pagination
   *
   * @param criteria - Filter criteria
   * @param offset - Number of records to skip
   * @param limit - Maximum records to return
   * @returns Array of ${fileName} entities
   */
  findByCriteria: (
    criteria: Record<string, unknown>,
    offset: number,
    limit: number
  ) =>
    repo
      .findAll(criteria as Parameters<typeof repo.findAll>[0], { skip: offset, limit })
      .pipe(
        Effect.map((result) => result.items),
        Effect.mapError((error) =>
          new ${className}Error({
            message: "Failed to find ${fileName} records",
            cause: error,
          })
        )
      ),

  /**
   * Count ${fileName} records matching criteria
   *
   * @param criteria - Filter criteria
   * @returns Number of matching records
   */
  count: (criteria: Record<string, unknown>) =>
    repo.count(criteria as Parameters<typeof repo.count>[0]).pipe(
      Effect.mapError((error) =>
        new ${className}Error({
          message: "Failed to count ${fileName} records",
          cause: error,
        })
      )
    ),

  /**
   * Create a new ${fileName}
   *
   * @param input - Creation data
   * @returns Created ${fileName} entity
   */
  create: (input: Record<string, unknown>) =>
    repo.create(input as Parameters<typeof repo.create>[0]).pipe(
      Effect.mapError((error) =>
        new ${className}Error({
          message: "Failed to create ${fileName}",
          cause: error,
        })
      )
    ),

  /**
   * Update an existing ${fileName}
   *
   * @param id - The ${fileName} ID
   * @param input - Update data
   * @returns Option of updated ${fileName} entity
   */
  update: (id: string, input: Record<string, unknown>) =>
    repo.update(id, input as Parameters<typeof repo.update>[1]).pipe(
      Effect.map(Option.some),
      Effect.mapError((error) =>
        new ${className}Error({
          message: \`Failed to update ${fileName}: \${id}\`,
          cause: error,
        })
      )
    ),

  /**
   * Delete a ${fileName} by ID
   *
   * @param id - The ${fileName} ID
   */
  delete: (id: string) =>
    repo.delete(id).pipe(
      Effect.mapError((error) =>
        new ${className}Error({
          message: \`Failed to delete ${fileName}: \${id}\`,
          cause: error,
        })
      )
    ),

  /**
   * Check if a ${fileName} exists
   *
   * @param id - The ${fileName} ID
   * @returns Boolean indicating existence
   */
  exists: (id: string) =>
    repo.exists(id).pipe(
      Effect.mapError((error) =>
        new ${className}Error({
          message: \`Failed to check existence: \${id}\`,
          cause: error,
        })
      )
    ),
} as const);

/**
 * Type alias derived from implementation
 * This ensures the interface always matches the implementation.
 */
export type ${className}ServiceInterface = ReturnType<typeof createServiceImpl>;`);
  builder.addBlankLine();

  // Context.Tag
  builder.addSectionComment('Context.Tag');
  builder.addBlankLine();

  builder.addRaw(`/**
 * ${className} Service Tag
 *
 * Access via: yield* ${className}Service
 *
 * Static layers:
 * - ${className}Service.Live - Production with repository dependencies
 * - ${className}Service.Test - Uses repository Test layer for in-memory testing
 */
export class ${className}Service extends Context.Tag("${className}Service")<
  ${className}Service,
  ${className}ServiceInterface
>() {
  /**
   * Live Layer - Production implementation
   *
   * Pre-wired with ${className}Repository.
   * Requires ${className}Repository.Live layer to be provided.
   */
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const repo = yield* ${className}Repository;
      return createServiceImpl(repo);
    })
  );

  /**
   * Test Layer - In-memory implementation
   *
   * Pre-wired with ${className}Repository.Test layer.
   * No external dependencies required.
   */
  static readonly Test = Layer.effect(
    this,
    Effect.gen(function* () {
      const repo = yield* ${className}Repository;
      return createServiceImpl(repo);
    })
  ).pipe(Layer.provide(${className}Repository.Test));
}`);

  return builder.toString();
}
