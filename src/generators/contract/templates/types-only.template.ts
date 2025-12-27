/**
 * Types-Only Template
 *
 * Generates a types.ts file with type-only exports for zero runtime overhead.
 * These imports are completely erased at compile time.
 */

import { TypeScriptBuilder } from '../../../utils/code-builder'
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config'

export interface TypesOnlyOptions {
  readonly entities: readonly string[]
  readonly includeCQRS?: boolean
  readonly typesDatabasePackage?: string
}

/**
 * Generate types.ts file with type-only exports
 *
 * Creates a file that exports only TypeScript types (no runtime code).
 * This enables zero-bundle-impact imports for type checking.
 */
export function generateTypesOnlyFile(options: TypesOnlyOptions) {
  const { entities, includeCQRS, typesDatabasePackage } = options
  const scope = WORKSPACE_CONFIG.getScope()

  const builder = new TypeScriptBuilder()

  // File header
  builder.addFileHeader({
    title: 'Type-Only Exports',
    description: `This file provides type-only exports for zero runtime overhead.
 * Use these imports when you only need types for TypeScript checking:
 *
 * @example
 * import type { Product } from '${scope}/contract-product/types';
 *
 * These imports are completely erased at compile time and add
 * zero bytes to your JavaScript bundle.`
  })

  builder.addBlankLine()

  // Entity Types Section
  builder.addSectionComment('Entity Types')
  builder.addBlankLine()

  // Entity types come from external package (prisma-effect-kysely) or local types file
  const entityTypeSource = typesDatabasePackage || './lib/types/database'
  const entitySourceComment = typesDatabasePackage
    ? `Entity types from ${typesDatabasePackage} (prisma-effect-kysely generated)`
    : 'Entity types from database schema'

  builder.addComment(entitySourceComment)

  // Export Prisma-generated types: Insert, Select, Update variants (alphabetical)
  const insertTypes = entities.map((e) => `${e}Insert`).join(', ')
  const selectTypes = entities.map((e) => `${e}Select`).join(', ')
  const updateTypes = entities.map((e) => `${e}Update`).join(', ')

  builder.addRaw(`export type { ${insertTypes}, ${selectTypes}, ${updateTypes} } from "${entityTypeSource}"`)
  builder.addBlankLine()

  builder.addComment('ID types are defined in rpc-definitions.ts (branded Schema types)')
  builder.addComment('They are re-exported via ./lib/rpc below')

  builder.addBlankLine()

  // Error Types Section
  builder.addSectionComment('Error Types')
  builder.addBlankLine()
  builder.addRaw('export type * from "./lib/errors"')

  builder.addBlankLine()

  // Port Types Section
  builder.addSectionComment('Port Types')
  builder.addBlankLine()
  builder.addRaw('export type * from "./lib/ports"')

  builder.addBlankLine()

  // Event Types Section
  builder.addSectionComment('Event Types')
  builder.addBlankLine()
  builder.addRaw('export type * from "./lib/events"')

  builder.addBlankLine()

  // RPC Types Section
  builder.addSectionComment('RPC Types')
  builder.addBlankLine()
  builder.addRaw('export type * from "./lib/rpc-errors"')
  builder.addRaw('export type * from "./lib/rpc-definitions"')
  builder.addRaw('export type * from "./lib/rpc-group"')

  // CQRS Types Section (optional)
  if (includeCQRS) {
    builder.addBlankLine()
    builder.addSectionComment('CQRS Types')
    builder.addBlankLine()
    builder.addRaw('export type * from "./lib/commands"')
    builder.addRaw('export type * from "./lib/queries"')
    builder.addRaw('export type * from "./lib/projections"')
  }

  builder.addBlankLine()

  return builder.toString()
}
