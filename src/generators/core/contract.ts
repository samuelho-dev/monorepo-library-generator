/**
 * Contract Generator Core
 *
 * Generates domain-specific files for contract libraries.
 * Works with both Nx Tree API and Effect FileSystem via FileSystemAdapter.
 *
 * Responsibilities:
 * - Generates domain files (entities, errors, events, ports, CQRS, RPC)
 * - Handles bundle optimization with separate entity files
 * - Creates CLAUDE.md documentation
 * - Infrastructure generation is handled by wrapper generators
 *
 * @module monorepo-library-generator/generators/core/contract-generator-core
 */

import { Effect } from "effect"
import type { FileSystemAdapter } from "../../utils/filesystem-adapter"
import { parseTags } from "../../utils/generators"
import type { ContractTemplateOptions } from "../../utils/shared/types"
import { generateCommandsFile } from "../contract/templates/commands.template"
// NOTE: Entity generation removed - entities come from prisma-effect-kysely
// import { generateEntityBarrelFile } from "../contract/templates/entity-barrel.template"
// import { generateEntityFile } from "../contract/templates/entity-file.template"
import { generateErrorsFile } from "../contract/templates/errors.template"
import { generateEventsFile } from "../contract/templates/events.template"
import { generateIndexFile } from "../contract/templates/index.template"
import { generatePortsFile } from "../contract/templates/ports.template"
import { generateProjectionsFile } from "../contract/templates/projections.template"
import { generateQueriesFile } from "../contract/templates/queries.template"
import { generateRpcFile } from "../contract/templates/rpc.template"
import { generateTypesOnlyFile } from "../contract/templates/types-only.template"

/**
 * Contract Generator Core Options
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
 * @property projectName - Nx project name (e.g., "contract-product")
 * @property projectRoot - Relative path to project root
 * @property sourceRoot - Relative path to source directory
 * @property packageName - NPM package name (e.g., "@scope/contract-product")
 * @property offsetFromRoot - Relative path from project to workspace root
 * @property description - Library description for documentation
 * @property tags - Comma-separated tags for Nx project configuration
 * @property includeCQRS - Generate CQRS files (commands, queries, projections)
 * @property includeRPC - Generate RPC endpoint definitions
 * @property entities - List of entity names for bundle optimization
 */
export interface ContractCoreOptions {
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
  readonly includeCQRS?: boolean
  readonly includeRPC?: boolean
  readonly entities?: ReadonlyArray<string>
}

/**
 * Generator Result
 *
 * Metadata returned after successful generation.
 *
 * @property projectName - Nx project name
 * @property projectRoot - Relative path to project root
 * @property packageName - NPM package name
 * @property sourceRoot - Relative path to source directory
 * @property filesGenerated - List of all generated file paths
 */
export interface GeneratorResult {
  readonly projectName: string
  readonly projectRoot: string
  readonly packageName: string
  readonly sourceRoot: string
  readonly filesGenerated: ReadonlyArray<string>
}

/**
 * Generate Contract Library Domain Files
 *
 * Generates only domain-specific files for contract libraries.
 * Infrastructure files (package.json, tsconfig, project.json) are handled by wrappers.
 *
 * This core function works with any FileSystemAdapter implementation,
 * allowing both Nx and CLI wrappers to share the same domain generation logic.
 *
 * @param adapter - FileSystemAdapter implementation (Nx Tree or Effect FileSystem)
 * @param options - Pre-computed metadata and feature flags from wrapper
 * @returns Effect that succeeds with GeneratorResult or fails with FileSystemErrors
 */
