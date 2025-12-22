/**
 * Workspace Configuration
 *
 * Single source of truth for workspace-level settings like package scope naming.
 * All generators should import from here to ensure consistency.
 *
 * @module monorepo-library-generator/workspace-config
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Detect workspace scope by reading package.json from workspace root.
 * Traverses up from current directory to find workspace root.
 */
function detectScope() {
  const DEFAULT_SCOPE = '@myorg';

  try {
    let currentPath = process.cwd();
    const maxDepth = 10;
    let depth = 0;

    while (depth < maxDepth) {
      const pkgPath = path.join(currentPath, 'package.json');

      if (fs.existsSync(pkgPath)) {
        // Check for workspace indicators
        const nxExists = fs.existsSync(path.join(currentPath, 'nx.json'));
        const pnpmExists = fs.existsSync(path.join(currentPath, 'pnpm-workspace.yaml'));
        const lernaExists = fs.existsSync(path.join(currentPath, 'lerna.json'));
        const turboExists = fs.existsSync(path.join(currentPath, 'turbo.json'));

        const content = fs.readFileSync(pkgPath, 'utf-8');
        const pkg = JSON.parse(content);
        const hasWorkspaces = Boolean(pkg.workspaces);

        if (nxExists || pnpmExists || lernaExists || turboExists || hasWorkspaces) {
          if (pkg.name?.startsWith('@')) {
            return pkg.name.split('/')[0] || DEFAULT_SCOPE;
          }
          return DEFAULT_SCOPE;
        }
      }

      const parent = path.dirname(currentPath);
      if (parent === currentPath) break;
      currentPath = parent;
      depth++;
    }
  } catch {
    // Fall back to default on any error
  }

  return DEFAULT_SCOPE;
}

// Scope is now detected dynamically on each call to support running CLI
// from different workspaces without stale cached values

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
    // Detect scope dynamically on each access to support different workspaces
    return detectScope();
  },

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
    return `${this.scope}/${type}-${name}`;
  },

  /**
   * Get just the scope prefix
   *
   * @returns Scope prefix with @ symbol (e.g., "@custom-repo")
   */
  getScope() {
    return this.scope;
  },
};

/**
 * Type-safe helper to get package name
 * Exports for backward compatibility and convenience
 *
 * Special case: ENV library uses simple name "@custom-repo/env" instead of "@custom-repo/env-env"
 */
export function getPackageName(type: 'env'): string;
export function getPackageName(type: string, name: string): string;
export function getPackageName(type: string, name?: string) {
  // Special case for ENV library - standalone package name
  if (type === 'env' && name === undefined) {
    return `${WORKSPACE_CONFIG.scope}/env`;
  }

  // Standard package naming: @scope/type-name
  if (name === undefined) {
    throw new Error(`getPackageName requires 'name' parameter for type '${type}'`);
  }

  return WORKSPACE_CONFIG.getPackageName(type, name);
}

/**
 * Type-safe helper to get workspace scope
 */
export function getWorkspaceScope() {
  return WORKSPACE_CONFIG.getScope();
}
