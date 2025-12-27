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

import { Effect } from 'effect'
import { TemplateCompiler } from '../../templates/core/compiler'
import type { TemplateContext } from '../../templates/core/types'
import {
  contractErrorsTemplate,
  contractEventsTemplate,
  contractPortsTemplate
} from '../../templates/definitions/contract'
import type { FileSystemAdapter } from '../../utils/filesystem'
import { parseTags } from '../../utils/generators'
import { createNamingVariants } from '../../utils/naming'
import { generateTemplatesWithSpan, writeContentWithSpan } from '../../utils/template-spans'
import type { ContractTemplateOptions } from '../../utils/types'
import { generateCommandsFile } from '../contract/templates/commands.template'
import { generateIndexFile } from '../contract/templates/index.template'
import { generateProjectionsFile } from '../contract/templates/projections.template'
import { generateQueriesFile } from '../contract/templates/queries.template'
import { generateRpcErrorsFile } from '../contract/templates/rpc.template'
import { generateRpcDefinitionsFile } from '../contract/templates/rpc-definitions.template'
import { generateRpcGroupFile } from '../contract/templates/rpc-group.template'
import { generateSubModuleEntitiesFile } from '../contract/templates/submodule-entities.template'
import { generateSubModuleErrorsFile } from '../contract/templates/submodule-errors.template'
import { generateSubModuleEventsFile } from '../contract/templates/submodule-events.template'
import { generateSubModuleIndexFile } from '../contract/templates/submodule-index.template'
import { generateSubModuleRpcDefinitionsFile } from '../contract/templates/submodule-rpc-definitions.template'
import { generateTypesOnlyFile } from '../contract/templates/types-only.template'

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
 * @property entities - List of entity names for bundle optimization
 * @property includeSubModules - Generate sub-module namespaces (Hybrid DDD pattern)
 * @property subModules - Comma-separated list of sub-module names
 * @property typesDatabasePackage - External package with prisma-effect-kysely types
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
  readonly entities?: readonly string[]
  readonly includeSubModules?: boolean
  readonly subModules?: string
  readonly typesDatabasePackage?: string
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
  readonly filesGenerated: readonly string[]
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
 *
 * @requires TemplateCompiler - Template compilation service for code generation
 */
