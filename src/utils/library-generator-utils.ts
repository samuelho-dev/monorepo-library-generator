/**
 * Centralized Library File Generation Utility
 *
 * Provides a single, unified interface for generating ALL root Nx library files.
 * This eliminates the need for template files and ensures consistency across all generators.
 *
 * Generated Files:
 * - project.json (Nx project configuration)
 * - package.json (NPM package configuration)
 * - tsconfig.json, tsconfig.lib.json, tsconfig.spec.json (TypeScript configuration)
 * - vitest.config.ts (Test configuration)
 * - README.md, CLAUDE.md (Documentation)
 * - index.ts, server.ts, client.ts, edge.ts (Entry points)
 * - Minimal source templates (lib/service.ts, lib/errors.ts, lib/layers.ts)
 */

import type { ProjectConfiguration, Tree } from "@nx/devkit"
import { addProjectConfiguration } from "@nx/devkit"
import { join } from "path"
import {
  type BuildConfigOptions,
  createEffectScripts,
  createStandardTargets,
  type LibraryType,
  type PlatformType
} from "./build-config-utils"
import { createNamingVariants } from "./naming-utils"
import { resolvePlatformExports } from "./platform-utils"
import { addTsConfigFiles, type TsConfigOptions } from "./tsconfig-utils"
import { detectWorkspace, getBuildMode } from "./workspace-detection"

// __dirname is available in CommonJS mode (Node.js global)
declare const __dirname: string

/**
 * Library Structure Configuration
 *
 * Defines the directory structure for each library type.
 * This enables centralized management of library-specific paths.
 *
 * @see feature.md for feature library architecture
 * @see ARCHITECTURE.md for layer patterns
 */
const LIBRARY_STRUCTURES = {
  feature: {
    types: "./lib/shared/types",
    errors: "./lib/shared/errors",
    service: "./lib/server/service",
    layers: "./lib/server/layers",
    rpc: "./lib/rpc/handlers",
    hooks: "./lib/client/hooks",
    atoms: "./lib/client/atoms",
    middleware: "./lib/edge/middleware"
  },
  "data-access": {
    types: "./lib/domain",
    errors: "./lib/errors",
    service: "./lib/repositories",
    layers: "./lib/layers",
    rpc: "./lib/rpc"
  },
  infra: {
    types: "./lib/service/interface",
    errors: "./lib/service/errors",
    service: "./lib/service/service",
    layers: "./lib/layers"
  },
  provider: {
    types: "./lib/types",
    errors: "./lib/errors",
    service: "./lib/service",
    layers: "./lib/layers"
  },
  contract: {
    types: "./lib/types",
    errors: "./lib/errors"
  },
  util: {
    types: "./lib/types"
  }
} satisfies Record<string, Record<string, string>>

/**
 * Complete options for library generation
 */
export interface LibraryGeneratorOptions {
  // Identity
  name: string
  projectName: string
  projectRoot: string
  offsetFromRoot: string

  // Classification
  libraryType: LibraryType
  platform: PlatformType

  // Metadata
  description?: string
  tags: Array<string>

  // Features
  includeClientServer?: boolean
  includeEdgeExports?: boolean
  includeRPC?: boolean // Enable RPC router and handlers

  // Custom data for templates
  templateData?: Record<string, unknown>
}

/**
 * Generated file manifest
 */
export interface GeneratedLibraryFiles {
  projectConfig?: ProjectConfiguration // Optional - only in Nx mode
  packageJson: PackageJsonConfiguration
  tsConfigFiles: {
    basePath: string
    libPath: string
    specPath?: string
  }
  sourceFiles: {
    index: string
    server?: string
    client?: string
    edge?: string
  }
  documentation?: {
    readme?: string
    claude?: string
  }
}

/**
 * Package.json configuration structure
 */
export interface PackageJsonConfiguration {
  name: string
  version: string
  type: "module"
  exports: Record<string, { import?: string; types?: string }>
  scripts?: Record<string, string>
  peerDependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  publishConfig?: {
    access: string
  }
}

