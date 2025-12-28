/**
 * Infrastructure Memory Provider Template Definition
 *
 * Declarative template for generating lib/memory-provider.ts in infrastructure libraries.
 * In-memory provider for testing and development.
 *
 * @module monorepo-library-generator/templates/definitions/infra/memory-provider
 */

import type { TemplateDefinition } from '../../core/types'

/**
 * Infrastructure Memory Provider Template Definition
 *
 * Generates a memory-provider.ts file with:
 * - Memory provider Context.Tag
 * - In-memory implementation
 * - Memory provider layer
 */
export const infraMemoryProviderTemplate: TemplateDefinition = {
  id: 'infra/memory-provider',
  meta: {
    title: 'Memory Provider for {className}',
    description: `In-memory provider implementation for testing and development.
Provides a simple data store without external dependencies.

TODO: Customize this file for your service:
1. Implement in-memory data structures for your domain
2. Add helper methods for testing
3. Consider state management (Map, Set, custom class)
4. Add reset() method for test isolation`,
    module: '{scope}/infra-{fileName}/providers'
  },
  imports: [{ from: 'effect', items: ['Context', 'Layer'] }],
  sections: [
    // Memory Provider Tag
    {
      title: 'Memory Provider Tag',
      content: {
        type: 'raw',
        value: `/**
 * Memory Provider Context Tag
 *
 * Effect 3.0+ pattern: Context.Tag with inline interface definition.
 * Use this for dependency injection in tests and development.
 *
 * TODO: Define interface for memory provider
 * This should match the external service interface but use in-memory storage.
 */
export class Memory{className}Provider extends Context.Tag(
  "{scope}/infra-{fileName}/Memory{className}Provider"
)<
  Memory{className}Provider,
  {
    // TODO: Add provider methods
    readonly store: Map<string, unknown>
    readonly reset: () => void
  }
>() {}`
      }
    },
    // Memory Provider Implementation
    {
      title: 'Memory Provider Implementation',
      content: {
        type: 'raw',
        value: `/**
 * Create memory provider
 *
 * TODO: Implement actual memory provider logic
 */
function createMemory{className}Provider() {
  const store = new Map<string, unknown>()

  return {
    store,
    reset: () => {
      store.clear()
    }
  }
}`
      }
    },
    // Memory Provider Layer
    {
      title: 'Memory Provider Layer',
      content: {
        type: 'raw',
        value: `/**
 * Memory Provider Layer
 *
 * Use this layer for testing and development.
 * All data is stored in-memory and lost when the process exits.
 */
export const Memory{className}ProviderLive = Layer.succeed(
  Memory{className}Provider,
  createMemory{className}Provider()
)

// TODO: Add provider factory if needed
// Example:
//
// export function makeMemory{className}Provider(): Layer.Layer<
//   Memory{className}Provider,
//   never,
//   never
// > {
//   return Layer.succeed(Memory{className}Provider, createMemory{className}Provider())
// }`
      }
    }
  ]
}

export default infraMemoryProviderTemplate
