/**
 * Repository Template
 *
 * Generates repository/repository.ts file with Context.Tag definition
 *
 * @module monorepo-library-generator/data-access/repository/repository-template
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder';
import type { DataAccessTemplateOptions } from '../../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../../utils/workspace-config';

/**
 * Generate repository/repository.ts file
 *
 * Creates the Context.Tag interface with Live layer
 */
export function generateRepositoryFile(options: DataAccessTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  builder.addFileHeader({
    title: `${className} Repository`,
    description: `Context.Tag definition for ${className}Repository.

ARCHITECTURE PATTERN:
- Operations split into separate files for bundle optimization
- Return types are inferred to preserve Effect's dependency tracking
- Use repository.streamAll() for large datasets
- Tests provide DatabaseService.Test, not a separate Repository.Test

@see repository/operations/* for implementation details`,
    module: `${scope}/data-access-${fileName}/repository`,
  });
  builder.addBlankLine();

  builder.addImports([
    { from: 'effect', imports: ['Chunk', 'Context', 'Effect', 'Layer', 'Option', 'Stream'] },
  ]);
  builder.addBlankLine();

  builder.addBlankLine();

  builder.addComment('Import operation implementations');
  builder.addImports([
    { from: './operations/create', imports: ['createOperations'] },
    { from: './operations/read', imports: ['readOperations'] },
    { from: './operations/update', imports: ['updateOperations'] },
    { from: './operations/delete', imports: ['deleteOperations'] },
    { from: './operations/aggregate', imports: ['aggregateOperations'] },
  ]);
  builder.addBlankLine();

  builder.addSectionComment('Repository Context.Tag');
  builder.addBlankLine();

  builder.addRaw(`/**
 * ${className} Repository implementation
 *
 * Combines all CRUD + aggregate operations into a single repository object.
 * Operations require DatabaseService which is provided via Layer composition.
 */
const repositoryImpl = {
  ...createOperations,
  ...readOperations,
  ...updateOperations,
  ...deleteOperations,
  ...aggregateOperations,

  streamAll: (options?: { batchSize?: number }) => {
    const batchSize = options?.batchSize ?? 100;
    return Stream.paginateChunkEffect(0, (offset) =>
      readOperations.findAll(undefined, { skip: offset, limit: batchSize }).pipe(
        Effect.map((result) => {
          const chunk = Chunk.fromIterable(result.items);
          const next = result.hasMore ? Option.some(offset + batchSize) : Option.none();
          return [chunk, next] as const;
        })
      )
    );
  },
} as const;

export type ${className}RepositoryInterface = typeof repositoryImpl;

/**
 * ${className} Repository Tag
 *
 * Access via: yield* ${className}Repository
 *
 * @example
 * \`\`\`typescript
 * // Production
 * Effect.provide(${className}Repository.Live.pipe(
 *   Layer.provide(DatabaseService.Live)
 * ))
 *
 * // Testing - provide test infrastructure
 * Effect.provide(${className}Repository.Live.pipe(
 *   Layer.provide(DatabaseService.Test)
 * ))
 * \`\`\`
 */
export class ${className}Repository extends Context.Tag("${className}Repository")<
  ${className}Repository,
  ${className}RepositoryInterface
>() {
  static readonly Live = Layer.succeed(this, repositoryImpl);
}`);

  return builder.toString();
}
