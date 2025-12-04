/**
 * Data Access Generator Core
 *
 * Shared core logic for generating data-access libraries.
 * Works with both Nx Tree API and Effect FileSystem via FileSystemAdapter.
 *
 * @module monorepo-library-generator/generators/core/data-access-generator-core
 */

import { Effect } from "effect"
import type { FileSystemAdapter, FileSystemErrors } from "../../utils/filesystem-adapter"
import { parseTags } from "../../utils/generator-utils"
import type { DataAccessTemplateOptions } from "../../utils/shared/types"
import { generateErrorsFile } from "../data-access/templates/errors.template"
import { generateIndexFile } from "../data-access/templates/index.template"
import { generateLayersSpecFile } from "../data-access/templates/layers-spec.template"
import { generateLayersFile } from "../data-access/templates/layers.template"
import { generateQueriesFile } from "../data-access/templates/queries.template"
import { generateRepositorySpecFile } from "../data-access/templates/repository-spec.template"
import { generateRepositoryFile } from "../data-access/templates/repository.template"
import { generateTypesFile } from "../data-access/templates/types.template"
import { generateValidationFile } from "../data-access/templates/validation.template"
import type { GeneratorResult } from "./contract-generator-core"

export type { GeneratorResult }

/**
 * Data Access Generator Options
 *
 * Accepts pre-computed metadata from wrapper generators.
 */
export interface DataAccessGeneratorCoreOptions {
  // Naming variants (pre-computed by wrapper)
  readonly name: string
  readonly className: string
  readonly propertyName: string
  readonly fileName: string
  readonly constantName: string

  // Project metadata (pre-computed by wrapper)
  readonly projectName: string
  readonly projectRoot: string
  readonly sourceRoot: string
  readonly packageName: string
  readonly offsetFromRoot: string

  // Optional metadata
  readonly description?: string
  readonly tags?: string

  // Feature flags
  readonly includeCache?: boolean
  readonly contractLibrary?: string
}

/**
 * Generate Data Access Library (Core Logic)
 */
export function generateDataAccessCore(
  adapter: FileSystemAdapter,
  options: DataAccessGeneratorCoreOptions
) {
  return Effect.gen(function*() {
    // 1. Parse tags (wrapper may have passed comma-separated string)
    const parsedTags = parseTags(options.tags, [])

    // 2. Prepare template options
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
      contractLibrary: options.contractLibrary ?? `@scope/contract-${options.fileName}`
    }

    // 3. Generate domain files (infrastructure handled by wrapper)
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
 */
function generateDomainFiles(
  adapter: FileSystemAdapter,
  sourceRoot: string,
  templateOptions: DataAccessTemplateOptions
): Effect.Effect<ReadonlyArray<string>, FileSystemErrors, unknown> {
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

### Structure

- **lib/shared/**: Shared types, errors, and validation
  - \`errors.ts\`: Data.TaggedError-based error types
  - \`types.ts\`: Entity types, filters, pagination
  - \`validation.ts\`: Input validation helpers

- **lib/repository.ts**: Repository implementation with CRUD operations
- **lib/queries.ts**: Kysely query builders
- **lib/server/layers.ts**: Server-side Layer compositions (Live, Test, Dev, Auto)

### Customization Guide

1. **Update Entity Types** (\`lib/shared/types.ts\`):
   - Modify entity schema to match your domain
   - Add custom filter types
   - Update pagination options

2. **Implement Repository** (\`lib/repository.ts\`):
   - Customize CRUD methods
   - Add domain-specific queries
   - Implement business logic

3. **Configure Layers** (\`lib/server/layers.ts\`):
   - Wire up dependencies (database, cache, etc.)
   - Configure Live layer with actual implementations
   - Customize Test layer for testing

### Usage Example

\`\`\`typescript
import { ${templateOptions.className}Repository } from '${templateOptions.packageName}';

// Use in your Effect program
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

    // Generate repository files
    const repoFiles = [
      { path: `${sourceLibPath}/queries.ts`, generator: generateQueriesFile },
      { path: `${sourceLibPath}/repository.ts`, generator: generateRepositoryFile },
      { path: `${sourceLibPath}/repository.spec.ts`, generator: generateRepositorySpecFile }
    ]

    for (const { generator, path } of repoFiles) {
      const content = generator(templateOptions)
      yield* adapter.writeFile(path, content)
      files.push(path)
    }

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

    // Generate index
    const indexPath = `${workspaceRoot}/${sourceRoot}/index.ts`
    yield* adapter.writeFile(indexPath, generateIndexFile(templateOptions))
    files.push(indexPath)

    return files
  })
}
