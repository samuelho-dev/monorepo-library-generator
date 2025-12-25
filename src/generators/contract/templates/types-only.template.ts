/**
 * Types-Only Template
 *
 * Generates a types.ts file with type-only exports for zero runtime overhead.
 * These imports are completely erased at compile time.
 */

import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"

export interface TypesOnlyOptions {
  readonly entities: ReadonlyArray<string>
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

  // Entity types come from external package (prisma-effect-kysely) or local types file
  // Prisma generates: ${Entity}Select, ${Entity}Insert, ${Entity}Update
  // ${Entity}Id is defined in rpc-definitions.ts and exported via ./lib/rpc
  const entityTypeSource = typesDatabasePackage || "./lib/types/database"
  const entitySourceComment = typesDatabasePackage
    ? `Entity types from ${typesDatabasePackage} (prisma-effect-kysely generated)`
    : "Entity types from database schema"

  // Export Prisma-generated types: Insert, Select, Update variants (alphabetical)
  const insertTypes = entities.map((e) => `${e}Insert`).join(", ")
  const selectTypes = entities.map((e) => `${e}Select`).join(", ")
  const updateTypes = entities.map((e) => `${e}Update`).join(", ")

  const entityExports = `// ${entitySourceComment}
export type { ${insertTypes}, ${selectTypes}, ${updateTypes} } from "${entityTypeSource}"

// ID types are defined in rpc-definitions.ts (branded Schema types)
// They are re-exported via ./lib/rpc below`

  return `/**
 * Type-Only Exports
 *
 * This file provides type-only exports for zero runtime overhead.
 * Use these imports when you only need types for TypeScript checking:
 *
 * @example
 * import type { Product } from '${scope}/contract-product/types';
 *
 * These imports are completely erased at compile time and add
 * zero bytes to your JavaScript bundle.
 */

// ============================================================================
// Entity Types
// ============================================================================

${entityExports}

// ============================================================================
// Error Types
// ============================================================================

export type * from "./lib/errors"

// ============================================================================
// Port Types
// ============================================================================

export type * from "./lib/ports"

// ============================================================================
// Event Types
// ============================================================================

export type * from "./lib/events"

// ============================================================================
// RPC Types
// ============================================================================

export type * from "./lib/rpc"${
    includeCQRS
      ? `

// ============================================================================
// CQRS Types
// ============================================================================

export type * from "./lib/commands"
export type * from "./lib/queries"
export type * from "./lib/projections"`
      : ""
  }
`
}
