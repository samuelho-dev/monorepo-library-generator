/**
 * Feature Generator MCP Schema
 *
 * Effect Schema definition for feature generator tool.
 */

import { JSONSchema, Schema } from 'effect';

/**
 * Platform Target
 */
export const PlatformSchema = Schema.Literal('node', 'browser', 'universal', 'edge').pipe(
  Schema.annotations({
    title: 'Platform',
    description:
      'Target platform: node (server), browser (client), universal (both), edge (CDN runtime)',
  }),
);

/**
 * Feature Generator Arguments Schema
 */
export class FeatureArgsSchema extends Schema.Class<FeatureArgsSchema>('FeatureArgs')({
  name: Schema.String.pipe(
    Schema.pattern(/^[a-z][a-z0-9-]*[a-z0-9]$/),
    Schema.annotations({
      title: 'Library Name',
      description: "Feature name (e.g., 'user-management', 'auth', 'checkout')",
      examples: ['user-management', 'auth', 'checkout'],
    }),
  ),

  workspaceRoot: Schema.String.pipe(
    Schema.minLength(1),
    Schema.annotations({
      title: 'Workspace Root',
      description: 'Absolute path to monorepo root',
    }),
  ),

  description: Schema.optionalWith(
    Schema.String.annotations({
      title: 'Description',
      description: 'Human-readable description',
    }),
    { as: 'Option' },
  ),

  platform: Schema.optionalWith(PlatformSchema, { default: () => 'universal' }),

  includeClientServer: Schema.optionalWith(
    Schema.Boolean.annotations({
      title: 'Include Client & Server',
      description: 'Generate both client and server exports',
    }),
    { default: () => false },
  ),

  includeRPC: Schema.optionalWith(
    Schema.Boolean.annotations({
      title: 'Include RPC',
      description: 'Include RPC router definitions',
    }),
    { default: () => false },
  ),

  includeCQRS: Schema.optionalWith(
    Schema.Boolean.annotations({
      title: 'Include CQRS',
      description: 'Include CQRS structure (commands, queries, handlers)',
    }),
    { default: () => false },
  ),

  includeEdge: Schema.optionalWith(
    Schema.Boolean.annotations({
      title: 'Include Edge',
      description: 'Include edge runtime support (Vercel, Cloudflare)',
    }),
    { default: () => false },
  ),

  dryRun: Schema.optionalWith(
    Schema.Boolean.annotations({
      title: 'Dry Run',
      description: 'Preview files without writing to disk',
    }),
    { default: () => false },
  ),

  directory: Schema.optionalWith(
    Schema.String.annotations({
      title: 'Directory',
      description: 'Custom parent directory (default: libs/feature)',
    }),
    { as: 'Option' },
  ),

  tags: Schema.optionalWith(
    Schema.String.annotations({
      title: 'Tags',
      description: 'Comma-separated tags',
    }),
    { as: 'Option' },
  ),
}) {}

export const FeatureArgsJsonSchema = JSONSchema.make(FeatureArgsSchema);

export const FeatureToolDefinition = {
  name: 'generate_feature',
  description:
    'Generate business logic service with Context.Tag, platform-aware exports (server/client/edge), React hooks for client, and optional RPC/CQRS patterns. Orchestrates data-access and infrastructure layers.',
  inputSchema: FeatureArgsJsonSchema,
};

export const decodeFeatureArgs = Schema.decodeUnknown(FeatureArgsSchema);
