/**
 * Contract Generator Core
 *
 * Shared core logic for generating contract libraries.
 * Works with both Nx Tree API and Effect FileSystem via FileSystemAdapter.
 *
 * @module monorepo-library-generator/generators/core/contract-generator-core
 */

import { Effect } from "effect"
import type { FileSystemAdapter, FileSystemErrors } from "../../utils/filesystem-adapter"
import { parseTags } from "../../utils/generator-utils"
import type { ContractTemplateOptions } from "../../utils/shared/types"
import { generateCommandsFile } from "../contract/templates/commands.template"
import { generateEntityBarrelFile } from "../contract/templates/entity-barrel.template"
import { generateEntityFile } from "../contract/templates/entity-file.template"
import { generateErrorsFile } from "../contract/templates/errors.template"
import { generateEventsFile } from "../contract/templates/events.template"
import { generateIndexFile } from "../contract/templates/index.template"
import { generatePortsFile } from "../contract/templates/ports.template"
import { generateProjectionsFile } from "../contract/templates/projections.template"
import { generateQueriesFile } from "../contract/templates/queries.template"
import { generateRpcFile } from "../contract/templates/rpc.template"
import { generateTypesOnlyFile } from "../contract/templates/types-only.template"

/**
 * Contract Generator Options
 *
 * Accepts pre-computed metadata from wrapper generators.
 * Wrapper is responsible for path computation via computeLibraryMetadata().
 */
export interface ContractGeneratorCoreOptions {
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
  readonly includeCQRS?: boolean
  readonly includeRPC?: boolean

  // Bundle optimization
  readonly entities?: ReadonlyArray<string>
}

/**
 * Generator Result
 *
 * Metadata about the generated library
 */
export interface GeneratorResult {
  readonly projectName: string
  readonly projectRoot: string
  readonly packageName: string
  readonly sourceRoot: string
  readonly filesGenerated: ReadonlyArray<string>
}

/**
 * Generate Contract Library (Core Logic)
 *
 * This is the shared core that works with any FileSystemAdapter.
 * Both Nx and CLI wrappers call this function.
 *
 * @param adapter - FileSystemAdapter implementation (Tree or Effect FS)
 * @param options - Generator options
 * @returns Effect that succeeds with GeneratorResult or fails with FileSystemErrors
 */
