/**
 * Atoms Template
 *
 * Generates client/atoms/{name}-atoms.ts file for feature libraries.
 *
 * @module monorepo-library-generator/feature/atoms-template
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { FeatureTemplateOptions } from "../../../utils/shared/types"

/**
 * Generate client/atoms/{name}-atoms.ts file for feature library
 *
 * Creates Jotai atoms for client-side state management.
 */
export function generateAtomsFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, name, propertyName } = options

  // Add file header
  builder.addFileHeader({
    title: `${className} Client State`,
    description: `Uses @effect-atom/atom for React state management.
Client-side only state - NO server dependencies.`,
    module: `@custom-repo/feature-${name}/client/atoms`
  })

  // Add imports
  builder.addImports([{ from: "@effect-atom/atom", imports: ["Atom"] }])
  builder.addBlankLine()

  // Add state interface
  builder.addInterface({
    exported: true,
    name: `${className}State`,
    properties: [
      { name: "isLoading", type: "boolean" },
      { name: "data", type: "unknown | null" },
      { name: "error", type: "string | null" }
    ]
  })
  builder.addBlankLine()

  // Add main atom
  builder.addRaw(`/**
 * Main state atom for ${name}
 */
export const ${propertyName}Atom = Atom.make<${className}State>({
  isLoading: false,
  data: null,
  error: null,
});`)
  builder.addBlankLine()


  return builder.toString()
}