/**
 * Helper to safely access properties from LIBRARY_STRUCTURES
 */
function getStructurePath(
  structure: { [key: string]: string } | undefined,
  key: string
) {
  if (!structure) return undefined
  return structure[key]
}

/**
 * Determine if server/client exports should be generated based on library type and platform
 *
 * Data-access and contract libraries don't need platform-specific exports.
 * Other library types generate server.ts and/or client.ts based on:
 * - includeClientServer flag (explicit opt-in)
 * - platform target (node → server, browser → client, universal → both)
 *
 * @param options Library generator options
 * @returns Object with shouldGenerateServer and shouldGenerateClient flags
 */
function shouldGeneratePlatformExports(options: LibraryGeneratorOptions) {
  // Use shared platform utilities for consistent logic
  return resolvePlatformExports({
    libraryType: options.libraryType,
    platform: options.platform,
    ...(options.includeClientServer !== undefined && {
      includeClientServer: options.includeClientServer
    })
  })
}

/**
 * Generate complete library with all required files
 *
 * Supports both Nx and Effect-native monorepo modes:
 * - **Nx Mode**: Generates project.json with Nx targets
 * - **Effect Mode**: Adds Effect-style scripts to package.json
 *
 * This is the main orchestrator function that:
 * 1. Detects workspace mode (Nx or Effect)
 * 2. Creates project configuration (project.json - Nx only)
 * 3. Generates TypeScript configurations (tsconfig files)
 * 4. Creates package.json with proper exports and scripts
 * 5. Generates source file templates
 * 6. Creates documentation files
 */
export async function generateLibraryFiles(
  tree: Tree,
  options: LibraryGeneratorOptions
) {
  // Detect workspace mode
  const context = detectWorkspace(tree)
  const buildMode = getBuildMode(context)

  // 1. Generate project.json (Nx mode only)
  const projectConfig = buildMode === "nx"
    ? generateProjectJson(tree, options, buildMode)
    : undefined

  // 2. Generate TypeScript configurations
  const tsConfigPaths = await generateTsConfig(tree, options)

  // 3. Generate package.json with mode-specific configuration
  const packageJson = generatePackageJson(tree, options, buildMode)

  // 4. Generate source files
  const sourceFiles = generateSourceFiles(tree, options)

  // 5. Generate documentation
  const documentation = generateDocumentation(tree, options)

  // 6. Generate vitest config
  generateVitestConfig(tree, options)

  // 7. Path mappings are NOT needed - pnpm workspace handles imports via package.json exports
  // See NX_STANDARDS.md for why tsconfig paths must not be used with pnpm workspaces

  return {
    ...(projectConfig && { projectConfig }),
    packageJson,
    tsConfigFiles: tsConfigPaths,
    sourceFiles,
    documentation
  }
}

/**
 * Generate project.json configuration (Nx mode only)
 */
function generateProjectJson(
  tree: Tree,
  options: LibraryGeneratorOptions,
  buildMode: "nx" | "effect"
) {
  const buildOptions: BuildConfigOptions = {
    projectRoot: options.projectRoot,
    platform: options.platform,
    libraryType: options.libraryType,
    includeClientServer: options.includeClientServer ?? false,
    buildMode
  }

  const config: ProjectConfiguration = {
    name: options.projectName,
    root: options.projectRoot,
    projectType: "library",
    sourceRoot: `${options.projectRoot}/src`,
    targets: createStandardTargets(buildOptions),
    tags: options.tags
  }

  addProjectConfiguration(tree, options.projectName, config)
  return config
}

/**
 * Generate TypeScript configuration files
 * Delegates to tsconfig-generator-utils for actual generation
 */
