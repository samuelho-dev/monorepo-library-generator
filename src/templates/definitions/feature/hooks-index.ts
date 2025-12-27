/**
 * Feature Hooks Index Template Definition
 *
 * Declarative template for generating client/hooks/index.ts in feature libraries.
 * Barrel export for client-side hooks.
 *
 * @module monorepo-library-generator/templates/definitions/feature/hooks-index
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Feature Hooks Index Template Definition
 *
 * Generates a hooks/index.ts barrel export file.
 * Uses named exports to comply with biome noBarrelFile rule.
 */
export const featureHooksIndexTemplate: TemplateDefinition = {
  id: "feature/hooks-index",
  meta: {
    title: "Client Hooks Barrel Export",
    description: "Barrel export for client-side hooks",
    module: "{scope}/feature-{fileName}/client/hooks"
  },
  imports: [],
  sections: [
    {
      content: {
        type: "raw",
        value: `export { use{className}, type Use{className}Return } from "./use-{fileName}"`
      }
    }
  ]
}

export default featureHooksIndexTemplate
