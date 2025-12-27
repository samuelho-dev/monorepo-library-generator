/**
 * Feature Atoms Index Template Definition
 *
 * Declarative template for generating client/atoms/index.ts in feature libraries.
 * Barrel export for client-side state atoms.
 *
 * @module monorepo-library-generator/templates/definitions/feature/atoms-index
 */

import type { TemplateDefinition } from '../../core/types'

/**
 * Feature Atoms Index Template Definition
 *
 * Generates an atoms/index.ts barrel export file.
 * Uses named exports to comply with biome noBarrelFile rule.
 */
export const featureAtomsIndexTemplate: TemplateDefinition = {
  id: 'feature/atoms-index',
  meta: {
    title: 'Client Atoms Barrel Export',
    description: 'Barrel export for client-side state atoms',
    module: '{scope}/feature-{fileName}/client/atoms'
  },
  imports: [],
  sections: [
    {
      content: {
        type: 'raw',
        value: `export {
  // State Types
  type LoadingState,
  type PaginationState,
  type {className}EntityState,
  type {className}ListState,
  type {className}OperationState,
  type {className}State,
  // Atoms
  {propertyName}Atom,
  {propertyName}EntityFamily,
  get{className}Atom,
  // Derived Atoms
  {propertyName}IsLoadingAtom,
  {propertyName}ErrorAtom,
  {propertyName}DataAtom,
  {propertyName}ListAtom,
  // State Updaters
  update{className}Entity,
  update{className}List,
  update{className}Operation,
  reset{className}State
} from "./{fileName}-atoms"`
      }
    }
  ]
}

export default featureAtomsIndexTemplate
