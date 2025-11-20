/**
 * Data Access Library Generator
 *
 * Generates data-access libraries following Repository-Oriented Architecture patterns.
 * Creates repositories, schemas, error types, and layers for type-safe database access.
 */

import { Tree, formatFiles } from '@nx/devkit';
import { generateLibraryFiles } from '../../utils/library-generator-utils';
import {
  normalizeBaseOptions,
  type NormalizedBaseOptions,
} from '../../utils/normalization-utils';
import type { DataAccessGeneratorSchema } from './schema.d';
import { generateErrorsFile } from './templates/errors.template';
import { generateTypesFile } from './templates/types.template';
import { generateValidationFile } from './templates/validation.template';
import { generateQueriesFile } from './templates/queries.template';
import { generateRepositoryFile } from './templates/repository.template';
import { generateLayersFile } from './templates/layers.template';
import { generateIndexFile } from './templates/index.template';
import { generateRepositorySpecFile } from './templates/repository-spec.template';
import { generateLayersSpecFile } from './templates/layers-spec.template';
import type { DataAccessTemplateOptions } from '../../utils/shared/types';

// __dirname is available in CommonJS mode (Node.js global)
declare const __dirname: string;

/**
 * Normalized options with computed values
 */
interface NormalizedDataAccessOptions extends NormalizedBaseOptions {
  // Data-access generators have no additional specific fields beyond base
}

/**
 * Main generator function
 */
