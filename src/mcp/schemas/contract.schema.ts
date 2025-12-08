/**
 * Contract Generator MCP Schema
 *
 * Effect Schema definition for contract generator tool.
 * Converts to JSON Schema for MCP tool definition.
 */

import { JSONSchema, Schema } from "effect"

/**
 * Contract Generator Arguments Schema
 */
export class ContractArgsSchema extends Schema.Class<ContractArgsSchema>("ContractArgs")({
  // Required fields
  name: Schema.String.pipe(
    Schema.pattern(/^[a-z][a-z0-9-]*[a-z0-9]$/),
    Schema.annotations({
      title: "Library Name",
      description:
        "Domain name (e.g., 'product', 'user', 'product-review'). Must be lowercase alphanumeric with hyphens.",
      examples: ["product", "user", "order-item"]
    })
  ),

  workspaceRoot: Schema.String.pipe(
    Schema.minLength(1),
    Schema.annotations({
      title: "Workspace Root",
      description: "Absolute path to monorepo root. Workspace context will be auto-detected.",
      examples: ["/Users/name/projects/my-monorepo"]
    })
  ),

  // Optional fields with defaults
  description: Schema.optionalWith(
    Schema.String.annotations({
      title: "Description",
      description: "Human-readable description of the domain"
    }),
    { as: "Option" }
  ),

  entities: Schema.optionalWith(
    Schema.Array(Schema.String).pipe(
      Schema.minItems(1),
      Schema.annotations({
        title: "Entity Names",
        description: "Entity names for bundle optimization (e.g., ['Product', 'Category', 'Review'])",
        examples: [["Product", "ProductCategory", "ProductReview"]]
      })
    ),
    { as: "Option" }
  ),

  includeCQRS: Schema.optionalWith(
    Schema.Boolean.annotations({
      title: "Include CQRS",
      description: "Include CQRS pattern files (commands, queries, projections)"
    }),
    { default: () => false }
  ),

  includeRPC: Schema.optionalWith(
    Schema.Boolean.annotations({
      title: "Include RPC",
      description: "Include RPC schemas for network boundaries"
    }),
    { default: () => false }
  ),

  dryRun: Schema.optionalWith(
    Schema.Boolean.annotations({
      title: "Dry Run",
      description: "Preview files without writing to disk"
    }),
    { default: () => false }
  ),

  directory: Schema.optionalWith(
    Schema.String.annotations({
      title: "Directory",
      description: "Custom parent directory (default: libs/contract)"
    }),
    { as: "Option" }
  ),

  tags: Schema.optionalWith(
    Schema.String.annotations({
      title: "Tags",
      description: "Comma-separated tags"
    }),
    { as: "Option" }
  )
}) {}

/**
 * Generate JSON Schema for MCP tool definition
 */
export const ContractArgsJsonSchema = JSONSchema.make(ContractArgsSchema)

/**
 * MCP Tool Definition
 */
export const ContractToolDefinition = {
  name: "generate_contract",
  description:
    "Generate Effect-based contract library with domain entities, repository interfaces, and error types following dependency inversion principles. Includes Schema.Class entities, Data.TaggedError types, and Context.Tag repository interfaces.",
  inputSchema: ContractArgsJsonSchema
}

/**
 * Decode and validate unknown input
 */
export const decodeContractArgs = Schema.decodeUnknown(ContractArgsSchema)