async function generateTsConfig(
  tree: Tree,
  options: LibraryGeneratorOptions
) {
  const tsConfigOptions: TsConfigOptions = {
    projectRoot: options.projectRoot,
    projectName: options.projectName,
    offsetFromRoot: options.offsetFromRoot,
    libraryType: options.libraryType,
    platform: options.platform,
    includeClientServer: options.includeClientServer ?? false,
    includeEdgeExports: options.includeEdgeExports ?? false
  }

  await addTsConfigFiles(tree, tsConfigOptions)

  return {
    basePath: join(options.projectRoot, "tsconfig.json"),
    libPath: join(options.projectRoot, "tsconfig.lib.json"),
    specPath: join(options.projectRoot, "tsconfig.spec.json")
  }
}

/**
 * Generate package.json with mode-specific configuration
 */
/**
 * Extract package scope from root package.json
 *
 * @param tree - Nx Tree API
 * @returns Package scope (e.g., "@myorg")
 */
function extractPackageScopeFromTree(tree: Tree) {
  const packageJsonContent = tree.read("package.json", "utf-8")
  if (!packageJsonContent) {
    throw new Error("package.json not found in workspace root")
  }

  const packageJson = JSON.parse(packageJsonContent)
  const packageName = packageJson.name

  if (!packageName || packageName.trim() === "") {
    throw new Error(
      "package.json must have a 'name' field. " +
        "Set it to your workspace name (e.g., '@myorg/monorepo' or 'my-workspace')"
    )
  }

  // If already scoped (starts with @), extract the scope part
  if (packageName.startsWith("@")) {
    const scope = packageName.split("/")[0]
    if (!scope) {
      throw new Error(`Invalid scoped package name: ${packageName}`)
    }
    return scope
  }

  // No scope - use package name as scope (add @ prefix)
  return `@${packageName}`
}

function generatePackageJson(
  tree: Tree,
  options: LibraryGeneratorOptions,
  buildMode: "nx" | "effect"
) {
  const scope = extractPackageScopeFromTree(tree)
  const scopedName = `${scope}/${options.projectName}`

  // Build exports map
  const exports: Record<string, { import?: string; types?: string }> = {
    ".": {
      import: `./src/index.ts`,
      types: `./src/index.ts`
    }
  }

  const { shouldGenerateClient, shouldGenerateServer } = shouldGeneratePlatformExports(options)

  if (shouldGenerateServer) {
    exports["./server"] = {
      import: `./src/server.ts`,
      types: `./src/server.ts`
    }
  }

  if (shouldGenerateClient) {
    exports["./client"] = {
      import: `./src/client.ts`,
      types: `./src/client.ts`
    }
  }

  if (options.includeEdgeExports) {
    exports["./edge"] = {
      import: `./src/edge.ts`,
      types: `./src/edge.ts`
    }
  }

  // Add @effect/vitest for Effect-based libraries
  const needsEffectVitest = ["provider", "infra", "feature"].includes(
    options.libraryType
  )
  const devDependencies = needsEffectVitest
    ? {
      "@effect/vitest": "workspace:*"
    }
    : undefined

  // Add Effect build scripts in Effect mode
  const scripts = buildMode === "effect"
    ? createEffectScripts({
      projectRoot: options.projectRoot,
      platform: options.platform,
      libraryType: options.libraryType,
      buildMode
    })
    : undefined

  const packageJson: PackageJsonConfiguration = {
    name: scopedName,
    version: "0.0.1",
    type: "module",
    exports,
    ...(scripts && { scripts }),
    peerDependencies: {
      effect: "*"
    },
    ...(devDependencies && { devDependencies }),
    publishConfig: {
      access: "public"
    }
  }

  tree.write(
    join(options.projectRoot, "package.json"),
    JSON.stringify(packageJson, null, 2) + "\n"
  )

  return packageJson
}

/**
 * Generate source file templates
 */
