/**
 * Platform Export Utilities
 *
 * Shared utilities for determining platform-specific export generation.
 * Consolidates logic for client/server/edge export determination across generators.
 *
 * @module monorepo-library-generator/platform-utils
 */

import type { LibraryType } from "./shared/types"

/**
 * Platform type for library
 */
export type PlatformType = "node" | "browser" | "universal" | "edge"

/**
 * Options for determining platform exports
 */
export interface PlatformExportOptions {
  readonly libraryType: LibraryType
  readonly platform: PlatformType
  readonly includeClientServer?: boolean
}

/**
 * Result of platform export determination
 */
export interface PlatformExports {
  readonly shouldGenerateServer: boolean
  readonly shouldGenerateClient: boolean
}

/**
 * Determine if platform-specific exports should be generated
 *
 * Implements the correct precedence logic:
 * 1. Explicit `includeClientServer` setting takes precedence
 * 2. Platform defaults apply if `includeClientServer` is undefined
 * 3. data-access and contract libraries never generate platform-specific exports
 *
 * @param options - Platform export options
 * @returns Object with shouldGenerateServer and shouldGenerateClient flags
 *
 * @example
 * ```typescript
 * // Explicit override - generate both regardless of platform
 * determinePlatformExports({
 *   libraryType: 'feature',
 *   platform: 'node',
 *   includeClientServer: true
 * });
 * // => { shouldGenerateServer: true, shouldGenerateClient: true }
 *
 * // Explicit override - generate neither
 * determinePlatformExports({
 *   libraryType: 'provider',
 *   platform: 'universal',
 *   includeClientServer: false
 * });
 * // => { shouldGenerateServer: false, shouldGenerateClient: false }
 *
 * // Platform defaults - universal generates both
 * determinePlatformExports({
 *   libraryType: 'infra',
 *   platform: 'universal',
 * });
 * // => { shouldGenerateServer: true, shouldGenerateClient: true }
 *
 * // Platform defaults - node only generates server
 * determinePlatformExports({
 *   libraryType: 'provider',
 *   platform: 'node',
 * });
 * // => { shouldGenerateServer: true, shouldGenerateClient: false }
 *
 * // Contract libraries never generate platform-specific exports
 * determinePlatformExports({
 *   libraryType: 'contract',
 *   platform: 'universal',
 *   includeClientServer: true
 * });
 * // => { shouldGenerateServer: false, shouldGenerateClient: false }
 * ```
 */
export function resolvePlatformExports(
  options: PlatformExportOptions
): PlatformExports {
  // Library types that don't support platform-specific exports
  const supportsPlatformExports = options.libraryType !== "data-access" &&
    options.libraryType !== "contract"

  if (!supportsPlatformExports) {
    return { shouldGenerateServer: false, shouldGenerateClient: false }
  }

  // Explicit override: includeClientServer === true
  if (options.includeClientServer === true) {
    return { shouldGenerateServer: true, shouldGenerateClient: true }
  }

  // Explicit override: includeClientServer === false
  if (options.includeClientServer === false) {
    return { shouldGenerateServer: false, shouldGenerateClient: false }
  }

  // Platform defaults (includeClientServer is undefined)
  const shouldGenerateServer = options.platform === "node" || options.platform === "universal"
  const shouldGenerateClient = options.platform === "browser" || options.platform === "universal"

  return { shouldGenerateServer, shouldGenerateClient }
}

/**
 * Check if a library type supports platform-specific exports
 *
 * @param libraryType - Library type to check
 * @returns true if library type supports platform-specific exports
 *
 * @example
 * ```typescript
 * supportsPlatformExports('feature');     // => true
 * supportsPlatformExports('provider');    // => true
 * supportsPlatformExports('infra');       // => true
 * supportsPlatformExports('contract');    // => false
 * supportsPlatformExports('data-access'); // => false
 * ```
 */
export function hasPlatformExports(libraryType: LibraryType) {
  return libraryType !== "data-access" && libraryType !== "contract"
}

/**
 * Options for computing platform configuration
 */
export interface PlatformConfigurationInput {
  readonly platform?: PlatformType
  readonly includeClientServer?: boolean
  readonly includeEdge?: boolean
}

/**
 * Complete platform configuration for a generator
 */
export interface PlatformConfiguration {
  readonly platform: PlatformType
  readonly includeClientServer: boolean
  readonly includeEdge: boolean
}

/**
 * Compute complete platform configuration for a generator
 *
 * Consolidates all platform-related logic including:
 * - Platform defaulting
 * - Client/server export determination
 * - Edge export handling
 *
 * This is the primary helper used by generators to avoid duplicating platform logic.
 *
 * @param input - Platform configuration input from schema
 * @param defaults - Default values for this generator
 * @returns Complete platform configuration with all flags computed
 *
 * @example
 * ```typescript
 * // Feature generator with defaults
 * const config = computePlatformConfiguration(
 *   { platform: 'universal', includeRPC: true },
 *   { defaultPlatform: 'universal', libraryType: 'feature' }
 * );
 * // => { platform: 'universal', shouldGenerateServer: true, shouldGenerateClient: true, shouldGenerateEdge: false }
 *
 * // Infra generator with client/server override
 * const config = computePlatformConfiguration(
 *   { includeClientServer: true },
 *   { defaultPlatform: 'node', libraryType: 'infra' }
 * );
 * // => { platform: 'node', shouldGenerateServer: true, shouldGenerateClient: true, shouldGenerateEdge: false }
 *
 * // Provider with edge support
 * const config = computePlatformConfiguration(
 *   { platform: 'edge', includeEdge: true },
 *   { defaultPlatform: 'node', libraryType: 'provider' }
 * );
 * // => { platform: 'edge', shouldGenerateServer: false, shouldGenerateClient: false, shouldGenerateEdge: true }
 * ```
 */
export function computePlatformConfiguration(
  input: PlatformConfigurationInput,
  defaults: {
    readonly defaultPlatform: PlatformType
    readonly libraryType: LibraryType
  }
): PlatformConfiguration {
  // Use provided platform or default
  const platform = input.platform ?? defaults.defaultPlatform

  // Determine if client/server exports should be generated
  // Client and server are always generated together as a package
  const { shouldGenerateClient, shouldGenerateServer } = resolvePlatformExports({
    libraryType: defaults.libraryType,
    platform,
    ...(input.includeClientServer !== undefined && { includeClientServer: input.includeClientServer })
  })

  // Client and server exports are generated together - both must be needed
  const includeClientServer = shouldGenerateClient && shouldGenerateServer

  // Edge is explicitly opt-in
  const includeEdge = input.includeEdge ?? false

  return {
    platform,
    includeClientServer,
    includeEdge
  }
}
