/**
 * Workspace Utilities
 *
 * Consolidated workspace detection, configuration, metadata computation,
 * and infrastructure provider mapping utilities.
 *
 * @module monorepo-library-generator/workspace
 */

import type { Tree } from "@nx/devkit"
import { joinPathFragments, offsetFromRoot as computeOffsetFromRoot } from "@nx/devkit"
import * as fs from "node:fs"
import * as path from "node:path"
import { Effect } from "effect"
import type { FileSystemAdapter } from "./filesystem"
import { createNamingVariants } from "./naming"
import type { GeneratorContext, LibraryType, PlatformType } from "./types"

// ============================================================================
// Workspace Configuration Detection
// ============================================================================

/**
 * Detect workspace scope by reading package.json from workspace root.
 * Traverses up from current directory to find workspace root.
 */
function detectScopeSync(): string {
  const DEFAULT_SCOPE = "@myorg"

  try {
    let currentPath = process.cwd()
    const maxDepth = 10
    let depth = 0

    while (depth < maxDepth) {
      const pkgPath = path.join(currentPath, "package.json")

      if (fs.existsSync(pkgPath)) {
        // Check for workspace indicators
        const nxExists = fs.existsSync(path.join(currentPath, "nx.json"))
        const pnpmExists = fs.existsSync(path.join(currentPath, "pnpm-workspace.yaml"))
        const lernaExists = fs.existsSync(path.join(currentPath, "lerna.json"))
        const turboExists = fs.existsSync(path.join(currentPath, "turbo.json"))

        const content = fs.readFileSync(pkgPath, "utf-8")
        const pkg = JSON.parse(content)
        const hasWorkspaces = Boolean(pkg.workspaces)

        if (nxExists || pnpmExists || lernaExists || turboExists || hasWorkspaces) {
          if (pkg.name && pkg.name.startsWith("@")) {
            return pkg.name.split("/")[0] || DEFAULT_SCOPE
          }
          return DEFAULT_SCOPE
        }
      }

      const parent = path.dirname(currentPath)
      if (parent === currentPath) break
      currentPath = parent
      depth++
    }
  } catch {
    // Fall back to default on any error
  }

  return DEFAULT_SCOPE
}

// Cache the detected scope (computed once on module load)
const detectedScope = detectScopeSync()

/**
 * Workspace-wide configuration constants
 */
export const WORKSPACE_CONFIG = {
  /**
   * Package scope for all generated libraries
   * Used in package.json name field: @{scope}/{type}-{name}
   * Dynamically detected from workspace root package.json
   */
  get scope() {
    return detectedScope
  },

  /**
   * Generate standardized package name
   */
  getPackageName(type: string, name: string) {
    return `${this.scope}/${type}-${name}`
  },

  /**
   * Get just the scope prefix
   */
  getScope() {
    return this.scope
  }
}

/**
 * Type-safe helper to get package name
 * Special case: ENV library uses simple name "@custom-repo/env" instead of "@custom-repo/env-env"
 */
export function getPackageName(type: "env"): string
export function getPackageName(type: string, name: string): string
export function getPackageName(type: string, name?: string) {
  // Special case for ENV library - standalone package name
  if (type === "env" && name === undefined) {
    return `${WORKSPACE_CONFIG.scope}/env`
  }

  // Standard package naming: @scope/type-name
  if (name === undefined) {
    throw new Error(`getPackageName requires 'name' parameter for type '${type}'`)
  }

  return WORKSPACE_CONFIG.getPackageName(type, name)
}

/**
 * Type-safe helper to get workspace scope
 */
export function getWorkspaceScope() {
  return WORKSPACE_CONFIG.getScope()
}

// ============================================================================
// Workspace Type Detection (Tree-based)
// ============================================================================

/**
 * Detect workspace type and configuration using Nx Tree
 */
export function detectWorkspace(tree: Tree) {
  const isNxWorkspace = detectNxWorkspace(tree)
  const isEffectNative = detectEffectNative(tree)
  const packageManager = detectPackageManager(tree)
  const workspaceRoot = tree.root

  return {
    workspaceRoot,
    packageManager,
    isNxWorkspace,
    isEffectNative
  }
}

/**
 * Check if workspace uses Nx
 */
function detectNxWorkspace(tree: Tree) {
  if (tree.exists("nx.json")) {
    return true
  }
  const hasProjectJson = tree.listChanges().some((change) => change.path.includes("project.json"))
  return hasProjectJson
}

/**
 * Check if workspace is Effect native monorepo
 */
