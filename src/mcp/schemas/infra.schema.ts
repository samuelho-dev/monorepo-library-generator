/**
 * Infrastructure Generator MCP Schema
 *
 * Effect Schema definition for infra generator tool.
 */

import { JSONSchema, Schema } from 'effect';

/**
 * Platform Target
 */
export const PlatformSchema = Schema.Literal('node', 'browser', 'universal', 'edge').pipe(
  Schema.annotations({
    title: 'Platform',
    description: 'Target platform for infrastructure service',
  }),
);

/**
 * Infrastructure Generator Arguments Schema
 */
export class InfraArgsSchema extends Schema.Class<InfraArgsSchema>('InfraArgs')({
  name: Schema.String.pipe(
    Schema.pattern(/^[a-z][a-z0-9-]*[a-z0-9]$/),
    Schema.annotations({
      title: 'Library Name',
      description: "Infrastructure concern (e.g., 'cache', 'storage', 'queue', 'logging')",
      examples: ['cache', 'storage', 'queue', 'logging'],
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

  platform: Schema.optionalWith(PlatformSchema, { default: () => 'node' }),

  includeClientServer: Schema.optionalWith(
    Schema.Boolean.annotations({
      title: 'Include Client & Server',
      description: 'Generate both client and server exports',
    }),
    { default: () => false },
  ),

  includeEdge: Schema.optionalWith(
    Schema.Boolean.annotations({
      title: 'Include Edge',
      description: 'Include edge runtime support',
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
      description: 'Custom parent directory (default: libs/infra)',
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

export const InfraArgsJsonSchema = JSONSchema.make(InfraArgsSchema);

export const InfraToolDefinition = {
  name: 'generate_infra',
  description:
    'Generate infrastructure service with Context.Tag interface, multiple provider implementations (Memory, Redis, etc.), Effect Config for type-safe configuration, and platform-specific layers.',
  inputSchema: InfraArgsJsonSchema,
};

export const decodeInfraArgs = Schema.decodeUnknown(InfraArgsSchema);
