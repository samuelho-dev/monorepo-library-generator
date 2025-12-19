/**
 * Data Access Generator Core
 *
 * Generates domain-specific files for data-access libraries.
 * Works with both Nx Tree API and Effect FileSystem via FileSystemAdapter.
 *
 * Responsibilities:
 * - Generates repository, queries, and data layer files
 * - Creates shared types, errors, and validation
 * - Generates server-side layer compositions
 * - Creates CLAUDE.md documentation
 * - Infrastructure generation is handled by wrapper generators
 *
 * @module monorepo-library-generator/generators/core/data-access-generator-core
 */

import { Effect } from "effect"
import type { FileSystemAdapter } from "../../utils/filesystem-adapter"
import { parseTags } from "../../utils/generators"
import type { DataAccessTemplateOptions } from "../../utils/shared/types"
import { getPackageName } from "../../utils/workspace-config"
import { generateErrorsFile } from "../data-access/templates/errors.template"
import { generateIndexFile } from "../data-access/templates/index.template"
import { generateLayersSpecFile } from "../data-access/templates/layers-spec.template"
import { generateLayersFile } from "../data-access/templates/layers.template"
import { generateQueriesFile } from "../data-access/templates/queries.template"
import { generateRepositorySpecFile } from "../data-access/templates/repository-spec.template"
import { generateTypesFile } from "../data-access/templates/types.template"
import { generateValidationFile } from "../data-access/templates/validation.template"
import type { GeneratorResult } from "./contract"

// Import new granular repository templates
import {
  generateRepositoryAggregateOperationFile,
  generateRepositoryCreateOperationFile,
  generateRepositoryDeleteOperationFile,
  generateRepositoryFile,
  generateRepositoryIndexFile,
  generateRepositoryOperationsIndexFile,
  generateRepositoryReadOperationFile,
  generateRepositoryUpdateOperationFile
} from "../data-access/templates/repository"

// Import type-only exports template
import { generateTypesOnlyFile, type TypesOnlyExportOptions } from "../../utils/templates/types-only-exports.template"

export type { GeneratorResult }

/**
 * Data Access Generator Core Options
 *
 * Receives pre-computed metadata from wrapper generators.
 * Wrappers are responsible for:
 * - Computing all paths via computeLibraryMetadata()
 * - Generating infrastructure files (package.json, tsconfig, project.json)
 * - Running this core function for domain file generation
 *
 * @property name - Base name in original format
 * @property className - PascalCase variant for class names
 * @property propertyName - camelCase variant for property names
 * @property fileName - kebab-case variant for file names
 * @property constantName - UPPER_SNAKE_CASE variant for constants
 * @property projectName - Nx project name (e.g., "data-access-product")
 * @property projectRoot - Relative path to project root
 * @property sourceRoot - Relative path to source directory
 * @property packageName - NPM package name (e.g., "@scope/data-access-product")
 * @property offsetFromRoot - Relative path from project to workspace root
 * @property description - Library description for documentation
 * @property tags - Comma-separated tags for Nx project configuration
 * @property includeCache - Enable caching layer in repository
 * @property contractLibrary - Import path to contract library
 */
export interface DataAccessCoreOptions {
  readonly name: string
  readonly className: string
  readonly propertyName: string
  readonly fileName: string
  readonly constantName: string
  readonly projectName: string
  readonly projectRoot: string
  readonly sourceRoot: string
  readonly packageName: string
  readonly offsetFromRoot: string
  readonly description?: string
  readonly tags?: string
  readonly includeCache?: boolean
  readonly contractLibrary?: string
}

/**
 * Generate Data Access Library Domain Files
 *
 * Generates only domain-specific files for data-access libraries.
 * Infrastructure files (package.json, tsconfig, project.json) are handled by wrappers.
 *
 * This core function works with any FileSystemAdapter implementation,
 * allowing both Nx and CLI wrappers to share the same domain generation logic.
 *
 * @param adapter - FileSystemAdapter implementation (Nx Tree or Effect FileSystem)
 * @param options - Pre-computed metadata and feature flags from wrapper
 * @returns Effect that succeeds with GeneratorResult or fails with FileSystemErrors
 */