function generateSourceFiles(
  tree: Tree,
  options: LibraryGeneratorOptions
) {
  const nameVars = createNamingVariants(options.name)

  // Generate index.ts
  const indexContent = generateIndexTemplate(options, nameVars)
  const indexPath = join(options.projectRoot, "src", "index.ts")
  tree.write(indexPath, indexContent)

  const sourceFiles: any = { index: indexPath }

  // Generate server.ts and client.ts based on platform or includeClientServer flag
  const { shouldGenerateClient, shouldGenerateServer } = shouldGeneratePlatformExports(options)

  if (shouldGenerateServer) {
    const serverContent = generateServerTemplate(options, nameVars)
    const serverPath = join(options.projectRoot, "src", "server.ts")
    tree.write(serverPath, serverContent)
    sourceFiles.server = serverPath
  }

  if (shouldGenerateClient) {
    const clientContent = generateClientTemplate(options, nameVars)
    const clientPath = join(options.projectRoot, "src", "client.ts")
    tree.write(clientPath, clientContent)
    sourceFiles.client = clientPath
  }

  // Generate edge.ts if needed
  if (options.includeEdgeExports) {
    const edgeContent = generateEdgeTemplate(options, nameVars)
    const edgePath = join(options.projectRoot, "src", "edge.ts")
    tree.write(edgePath, edgeContent)
    sourceFiles.edge = edgePath
  }

  return sourceFiles
}

/**
 * Generate index.ts template
 *
 * Entry point structure varies by library type:
 * - **feature**: Exports shared types/errors from ./lib/shared/*
 * - **data-access**: Exports domain types from ./lib/domain
 * - **infra**: Exports service interface and errors from ./lib/service/*
 * - **provider/contract/util**: Exports from ./lib/types and ./lib/errors
 *
 * @see feature.md for feature library architecture
 * @see ARCHITECTURE.md for layer patterns
 */
function generateIndexTemplate(
  options: LibraryGeneratorOptions,
  nameVars: ReturnType<typeof createNamingVariants>
) {
  const structure = LIBRARY_STRUCTURES[options.libraryType]
  const typesPath = getStructurePath(structure, "types") || "./lib/types"
  const errorsPath = getStructurePath(structure, "errors") || "./lib/errors"

  return `/**
 * ${nameVars.className} Library
 *
 * ${
    options.description ||
    `${nameVars.className} library for ${options.projectName}`
  }
 */

// Export public API
export * from '${typesPath}';
export * from '${errorsPath}';
`
}

/**
 * Generate server.ts template
 *
 * Server-side export structure varies by library type:
 * - **feature**: Exports from ./lib/server/service, ./lib/server/layers, and ./lib/rpc/handlers (if RPC enabled)
 * - **data-access**: Exports from ./lib/repositories and ./lib/layers
 * - **infra**: Exports from ./lib/service/service and ./lib/layers
 * - **provider**: Exports from ./lib/service and ./lib/layers
 */
function generateServerTemplate(
  options: LibraryGeneratorOptions,
  _nameVars: ReturnType<typeof createNamingVariants>
) {
  const structure = LIBRARY_STRUCTURES[options.libraryType]
  const servicePath = getStructurePath(structure, "service") || "./lib/service"
  const layersPath = getStructurePath(structure, "layers") || "./lib/layers"

  let exports = `/**
 * Server-side exports
 *
 * This file contains server-only code. Do not import in browser/client code.
 */

export * from '${servicePath}';
export * from '${layersPath}';
`

  // Feature libraries with RPC
  const rpcPath = getStructurePath(structure, "rpc")
  if (options.libraryType === "feature" && options.includeRPC && rpcPath) {
    exports += `export * from '${rpcPath}';\n`
  }

  return exports
}

/**
 * Generate client.ts template
 *
 * Client-side export structure varies by library type:
 * - **feature**: Exports types from ./lib/shared/*, plus hooks and atoms if includeClientServer=true
 * - **infra**: Exports type-only from ./lib/service/interface
 * - **provider**: Exports type-only from ./lib/types
 */
