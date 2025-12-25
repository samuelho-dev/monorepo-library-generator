/**
 * Infrastructure Client Layers Template
 *
 * Generates client-side layer compositions (browser-safe).
 *
 * @module monorepo-library-generator/infra-templates
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import type { InfraTemplateOptions } from "../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"

/**
 * Generate client layers file for infrastructure service
 */
export function generateClientLayersFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, includeClientServer } = options
  const scope = WORKSPACE_CONFIG.getScope()

  // Only generate if client/server mode is enabled
  if (!includeClientServer) {
    return ""
  }

  // File header
  builder.addFileHeader({
    title: `${className} Client Layers`,
    description:
      `Layer compositions for client-side dependency injection using Effect.\nBrowser-safe implementations without Node.js APIs or server secrets.\n\nTODO: Customize this file for your service:\n1. Implement client-side service logic\n2. Use browser-safe APIs only (no Node.js modules)\n3. Handle browser storage (localStorage, IndexedDB)\n4. Implement offline support if needed\n5. Add client-specific configuration`,
    module: `${scope}/infra-${fileName}/client`,
    see: ["https://effect.website/docs/guides/context-management for layer patterns"]
  })

  // Imports
  builder.addImports([
    { from: "effect", imports: ["Layer", "Effect", "Option"] },
    { from: "../service/service", imports: [`${className}Service`] }
  ])

  // Section: Client Layer
  builder.addSectionComment("Client Layer (Browser-Safe)")

  builder.addRaw(`// ${className}Service static members for client platform
// These extend the service tag with platform-specific layers

/**
 * Client Live Layer (Effect 3.0+ Pattern)
 *
 * Browser-safe implementation of ${className}Service.
 * Uses only browser APIs and client-side data sources.
 *
 * BASELINE: Uses in-memory Map for client-side storage.
 * Replace with localStorage/IndexedDB for persistence.
 *
 * Defined as static member: ${className}Service.ClientLive
 */
${className}Service.ClientLive = Layer.sync(
  ${className}Service,
  () => {
    // In-memory store for baseline client implementation
    const store = new Map<string, { id: string; [key: string]: unknown }>()
    let idCounter = 0

    return {
      get: (id: string) =>
        Effect.sync(() => {
          const item = store.get(id)
          return item ? Option.some(item) : Option.none()
        }),

      findByCriteria: (criteria: Record<string, unknown>, skip = 0, limit = 10) =>
        Effect.sync(() => {
          const items = Array.from(store.values())
            .filter((item) =>
              Object.entries(criteria).every(
                ([key, value]) => item[key] === value
              )
            )
            .slice(skip, skip + limit)
          return items
        }),

      create: (input: Record<string, unknown>) =>
        Effect.sync(() => {
          const id = \`client-\${++idCounter}\`
          const item = { id, ...input, createdAt: new Date() }
          store.set(id, item)
          return item
        }),

      update: (id: string, input: Record<string, unknown>) =>
        Effect.sync(() => {
          const existing = store.get(id)
          const updated = { ...existing, ...input, id, updatedAt: new Date() }
          store.set(id, updated)
          return updated
        }),

      delete: (id: string) =>
        Effect.sync(() => {
          store.delete(id)
        }),

      healthCheck: () => Effect.succeed(true)
    }
  }
)`)
  builder.addBlankLine()

  // Section: Browser Storage Provider
  builder.addSectionComment("Browser Storage Provider (Optional)")

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
  readonly getItem: (key: string) => unknown | null

  /**
   * Set item in storage
   */
  readonly setItem: (key: string, value: unknown) => void

  /**
   * Remove item from storage
   */
  readonly removeItem: (key: string) => void

  /**
   * Clear all storage
   */
  readonly clear: () => void
}`)
  builder.addBlankLine()

  builder.addRaw(`/**
 * LocalStorage Provider
 *
 * Browser localStorage implementation
 */
export const localStorageProvider: BrowserStorageProvider = {
  getItem: (key: string) => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch {
      return null
    }
  },
  setItem: (key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage quota exceeded or other error
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key)
    } catch {
      // Ignore errors
    }
  },
  clear: () => {
    try {
      localStorage.clear()
    } catch {
      // Ignore errors
    }
  }
}`)
  builder.addBlankLine()

  builder.addRaw(`// TODO: Add IndexedDB provider if needed for larger storage
// TODO: Add session storage provider if needed for session-scoped data`)

  return builder.toString()
}
