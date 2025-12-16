/**
 * Export Utilities for Granular Sub-Path Export Generation
 *
 * Provides utilities for generating package.json exports with granular sub-paths
 * to enable optimal tree-shaking and bundle optimization.
 */

import type { PlatformType } from "./platforms"
import type { LibraryType } from "./shared/types"

/**
 * Package.json export entry
 */
export interface ExportEntry {
  import?: string
  types?: string
  require?: string // For future CJS support if needed
}

/**
 * Export map for package.json
 */
export type ExportMap = Record<string, ExportEntry>

/**
 * Export configuration for a library
 */
export interface ExportConfig {
  libraryType: LibraryType
  platform: PlatformType
  includeClientServer?: boolean
  includeEdgeExports?: boolean
  includeRPC?: boolean
  hasEntities?: boolean
  entityNames?: Array<string>
}

/**
 * Generate granular exports for contract libraries
 */
export function generateContractExports(config: ExportConfig) {
  const exports: ExportMap = {
    // Main barrel export
    ".": {
      import: "./src/index.ts",
      types: "./src/index.ts"
    },
    // Type-only exports (zero runtime overhead)
    "./types": {
      import: "./src/types.ts",
      types: "./src/types.ts"
    },
    // Error exports
    "./errors": {
      import: "./src/lib/errors.ts",
      types: "./src/lib/errors.ts"
    },
    // Ports exports
    "./ports": {
      import: "./src/lib/ports.ts",
      types: "./src/lib/ports.ts"
    }
  }

  // Add entity exports if entities exist
  if (config.hasEntities) {
    // Barrel export for all entities
    exports["./entities"] = {
      import: "./src/lib/entities/index.ts",
      types: "./src/lib/entities/index.ts"
    }
    // Wildcard export for individual entities (granular tree-shaking)
    exports["./entities/*"] = {
      import: "./src/lib/entities/*.ts",
      types: "./src/lib/entities/*.ts"
    }
  }

  // Add events exports if applicable
  exports["./events"] = {
    import: "./src/lib/events.ts",
    types: "./src/lib/events.ts"
  }

  return exports
}

/**
 * Generate granular exports for data-access libraries
 */
export function generateDataAccessExports() {
  const exports: ExportMap = {
    // Main barrel export
    ".": {
      import: "./src/index.ts",
      types: "./src/index.ts"
    },
    // Type-only exports
    "./types": {
      import: "./src/types.ts",
      types: "./src/types.ts"
    },
    // Repository exports
    "./repository": {
      import: "./src/lib/repository/index.ts",
      types: "./src/lib/repository/index.ts"
    },
    // Repository operations (granular - only bundle what's imported)
    "./repository/operations": {
      import: "./src/lib/repository/operations/index.ts",
      types: "./src/lib/repository/operations/index.ts"
    },
    "./repository/operations/*": {
      import: "./src/lib/repository/operations/*.ts",
      types: "./src/lib/repository/operations/*.ts"
    },
    // Query builder exports
    "./queries": {
      import: "./src/lib/queries/index.ts",
      types: "./src/lib/queries/index.ts"
    },
    "./queries/*": {
      import: "./src/lib/queries/*.ts",
      types: "./src/lib/queries/*.ts"
    },
    // Validation exports
    "./validation": {
      import: "./src/lib/validation/index.ts",
      types: "./src/lib/validation/index.ts"
    },
    "./validation/*": {
      import: "./src/lib/validation/*.ts",
      types: "./src/lib/validation/*.ts"
    },
    // Layers
    "./layers": {
      import: "./src/lib/layers/index.ts",
      types: "./src/lib/layers/index.ts"
    },
    "./layers/*": {
      import: "./src/lib/layers/*.ts",
      types: "./src/lib/layers/*.ts"
    }
  }

  return exports
}

/**
 * Generate granular exports for feature libraries
 *
 * Platform-specific exports removed - rely on automatic tree-shaking
 */
export function generateFeatureExports(config: ExportConfig) {
  const exports: ExportMap = {
    // Main barrel export
    ".": {
      import: "./src/index.ts",
      types: "./src/index.ts"
    },
    // Type-only exports
    "./types": {
      import: "./src/types.ts",
      types: "./src/types.ts"
    }
  }

  // RPC exports (kept as these are functional, not platform-based)
  if (config.includeRPC) {
    exports["./rpc/handlers"] = {
      import: "./src/lib/rpc/handlers/index.ts",
      types: "./src/lib/rpc/handlers/index.ts"
    }
    exports["./rpc/handlers/*"] = {
      import: "./src/lib/rpc/handlers/*.ts",
      types: "./src/lib/rpc/handlers/*.ts"
    }
  }

  return exports
}

/**
 * Generate granular exports for infra libraries
 *
 * Platform-specific exports removed - rely on automatic tree-shaking
 */
export function generateInfraExports() {
  const exports: ExportMap = {
    // Main barrel export
    ".": {
      import: "./src/index.ts",
      types: "./src/index.ts"
    },
    // Type-only exports
    "./types": {
      import: "./src/types.ts",
      types: "./src/types.ts"
    },
    // Service exports
    "./service": {
      import: "./src/lib/service/index.ts",
      types: "./src/lib/service/index.ts"
    },
    // Provider exports (wildcard for custom providers)
    "./providers/*": {
      import: "./src/lib/providers/*.ts",
      types: "./src/lib/providers/*.ts"
    },
    // Layer exports
    "./layers/*": {
      import: "./src/lib/layers/*.ts",
      types: "./src/lib/layers/*.ts"
    }
  }

  return exports
}