function generateClientTemplate(
  options: LibraryGeneratorOptions,
  _nameVars: ReturnType<typeof createNamingVariants>
) {
  const structure = LIBRARY_STRUCTURES[options.libraryType]
  const typesPath = getStructurePath(structure, "types") || "./lib/types"
  const errorsPath = getStructurePath(structure, "errors") || "./lib/errors"

  let exports = `/**
 * Client-side exports
 *
 * Browser-safe exports. No server-only dependencies.
 * NO secrets, NO environment variables, NO server logic.
 */

// Export only types and client-safe utilities
export type * from '${typesPath}';
export type * from '${errorsPath}';
`

  // Feature libraries export hooks and atoms
  if (options.libraryType === "feature" && options.includeClientServer) {
    const hooksPath = getStructurePath(structure, "hooks")
    const atomsPath = getStructurePath(structure, "atoms")

    if (hooksPath) {
      exports += `\n// Client-side implementation\n`
      exports += `export * from '${hooksPath}';\n`
    }
    if (atomsPath) {
      exports += `export * from '${atomsPath}';\n`
    }
  }

  return exports
}

/**
 * Generate edge.ts template
 *
 * Edge runtime export structure varies by library type:
 * - **feature**: Exports from ./lib/edge/middleware
 * - **infra**: Exports from ./lib/service/service
 * - **provider**: Exports from ./lib/service
 */
function generateEdgeTemplate(
  options: LibraryGeneratorOptions,
  _nameVars: ReturnType<typeof createNamingVariants>
) {
  const structure = LIBRARY_STRUCTURES[options.libraryType]
  const middlewarePath = getStructurePath(structure, "middleware")
  const servicePath = options.libraryType === "feature" && middlewarePath
    ? middlewarePath
    : getStructurePath(structure, "service") || "./lib/service"
  const typesPath = getStructurePath(structure, "types") || "./lib/types"
  const errorsPath = getStructurePath(structure, "errors") || "./lib/errors"

  return `/**
 * Edge runtime exports
 *
 * Compatible with edge runtimes (Vercel Edge, Cloudflare Workers, etc.)
 */

export * from '${servicePath}';
export * from '${typesPath}';
export * from '${errorsPath}';
`
}

/**
 * Generate documentation files
 */
function generateDocumentation(
  tree: Tree,
  options: LibraryGeneratorOptions
) {
  const nameVars = createNamingVariants(options.name)

  // Generate README.md
  const readmeContent = generateReadmeTemplate(options, nameVars)
  const readmePath = join(options.projectRoot, "README.md")
  tree.write(readmePath, readmeContent)

  // Generate CLAUDE.md
  const claudeContent = generateClaudeTemplate(options, nameVars)
  const claudePath = join(options.projectRoot, "CLAUDE.md")
  tree.write(claudePath, claudeContent)

  return {
    readme: readmePath,
    claude: claudePath
  }
}

/**
 * Generate README.md template
 */
function generateReadmeTemplate(
  options: LibraryGeneratorOptions,
  nameVars: ReturnType<typeof createNamingVariants>
) {
  return `# @custom-repo/${options.projectName}

${options.description || `${nameVars.className} library`}

## Installation

\`\`\`bash
pnpm add @custom-repo/${options.projectName}
\`\`\`

## Usage

\`\`\`typescript
import { ${nameVars.className} } from '@custom-repo/${options.projectName}';
\`\`\`

## Development

\`\`\`bash
# Build
pnpm exec nx build ${options.projectName}

# Test
pnpm exec nx test ${options.projectName}

# Lint
pnpm exec nx lint ${options.projectName}
\`\`\`

## License

MIT
`
}

/**
 * Generate CLAUDE.md template
 */
