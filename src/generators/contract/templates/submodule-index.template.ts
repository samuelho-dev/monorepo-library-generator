/**
 * Contract Sub-Module Index Template
 *
 * Generates index.ts barrel export for contract sub-module namespaces.
 * Part of the Hybrid DDD pattern for sub-module support.
 *
 * @module monorepo-library-generator/contract/submodule-index-template
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"

export interface SubModuleIndexOptions {
  /** Parent domain name (e.g., 'order') */
  parentName: string
  /** Parent class name (e.g., 'Order') */
  parentClassName: string
  /** Sub-module name (e.g., 'cart') */
  subModuleName: string
  /** Sub-module class name (e.g., 'Cart') */
  subModuleClassName: string
}

/**
 * Generate index.ts barrel export for a contract sub-module
 *
 * Creates exports for sub-module entities, events, and RPC definitions
 */
export function generateSubModuleIndexFile(options: SubModuleIndexOptions) {
  const builder = new TypeScriptBuilder()
  const { parentClassName, parentName, subModuleClassName, subModuleName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${parentClassName} ${subModuleClassName} Sub-Module`,
    description: `Contract definitions for the ${subModuleName} sub-module of the ${parentName} domain.

This sub-module contains:
- Errors: ${subModuleClassName}-specific domain errors (SINGLE SOURCE OF TRUTH)
- Entities: ${subModuleClassName}-specific domain entities
- Events: ${subModuleClassName}-specific domain events
- RPC: ${subModuleClassName}-specific RPC definitions with prefixed operations

CONTRACT-FIRST ARCHITECTURE:
Errors defined here are the SINGLE SOURCE OF TRUTH.
Data-access and feature layers should import these errors.

Usage:
\`\`\`typescript
import {
  ${subModuleClassName}NotFoundError,
  ${subModuleClassName}Item,
  ${subModuleClassName}AddItem
} from "${scope}/contract-${parentName}/${subModuleName}";
\`\`\``,
    module: `${scope}/contract-${parentName}/${subModuleName}`
  })
  builder.addBlankLine()

  builder.addSectionComment("Error Exports (Contract-First)")
  builder.addComment("Errors are the SINGLE SOURCE OF TRUTH - data-access and feature layers import these")
  builder.addRaw(`export * from "./errors";`)
  builder.addBlankLine()

  builder.addSectionComment("Entity Exports")
  builder.addRaw(`export * from "./entities";`)
  builder.addBlankLine()

  builder.addSectionComment("Event Exports")
  builder.addRaw(`export * from "./events";`)
  builder.addBlankLine()

  builder.addSectionComment("RPC Exports")
  builder.addRaw(`export * from "./rpc-definitions";`)
  builder.addRaw(`export * from "./rpc-errors";`)
  builder.addBlankLine()

  return builder.toString()
}