export function generateContractCore(
  adapter: FileSystemAdapter,
  options: ContractCoreOptions
) {
  return Effect.gen(function*() {
    // Prepare entities list (defaults to single entity based on library name)
    const entities = options.entities && options.entities.length > 0
      ? options.entities
      : [options.className]

    // Parse tags from comma-separated string
    const parsedTags = parseTags(options.tags, [])

    // Assemble template options from pre-computed metadata
    const templateOptions: ContractTemplateOptions = {
      name: options.name,
      className: options.className,
      propertyName: options.propertyName,
      fileName: options.fileName,
      constantName: options.constantName,
      libraryType: "contract",
      packageName: options.packageName,
      projectName: options.projectName,
      projectRoot: options.projectRoot,
      sourceRoot: options.sourceRoot,
      offsetFromRoot: options.offsetFromRoot,
      description: options.description ?? `Contract library for ${options.className}`,
      tags: parsedTags,
      includeCQRS: options.includeCQRS ?? false,
      includeRPC: options.includeRPC ?? false,
      entities
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
 * Creates all contract library files including entities, errors, events, ports,
 * and optional CQRS/RPC files. Implements bundle optimization with separate
 * entity files for tree-shaking.
 *
 * @param adapter - FileSystemAdapter for file operations
 * @param sourceRoot - Relative path to source directory
 * @param templateOptions - Template configuration with all metadata
 * @returns Effect with list of generated file paths
 */
function generateDomainFiles(
  adapter: FileSystemAdapter,
  sourceRoot: string,
  templateOptions: ContractTemplateOptions
) {
  return Effect.gen(function*() {
    const workspaceRoot = adapter.getWorkspaceRoot()
    const sourceLibPath = `${workspaceRoot}/${sourceRoot}/lib`
    const files: Array<string> = []

    // Generate CLAUDE.md
    const claudeDoc = `# ${templateOptions.packageName}

${templateOptions.description}

## AI Agent Reference

This is a contract library defining domain types and interfaces.
**Entity types are generated by prisma-effect-kysely** from Prisma schemas.

### Structure

- **lib/generated/**: Entity types from prisma-effect-kysely (run \`npx prisma generate\`)
  - types.ts: Entity schemas (${templateOptions.className}, ${templateOptions.className}Select, ${templateOptions.className}Insert, ${templateOptions.className}Update)
  - enums.ts: Enum schemas from Prisma
- **lib/errors.ts**: Domain-specific error types (Data.TaggedError)
- **lib/events.ts**: Domain events (imports entity types from generated/)
- **lib/ports.ts**: Repository/service interfaces (Context.Tag pattern)
${
      templateOptions.includeCQRS
        ? `- **lib/commands.ts**: CQRS command schemas\n- **lib/queries.ts**: CQRS query schemas\n- **lib/projections.ts**: Read-model projections`
        : ""
    }${templateOptions.includeRPC ? `\n- **lib/rpc.ts**: RPC endpoint definitions` : ""}

### Integration with prisma-effect-kysely

1. **Entity schemas are generated** from Prisma schema, NOT manually created
2. Run \`npx prisma generate\` to update entity types after schema changes
3. Events and ports import entity types from \`./generated\` folder

### Customization Guide

1. **Prisma Schema** (source of truth for entities):
   - Define your domain entities in \`prisma/schema.prisma\`
   - Add custom fields, relations, and validation
   - Run \`npx prisma generate\` to update types

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
import type { ${templateOptions.className}Insert } from '${templateOptions.packageName}';

// Use in your Effect program
Effect.gen(function* () {
  const repo = yield* ${templateOptions.className}Repository;

  // Query existing entity
  const entity = yield* repo.findById("id-123");

  // Create new entity (uses prisma-effect-kysely generated Insert type)
  const newEntity = yield* repo.create({
    // ... fields from ${templateOptions.className}Insert
  });
});
\`\`\`
`

    yield* adapter.writeFile(`${workspaceRoot}/${templateOptions.projectRoot}/CLAUDE.md`, claudeDoc)

    // Create lib directory
    yield* adapter.makeDirectory(sourceLibPath)

    // Generate core domain files (always generated)
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

    // NOTE: Entity files are NOT generated here - they come from prisma-effect-kysely
    // prisma-effect-kysely generates entity schemas in src/generated/ folder
    // See: https://github.com/your-org/prisma-effect-kysely
    //
    // Create generated directory with placeholder for prisma-effect-kysely output
    const generatedPath = `${sourceLibPath}/generated`
    yield* adapter.makeDirectory(generatedPath)

    // Create placeholder index.ts that explains the integration
    const generatedPlaceholderContent = `/**
 * Generated Types Placeholder
 *
 * This directory is populated by prisma-effect-kysely generator.
 * Run 'npx prisma generate' to generate entity schemas from your Prisma schema.
 *
 * Expected output:
 * - types.ts: Entity schemas (${templateOptions.className}, ${templateOptions.className}Select, ${templateOptions.className}Insert, ${templateOptions.className}Update)
 * - enums.ts: Enum schemas from Prisma enums
 * - index.ts: Barrel exports
 *
 * @see https://github.com/your-org/prisma-effect-kysely
 */

// Re-export generated types when available
// After running 'npx prisma generate', replace this with:
// export * from './types';
// export * from './enums';

// Temporary placeholder types until prisma-effect-kysely generates real types
import { Brand, Schema } from "effect"

/**
 * Branded ID type for type-safe ${templateOptions.className} identifiers
 */
export type ${templateOptions.className}Id = string & Brand.Brand<"${templateOptions.className}Id">

/**
 * ${templateOptions.className}Id Schema for validation
 */
export const ${templateOptions.className}Id = Schema.String.pipe(
  Schema.brand("${templateOptions.className}Id")
)

/**
 * Placeholder ${templateOptions.className} schema
 * Replace with actual generated schema from prisma-effect-kysely
 */
export const ${templateOptions.className} = Schema.Struct({
  id: ${templateOptions.className}Id,
  name: Schema.String,
  createdAt: Schema.Date,
  updatedAt: Schema.Date
})

export type ${templateOptions.className} = typeof ${templateOptions.className}.Type

/**
 * Insert type (excludes auto-generated fields)
 */
export type ${templateOptions.className}Insert = Omit<${templateOptions.className}, "id" | "createdAt" | "updatedAt">

/**
 * Update type (partial insert)
 */
export type ${templateOptions.className}Update = Partial<${templateOptions.className}Insert>
`
    yield* adapter.writeFile(`${generatedPath}/index.ts`, generatedPlaceholderContent)
    files.push(`${generatedPath}/index.ts`)

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