export function generateContractCore(
  adapter: FileSystemAdapter,
  options: ContractGeneratorCoreOptions
) {
  return Effect.gen(function*() {
    // 1. Prepare entities list (default to single entity based on library name if not specified)
    const entities = options.entities && options.entities.length > 0
      ? options.entities
      : [options.className]

    // 2. Parse tags (wrapper may have passed comma-separated string)
    const parsedTags = parseTags(options.tags, [])

    // 3. Prepare template options for domain files
    const templateOptions: ContractTemplateOptions = {
      // Naming variants (from wrapper)
      name: options.name,
      className: options.className,
      propertyName: options.propertyName,
      fileName: options.fileName,
      constantName: options.constantName,

      // Library metadata (from wrapper)
      libraryType: "contract",
      packageName: options.packageName,
      projectName: options.projectName,
      projectRoot: options.projectRoot,
      sourceRoot: options.sourceRoot,
      offsetFromRoot: options.offsetFromRoot,
      description: options.description ?? `Contract library for ${options.className}`,
      tags: parsedTags,

      // Feature flags
      includeCQRS: options.includeCQRS ?? false,
      includeRPC: options.includeRPC ?? false,

      // Bundle optimization
      entities
    }

    // 4. Generate domain files only (infrastructure handled by wrapper)
    const filesGenerated = yield* generateDomainFiles(adapter, options.sourceRoot, templateOptions)

    // 5. Return result
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
 * Generate domain-specific files using templates
 */
function generateDomainFiles(
  adapter: FileSystemAdapter,
  sourceRoot: string,
  templateOptions: ContractTemplateOptions
): Effect.Effect<ReadonlyArray<string>, FileSystemErrors, unknown> {
  return Effect.gen(function*() {
    const workspaceRoot = adapter.getWorkspaceRoot()
    const sourceLibPath = `${workspaceRoot}/${sourceRoot}/lib`
    const files: Array<string> = []

    // Generate CLAUDE.md
    const claudeDoc = `# ${templateOptions.packageName}

${templateOptions.description}

## AI Agent Reference

This is a contract library defining domain types and interfaces.

### Structure

- **lib/entities.ts**: Domain entities with Effect Schema
- **lib/errors.ts**: Domain-specific error types (Data.TaggedError)
- **lib/events.ts**: Domain events
- **lib/ports.ts**: Repository/service interfaces (Context.Tag pattern)
${
      templateOptions.includeCQRS
        ? `- **lib/commands.ts**: CQRS command schemas\n- **lib/queries.ts**: CQRS query schemas\n- **lib/projections.ts**: Read-model projections`
        : ""
    }${templateOptions.includeRPC ? `\n- **lib/rpc.ts**: RPC endpoint definitions` : ""}

### Customization Guide

1. **Entities** (\`lib/entities.ts\`):
   - Update entity schemas to match your domain
   - Add custom fields and validation
   - Define value objects

2. **Errors** (\`lib/errors.ts\`):
   - Add domain-specific error types
   - Use Data.TaggedError for error handling

3. **Ports** (\`lib/ports.ts\`):
   - Define repository interfaces
   - Add service interfaces
   - Use Context.Tag for dependency injection

### Usage Example

\`\`\`typescript
import { ${templateOptions.className}, ${templateOptions.className}Repository } from '${templateOptions.packageName}';

// Use in your Effect program
Effect.gen(function* () {
  const repo = yield* ${templateOptions.className}Repository;
  const entity = yield* repo.findById("id-123");
  // ...
});
\`\`\`
`

    yield* adapter.writeFile(`${workspaceRoot}/${templateOptions.projectRoot}/CLAUDE.md`, claudeDoc)

    // Create lib directory
    yield* adapter.makeDirectory(sourceLibPath)

    // Generate core files (always) - excluding entities for now
    const coreFiles = [
      { path: "errors.ts", generator: generateErrorsFile },
      { path: "ports.ts", generator: generatePortsFile },
      { path: "events.ts", generator: generateEventsFile }
    ]

    for (const { generator, path } of coreFiles) {
      const filePath = `${sourceLibPath}/${path}`
      const content = generator(templateOptions)
      yield* adapter.writeFile(filePath, content)
      files.push(filePath)
    }

    // Generate entity files with bundle optimization
    // Create entities directory
    const entitiesPath = `${sourceLibPath}/entities`
    yield* adapter.makeDirectory(entitiesPath)

    // Generate separate entity file for each entity
    for (const entityName of templateOptions.entities) {
      const entityFileName = entityNameToFileName(entityName)
      const entityFilePath = `${entitiesPath}/${entityFileName}.ts`
      const entityContent = generateEntityFile({
        entityName,
        className: templateOptions.className,
        packageName: templateOptions.packageName
      })
      yield* adapter.writeFile(entityFilePath, entityContent)
      files.push(entityFilePath)
    }

    // Generate barrel file (entities/index.ts)
    const barrelPath = `${entitiesPath}/index.ts`
    const barrelContent = generateEntityBarrelFile({
      entities: templateOptions.entities
    })
    yield* adapter.writeFile(barrelPath, barrelContent)
    files.push(barrelPath)

    // Generate types-only file (types.ts) for zero-runtime imports
    const typesPath = `${workspaceRoot}/${sourceRoot}/types.ts`
    const typesContent = generateTypesOnlyFile({
      entities: templateOptions.entities,
      includeCQRS: templateOptions.includeCQRS,
      includeRPC: templateOptions.includeRPC
    })
    yield* adapter.writeFile(typesPath, typesContent)
    files.push(typesPath)

    // Generate CQRS files (conditional)
    if (templateOptions.includeCQRS) {
      const cqrsFiles = [
        { path: "commands.ts", generator: generateCommandsFile },
        { path: "queries.ts", generator: generateQueriesFile },
        { path: "projections.ts", generator: generateProjectionsFile }
      ]

      for (const { generator, path } of cqrsFiles) {
        const filePath = `${sourceLibPath}/${path}`
        const content = generator(templateOptions)
        yield* adapter.writeFile(filePath, content)
        files.push(filePath)
      }
    }

    // Generate RPC file (conditional)
    if (templateOptions.includeRPC) {
      const rpcPath = `${sourceLibPath}/rpc.ts`
      const content = generateRpcFile(templateOptions)
      yield* adapter.writeFile(rpcPath, content)
      files.push(rpcPath)
    }

    // Generate index file (barrel exports)
    const indexPath = `${workspaceRoot}/${sourceRoot}/index.ts`
    const indexContent = generateIndexFile(templateOptions)
    yield* adapter.writeFile(indexPath, indexContent)
    files.push(indexPath)

    return files
  })
}

/**
 * Convert entity name to file name
 *
 * Converts PascalCase entity names to kebab-case file names
 *
 * @example
 * entityNameToFileName("Product") // "product"
 * entityNameToFileName("ProductCategory") // "product-category"
 */
function entityNameToFileName(entityName: string) {
  return entityName
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
}
