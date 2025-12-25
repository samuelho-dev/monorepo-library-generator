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
import type { FileSystemAdapter } from "../../utils/filesystem"
import { parseTags } from "../../utils/generators"
import { createNamingVariants } from "../../utils/naming"
// Import type-only exports template
import { generateTypesOnlyFile, type TypesOnlyExportOptions } from "../../utils/templates"
import type { DataAccessTemplateOptions } from "../../utils/types"
import { getPackageName } from "../../utils/workspace-config"
import { generateAggregateFile } from "../data-access/templates/aggregate.template"
import { generateCacheFile } from "../data-access/templates/cache.template"
import { generateErrorsFile } from "../data-access/templates/errors.template"
import { generateIndexFile } from "../data-access/templates/index.template"
import { generateLayersSpecFile } from "../data-access/templates/layers-spec.template"
import { generateLayersFile } from "../data-access/templates/layers.template"
import { generateQueriesFile } from "../data-access/templates/queries.template"
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
import { generateRepositorySpecFile } from "../data-access/templates/repository-spec.template"
import {
  generateSubModuleRepositoryFile,
  generateSubModuleRepositoryIndexFile
} from "../data-access/templates/submodule-repository.template"
import { generateTypesFile } from "../data-access/templates/types.template"
import { generateValidationFile } from "../data-access/templates/validation.template"
import type { GeneratorResult } from "./contract"

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
 * @property contractLibrary - Import path to contract library
 * @property includeSubModules - Generate sub-module repositories with aggregate root
 * @property subModules - Comma-separated list of sub-module names
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
  readonly contractLibrary?: string
  readonly includeSubModules?: boolean
  readonly subModules?: string
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
export function generateDataAccessCore(adapter: FileSystemAdapter, options: DataAccessCoreOptions) {
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
      contractLibrary: options.contractLibrary ?? getPackageName("contract", options.fileName),
      includeSubModules: options.includeSubModules ?? false,
      subModules: options.subModules
        ? options.subModules.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined
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

This is a data-access library following Effect-based repository patterns.

### Structure (Flat lib/ Directory)

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/repository.ts**: Context.Tag with static layers (Live, Test, Dev, Auto)
- **lib/errors.ts**: Data.TaggedError-based error types
- **lib/types.ts**: Entity types, filters, pagination
- **lib/validation.ts**: Input validation helpers
- **lib/queries.ts**: Kysely query builders
- **lib/cache.ts**: Read-through caching layer

### Import Patterns

\`\`\`typescript
// Type-only import (zero runtime)
import type { ${templateOptions.className}, ${templateOptions.className}CreateInput } from '${templateOptions.packageName}/types';

// Repository import
import { ${templateOptions.className}Repository } from '${templateOptions.packageName}';

Effect.gen(function*() {
  const repo = yield* ${templateOptions.className}Repository;
  const result = yield* repo.findById("id-123");
  // ...
});
\`\`\`

### Customization Guide

1. **Update Entity Types** (\`lib/types.ts\`):
   - Modify entity schema to match your domain
   - Add custom filter types
   - Update pagination options

2. **Implement Repository Operations** (\`lib/repository.ts\`):
   - findById(), findMany(), findFirst() for reads
   - create(), createMany() for creates
   - update(), updateMany() for updates
   - delete(), deleteMany() for deletes
   - count(), exists() for aggregates

3. **Configure Layers** (\`lib/repository.ts\` static members):
   - Live: Production layer with real database
   - Test: Mock layer for unit tests
   - Dev: Debug logging layer
   - Auto: Environment-aware layer selection (NODE_ENV)

### Usage Example

\`\`\`typescript
import { ${templateOptions.className}Repository } from '${templateOptions.packageName}';
import type { ${templateOptions.className}CreateInput } from '${templateOptions.packageName}/types';

// Standard usage
const program = Effect.gen(function*() {
  const repo = yield* ${templateOptions.className}Repository;
  const entity = yield* repo.findById("id-123");
  return entity;
});

// With layers
const result = program.pipe(
  Effect.provide(${templateOptions.className}Repository.Live)  // Production
  // or Effect.provide(${templateOptions.className}Repository.Test)   // Testing
  // or Effect.provide(${templateOptions.className}Repository.Auto)   // NODE_ENV-based
);

// With caching layer
import { ${templateOptions.className}Cache } from '${templateOptions.packageName}';

Effect.gen(function*() {
  const repo = yield* ${templateOptions.className}Repository;
  const cache = yield* ${templateOptions.className}Cache;

  // Reads go through cache (automatic lookup on miss)
  const entity = yield* cache.get("id-123", () => repo.findById("id-123"));
});
\`\`\`

### Testing Strategy

1. **Use Test layer** - pure mock implementation for unit tests
2. **Use Dev layer** - debug logging for development
3. **Use Live layer** - production implementation
4. **Use Auto layer** - NODE_ENV-based automatic selection
`

    yield* adapter.writeFile(
      `${workspaceRoot}/${templateOptions.projectRoot}/CLAUDE.md`,
      claudeDoc
    )

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
      {
        path: `${operationsPath}/aggregate.ts`,
        generator: generateRepositoryAggregateOperationFile
      }
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

    // NOTE: Cache generation temporarily disabled due to architectural issues
    // with Effect type inference and exactOptionalPropertyTypes.
    // TODO: Redesign cache template to properly handle repository requirements

    // Generate server files
    yield* adapter.writeFile(`${sourceServerPath}/layers.ts`, generateLayersFile(templateOptions))
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

    // Generate sub-module repositories with aggregate root (Hybrid DDD pattern)
    if (templateOptions.includeSubModules && templateOptions.subModules) {
      const subModuleFiles = yield* generateSubModuleRepositories(
        adapter,
        workspaceRoot,
        sourceRoot,
        sourceLibPath,
        templateOptions
      )
      for (const file of subModuleFiles) {
        files.push(file)
      }
    }

    return files
  })
}

