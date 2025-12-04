/**
 * Types-Only Template
 *
 * Generates a types.ts file with type-only exports for zero runtime overhead.
 * These imports are completely erased at compile time.
 */

export interface TypesOnlyOptions {
  readonly entities: ReadonlyArray<string>
  readonly includeCQRS?: boolean
  readonly includeRPC?: boolean
}

/**
 * Generate types.ts file with type-only exports
 *
 * Creates a file that exports only TypeScript types (no runtime code).
 * This enables zero-bundle-impact imports for type checking.
 */
export function generateTypesOnlyFile(options: TypesOnlyOptions) {
  const { entities, includeCQRS, includeRPC } = options

  const entityExports = entities
    .map((entityName) => {
      const fileName = entityNameToFileName(entityName)
      return `// ${entityName} entity types
export type { ${entityName}, ${entityName}Insert, ${entityName}Update } from "./lib/entities/${fileName}";`
    })
    .join("\n")

  return `/**
 * Type-Only Exports
 *
 * This file provides type-only exports for zero runtime overhead.
 * Use these imports when you only need types for TypeScript checking:
 *
 * @example
 * import type { Product } from '@custom-repo/contract-product/types';
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

export type * from "./lib/errors";

// ============================================================================
// Port Types
// ============================================================================

export type * from "./lib/ports";

// ============================================================================
// Event Types
// ============================================================================

export type * from "./lib/events";
${
    includeCQRS
      ? `
// ============================================================================
// CQRS Types
// ============================================================================

export type * from "./lib/commands";
export type * from "./lib/queries";
export type * from "./lib/projections";
`
      : ""
  }${
    includeRPC
      ? `
// ============================================================================
// RPC Types
// ============================================================================

export type * from "./lib/rpc";
`
      : ""
  }
`
}

/**
 * Convert entity name to file name
 */
function entityNameToFileName(entityName: string) {
  return entityName
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
}
