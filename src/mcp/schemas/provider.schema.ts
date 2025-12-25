/**
 * Provider Generator MCP Schema
 *
 * Effect Schema definition for provider generator tool.
 */

import { JSONSchema, Schema } from "effect"

/**
 * Platform Target
 */
export const PlatformSchema = Schema.Literal("node", "browser", "universal", "edge").pipe(
  Schema.annotations({
    title: "Platform",
    description: "Target platform for provider service"
  })
)

/**
 * Provider Generator Arguments Schema
 */
export class ProviderArgsSchema extends Schema.Class<ProviderArgsSchema>("ProviderArgs")({
  name: Schema.String.pipe(
    Schema.pattern(/^[a-z][a-z0-9-]*[a-z0-9]$/),
    Schema.annotations({
      title: "Library Name",
      description: "Provider name (e.g., 'stripe', 'supabase', 'redis')",
      examples: ["stripe", "supabase", "redis", "sentry"]
    })
  ),

  workspaceRoot: Schema.String.pipe(
    Schema.minLength(1),
    Schema.annotations({
      title: "Workspace Root",
      description: "Absolute path to monorepo root"
    })
  ),

  externalService: Schema.String.pipe(
    Schema.minLength(1),
    Schema.annotations({
      title: "External Service",
      description: "External service name being wrapped (e.g., 'Stripe', 'Supabase', 'Redis')",
      examples: ["Stripe", "Supabase", "Redis"]
    })
  ),

  description: Schema.optionalWith(
    Schema.String.annotations({
      title: "Description",
      description: "Human-readable description"
    }),
    { as: "Option" }
  ),

  platform: Schema.optionalWith(PlatformSchema, { default: () => "node" }),

  includeClientServer: Schema.optionalWith(
    Schema.Boolean.annotations({
      title: "Include Client & Server",
      description: "Generate both client and server exports"
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
      description: "Custom parent directory (default: libs/provider)"
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

export const ProviderArgsJsonSchema = JSONSchema.make(ProviderArgsSchema)

export const ProviderToolDefinition = {
  name: "generate_provider",
  description:
    "Generate Effect-based wrapper for external service SDK with Context.Tag service, safe error mapping from SDK errors to Data.TaggedError, Layer.scoped with Effect.addFinalizer for cleanup, and platform-specific exports.",
  inputSchema: ProviderArgsJsonSchema
}

export const decodeProviderArgs = Schema.decodeUnknown(ProviderArgsSchema)