function detectEffectNative(tree: Tree) {
  if (!tree.exists("pnpm-workspace.yaml")) {
    return false
  }

  if (!tree.exists("package.json")) {
    return false
  }

  const packageJsonContent = tree.read("package.json", "utf-8")
  if (!packageJsonContent) {
    return false
  }

  try {
    const packageJson = JSON.parse(packageJsonContent)
    const hasEffectBuildUtils = packageJson.devDependencies?.["@effect/build-utils"] !== undefined
    const hasEffectScripts = packageJson.scripts?.["codegen"]?.includes("build-utils") === true
    return hasEffectBuildUtils || hasEffectScripts
  } catch {
    return false
  }
}

/**
 * Detect package manager from lock files
 */
function detectPackageManager(tree: Tree) {
  const manager: "npm" | "yarn" | "pnpm" = tree.exists("pnpm-lock.yaml")
    ? "pnpm"
    : tree.exists("yarn.lock")
      ? "yarn"
      : "npm"
  return manager
}

/**
 * Get build mode based on workspace type
 */
export function getBuildMode(context: GeneratorContext) {
  if (context.isNxWorkspace) {
    return "nx"
  }
  if (context.isEffectNative) {
    return "effect"
  }
  return "nx"
}

/**
 * Check if project.json should be generated
 */
export function shouldGenerateProjectJson(context: GeneratorContext) {
  return context.isNxWorkspace
}

/**
 * Check if Effect build scripts should be generated
 */
export function shouldGenerateEffectScripts(context: GeneratorContext) {
  return context.isEffectNative
}

// ============================================================================
// Workspace Configuration Detection (FileSystemAdapter-based)
// ============================================================================

/**
 * Workspace configuration detected from package.json and structure
 */
export interface WorkspaceConfig {
  readonly scope: string
  readonly librariesRoot: string
  readonly workspaceType: "nx" | "effect" | "hybrid" | "unknown"
  readonly packageManager: "npm" | "yarn" | "pnpm"
  readonly buildMode: "nx" | "effect"
  readonly workspaceRoot: string
}

/**
 * Extract package scope from package.json name
 */
function extractScope(packageName: string | undefined) {
  if (!packageName || packageName.trim() === "") {
    throw new Error(
      "package.json must have a 'name' field. " +
        "Set it to your workspace name (e.g., '@myorg/monorepo' or 'my-workspace')"
    )
  }

  if (packageName.startsWith("@")) {
    const scope = packageName.split("/")[0]
    if (!scope) {
      throw new Error(`Invalid scoped package name: ${packageName}`)
    }
    return scope
  }

  return `@${packageName}`
}

/**
 * Detect libraries root directory from nx.json or workspace structure
 */
function detectLibrariesRoot(
  adapter: FileSystemAdapter,
  workspaceRoot: string,
  hasNxJson: boolean
) {
  return Effect.gen(function* () {
    if (hasNxJson) {
      const nxJsonContent = yield* adapter
        .readFile(`${workspaceRoot}/nx.json`)
        .pipe(Effect.orElseSucceed(() => "{}"))

      try {
        const nxJson: {
          workspaceLayout?: {
            libsDir?: string
          }
        } = JSON.parse(nxJsonContent)

        if (nxJson.workspaceLayout?.libsDir) {
          return nxJson.workspaceLayout.libsDir
        }
      } catch {
        // Invalid JSON, continue with detection
      }
    }

    const hasPackages = yield* adapter.exists(`${workspaceRoot}/packages`)
    if (hasPackages) {
      return "packages"
    }

    const hasLibs = yield* adapter.exists(`${workspaceRoot}/libs`)
    if (hasLibs) {
      return "libs"
    }

    return "libs"
  })
}

/**
 * Detect workspace configuration from package.json and structure
 */
