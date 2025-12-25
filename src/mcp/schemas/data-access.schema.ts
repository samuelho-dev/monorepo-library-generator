/**
 * Data Access Generator MCP Schema
 *
 * Effect Schema definition for data-access generator tool.
 */

import { JSONSchema, Schema } from "effect"

/**
 * Data Access Generator Arguments Schema
 */
export class DataAccessArgsSchema extends Schema.Class<DataAccessArgsSchema>("DataAccessArgs")({
  name: Schema.String.pipe(
    Schema.pattern(/^[a-z][a-z0-9-]*[a-z0-9]$/),
    Schema.annotations({
      title: "Library Name",
      description: "Domain name matching the contract library (e.g., 'product', 'user')",
      examples: ["product", "user", "order"]
    })
  ),

  workspaceRoot: Schema.String.pipe(
    Schema.minLength(1),
    Schema.annotations({
      title: "Workspace Root",
      description: "Absolute path to monorepo root"
    })
  ),

  description: Schema.optionalWith(
    Schema.String.annotations({
      title: "Description",
      description: "Human-readable description"
    }),
    { as: "Option" }
  ),

  contractDomain: Schema.optionalWith(
    Schema.String.annotations({
      title: "Contract Domain",
      description: "Name of the contract library this implements (defaults to same as name)"
    }),
    { as: "Option" }
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
      description: "Custom parent directory (default: libs/data-access)"
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

export const DataAccessArgsJsonSchema = JSONSchema.make(DataAccessArgsSchema)

export const DataAccessToolDefinition = {
  name: "generate_data_access",
  description:
    "Generate repository implementation with Kysely query builders, data transformations, Layer compositions, and comprehensive tests. Implements contract repository interfaces.",
  inputSchema: DataAccessArgsJsonSchema
}

export const decodeDataAccessArgs = Schema.decodeUnknown(DataAccessArgsSchema)