export function generateDataAccessCore(
  adapter: FileSystemAdapter,
  options: DataAccessCoreOptions
) {
  return Effect.gen(function*() {
    // Parse tags from comma-separated string
    const parsedTags = parseTags(options.tags, [])

    // Assemble template options from pre-computed metadata
    const templateOptions: DataAccessTemplateOptions = {
      name: options.name,
      className: options.className,
      propertyName: options.propertyName,
      fileName: options.fileName,
      constantName: options.constantName,
      libraryType: "data-access",
      packageName: options.packageName,
      projectName: options.projectName,
      projectRoot: options.projectRoot,
      sourceRoot: options.sourceRoot,
      offsetFromRoot: options.offsetFromRoot,
      description: options.description ?? `Data access library for ${options.className}`,
      tags: parsedTags,
      includeCache: options.includeCache ?? false,
      contractLibrary: options.contractLibrary ?? getPackageName("contract", options.fileName)
    }

    // Generate all domain files
    const filesGenerated = yield* generateDomainFiles(adapter, options.sourceRoot, templateOptions)

    return {
      projectName: options.projectName,
      projectRoot: options.projectRoot,
      packageName: options.packageName,
      sourceRoot: options.sourceRoot,
      filesGenerated
    }
  })
}

/**
 * Generate domain-specific files
 *
 * Creates all data-access library files including repository implementation,
 * query builders, shared types/errors/validation, and server-side layers.
 *
 * @param adapter - FileSystemAdapter for file operations
 * @param sourceRoot - Relative path to source directory
 * @param templateOptions - Template configuration with all metadata
 * @returns Effect with list of generated file paths
 */