function generateClaudeTemplate(
  options: LibraryGeneratorOptions,
  nameVars: ReturnType<typeof createNamingVariants>
) {
  return `# @custom-repo/${options.projectName}

> AI-optimized reference for ${nameVars.className}

## Quick Reference

**Purpose**: ${options.description || `${nameVars.className} library`}
**Platform**: ${options.platform}
**Library Type**: ${options.libraryType}

## Import Patterns

\`\`\`typescript
// Main exports
import { ${nameVars.className} } from '@custom-repo/${options.projectName}';

${
    options.libraryType !== "data-access" &&
      options.libraryType !== "contract" &&
      (options.includeClientServer ||
        options.platform === "node" ||
        options.platform === "universal")
      ? `// Server exports\nimport { ${nameVars.className}Live } from '@custom-repo/${options.projectName}/server';\n`
      : ""
  }
${
    options.libraryType !== "data-access" &&
      options.libraryType !== "contract" &&
      (options.includeClientServer ||
        options.platform === "browser" ||
        options.platform === "universal")
      ? `// Client exports\nimport type { ${nameVars.className}Type } from '@custom-repo/${options.projectName}/client';\n`
      : ""
  }
\`\`\`

## Architecture

TODO: Document architecture patterns

## Common Commands

\`\`\`bash
# Build
pnpm exec nx build ${options.projectName}

# Test
pnpm exec nx test ${options.projectName}

# Type check
pnpm exec nx typecheck ${options.projectName}

# Lint
pnpm exec nx lint ${options.projectName}
\`\`\`

## Incremental Builds

This library uses TypeScript project references for incremental compilation:

\`\`\`bash
# Build with incremental compilation (recommended)
pnpm exec nx build ${options.projectName} --batch

# Build all projects with incremental compilation
pnpm exec nx run-many --target=build --all --batch

# Build affected projects with incremental compilation
pnpm exec nx affected --target=build --batch
\`\`\`

**Why --batch?**
- Enables TypeScript's project references mode
- Only rebuilds changed files and their dependents
- Dramatically faster for large monorepos
- Preserves build cache between runs (clean: false)

**How it works:**
1. TypeScript reads tsconfig.lib.json with \`composite: true\`
2. Generates .tsbuildinfo file tracking compilation state
3. Follows \`references\` to dependent libraries
4. Only recompiles what changed

**See also:** [Nx TypeScript Batch Mode](https://nx.dev/recipes/tips-n-tricks/enable-tsc-batch-mode)

## Import Resolution

This library uses **pnpm workspace packages** for imports, not TypeScript path aliases:

\`\`\`typescript
// ✅ Correct: Import via package name
import { ${nameVars.className}Service } from '@custom-repo/${options.projectName}/server';

// ❌ Wrong: Path aliases are NOT used
// import { ${nameVars.className}Service } from 'libs/...';
\`\`\`

**How imports work:**
1. package.json defines exports via \`exports\` field
2. pnpm workspace resolves \`@custom-repo/*\` packages
3. TypeScript follows package.json exports for types
4. No tsconfig.base.json paths needed

**See also:** NX_STANDARDS.md for pnpm workspace conventions
`
}

/**
 * Generate vitest.config.ts
 */
function generateVitestConfig(
  tree: Tree,
  options: LibraryGeneratorOptions
) {
  // Only include @effect/vitest setup for libraries that use Effect
  // Provider, infra, and feature libraries use Effect patterns
  // Util, contract, and types libraries typically don't
  const needsEffectSetup = ["provider", "infra", "feature"].includes(
    options.libraryType
  )
  const setupFiles = needsEffectSetup
    ? `    setupFiles: ['@effect/vitest/setup'],\n`
    : ""

  const content = `import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  root: __dirname,
  cacheDir: '${options.offsetFromRoot}node_modules/.vite/${options.projectName}',
  plugins: [nxViteTsPaths()],
  test: {
    watch: false,
    globals: true,
    environment: 'node',
${setupFiles}    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '${options.offsetFromRoot}coverage/${options.projectRoot}',
      provider: 'v8',
    },
  },
});
`

  tree.write(join(options.projectRoot, "vitest.config.ts"), content)
}
