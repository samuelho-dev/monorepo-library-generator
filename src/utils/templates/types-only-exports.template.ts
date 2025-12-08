/**
 * Type-Only Exports Template (Shared)
 *
 * Generates types.ts files with type-only exports for zero runtime overhead.
 * These imports are completely erased at compile time.
 *
 * Each library type gets its own template function that generates appropriate
 * type-only re-exports based on the library's structure.
 */

import type { LibraryType } from "../shared/types"

/**
 * Options for generating type-only export files
 */
export interface TypesOnlyExportOptions {
  libraryType: LibraryType
  className: string
  fileName: string
  packageName: string
  includeRPC?: boolean
  includeCQRS?: boolean
  includeClientServer?: boolean
  platform?: "server" | "client" | "universal"
}

/**
 * Generate types.ts file for data-access libraries
 *
 * Provides type-only re-exports from repository, queries, validation, and shared modules
 */
export function generateDataAccessTypesOnly(
  options: TypesOnlyExportOptions
) {
  const { packageName } = options

  return `/**
 * Type-Only Exports
 *
 * This file provides type-only exports for zero runtime overhead.
 * Use these imports when you only need types for TypeScript checking:
 *
 * @example
 * import type { User, UserCreateInput } from '${packageName}/types';
 *
 * These imports are completely erased at compile time and add
 * zero bytes to your JavaScript bundle.
 */

// ============================================================================
// Repository Types
// ============================================================================

export type * from "./lib/repository/interface";

// ============================================================================
// Shared Types
// ============================================================================

export type * from "./lib/shared/types";

// ============================================================================
// Error Types
// ============================================================================

export type * from "./lib/shared/errors";

// ============================================================================
// Validation Types
// ============================================================================

export type * from "./lib/shared/validation";
`
}

/**
 * Generate types.ts file for feature libraries
 *
 * Provides type-only re-exports from server, client, RPC, and shared modules
 */
export function generateFeatureTypesOnly(options: TypesOnlyExportOptions) {
  const { includeClientServer, includeRPC, packageName, platform } = options

  const hasServer = platform === "server" || includeClientServer
  const hasClient = platform === "client" || includeClientServer

  return `/**
 * Type-Only Exports
 *
 * This file provides type-only exports for zero runtime overhead.
 * Use these imports when you only need types for TypeScript checking:
 *
 * @example
 * import type { UserData, UserServiceInterface } from '${packageName}/types';
 *
 * These imports are completely erased at compile time and add
 * zero bytes to your JavaScript bundle.
 */

// ============================================================================
// Shared Types
// ============================================================================

export type * from "./lib/shared/types";

// ============================================================================
// Error Types
// ============================================================================

export type * from "./lib/shared/errors";
${
    hasServer
      ? `
// ============================================================================
// Server Types
// ============================================================================

// Service interface types
export type * from "./lib/server/service/interface";
`
      : ""
  }${
    includeRPC
      ? `
// ============================================================================
// RPC Types
// ============================================================================

export type * from "./lib/rpc/rpc";
export type * from "./lib/rpc/errors";
`
      : ""
  }${
    hasClient
      ? `
// ============================================================================
// Client Types
// ============================================================================

// Hook types (return values, parameters)
export type * from "./lib/client/hooks/index";

// Atom types (state shapes)
export type * from "./lib/client/atoms/index";
`
      : ""
  }
`
}

/**
 * Generate types.ts file for provider libraries
 *
 * Provides type-only re-exports from service, errors, and validation modules
 */
export function generateProviderTypesOnly(
  options: TypesOnlyExportOptions
) {
  const { packageName } = options

  return `/**
 * Type-Only Exports
 *
 * This file provides type-only exports for zero runtime overhead.
 * Use these imports when you only need types for TypeScript checking:
 *
 * @example
 * import type { CacheItem, CacheServiceInterface } from '${packageName}/types';
 *
 * These imports are completely erased at compile time and add
 * zero bytes to your JavaScript bundle.
 */

// ============================================================================
// Service Types
// ============================================================================

export type * from "./lib/service/interface";

// ============================================================================
// Shared Types
// ============================================================================

export type * from "./lib/types";

// ============================================================================
// Error Types
// ============================================================================

export type * from "./lib/errors";

// ============================================================================
// Validation Types
// ============================================================================

export type * from "./lib/validation";
`
}

/**
 * Generate types.ts file for infra libraries
 *
 * Provides type-only re-exports from service, config, and error modules
 */
export function generateInfraTypesOnly(options: TypesOnlyExportOptions) {
  const { packageName } = options

  return `/**
 * Type-Only Exports
 *
 * This file provides type-only exports for zero runtime overhead.
 * Use these imports when you only need types for TypeScript checking:
 *
 * @example
 * import type { DatabaseConfig, DatabaseServiceInterface } from '${packageName}/types';
 *
 * These imports are completely erased at compile time and add
 * zero bytes to your JavaScript bundle.
 */

// ============================================================================
// Service Types
// ============================================================================

export type * from "./lib/service/interface";

// ============================================================================
// Configuration Types
// ============================================================================

export type * from "./lib/service/config";

// ============================================================================
// Error Types
// ============================================================================

export type * from "./lib/service/errors";
`
}

/**
 * Generate types.ts file based on library type
 *
 * Main entry point that delegates to library-specific generators
 */
export function generateTypesOnlyFile(
  options: TypesOnlyExportOptions
) {
  switch (options.libraryType) {
    case "data-access":
      return generateDataAccessTypesOnly(options)
    case "feature":
      return generateFeatureTypesOnly(options)
    case "provider":
      return generateProviderTypesOnly(options)
    case "infra":
      return generateInfraTypesOnly(options)
    case "contract":
      // Contract libraries use their own types-only.template.ts
      throw new Error(
        "Contract libraries should use contract/templates/types-only.template.ts"
      )
    default:
      throw new Error(`Unsupported library type: ${options.libraryType}`)
  }
}

/**
 * Get the file path for the types-only export file
 */
export function getTypesOnlyFilePath(projectRoot: string) {
  return `${projectRoot}/src/types.ts`
}

/**
 * Check if a library type should have a types-only export file
 */
export function shouldGenerateTypesOnly(libraryType: LibraryType) {
  // All library types benefit from type-only exports for bundle optimization
  return ["contract", "data-access", "feature", "infra", "provider"].includes(
    libraryType
  )
}
