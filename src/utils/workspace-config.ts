/**
 * Workspace Configuration
 *
 * Single source of truth for workspace-level settings like package scope naming.
 * All generators should import from here to ensure consistency.
 *
 * @module monorepo-library-generator/workspace-config
 */

/**
 * Workspace-wide configuration constants
 */
export const WORKSPACE_CONFIG = {
  /**
   * Package scope for all generated libraries
   * Used in package.json name field: @{scope}/{type}-{name}
   */
  scope: "@myorg",

  /**
   * Generate standardized package name
   *
   * @param type - Library type (provider, infra, feature, contract, data-access)
   * @param name - Library name (e.g., "kysely", "cache", "user")
   * @returns Fully qualified package name (e.g., "@custom-repo/provider-kysely")
   *
   * @example
   * ```typescript
   * WORKSPACE_CONFIG.getPackageName("provider", "kysely")
   * // => "@custom-repo/provider-kysely"
   *
   * WORKSPACE_CONFIG.getPackageName("infra", "cache")
   * // => "@custom-repo/infra-cache"
   * ```
   */
  getPackageName(type: string, name: string) {
    return `${this.scope}/${type}-${name}`
  },

  /**
   * Get just the scope prefix
   *
   * @returns Scope prefix with @ symbol (e.g., "@custom-repo")
   */
  getScope() {
    return this.scope
  }
}

/**
 * Type-safe helper to get package name
 * Exports for backward compatibility and convenience
 *
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
