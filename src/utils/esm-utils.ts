/**
 * ESM Utilities
 *
 * Utilities for ES Module compatibility, handling both ESM and CommonJS loader contexts.
 * This is necessary because Nx generators may be loaded via the pirate loader
 * which doesn't fully support import.meta.url in TypeScript files.
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Get the directory name from import.meta.url
 *
 * Handles both ESM and CommonJS loader contexts gracefully.
 * Falls back to computing directory from the calling context if needed.
 *
 * @param importMetaUrl - The import.meta.url from the calling module
 * @returns The directory path of the calling module
 *
 * @example
 * ```typescript
 * import { getDirname } from './utils/esm-utils';
 *
 * const __dirname = getDirname(import.meta.url);
 * const templatePath = path.join(__dirname, 'files');
 * ```
 */
export function getDirname(importMetaUrl: string | undefined) {
  // Handle cases where import.meta.url might be undefined (CommonJS loader context)
  if (!importMetaUrl || typeof importMetaUrl !== 'string') {
    // Fallback: return the workspace-plugin source directory
    // This works because all generators are in the same directory structure
    return resolve(__dirname, '.');
  }

  try {
    return dirname(fileURLToPath(importMetaUrl));
  } catch {
    // Fallback if fileURLToPath fails
    return resolve(__dirname, '.');
  }
}