/**
 * Generate granular exports for provider libraries
 *
 * Platform-specific exports removed - rely on automatic tree-shaking
 */
export function generateProviderExports() {
  const exports: ExportMap = {
    // Main barrel export
    ".": {
      import: "./src/index.ts",
      types: "./src/index.ts"
    },
    // Type-only exports
    "./types": {
      import: "./src/types.ts",
      types: "./src/types.ts"
    },
    // Service exports
    "./service": {
      import: "./src/lib/service/index.ts",
      types: "./src/lib/service/index.ts"
    },
    // Service operations (granular)
    "./service/*": {
      import: "./src/lib/service/operations/*.ts",
      types: "./src/lib/service/operations/*.ts"
    },
    // Error exports
    "./errors": {
      import: "./src/lib/errors.ts",
      types: "./src/lib/errors.ts"
    },
    // Validation exports
    "./validation": {
      import: "./src/lib/validation.ts",
      types: "./src/lib/validation.ts"
    }
  }

  return exports
}

/**
 * Generate granular exports based on library type
 */
export function generateGranularExports(config: ExportConfig) {
  switch (config.libraryType) {
    case "contract":
      return generateContractExports(config)
    case "data-access":
      return generateDataAccessExports()
    case "feature":
      return generateFeatureExports(config)
    case "infra":
      return generateInfraExports()
    case "provider":
      return generateProviderExports()
    default:
      // Fallback to basic exports
      return {
        ".": {
          import: "./src/index.ts",
          types: "./src/index.ts"
        }
      }
  }
}

/**
 * Merge exports with granular exports, prioritizing granular exports
 */
export function mergeExports(
  baseExports: ExportMap,
  granularExports: ExportMap
) {
  return {
    ...baseExports,
    ...granularExports
  }
}

/**
 * Validate export paths exist (helper for testing)
 */
export function validateExportPaths(exports: ExportMap) {
  const errors: Array<string> = []

  for (const [key, value] of Object.entries(exports)) {
    if (!value.import) {
      errors.push(`Export "${key}" missing import path`)
    }
    if (!value.types) {
      errors.push(`Export "${key}" missing types path`)
    }
  }

  return errors
}

/**
 * Get export path for specific import
 * Useful for migration tools and linting
 */
export function getExportPathForImport(
  exports: ExportMap,
  importPath: string
) {
  // Direct match
  if (exports[importPath]) {
    return importPath
  }

  // Wildcard match
  for (const key of Object.keys(exports)) {
    if (key.endsWith("/*")) {
      const basePath = key.slice(0, -2)
      if (importPath.startsWith(basePath + "/")) {
        return key
      }
    }
  }

  return undefined
}

/**
 * Generate import example documentation for README
 */
export function generateImportExamples(config: ExportConfig) {
  const examples: Array<string> = []

  switch (config.libraryType) {
    case "contract":
      examples.push(
        "// Granular entity import (optimal tree-shaking)",
        "import { Product } from '@scope/contract-product/entities/product'",
        "",
        "// Barrel import (convenience)",
        "import { Product, Category } from '@scope/contract-product/entities'",
        "",
        "// Type-only import (zero runtime overhead)",
        "import type { Product } from '@scope/contract-product/types'"
      )
      break

    case "data-access":
      examples.push(
        "// Granular operation import (only bundles create logic)",
        "import { createUser } from '@scope/data-access-user/repository/operations/create'",
        "",
        "// Specific query builder",
        "import { buildFindByIdQuery } from '@scope/data-access-user/queries/find-queries'",
        "",
        "// Type-only import",
        "import type { User, UserCreateInput } from '@scope/data-access-user/types'"
      )
      break

    case "feature":
      if (config.platform === "browser" || config.platform === "universal" || config.includeClientServer) {
        examples.push(
          "// Granular hook import",
          "import { useUser } from '@scope/feature-user/client/hooks/use-user'",
          "",
          "// Type-only import",
          "import type { UserData } from '@scope/feature-user/types'"
        )
      }
      if (config.platform === "node" || config.platform === "universal" || config.includeClientServer) {
        examples.push(
          "// Granular service operation",
          "import { createUser } from '@scope/feature-user/server/service/create-user'",
          "",
          "// Full server exports",
          "import { UserService } from '@scope/feature-user/server'"
        )
      }
      break

    case "provider":
      examples.push(
        "// Granular operation import",
        "import { createItem } from '@scope/provider-cache/service/create'",
        "",
        "// Type-only import",
        "import type { CacheItem } from '@scope/provider-cache/types'"
      )
      break

    case "infra":
      examples.push(
        "// Service import",
        "import { DatabaseService } from '@scope/infra-database/service'",
        "",
        "// Specific provider",
        "import { PostgresProvider } from '@scope/infra-database/providers/postgres'",
        "",
        "// Type-only import",
        "import type { DatabaseConfig } from '@scope/infra-database/types'"
      )
      break
  }

  return examples.join("\n")
}
