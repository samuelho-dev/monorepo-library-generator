/**
 * Infrastructure Memory Provider Template
 *
 * Generates in-memory provider for testing and development.
 *
 * @module monorepo-library-generator/infra-templates
 */

import { TypeScriptBuilder } from '../../../utils/code-builder'
import type { InfraTemplateOptions } from '../../../utils/types'
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config'

/**
 * Generate memory provider file for infrastructure service
 */
export function generateMemoryProviderFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  // File header
  builder.addFileHeader({
    title: `Memory Provider for ${className}`,
    description: `In-memory provider implementation for testing and development.\nProvides a simple data store without external dependencies.\n\nTODO: Customize this file for your service:\n1. Implement in-memory data structures for your domain\n2. Add helper methods for testing\n3. Consider state management (Map, Set, custom class)\n4. Add reset() method for test isolation`,
    module: `${scope}/infra-${fileName}/providers`
  })

  // Imports
  builder.addImports([{ from: 'effect', imports: ['Context', 'Layer'] }])

  // Section: Memory Provider Tag
  builder.addSectionComment('Memory Provider Tag')

  builder.addRaw(`/**
 * Memory Provider Context Tag
 *
 * Effect 3.0+ pattern: Context.Tag with inline interface definition.
 * Use this for dependency injection in tests and development.
 *
 * TODO: Define interface for memory provider
 * This should match the external service interface but use in-memory storage.
 */
export class Memory${className}Provider extends Context.Tag(
  "${scope}/infra-${fileName}/Memory${className}Provider"
)<
  Memory${className}Provider,
  {
    // TODO: Add provider methods
    readonly store: Map<string, unknown>
    readonly reset: () => void
  }
>() {}`)
  builder.addBlankLine()

  // Section: Memory Provider Implementation
  builder.addSectionComment('Memory Provider Implementation')

  builder.addFunction({
    name: `createMemory${className}Provider`,
    params: [],
    body: `const store = new Map<string, unknown>()

return {
  store,
  reset: () => {
    store.clear()
  }
}`,
    exported: false,
    jsdoc: `Create memory provider\n\nTODO: Implement actual memory provider logic`
  })

  // Section: Memory Provider Layer
  builder.addSectionComment('Memory Provider Layer')

  builder.addConst(
    `Memory${className}ProviderLive`,
    `Layer.succeed(
  Memory${className}Provider,
  createMemory${className}Provider()
)`,
    undefined,
    true,
    `Memory Provider Layer\n\nUse this layer for testing and development.\nAll data is stored in-memory and lost when the process exits.`
  )

  // TODO comment
  builder.addRaw(`// TODO: Add provider factory if needed
// Example:
//
// export function makeMemory${className}Provider(): Layer.Layer<
//   Memory${className}Provider,
//   never,
//   never
// > {
//   return Layer.succeed(Memory${className}Provider, createMemory${className}Provider())
// }`)

  return builder.toString()
}