export default async function dataAccessGenerator(
  tree: Tree,
  schema: DataAccessGeneratorSchema,
) {
  const options = normalizeOptions(tree, schema);

  // Validate contract library existence (Contract-First Architecture)
  const contractLibPath = `libs/contract/${options.fileName}`;
  const hasContractLib = tree.exists(contractLibPath);

  if (!hasContractLib) {
    console.warn(`
⚠️  WARNING: Contract library not found at ${contractLibPath}

Contract-First Architecture requires the contract library to exist BEFORE
creating the data-access implementation.

RECOMMENDED WORKFLOW:
1. Generate contract first:
   pnpm exec nx g @workspace:contract ${options.name}

2. Then generate data-access:
   pnpm exec nx g @workspace:data-access ${options.name}

PROCEEDING WITH FALLBACK:
This generator will create a data-access library with local interface definitions.
You MUST migrate to contract-based interfaces before production use.

See: /libs/ARCHITECTURE.md for Contract-First Architecture details
`);
  }

  // 1. Generate base library files (project.json, package.json, tsconfig, etc.)
  // Platform type is 'node' (for build config) but tag is 'platform:server' (for export convention)
  const libraryOptions = {
    name: options.name,
    projectName: options.projectName,
    projectRoot: options.projectRoot,
    offsetFromRoot: options.offsetFromRoot,
    libraryType: 'data-access' as const,
    platform: 'node' as const, // Build platform type
    description: options.description,
    tags: ['type:data-access', 'scope:shared', 'platform:server'], // Nx tag aligns with /server export
    includeClientServer: false,
    includeEdgeExports: false,
  };

  await generateLibraryFiles(tree, libraryOptions);

  // 2. Generate domain-specific files using code-based templates
  const templateOptions: DataAccessTemplateOptions = {
    // Naming variants
    name: options.name,
    className: options.className,
    propertyName: options.propertyName,
    fileName: options.fileName,
    constantName: options.constantName,

    // Library metadata
    libraryType: 'data-access',
    packageName: options.packageName,
    projectName: options.projectName,
    projectRoot: options.projectRoot,
    sourceRoot: options.sourceRoot,
    offsetFromRoot: options.offsetFromRoot,
    description: options.description,
    tags: options.tags.split(','),

    // Data-access specific options
    includeCache: false, // Default to no caching layer
    contractLibrary: `@custom-repo/contract-${options.fileName}`, // Expected contract library
  };

  const sourceLibPath = `${options.sourceRoot}/lib`;
  const sourceSharedPath = `${sourceLibPath}/shared`;
  const sourceServerPath = `${sourceLibPath}/server`;

  // Generate shared files
  tree.write(
    `${sourceSharedPath}/errors.ts`,
    generateErrorsFile(templateOptions),
  );
  tree.write(
    `${sourceSharedPath}/types.ts`,
    generateTypesFile(templateOptions),
  );
  tree.write(
    `${sourceSharedPath}/validation.ts`,
    generateValidationFile(templateOptions),
  );

  // Generate repository files
  tree.write(
    `${sourceLibPath}/queries.ts`,
    generateQueriesFile(templateOptions),
  );
  tree.write(
    `${sourceLibPath}/repository.ts`,
    generateRepositoryFile(templateOptions),
  );
  tree.write(
    `${sourceLibPath}/repository.spec.ts`,
    generateRepositorySpecFile(templateOptions),
  );

  // Generate server files
  tree.write(
    `${sourceServerPath}/layers.ts`,
    generateLayersFile(templateOptions),
  );
  tree.write(
    `${sourceLibPath}/layers.spec.ts`,
    generateLayersSpecFile(templateOptions),
  );

  // Generate index file (barrel exports)
  tree.write(
    `${options.sourceRoot}/index.ts`,
    generateIndexFile(templateOptions),
  );

  // 3. Format files
  await formatFiles(tree);

  // 5. Return post-generation instructions
  return () => {
    console.log(`
✅ Data Access library created: ${options.packageName}

📁 Location: ${options.projectRoot}
📦 Package: ${options.packageName}

🎯 IMPORTANT - Customization Required:
This library was generated with minimal scaffolding.
Follow the TODO comments in each file to customize for your data layer.

Next steps:
1. Configure contract library (CRITICAL - Contract-First Architecture):
   - Create: libs/contracts/${options.name}/src/index.ts
   - Define: ${options.className}Repository Context.Tag
   - Export: Error types and entity types from contract
   - Update: ${options.sourceRoot}/lib/repository.ts to import from contract
   - Reference: See IMPORTANT note in repository.ts

2. Customize repository implementation (see TODO comments):
   - ${options.sourceRoot}/lib/repository.ts              - Wire contract imports & implement Kysely queries
   - ${options.sourceRoot}/lib/shared/errors.ts          - Uses Data.TaggedError (extend for domain errors)
   - ${options.sourceRoot}/lib/shared/types.ts           - Define entity, filter, and pagination types
   - ${options.sourceRoot}/lib/shared/validation.ts      - Add input validators using Zod or similar

3. Build type-safe queries:
   - ${options.sourceRoot}/lib/queries.ts                - Implement Kysely query builders
   - Use buildFindAllQuery(), buildFindByIdQuery(), buildCountQuery() helpers
   - Add custom query builders for domain-specific queries

4. Write comprehensive tests:
   - ${options.sourceRoot}/lib/repository.spec.ts        - Test CRUD operations
   - ${options.sourceRoot}/lib/layers.spec.ts            - Test Effect layer composition
   - Follow Effect testing patterns with Live, Test, Dev layers

5. Build and test:
   - pnpm exec nx build ${options.projectName} --batch
   - pnpm exec nx test ${options.projectName}

6. Auto-sync TypeScript project references:
   - pnpm exec nx sync

📚 Documentation:
   - See /libs/ARCHITECTURE.md for repository patterns
   - See /tools/workspace-plugin/src/dataaccess.md for generator details
   - See ${options.projectRoot}/README.md for customization examples

⚡ Key Architecture Patterns:
   - Repository Pattern: CQRS-inspired queries and mutations
   - Contract-First: Implements contracts from @custom-repo/contract-${options.name}
   - Error Handling: All errors use Data.TaggedError for Effect integration
   - Kysely Queries: Type-safe SQL query builder in src/lib/queries.ts
   - Effect Layers: Live, Test, Dev, Auto environment layers
   - Shared Types: Entity, filters, and validation in src/lib/shared/
   - Type Guards: Using _tag property for discriminated unions
    `);
  };
}

/**
 * Normalize options with defaults and computed values
 */
function normalizeOptions(
  tree: Tree,
  schema: DataAccessGeneratorSchema,
): NormalizedDataAccessOptions {
  // Use shared normalization utility for common fields
  return normalizeBaseOptions(tree, {
    name: schema.name,
    ...(schema.directory !== undefined && { directory: schema.directory }),
    ...(schema.description !== undefined && {
      description: schema.description,
    }),
    libraryType: 'data-access',
    additionalTags: ['platform:server'], // Data-access is server-only (Kysely, database)
  });
}