export function generateContractCore(adapter: FileSystemAdapter, options: ContractCoreOptions) {
  return Effect.gen(function* () {
    // Prepare entities list (defaults to single entity based on library name)
    const entities =
      options.entities && options.entities.length > 0 ? options.entities : [options.className]

    // Parse tags from comma-separated string
    const parsedTags = parseTags(options.tags, [])

    // Assemble template options from pre-computed metadata
    const templateOptions: ContractTemplateOptions = {
      name: options.name,
      className: options.className,
      propertyName: options.propertyName,
      fileName: options.fileName,
      constantName: options.constantName,
      libraryType: 'contract',
      packageName: options.packageName,
      projectName: options.projectName,
      projectRoot: options.projectRoot,
      sourceRoot: options.sourceRoot,
      offsetFromRoot: options.offsetFromRoot,
      description: options.description ?? `Contract library for ${options.className}`,
      tags: parsedTags,
      includeCQRS: options.includeCQRS ?? false,
      entities,
      includeSubModules: options.includeSubModules ?? false,
      subModules: options.subModules
        ? options.subModules
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      typesDatabasePackage: options.typesDatabasePackage
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
 *
 * @requires TemplateCompiler - Template compilation service
 */
function generateDomainFiles(
  adapter: FileSystemAdapter,
  sourceRoot: string,
  templateOptions: ContractTemplateOptions
) {
  return Effect.gen(function* () {
    const workspaceRoot = adapter.getWorkspaceRoot()
    const sourceLibPath = `${workspaceRoot}/${sourceRoot}/lib`
    const files: string[] = []

    // Generate CLAUDE.md
    const claudeDoc = `# ${templateOptions.packageName}

${templateOptions.description}

## AI Agent Reference

This is a contract library defining domain types and interfaces.
**Entity types are generated by prisma-effect-kysely** from Prisma schemas.

### Structure (Flat lib/ Directory)

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/generated/**: Entity types from prisma-effect-kysely (run \`npx prisma generate\`)
  - types.ts: Entity schemas (${templateOptions.className}, ${templateOptions.className}Select, ${templateOptions.className}Insert, ${templateOptions.className}Update)
  - enums.ts: Enum schemas from Prisma
- **lib/errors.ts**: Domain-specific error types (Data.TaggedError)
- **lib/events.ts**: Domain events (imports entity types from generated/)
- **lib/ports.ts**: Repository/service interfaces (Context.Tag pattern)
- **lib/rpc.ts**: RPC endpoint definitions
${
  templateOptions.includeCQRS
    ? `- **lib/commands.ts**: CQRS command schemas\n- **lib/queries.ts**: CQRS query schemas\n- **lib/projections.ts**: Read-model projections`
    : ''
}

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
import type { ${templateOptions.className}Insert } from '${templateOptions.packageName}'// Use in your Effect program
Effect.gen(function*() {
  const repo = yield* ${templateOptions.className}Repository  // Query existing entity
  const entity = yield* repo.findById("id-123")

  // Create new entity (uses prisma-effect-kysely generated Insert type)
  const newEntity = yield* repo.create({
    // ... fields from ${templateOptions.className}Insert
  })
})
\`\`\`
`

    // Generate CLAUDE.md with observability
    yield* writeContentWithSpan(
      adapter,
      'contract/claude-md',
      `${workspaceRoot}/${templateOptions.projectRoot}/CLAUDE.md`,
      claudeDoc
    )

    // Create lib directory
    yield* adapter.makeDirectory(sourceLibPath)

    // Build template context from options
    const scope = templateOptions.packageName.split('/')[0] ?? '@scope'
    // entityTypeSource: where to import entity types from
    // Defaults to local ./types file, can be overridden with typesDatabasePackage
    const entityTypeSource = templateOptions.typesDatabasePackage ?? './types'
    const templateContext: TemplateContext = {
      className: templateOptions.className,
      fileName: templateOptions.fileName,
      propertyName: templateOptions.propertyName,
      constantName: templateOptions.constantName,
      scope,
      packageName: templateOptions.packageName,
      projectName: templateOptions.projectName,
      libraryType: 'contract',
      entityTypeSource,
      // Include CQRS flag for conditional template generation
      includeCQRS: templateOptions.includeCQRS
    }

    // Get template compiler service
    const compiler = yield* TemplateCompiler

    // Generate core domain files using new template compiler
    const coreTemplateFiles = [
      { template: contractErrorsTemplate, path: 'errors.ts' },
      { template: contractPortsTemplate, path: 'ports.ts' },
      { template: contractEventsTemplate, path: 'events.ts' }
    ]

    for (const { path, template } of coreTemplateFiles) {
      const content = yield* compiler.compile(template, templateContext).pipe(
        Effect.withSpan(`generate.contract.${template.id}`, {
          attributes: {
            'template.id': template.id,
            'context.className': templateContext.className
          }
        })
      )
      const filePath = `${sourceLibPath}/${path}`
      yield* adapter.writeFile(filePath, content)
      files.push(filePath)
    }

    // NOTE: Entity types come from prisma-effect-kysely generated types-database package
    // No placeholder generation - typesDatabasePackage should always be specified

    // Generate types-only file (types.ts) for zero-runtime imports with span
    const typesOnlyPath = `${workspaceRoot}/${sourceRoot}/types.ts`
    const typesContent = generateTypesOnlyFile({
      entities: templateOptions.entities,
      includeCQRS: templateOptions.includeCQRS,
      typesDatabasePackage: templateOptions.typesDatabasePackage
    })
    yield* writeContentWithSpan(adapter, 'contract/types-only', typesOnlyPath, typesContent)
    files.push(typesOnlyPath)

    // Generate CQRS files (conditional) with spans
    if (templateOptions.includeCQRS) {
      const cqrsTemplates = [
        { id: 'contract/commands', path: 'commands.ts', generator: generateCommandsFile },
        { id: 'contract/queries', path: 'queries.ts', generator: generateQueriesFile },
        { id: 'contract/projections', path: 'projections.ts', generator: generateProjectionsFile }
      ]

      const cqrsFilePaths = yield* generateTemplatesWithSpan(
        adapter,
        cqrsTemplates,
        sourceLibPath,
        templateOptions
      )
      for (const p of cqrsFilePaths) {
        files.push(p)
      }
    }

    // Generate RPC files (always - prewired integration) with spans
    // Contract-First: RPC definitions are the single source of truth
    const rpcTemplates = [
      { id: 'contract/rpc-errors', path: 'rpc-errors.ts', generator: generateRpcErrorsFile },
      {
        id: 'contract/rpc-definitions',
        path: 'rpc-definitions.ts',
        generator: generateRpcDefinitionsFile
      },
      { id: 'contract/rpc-group', path: 'rpc-group.ts', generator: generateRpcGroupFile }
    ]

    const rpcFilePaths = yield* generateTemplatesWithSpan(
      adapter,
      rpcTemplates,
      sourceLibPath,
      templateOptions
    )
    for (const p of rpcFilePaths) {
      files.push(p)
    }

    // NOTE: rpc.ts barrel file eliminated - biome noBarrelFile compliance
    // Consumers should import directly from rpc-errors.ts, rpc-definitions.ts, or rpc-group.ts
    // Main index.ts provides unified imports for convenience

    // Generate index file (barrel exports) with span
    const indexPath = `${workspaceRoot}/${sourceRoot}/index.ts`
    const indexContent = generateIndexFile(templateOptions)
    yield* writeContentWithSpan(adapter, 'contract/index', indexPath, indexContent)
    files.push(indexPath)

    // Generate sub-module namespaces (Hybrid DDD pattern)
    if (templateOptions.includeSubModules && templateOptions.subModules) {
      const subModuleFiles = yield* generateSubModules(
        adapter,
        workspaceRoot,
        sourceRoot,
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
 * Generate sub-module namespaced exports
 *
 * Creates sub-module directories with entities, events, and RPC definitions.
 * Each sub-module is exported as a namespace from the main package.
 *
 * @param adapter - FileSystemAdapter for file operations
 * @param workspaceRoot - Absolute path to workspace root
 * @param sourceRoot - Relative path to source directory
 * @param templateOptions - Template configuration with all metadata
 * @returns Effect with list of generated file paths
 */
function generateSubModules(
  adapter: FileSystemAdapter,
  workspaceRoot: string,
  sourceRoot: string,
  templateOptions: ContractTemplateOptions
) {
  return Effect.gen(function* () {
    const files: string[] = []
    const subModuleNames = templateOptions.subModules ?? []

    if (subModuleNames.length === 0) {
      return files
    }

    // Generate each sub-module
    for (const subModuleName of subModuleNames) {
      const subModuleClassName = createNamingVariants(subModuleName).className
      const subModulePath = `${workspaceRoot}/${sourceRoot}/${subModuleName}`

      // Create sub-module directory
      yield* adapter.makeDirectory(subModulePath)

      const subModuleOptions = {
        parentName: templateOptions.fileName,
        parentClassName: templateOptions.className,
        subModuleName,
        subModuleClassName
      }

      // Generate sub-module index.ts
      const indexPath = `${subModulePath}/index.ts`
      yield* adapter.writeFile(indexPath, generateSubModuleIndexFile(subModuleOptions))
      files.push(indexPath)

      // Generate sub-module errors.ts (Contract-First: SINGLE SOURCE OF TRUTH)
      const errorsPath = `${subModulePath}/errors.ts`
      yield* adapter.writeFile(errorsPath, generateSubModuleErrorsFile(subModuleOptions))
      files.push(errorsPath)

      // Generate sub-module entities.ts
      const entitiesPath = `${subModulePath}/entities.ts`
      yield* adapter.writeFile(entitiesPath, generateSubModuleEntitiesFile(subModuleOptions))
      files.push(entitiesPath)

      // Generate sub-module events.ts
      const eventsPath = `${subModulePath}/events.ts`
      yield* adapter.writeFile(eventsPath, generateSubModuleEventsFile(subModuleOptions))
      files.push(eventsPath)

      // Generate sub-module RPC definitions (Contract-First: Rpc.make with RouteTag)
      const rpcDefinitionsPath = `${subModulePath}/rpc-definitions.ts`
      yield* adapter.writeFile(
        rpcDefinitionsPath,
        generateSubModuleRpcDefinitionsFile({
          ...subModuleOptions,
          subModulePropertyName: createNamingVariants(subModuleName).propertyName
        })
      )
      files.push(rpcDefinitionsPath)

      // Generate sub-module RPC errors
      const rpcErrorsPath = `${subModulePath}/rpc-errors.ts`
      yield* adapter.writeFile(
        rpcErrorsPath,
        generateSubModuleRpcErrorsFile({
          ...subModuleOptions,
          subModulePropertyName: createNamingVariants(subModuleName).propertyName
        })
      )
      files.push(rpcErrorsPath)
    }

    // Update main index to export sub-modules
    yield* updateMainIndexWithSubModules(
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
 * Generate sub-module RPC errors file
 */
function generateSubModuleRpcErrorsFile(options: {
  parentName: string
  parentClassName: string
  subModuleName: string
  subModuleClassName: string
  subModulePropertyName: string
}) {
  const { parentName, subModuleClassName, subModulePropertyName } = options
  const scope = `@samuelho-dev` // TODO: Get from workspace config

  return `/**
 * ${subModuleClassName} RPC Errors
 *
 * Schema.TaggedError types for ${subModuleClassName} RPC operations.
 * These are serializable over the network (unlike Data.TaggedError in errors.ts).
 *
 * @module ${scope}/contract-${parentName}/${options.subModuleName}/rpc-errors
 */

import { Schema } from "effect"

// ============================================================================
// RPC Errors (Schema.TaggedError for serialization)
// ============================================================================

/**
 * ${subModuleClassName} not found RPC error
 */
export class ${subModuleClassName}NotFoundRpcError extends Schema.TaggedError<${subModuleClassName}NotFoundRpcError>()(
  "${subModuleClassName}NotFoundRpcError",
  {
    message: Schema.String,
    ${subModulePropertyName}Id: Schema.String
  }
) {
  static create(id: string) {
    return new ${subModuleClassName}NotFoundRpcError({
      message: \`${subModuleClassName} not found: \${id}\`,
      ${subModulePropertyName}Id: id
    })
  }
}

/**
 * ${subModuleClassName} validation RPC error
 */
export class ${subModuleClassName}ValidationRpcError extends Schema.TaggedError<${subModuleClassName}ValidationRpcError>()(
  "${subModuleClassName}ValidationRpcError",
  {
    message: Schema.String,
    field: Schema.optional(Schema.String),
    constraint: Schema.optional(Schema.String)
  }
) {
  static create(params: { message: string; field?: string; constraint?: string }) {
    return new ${subModuleClassName}ValidationRpcError(params)
  }
}

/**
 * ${subModuleClassName} permission RPC error
 */
export class ${subModuleClassName}PermissionRpcError extends Schema.TaggedError<${subModuleClassName}PermissionRpcError>()(
  "${subModuleClassName}PermissionRpcError",
  {
    message: Schema.String,
    action: Schema.String,
    ${subModulePropertyName}Id: Schema.optional(Schema.String)
  }
) {
  static create(action: string, ${subModulePropertyName}Id?: string) {
    return new ${subModuleClassName}PermissionRpcError({
      message: \`Permission denied: \${action}\`,
      action,
      ...(${subModulePropertyName}Id ? { ${subModulePropertyName}Id } : {})
    })
  }
}

/**
 * Union of all ${subModuleClassName} RPC errors
 */
export type ${subModuleClassName}RpcError =
  | ${subModuleClassName}NotFoundRpcError
  | ${subModuleClassName}ValidationRpcError
  | ${subModuleClassName}PermissionRpcError

/**
 * Schema for the RPC error union
 */
export const ${subModuleClassName}RpcError = Schema.Union(
  ${subModuleClassName}NotFoundRpcError,
  ${subModuleClassName}ValidationRpcError,
  ${subModuleClassName}PermissionRpcError
)
`
}

/**
 * Update main index.ts to include sub-module exports
 *
 * Uses import * as + re-export pattern instead of export * as to satisfy biome noReExportAll rule.
 */
function updateMainIndexWithSubModules(
  adapter: FileSystemAdapter,
  workspaceRoot: string,
  sourceRoot: string,
  templateOptions: ContractTemplateOptions,
  subModuleNames: string[]
) {
  return Effect.gen(function* () {
    const indexPath = `${workspaceRoot}/${sourceRoot}/index.ts`

    // Read existing index content
    const existingContent = yield* adapter.readFile(indexPath)

    // Generate imports for each sub-module
    const subModuleImports = subModuleNames
      .map((name) => {
        const className = createNamingVariants(name).className
        return `import * as ${className}Module from "./${name}"`
      })
      .join('\n')

    // Generate named exports that re-export the imported namespaces
    const subModuleExports = subModuleNames
      .map((name) => {
        const className = createNamingVariants(name).className
        return `export { ${className}Module as ${className} }`
      })
      .join('\n')

    const newContent = `${existingContent}

// ============================================================================
// Sub-Module Namespace Exports (Hybrid DDD Pattern)
// ============================================================================

${subModuleImports}

${subModuleExports}
`

    yield* adapter.writeFile(indexPath, newContent)
  })
}