export function detectWorkspaceConfig(adapter: FileSystemAdapter) {
  return Effect.gen(function* () {
    const workspaceRoot = adapter.getWorkspaceRoot()

    const packageJsonContent = yield* adapter
      .readFile(`${workspaceRoot}/package.json`)
      .pipe(Effect.orElseSucceed(() => "{}"))

    const packageJson: {
      name?: string
      devDependencies?: Record<string, string>
      scripts?: Record<string, string>
    } = JSON.parse(packageJsonContent)

    const hasNxJson = yield* adapter.exists(`${workspaceRoot}/nx.json`)
    const hasPnpmWorkspace = yield* adapter.exists(`${workspaceRoot}/pnpm-workspace.yaml`)
    const hasEffectBuildUtils = packageJson.devDependencies?.["@effect/build-utils"] !== undefined

    let workspaceType: "nx" | "effect" | "hybrid" | "unknown"
    if (hasNxJson && hasEffectBuildUtils) {
      workspaceType = "hybrid"
    } else if (hasNxJson) {
      workspaceType = "nx"
    } else if (hasPnpmWorkspace && hasEffectBuildUtils) {
      workspaceType = "effect"
    } else {
      workspaceType = "unknown"
    }

    const hasPnpmLock = yield* adapter.exists(`${workspaceRoot}/pnpm-lock.yaml`)
    const hasYarnLock = yield* adapter.exists(`${workspaceRoot}/yarn.lock`)
    const packageManager: "pnpm" | "yarn" | "npm" = hasPnpmLock
      ? "pnpm"
      : hasYarnLock
        ? "yarn"
        : "npm"

    const scope = extractScope(packageJson.name)
    const librariesRoot = yield* detectLibrariesRoot(adapter, workspaceRoot, hasNxJson)
    const buildMode: "nx" | "effect" = hasNxJson ? "nx" : "effect"

    return {
      scope,
      librariesRoot,
      workspaceType,
      packageManager,
      buildMode,
      workspaceRoot
    }
  })
}

// ============================================================================
// Library Metadata Computation
// ============================================================================

/**
 * Input for computing library metadata
 */
export interface LibraryMetadataInput {
  readonly name: string
  readonly directory?: string
  readonly description?: string
  readonly libraryType: LibraryType
  readonly additionalTags?: Array<string>
}

/**
 * Complete library metadata (all computed values)
 */
export interface LibraryMetadata {
  readonly tmpl: ""
  readonly name: string
  readonly offsetFromRoot: string
  readonly tags: string
  readonly className: string
  readonly propertyName: string
  readonly fileName: string
  readonly constantName: string
  readonly domainName: string
  readonly projectName: string
  readonly packageName: string
  readonly projectRoot: string
  readonly sourceRoot: string
  readonly distRoot: string
  readonly description: string
}

/**
 * Get default directory for library type
 */
function getDefaultDirectory(libraryType: LibraryType, librariesRoot: string) {
  const directories: Record<LibraryType, string> = {
    contract: `${librariesRoot}/contract`,
    "data-access": `${librariesRoot}/data-access`,
    feature: `${librariesRoot}/feature`,
    provider: `${librariesRoot}/provider`,
    infra: `${librariesRoot}/infra`,
    util: `${librariesRoot}/util`
  }
  return directories[libraryType]
}

/**
 * Convert kebab-case fileName to Title Case domain name
 */
function createDomainName(fileName: string) {
  return fileName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * Build standard Nx tags for library
 */
function buildTags(libraryType: LibraryType, fileName: string, additionalTags?: Array<string>) {
  const baseTags = [`type:${libraryType}`, `scope:${fileName}`]

  if (additionalTags) {
    for (const tag of additionalTags) {
      baseTags.push(tag)
    }
  }

  return baseTags.join(",")
}

/**
 * Compute library metadata
 */
export function computeLibraryMetadata(
  tree: Tree,
  schema: {
    readonly name: string
    readonly directory?: string
    readonly description?: string
    readonly tags?: string
  },
  libraryType: LibraryType,
  additionalTags?: ReadonlyArray<string>
) {
  // Import createTreeAdapter dynamically to avoid circular dependency
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createTreeAdapter } = require("./filesystem") as { createTreeAdapter: (tree: Tree) => FileSystemAdapter }
  const adapter = createTreeAdapter(tree)

  const workspaceConfig = Effect.runSync(detectWorkspaceConfig(adapter).pipe(Effect.orDie))

  const schemaTags = schema.tags
    ? schema.tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    : []

  const allAdditionalTags = additionalTags ? [...schemaTags, ...additionalTags] : schemaTags
  const nameVariants = createNamingVariants(schema.name)
  const fileName = nameVariants.fileName

  const directory =
    schema.directory || getDefaultDirectory(libraryType, workspaceConfig.librariesRoot)

  const projectRoot = joinPathFragments(directory, fileName)
  const sourceRoot = joinPathFragments(projectRoot, "src")
  const distRoot = joinPathFragments("dist", directory, fileName)

  const projectName = `${libraryType}-${fileName}`
  const packageName = `${workspaceConfig.scope}/${projectName}`

  const domainName = schema.description || createDomainName(fileName)

  const tags = buildTags(
    libraryType,
    fileName,
    allAdditionalTags.length > 0 ? allAdditionalTags : undefined
  )

  return {
    tmpl: "" as const,
    name: schema.name,
    offsetFromRoot: computeOffsetFromRoot(projectRoot),
    tags,
    className: nameVariants.className,
    propertyName: nameVariants.propertyName,
    fileName,
    constantName: nameVariants.constantName,
    domainName,
    projectName,
    packageName,
    projectRoot,
    sourceRoot,
    distRoot,
    description: schema.description || domainName
  }
}