/**
 * Generate sub-module repositories with aggregate root
 *
 * Creates sub-module repository directories and an aggregate root
 * that coordinates all sub-module repositories.
 */
function generateSubModuleRepositories(
  adapter: FileSystemAdapter,
  workspaceRoot: string,
  sourceRoot: string,
  sourceLibPath: string,
  templateOptions: DataAccessTemplateOptions
) {
  return Effect.gen(function*() {
    const files: Array<string> = []
    const subModuleNames = templateOptions.subModules ?? []

    if (subModuleNames.length === 0) {
      return files
    }

    // Generate each sub-module repository
    for (const subModuleName of subModuleNames) {
      const subModuleClassName = createNamingVariants(subModuleName).className
      const subModulePath = `${sourceLibPath}/${subModuleName}`

      // Create sub-module directory
      yield* adapter.makeDirectory(subModulePath)

      const subModuleOptions = {
        parentName: templateOptions.name,
        parentClassName: templateOptions.className,
        parentFileName: templateOptions.fileName,
        subModuleName,
        subModuleClassName
      }

      // Generate sub-module repository.ts
      const repoPath = `${subModulePath}/repository.ts`
      yield* adapter.writeFile(repoPath, generateSubModuleRepositoryFile(subModuleOptions))
      files.push(repoPath)

      // Generate sub-module index.ts
      const indexPath = `${subModulePath}/index.ts`
      yield* adapter.writeFile(indexPath, generateSubModuleRepositoryIndexFile(subModuleOptions))
      files.push(indexPath)
    }

    // Generate aggregate root that coordinates all sub-module repositories
    const aggregatePath = `${sourceLibPath}/aggregate.ts`
    const aggregateContent = generateAggregateFile({
      name: templateOptions.name,
      className: templateOptions.className,
      fileName: templateOptions.fileName,
      packageName: templateOptions.packageName,
      subModuleNames
    })
    yield* adapter.writeFile(aggregatePath, aggregateContent)
    files.push(aggregatePath)

    // Update main index to export sub-modules and aggregate
    yield* updateDataAccessIndexWithSubModules(
      adapter,
      workspaceRoot,
      sourceRoot,
      templateOptions,
      subModuleNames
    )

    return files
  })
}

/**
 * Update main index.ts to include sub-module and aggregate exports
 */
function updateDataAccessIndexWithSubModules(
  adapter: FileSystemAdapter,
  workspaceRoot: string,
  sourceRoot: string,
  templateOptions: DataAccessTemplateOptions,
  subModuleNames: Array<string>
) {
  return Effect.gen(function*() {
    const indexPath = `${workspaceRoot}/${sourceRoot}/index.ts`

    // Read existing index content
    const existingContent = yield* adapter.readFile(indexPath)

    // Add sub-module namespace exports
    const subModuleExports = subModuleNames
      .map((name) => {
        const className = createNamingVariants(name).className
        return `export * as ${className} from "./lib/${name}";`
      })
      .join("\n")

    const newContent = `${existingContent}

// ============================================================================
// Aggregate Root Export (Hybrid DDD Pattern)
// ============================================================================

export {
  ${templateOptions.className}Aggregate,
  ${templateOptions.className}AggregateLive,
  ${templateOptions.className}AggregateTestLayer,
  ${templateOptions.className}AggregateLayer,
  type ${templateOptions.className}AggregateInterface,
} from "./lib/aggregate";

// ============================================================================
// Sub-Module Repository Exports
// ============================================================================

${subModuleExports}
`

    yield* adapter.writeFile(indexPath, newContent)
  })
}
