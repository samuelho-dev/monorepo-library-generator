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
Import only the operations you need for smallest bundle size.`,
    module: `${scope}/feature-${fileName}/server/service`,
  });
  builder.addBlankLine();

  builder.addImports([{ from: 'effect', imports: ['Effect', 'Layer', 'Context', 'Option'] }]);
  builder.addBlankLine();

  builder.addImports([
    {
      from: '../../shared/errors',
      imports: [`${className}Error`],
    },
  ]);
  builder.addBlankLine();

  builder.addSectionComment('Repository Integration');
  builder.addRaw(`import { ${className}Repository } from "${scope}/data-access-${fileName}";
import { DatabaseService } from "${scope}/infra-database";`);
  builder.addBlankLine();

  builder.addSectionComment('Service Implementation');
  builder.addBlankLine();

  builder.addRaw(`const createServiceImpl = (repo: Effect.Effect.Success<typeof ${className}Repository>) => ({
  get: (id: string) =>
    repo.findById(id).pipe(
      Effect.mapError((error) =>
        new ${className}Error({
          message: \`Failed to get ${fileName}: \${id}\`,
          code: "INTERNAL_ERROR",
          cause: error,
        })
      )
    ),

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
            code: "INTERNAL_ERROR",
            cause: error,
          })
        )
      ),

  count: (criteria: Record<string, unknown>) =>
    repo.count(criteria as Parameters<typeof repo.count>[0]).pipe(
      Effect.mapError((error) =>
        new ${className}Error({
          message: "Failed to count ${fileName} records",
          code: "INTERNAL_ERROR",
          cause: error,
        })
      )
    ),

  create: (input: Record<string, unknown>) =>
    repo.create(input as Parameters<typeof repo.create>[0]).pipe(
      Effect.mapError((error) =>
        new ${className}Error({
          message: "Failed to create ${fileName}",
          code: "INTERNAL_ERROR",
          cause: error,
        })
      )
    ),

  update: (id: string, input: Record<string, unknown>) =>
    repo.update(id, input as Parameters<typeof repo.update>[1]).pipe(
      Effect.map(Option.some),
      Effect.mapError((error) =>
        new ${className}Error({
          message: \`Failed to update ${fileName}: \${id}\`,
          code: "INTERNAL_ERROR",
          cause: error,
        })
      )
    ),

  delete: (id: string) =>
    repo.delete(id).pipe(
      Effect.mapError((error) =>
        new ${className}Error({
          message: \`Failed to delete ${fileName}: \${id}\`,
          code: "INTERNAL_ERROR",
          cause: error,
        })
      )
    ),

  exists: (id: string) =>
    repo.exists(id).pipe(
      Effect.mapError((error) =>
        new ${className}Error({
          message: \`Failed to check existence: \${id}\`,
          code: "INTERNAL_ERROR",
          cause: error,
        })
      )
    ),
} as const);

export type ${className}ServiceInterface = ReturnType<typeof createServiceImpl>;`);
  builder.addBlankLine();

  builder.addSectionComment('Context.Tag');
  builder.addBlankLine();

  builder.addRaw(`export class ${className}Service extends Context.Tag("${className}Service")<
  ${className}Service,
  ${className}ServiceInterface
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const repo = yield* ${className}Repository;
      return createServiceImpl(repo);
    })
  );

  static readonly Layer = ${className}Service.Live.pipe(
    Layer.provide(${className}Repository.Live),
    Layer.provide(DatabaseService.Live)
  );

  static readonly TestLayer = ${className}Service.Live.pipe(
    Layer.provide(${className}Repository.Live),
    Layer.provide(DatabaseService.Test)
  );
}`);

  return builder.toString();
}