// ============================================================================
// Generator Utilities
// ============================================================================

/**
 * Calculate relative path from project root to workspace root
 */
export function calculateOffsetFromRoot(projectRoot: string) {
  const depth = projectRoot.split("/").length
  return "../".repeat(depth)
}

/**
 * Create standardized tags for library types
 */
export function createStandardTags(libraryType: LibraryType, platform: PlatformType = "universal") {
  return [`type:${libraryType}`, `platform:${platform}`]
}

/**
 * Parse tags from comma-separated string with defaults
 */
export function parseTags(tags: string | undefined, defaults: Array<string>) {
  if (!tags) return defaults

  const parsed = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)

  return Array.from(new Set([...defaults, ...parsed]))
}

/**
 * Validate that a library does not already exist
 */
export function validateLibraryDoesNotExist(tree: Tree, projectRoot: string, projectName: string) {
  if (tree.exists(projectRoot)) {
    throw new Error(`Library "${projectName}" already exists at ${projectRoot}`)
  }
}

// ============================================================================
// Infrastructure-Provider Mapping
// ============================================================================

/**
 * Maps infrastructure library names to their provider dependencies
 */
export const INFRA_PROVIDER_MAP: Record<string, string> = {
  database: "kysely"
}

/**
 * Infrastructure concern types for specialized template generation
 */
export type InfraConcernType =
  | "cache"
  | "database"
  | "logging"
  | "metrics"
  | "queue"
  | "pubsub"
  | "rpc"
  | "generic"

/**
 * Keywords used to detect infrastructure concern type from library name
 */
const CONCERN_KEYWORDS: Record<string, InfraConcernType> = {
  cache: "cache",
  caching: "cache",
  database: "database",
  db: "database",
  logging: "logging",
  log: "logging",
  logger: "logging",
  metrics: "metrics",
  metric: "metrics",
  telemetry: "metrics",
  queue: "queue",
  job: "queue",
  worker: "queue",
  task: "queue",
  pubsub: "pubsub",
  event: "pubsub",
  messaging: "pubsub",
  broadcast: "pubsub",
  rpc: "rpc",
  api: "rpc",
  remote: "rpc"
}

/**
 * Detect infrastructure concern type from library name
 */
export function detectInfraConcern(name: string): InfraConcernType {
  const lowerName = name.toLowerCase()

  for (const [keyword, concern] of Object.entries(CONCERN_KEYWORDS)) {
    if (lowerName.includes(keyword)) {
      return concern
    }
  }

  return "generic"
}

/**
 * Type-safe keys for infrastructure libraries with provider mappings
 */
export type InfraName = string

/**
 * Type guard to check if a string is a valid InfraName
 */
function isInfraName(name: string): name is InfraName {
  return Object.keys(INFRA_PROVIDER_MAP).includes(name)
}

/**
 * Get provider name for infrastructure library
 */
export function getProviderForInfra(infraName: string) {
  if (isInfraName(infraName)) {
    return INFRA_PROVIDER_MAP[infraName]
  }
  return undefined
}

/**
 * Get provider package name for infrastructure library
 */
export function getProviderPackageName(infraName: string, scope: string) {
  const provider = getProviderForInfra(infraName)
  return provider ? `${scope}/provider-${provider}` : undefined
}

/**
 * Get provider class name for infrastructure library
 */
export function getProviderClassName(infraName: string) {
  const provider = getProviderForInfra(infraName)
  if (!provider) return undefined

  return provider
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
}

/**
 * Check if infrastructure library has a provider mapping
 */
export function hasProviderMapping(infraName: string) {
  return infraName in INFRA_PROVIDER_MAP
}

/**
 * Check if infrastructure library uses Effect primitives directly
 */
export function usesEffectPrimitives(infraName: string) {
  const concern = detectInfraConcern(infraName)
  return ["cache", "database", "logging", "metrics", "queue", "pubsub", "rpc"].includes(concern)
}
