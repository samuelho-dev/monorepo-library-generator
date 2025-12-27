/**
 * Contract Types-Only Template Definition
 *
 * Declarative template for generating types.ts with type-only exports
 * for zero runtime overhead.
 *
 * @module monorepo-library-generator/templates/definitions/contract/types-only
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Contract Types-Only Template Definition
 *
 * Generates a types.ts file with type-only exports that:
 * - Have zero runtime overhead (completely erased at compile time)
 * - Re-export entity types from database schema
 * - Re-export error, port, event, and RPC types
 * - Conditionally include CQRS types
 */
export const contractTypesOnlyTemplate: TemplateDefinition = {
  id: "contract/types-only",
  meta: {
    title: "Type-Only Exports",
    description: `This file provides type-only exports for zero runtime overhead.
Use these imports when you only need types for TypeScript checking:

@example
import type { {className} } from '{scope}/contract-{fileName}/types';

These imports are completely erased at compile time and add
zero bytes to your JavaScript bundle.`,
    module: "{scope}/contract-{fileName}/types"
  },
  imports: [],
  sections: [
    // Entity Types
    {
      title: "Entity Types",
      content: {
        type: "raw",
        value: `// Entity types from database schema
export type { {className}Insert, {className}Select, {className}Update } from "{entityTypeSource}"

// ID types are defined in rpc-definitions.ts (branded Schema types)
// They are re-exported via ./lib/rpc below`
      }
    },
    // Error Types
    {
      title: "Error Types",
      content: {
        type: "raw",
        value: `export type * from "./lib/errors"`
      }
    },
    // Port Types
    {
      title: "Port Types",
      content: {
        type: "raw",
        value: `export type * from "./lib/ports"`
      }
    },
    // Event Types
    {
      title: "Event Types",
      content: {
        type: "raw",
        value: `export type * from "./lib/events"`
      }
    },
    // RPC Types
    {
      title: "RPC Types",
      content: {
        type: "raw",
        value: `export type * from "./lib/rpc-errors"
export type * from "./lib/rpc-definitions"
export type * from "./lib/rpc-group"`
      }
    }
  ],
  conditionals: {
    includeCQRS: {
      imports: [],
      sections: [
        {
          title: "CQRS Types",
          content: {
            type: "raw",
            value: `export type * from "./lib/commands"
export type * from "./lib/queries"
export type * from "./lib/projections"`
          }
        }
      ]
    }
  }
}

export default contractTypesOnlyTemplate
