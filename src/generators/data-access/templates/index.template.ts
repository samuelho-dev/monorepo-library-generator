/**
 * Data Access Index Template
 *
 * Generates index.ts file for data-access libraries with all exports.
 *
 * @module monorepo-library-generator/data-access/index-template
 */

import { generateStandardErrorExports } from '../../../utils/code-generation/barrel-export-utils';
import { TypeScriptBuilder } from '../../../utils/code-generation/typescript-builder';
import type { DataAccessTemplateOptions } from '../../../utils/shared/types';

/**
 * Generate index.ts file for data-access library
 *
 * Creates main entry point with all exports organized by category
 */
export function generateIndexFile(options: DataAccessTemplateOptions): string {
  const builder = new TypeScriptBuilder();
  const { className, fileName, propertyName } = options;
  const domainName = propertyName;

  // Add file header
  builder.addFileHeader({
    title: `${className} Data Access Library`,
    description: `Type-safe data access layer for ${domainName} domain.
Provides repository pattern with Effect-based dependency injection.

ARCHITECTURE: Server-only exports (no client/edge variants)
Repository implements contract from @custom-repo/contract-${fileName}`,
    module: `@custom-repo/data-access-${fileName}`,
  });

  // Error Types section
  builder.addSectionComment('Error Types (from shared/)');
  builder.addBlankLine();

  builder.addRaw(
    generateStandardErrorExports({
      className,
      importPath: './lib/shared/errors.js',
      unionTypeSuffix: 'RepositoryError',
    }),
  );
  builder.addBlankLine();

  // Domain Types section
  builder.addSectionComment('Domain Types (from shared/)');
  builder.addBlankLine();

  builder.addRaw(`export type {
  ${className},
  ${className}CreateInput,
  ${className}UpdateInput,
  ${className}Filter,
  SortDirection,
  ${className}Sort,
  PaginationOptions,
  QueryOptions,
  PaginatedResponse,
} from "./lib/shared/types.js";`);
  builder.addBlankLine();

  // Validation Functions section
  builder.addSectionComment('Validation Functions (from shared/)');
  builder.addBlankLine();

  builder.addRaw(`export {
  validate${className}CreateInput,
  validate${className}UpdateInput,
  validate${className}Filter,
  validate${className}Id,
  validatePagination,
  is${className},
  isValid${className}CreateInput,
  isValid${className}UpdateInput,
} from "./lib/shared/validation.js";`);
  builder.addBlankLine();

  // Query Builders section
  builder.addSectionComment('Query Builders (from queries.ts)');
  builder.addBlankLine();

  builder.addRaw(`export {
  buildFindAllQuery,
  buildFindByIdQuery,
  buildCountQuery,
} from "./lib/queries.js";`);
  builder.addBlankLine();

  builder.addRaw(
    `export type { ${className}QueryFilters, PaginationOptions as QueryPaginationOptions } from "./lib/queries.js";`,
  );
  builder.addBlankLine();

  // Repository section with Effect 3.0+ pattern documentation
  builder.addComment(`Repository (Effect 3.0+ Pattern: Static Members)`);
  builder.addBlankLine();
  builder.addComment(`Export the ${className}Repository Context.Tag class.`);
  builder.addComment(`Layers are accessed via static members:`);
  builder.addComment(`  - ${className}Repository.Live  (production)`);
  builder.addComment(`  - ${className}Repository.Test  (testing)`);
  builder.addComment(`  - ${className}Repository.Dev   (development)`);
  builder.addComment(`  - ${className}Repository.Auto  (environment-based)`);
  builder.addBlankLine();
  builder.addComment(`MIGRATION from pre-3.0 pattern:`);
  builder.addComment(
    `OLD: import { ${className}RepositoryLive } from "@custom-repo/data-access-${fileName}";`,
  );
  builder.addComment(
    `NEW: import { ${className}Repository } from "@custom-repo/data-access-${fileName}";`,
  );
  builder.addComment(`     const layer = ${className}Repository.Live;`);
  builder.addBlankLine();

  builder.addRaw(`export { ${className}Repository } from "./lib/repository.js";
`);

  return builder.toString();
}
