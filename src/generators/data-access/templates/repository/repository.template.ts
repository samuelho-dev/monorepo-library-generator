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
 * Creates the Context.Tag interface with static layers (Live, Test)
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

@see repository/operations/* for implementation details`,
    module: `${scope}/data-access-${fileName}/repository`,
  });
  builder.addBlankLine();

  // Add imports
  builder.addImports([
    { from: 'effect', imports: ['Chunk', 'Context', 'Effect', 'Layer', 'Option', 'Stream'] },
  ]);
  builder.addBlankLine();

  // Import types from shared
  builder.addImports([
    {
      from: '../shared/types',
      imports: [
        `${className}CreateInput`,
        `${className}UpdateInput`,
        `${className}Filter`,
        `PaginationOptions`,
      ],
      isTypeOnly: true,
    },
    {
      from: '../shared/errors',
      imports: [`${className}NotFoundError`],
    },
  ]);
  builder.addBlankLine();

  // Import operations
  builder.addComment('Import operation implementations');
  builder.addImports([
    { from: './operations/create', imports: ['createOperations'] },
    { from: './operations/read', imports: ['readOperations'] },
    { from: './operations/update', imports: ['updateOperations'] },
    { from: './operations/delete', imports: ['deleteOperations'] },
    { from: './operations/aggregate', imports: ['aggregateOperations'] },
  ]);
  builder.addBlankLine();

  // Context.Tag
  builder.addSectionComment('Repository Context.Tag');
  builder.addBlankLine();

  builder.addRaw(`/**
 * ${className} Repository implementation
 *
 * Combines all CRUD + aggregate operations into a single repository object.
 * Return types flow from operations, preserving Effect's dependency and error tracking.
 */
const repositoryImpl = {
  ...createOperations,
  ...readOperations,
  ...updateOperations,
  ...deleteOperations,
  ...aggregateOperations,

  /**
   * Stream all entities with pagination
   *
   * Provides constant-memory processing of large datasets.
   *
   * @example
   * \`\`\`typescript
   * yield* repo.streamAll({ batchSize: 100 }).pipe(
   *   Stream.mapEffect((entity) => processEntity(entity)),
   *   Stream.runDrain
   * );
   * \`\`\`
   */
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

/**
 * ${className} Repository Type
 *
 * Use this type when you need to reference the repository interface.
 */
export type ${className}RepositoryInterface = typeof repositoryImpl;

/**
 * ${className} Repository Tag
 *
 * Access via: yield* ${className}Repository
 *
 * Static layers available:
 * - ${className}Repository.Live - Production implementation
 * - ${className}Repository.Test - In-memory test implementation
 */
export class ${className}Repository extends Context.Tag("${className}Repository")<
  ${className}Repository,
  ${className}RepositoryInterface
>() {
  /**
   * Live Layer - Production implementation
   *
   * Requires DatabaseService for database persistence.
   * All dependencies are handled internally via Effect.gen.
   */
  static readonly Live = Layer.succeed(this, repositoryImpl);

  /**
   * Test Layer - In-memory test implementation
   *
   * Uses Layer.effect for isolated in-memory storage per test.
   * Each Layer.fresh() call creates isolated storage.
   */
  static readonly Test = Layer.effect(
    this,
    Effect.sync(() => {
      // In-memory storage for test isolation
      const store = new Map<string, Record<string, unknown>>();

      const generateId = () => crypto.randomUUID();

      return {
        create: (input: ${className}CreateInput) =>
          Effect.sync(() => {
            const now = new Date();
            const entity = {
              id: generateId(),
              ...input,
              createdAt: now,
              updatedAt: now,
            };
            store.set(entity.id, entity);
            return entity;
          }),

        createMany: (inputs: ReadonlyArray<${className}CreateInput>) =>
          Effect.sync(() => {
            const now = new Date();
            return inputs.map((input) => {
              const entity = {
                id: generateId(),
                ...input,
                createdAt: now,
                updatedAt: now,
              };
              store.set(entity.id, entity);
              return entity;
            });
          }),

        findById: (id: string) =>
          Effect.sync(() => {
            const entity = store.get(id);
            return entity ? Option.some(entity) : Option.none();
          }),

        findAll: (filter?: ${className}Filter, pagination?: PaginationOptions) =>
          Effect.sync(() => {
            let items = Array.from(store.values());

            // Apply search filter if provided
            if (filter?.search) {
              const search = filter.search.toLowerCase();
              items = items.filter((item) =>
                JSON.stringify(item).toLowerCase().includes(search)
              );
            }

            const total = items.length;
            const limit = pagination?.limit ?? 50;
            const skip = pagination?.skip ?? 0;

            items = items.slice(skip, skip + limit);

            return {
              items,
              total,
              hasMore: skip + items.length < total,
            };
          }),

        findOne: (filter: ${className}Filter) =>
          Effect.sync(() => {
            const items = Array.from(store.values());
            if (filter.search) {
              const search = filter.search.toLowerCase();
              const found = items.find((item) =>
                JSON.stringify(item).toLowerCase().includes(search)
              );
              return found ? Option.some(found) : Option.none();
            }
            return items[0] ? Option.some(items[0]) : Option.none();
          }),

        update: (id: string, input: ${className}UpdateInput) =>
          Effect.gen(function* () {
            const existing = store.get(id);
            if (!existing) {
              return yield* Effect.fail(${className}NotFoundError.create(id));
            }
            const updated = {
              ...existing,
              ...input,
              updatedAt: new Date(),
            };
            store.set(id, updated);
            return updated;
          }),

        delete: (id: string) =>
          Effect.sync(() => {
            store.delete(id);
          }),

        deleteMany: (ids: ReadonlyArray<string>) =>
          Effect.sync(() => {
            for (const id of ids) {
              store.delete(id);
            }
          }),

        count: (filter?: ${className}Filter) =>
          Effect.sync(() => {
            if (!filter?.search) {
              return store.size;
            }
            const search = filter.search.toLowerCase();
            return Array.from(store.values()).filter((item) =>
              JSON.stringify(item).toLowerCase().includes(search)
            ).length;
          }),

        exists: (id: string) =>
          Effect.sync(() => store.has(id)),

        streamAll: (options?: { batchSize?: number }) => {
          const batchSize = options?.batchSize ?? 100;
          return Stream.paginateChunkEffect(0, (offset) =>
            Effect.sync(() => {
              const items = Array.from(store.values()).slice(offset, offset + batchSize);
              const chunk = Chunk.fromIterable(items);
              const next = items.length < batchSize ? Option.none() : Option.some(offset + batchSize);
              return [chunk, next];
            })
          );
        },
      };
    })
  );
}`);

  return builder.toString();
}