function generateDomainFiles(
  adapter: FileSystemAdapter,
  sourceRoot: string,
  templateOptions: DataAccessTemplateOptions
) {
  return Effect.gen(function*() {
    const workspaceRoot = adapter.getWorkspaceRoot()
    const sourceLibPath = `${workspaceRoot}/${sourceRoot}/lib`
    const sourceSharedPath = `${sourceLibPath}/shared`
    const sourceServerPath = `${sourceLibPath}/server`
    const files: Array<string> = []

    // Generate CLAUDE.md
    const claudeDoc = `# ${templateOptions.packageName}

${templateOptions.description}

## AI Agent Reference

This is a data-access library following Effect-based repository patterns with granular bundle optimization.

### Structure (Optimized for Tree-Shaking)

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/shared/**: Shared types, errors, and validation
  - \`errors.ts\`: Data.TaggedError-based error types
  - \`types.ts\`: Entity types, filters, pagination
  - \`validation.ts\`: Input validation helpers

- **lib/repository/**: Granular repository implementation
  - \`interface.ts\`: Context.Tag with static layers
  - \`operations/create.ts\`: Create operations (~4 KB)
  - \`operations/read.ts\`: Read/query operations (~5 KB)
  - \`operations/update.ts\`: Update operations (~3 KB)
  - \`operations/delete.ts\`: Delete operations (~3 KB)
  - \`operations/aggregate.ts\`: Count/exists operations (~3 KB)
  - \`index.ts\`: Barrel export for convenience

- **lib/queries.ts**: Kysely query builders
- **lib/server/layers.ts**: Server-side Layer compositions (Live, Test, Dev, Auto)

### Import Patterns (Most to Least Optimized)

\`\`\`typescript
// 1. Granular operation import (smallest bundle ~4-5 KB)
import { createOperations } from '${templateOptions.packageName}/repository/operations/create';

// 2. Type-only import (zero runtime ~0.3 KB)
import type { ${templateOptions.className}, ${templateOptions.className}CreateInput } from '${templateOptions.packageName}/types';

// 3. Operation category (~8-12 KB)
import { createOperations, readOperations } from '${templateOptions.packageName}/repository/operations';

// 4. Full repository (~15-20 KB)
import { ${templateOptions.className}Repository } from '${templateOptions.packageName}/repository';

// 5. Package barrel (largest ~25-30 KB)
import { ${templateOptions.className}Repository } from '${templateOptions.packageName}';
\`\`\`

### Customization Guide

1. **Update Entity Types** (\`lib/shared/types.ts\`):
   - Modify entity schema to match your domain
   - Add custom filter types
   - Update pagination options

2. **Implement Repository Operations**:
   - \`lib/repository/operations/create.ts\`: Customize create logic
   - \`lib/repository/operations/read.ts\`: Add domain-specific queries
   - \`lib/repository/operations/update.ts\`: Implement update validation
   - Each operation can be implemented independently

3. **Configure Layers** (\`lib/server/layers.ts\`):
   - Wire up dependencies (database, cache, etc.)
   - Configure Live layer with actual implementations
   - Customize Test layer for testing

### Usage Example

\`\`\`typescript
// Granular import for optimal bundle size
import { createOperations } from '${templateOptions.packageName}/repository/operations/create';
import type { ${templateOptions.className}CreateInput } from '${templateOptions.packageName}/types';

// Use directly without full repository
const program = Effect.gen(function* () {
  const created = yield* createOperations.create({
    // ...entity data
  } as ${templateOptions.className}CreateInput);
  return created;
});

// Traditional approach (still works)
import { ${templateOptions.className}Repository } from '${templateOptions.packageName}';

Effect.gen(function* () {
  const repo = yield* ${templateOptions.className}Repository;
  const result = yield* repo.findById("id-123");
  // ...
});
\`\`\`
`

    yield* adapter.writeFile(`${workspaceRoot}/${templateOptions.projectRoot}/CLAUDE.md`, claudeDoc)

    // Create directories
    yield* adapter.makeDirectory(sourceLibPath)
    yield* adapter.makeDirectory(sourceSharedPath)
    yield* adapter.makeDirectory(sourceServerPath)

    // Generate shared files
    const sharedFiles = [
      { path: `${sourceSharedPath}/errors.ts`, generator: generateErrorsFile },
      { path: `${sourceSharedPath}/types.ts`, generator: generateTypesFile },
      { path: `${sourceSharedPath}/validation.ts`, generator: generateValidationFile }
    ]

    for (const { generator, path } of sharedFiles) {
      const content = generator(templateOptions)
      yield* adapter.writeFile(path, content)
      files.push(path)
    }

    // Generate repository files with granular structure for bundle optimization
    const repositoryPath = `${sourceLibPath}/repository`
    const operationsPath = `${repositoryPath}/operations`

    // Create repository directories
    yield* adapter.makeDirectory(repositoryPath)
    yield* adapter.makeDirectory(operationsPath)

    // Generate repository interface
    const interfaceContent = generateRepositoryFile(templateOptions)
    yield* adapter.writeFile(`${repositoryPath}/repository.ts`, interfaceContent)
    files.push(`${repositoryPath}/repository.ts`)

    // Generate operation files (split for optimal tree-shaking)
    const operationFiles = [
      { path: `${operationsPath}/create.ts`, generator: generateRepositoryCreateOperationFile },
      { path: `${operationsPath}/read.ts`, generator: generateRepositoryReadOperationFile },
      { path: `${operationsPath}/update.ts`, generator: generateRepositoryUpdateOperationFile },
      { path: `${operationsPath}/delete.ts`, generator: generateRepositoryDeleteOperationFile },
      { path: `${operationsPath}/aggregate.ts`, generator: generateRepositoryAggregateOperationFile }
    ]

    for (const { generator, path } of operationFiles) {
      const content = generator(templateOptions)
      yield* adapter.writeFile(path, content)
      files.push(path)
    }

    // Generate operations index (barrel)
    const operationsIndexContent = generateRepositoryOperationsIndexFile(templateOptions)
    yield* adapter.writeFile(`${operationsPath}/index.ts`, operationsIndexContent)
    files.push(`${operationsPath}/index.ts`)

    // Generate repository index (barrel)
    const repositoryIndexContent = generateRepositoryIndexFile(templateOptions)
    yield* adapter.writeFile(`${repositoryPath}/index.ts`, repositoryIndexContent)
    files.push(`${repositoryPath}/index.ts`)

    // Generate repository spec (updated to use new structure)
    const repoSpecContent = generateRepositorySpecFile(templateOptions)
    yield* adapter.writeFile(`${sourceLibPath}/repository.spec.ts`, repoSpecContent)
    files.push(`${sourceLibPath}/repository.spec.ts`)

    // Generate queries file
    const queriesContent = generateQueriesFile(templateOptions)
    yield* adapter.writeFile(`${sourceLibPath}/queries.ts`, queriesContent)
    files.push(`${sourceLibPath}/queries.ts`)

    // Generate server files
    yield* adapter.writeFile(
      `${sourceServerPath}/layers.ts`,
      generateLayersFile(templateOptions)
    )
    files.push(`${sourceServerPath}/layers.ts`)

    yield* adapter.writeFile(
      `${sourceLibPath}/layers.spec.ts`,
      generateLayersSpecFile(templateOptions)
    )
    files.push(`${sourceLibPath}/layers.spec.ts`)

    // Generate type-only exports file for zero-runtime imports
    const typesOnlyOptions: TypesOnlyExportOptions = {
      libraryType: "data-access",
      className: templateOptions.className,
      fileName: templateOptions.fileName,
      packageName: templateOptions.packageName,
      platform: "server"
    }
    const typesOnlyContent = generateTypesOnlyFile(typesOnlyOptions)
    const typesOnlyPath = `${workspaceRoot}/${sourceRoot}/types.ts`
    yield* adapter.writeFile(typesOnlyPath, typesOnlyContent)
    files.push(typesOnlyPath)

    // Generate index
    const indexPath = `${workspaceRoot}/${sourceRoot}/index.ts`
    yield* adapter.writeFile(indexPath, generateIndexFile(templateOptions))
    files.push(indexPath)

    return files
  })
}
