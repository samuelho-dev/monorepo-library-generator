/**
 * Infrastructure Client Layers Template
 *
 * Generates client-side layer compositions (browser-safe).
 *
 * @module monorepo-library-generator/infra-templates
 */

import { TypeScriptBuilder } from '../../../utils/code-generation/typescript-builder';
import type { InfraTemplateOptions } from '../../../utils/shared/types';

/**
 * Generate client layers file for infrastructure service
 */
export function generateClientLayersFile(
  options: InfraTemplateOptions,
): string {
  const builder = new TypeScriptBuilder();
  const { className, fileName, includeClientServer } = options;

  // Only generate if client/server mode is enabled
  if (!includeClientServer) {
    return '';
  }

  // File header
  builder.addFileHeader({
    title: `${className} Client Layers`,
    description: `Layer compositions for client-side dependency injection using Effect.\nBrowser-safe implementations without Node.js APIs or server secrets.\n\nTODO: Customize this file for your service:\n1. Implement client-side service logic\n2. Use browser-safe APIs only (no Node.js modules)\n3. Handle browser storage (localStorage, IndexedDB)\n4. Implement offline support if needed\n5. Add client-specific configuration`,
    module: `@custom-repo/infra-${fileName}/client`,
    see: [
      'https://effect.website/docs/guides/context-management for layer patterns',
    ],
  });

  // Imports
  builder.addImports([
    { from: 'effect', imports: ['Layer', 'Effect'] },
    { from: '../service/interface', imports: [`${className}Service`] },
  ]);

  // Section: Client Layer
  builder.addSectionComment('Client Layer (Browser-Safe)');

  builder.addRaw(`/**
 * Client Layer
 *
 * Browser-safe implementation of ${className}Service.
 * Uses only browser APIs and client-side data sources.
 *
 * TODO: Implement browser-specific service logic
 */
export const ${className}ServiceClientLayers = Layer.effect(
  ${className}Service,
  Effect.gen(function* () {
    // TODO: Inject browser-specific dependencies
    // Example: localStorage, IndexedDB, etc.

    return {
      get: (id: string) => {
        // TODO: Implement browser-safe get operation
        return Effect.succeed(undefined as any);
      },
      // TODO: Implement client methods
    };
  })
);`);
  builder.addBlankLine();

  // Section: Browser Storage Provider
  builder.addSectionComment('Browser Storage Provider (Optional)');

  builder.addRaw(`/**
 * Browser Storage Provider
 *
 * Optional helper for browser storage integration.
 * Use localStorage or IndexedDB as needed.
 *
 * TODO: Implement if using browser storage
 */
export interface BrowserStorageProvider {
  /**
   * Get item from storage
   */
  readonly getItem: (key: string) => unknown | null;

  /**
   * Set item in storage
   */
  readonly setItem: (key: string, value: unknown) => void;

  /**
   * Remove item from storage
   */
  readonly removeItem: (key: string) => void;

  /**
   * Clear all storage
   */
  readonly clear: () => void;
}`);
  builder.addBlankLine();

  builder.addRaw(`/**
 * LocalStorage Provider
 *
 * Browser localStorage implementation
 */
export const localStorageProvider: BrowserStorageProvider = {
  getItem: (key: string) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage quota exceeded or other error
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  },
  clear: () => {
    try {
      localStorage.clear();
    } catch {
      // Ignore errors
    }
  },
};`);
  builder.addBlankLine();

  builder.addRaw(`// TODO: Add IndexedDB provider if needed for larger storage
// TODO: Add session storage provider if needed for session-scoped data`);

  return builder.toString();
}
