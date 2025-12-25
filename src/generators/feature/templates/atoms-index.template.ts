/**
 * Atoms Index Template
 *
 * Generates client/atoms/index.ts file for feature libraries.
 *
 * @module monorepo-library-generator/feature/atoms-index-template
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import type { FeatureTemplateOptions } from "../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"

/**
 * Generate client/atoms/index.ts file for feature library
 *
 * Creates named exports for client atoms to comply with biome rules.
 */
export function generateAtomsIndexFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  // Add file header
  builder.addFileHeader({
    title: "Client Atoms Barrel Export",
    description: "Barrel export for client-side state atoms",
    module: `${scope}/feature-${fileName}/client/atoms`
  })

  // Add named exports
  builder.addRaw(`export {
  // State Types
  type LoadingState,
  type PaginationState,
  type ${className}EntityState,
  type ${className}ListState,
  type ${className}OperationState,
  type ${className}State,
  // Atoms
  ${fileName}Atom,
  ${fileName}EntityFamily,
  get${className}Atom,
  // Derived Atoms
  ${fileName}IsLoadingAtom,
  ${fileName}ErrorAtom,
  ${fileName}DataAtom,
  ${fileName}ListAtom,
  // State Updaters
  update${className}Entity,
  update${className}List,
  update${className}Operation,
  reset${className}State
} from "./${fileName}-atoms"`)
  builder.addBlankLine()

  return builder.toString()
}
