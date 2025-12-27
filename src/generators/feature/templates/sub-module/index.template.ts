/**
 * Feature Sub-Module Index Template
 *
 * Generates index.ts barrel export for feature sub-modules.
 * Part of the Contract-First architecture for sub-module support.
 *
 * Sub-modules export:
 * - Service (Context.Tag + implementation)
 * - Layers (Live/Test)
 * - RPC Handlers (implements contract RPCs)
 *
 * NOTE: State management is centralized in parent module atoms.
 *
 * @module monorepo-library-generator/feature/sub-module/index-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

export interface SubModuleIndexOptions {
  /** Parent domain name (e.g., 'order') */
  parentName: string
  /** Parent class name (e.g., 'Order') */
  parentClassName: string
  /** Parent file name (e.g., 'order') */
  parentFileName: string
  /** Sub-module name (e.g., 'cart') */
  subModuleName: string
  /** Sub-module class name (e.g., 'Cart') */
  subModuleClassName: string
}

/**
 * Generate index.ts barrel export for a feature sub-module
 *
 * Exports service, layers, handlers, and types for use by parent
 */
export function generateSubModuleIndexFile(options: SubModuleIndexOptions) {
  const builder = new TypeScriptBuilder()
  const { parentClassName, parentFileName, parentName, subModuleClassName, subModuleName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${parentClassName} ${subModuleClassName} Sub-Module`,
    description: `Barrel export for ${subModuleName} sub-module within the ${parentName} feature.

Exports all public API for the sub-module:
- ${subModuleClassName}Service (Context.Tag)
- ${subModuleClassName}Live / ${subModuleClassName}Test (composed layers)
- ${subModuleClassName}Handlers (RPC handler implementations)
- Error types and interfaces

NOTE: State is managed by parent ${parentClassName} atoms.`,
    module: `${scope}/feature-${parentFileName}/server/services/${subModuleName}`
  })

  builder.addSectionComment("Service Exports")
  builder.addRaw(`export {
  // Context.Tag
  ${subModuleClassName}Service,
  // Live layer implementation
  ${subModuleClassName}ServiceLive,
  // Service interface type
  type ${subModuleClassName}ServiceInterface,
  // Error type
  ${subModuleClassName}ServiceError
} from "./service"`)

  builder.addSectionComment("Composed Layer Exports")
  builder.addRaw(`export {
  // Full production layer
  ${subModuleClassName}Live,
  // Test layer with mocks
  ${subModuleClassName}Test,
  // Dependencies layer for parent composition
  ${subModuleClassName}Dependencies
} from "./layer"`)

  builder.addSectionComment("RPC Handler Exports")
  builder.addRaw(`export { ${subModuleClassName}Handlers } from "./handlers"`)

  return builder.toString()
}
