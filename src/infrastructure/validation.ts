/**
 * Validation Registry
 *
 * Centralized Effect Schema validation for all generator inputs
 * Used by MCP, CLI, and Nx to validate inputs consistently
 *
 * @module monorepo-library-generator/infrastructure/validation
 */

import { Schema } from 'effect'

// ============================================================================
// Base Schema
// ============================================================================

/**
 * Base schema fields common to all generators
 */
const BaseGeneratorFields = {
  name: Schema.String.pipe(
    Schema.pattern(/^[a-z][a-z0-9-]*[a-z0-9]$/),
    Schema.annotations({
      title: 'Library Name',
      description:
        "Domain name (e.g., 'product', 'user', 'product-review'). Must be lowercase alphanumeric with hyphens.",
      examples: ['product', 'user', 'order-item']
    })
  ),

  workspaceRoot: Schema.optional(
    Schema.String.pipe(
      Schema.minLength(1),
      Schema.annotations({
        title: 'Workspace Root',
        description: 'Absolute path to monorepo root. Defaults to process.cwd()'
      })
    )
  ),

  description: Schema.optional(
    Schema.String.annotations({
      title: 'Description',
      description: 'Human-readable description of the library'
    })
  ),

  directory: Schema.optional(
    Schema.String.annotations({
      title: 'Directory',
      description: 'Custom parent directory (default varies by library type)'
    })
  ),

  tags: Schema.optional(
    Schema.String.annotations({
      title: 'Tags',
      description: 'Comma-separated tags for library categorization'
    })
  ),

  dryRun: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Dry Run',
      description: 'Preview files without writing to disk'
    })
  )
}

// ============================================================================
// Generator Input Schemas
// ============================================================================

/**
 * Contract Generator Input Schema
 */
export class ContractInputSchema extends Schema.Class<ContractInputSchema>('ContractInput')({
  ...BaseGeneratorFields,

  entities: Schema.optional(
    Schema.Array(Schema.String).pipe(
      Schema.minItems(1),
      Schema.annotations({
        title: 'Entity Names',
        description: 'Entity names for bundle optimization',
        examples: [['Product', 'Category', 'Review']]
      })
    )
  ),

  includeCQRS: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Include CQRS',
      description: 'Include CQRS pattern files (commands, queries, projections)'
    })
  ),

  includeSubModules: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Include Sub-Modules',
      description: 'Generate namespaced sub-module exports (e.g., cart, checkout)'
    })
  ),

  subModules: Schema.optional(
    Schema.String.annotations({
      title: 'Sub-Modules',
      description: 'Comma-separated list of sub-module names to generate',
      examples: ['cart,checkout,management']
    })
  ),

  typesDatabasePackage: Schema.optional(
    Schema.String.annotations({
      title: 'Types Database Package',
      description:
        'Package containing database entity types from prisma-effect-kysely. When specified, imports entity types from this package instead of generating them.',
      examples: ['@myorg/types-database']
    })
  )
}) {}

/**
 * Data Access Generator Input Schema
 */
export class DataAccessInputSchema extends Schema.Class<DataAccessInputSchema>('DataAccessInput')({
  ...BaseGeneratorFields,

  contractLibrary: Schema.optional(
    Schema.String.annotations({
      title: 'Contract Library',
      description: 'Name of contract library this data-access implements'
    })
  ),

  includeCache: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Include Cache',
      description: 'Include caching layer'
    })
  ),

  includeSubModules: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Include Sub-Modules',
      description: 'Generate sub-module repositories with aggregate root pattern'
    })
  ),

  subModules: Schema.optional(
    Schema.String.annotations({
      title: 'Sub-Modules',
      description: 'Comma-separated list of sub-module names to generate',
      examples: ['cart,checkout,management']
    })
  )
}) {}

/**
 * Feature Generator Input Schema
 */
export class FeatureInputSchema extends Schema.Class<FeatureInputSchema>('FeatureInput')({
  ...BaseGeneratorFields,

  dataAccessLibrary: Schema.optional(
    Schema.String.annotations({
      title: 'Data Access Library',
      description: 'Name of data-access library this feature uses'
    })
  ),

  includeClientState: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Include Client State',
      description: 'Include client-side state management (@effect-atom)'
    })
  ),

  scope: Schema.optional(
    Schema.String.annotations({
      title: 'Scope',
      description: 'Custom scope for the feature library'
    })
  ),

  platform: Schema.optional(
    Schema.Literal('node', 'browser', 'universal', 'edge').annotations({
      title: 'Platform',
      description: 'Target platform for the feature'
    })
  ),

  includeClientServer: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Include Client/Server',
      description: 'Generate client-side hooks and state management'
    })
  ),

  includeCQRS: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Include CQRS',
      description: 'Generate CQRS structure with placeholders'
    })
  ),

  includeSubModules: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Include Sub-Modules',
      description: 'Generate modular sub-modules within the feature'
    })
  ),

  subModules: Schema.optional(
    Schema.String.annotations({
      title: 'Sub-Modules',
      description: 'Comma-separated list of sub-module names to generate',
      examples: ['cart,checkout,management']
    })
  )
}) {}

/**
 * Provider Generator Input Schema
 */
export class ProviderInputSchema extends Schema.Class<ProviderInputSchema>('ProviderInput')({
  ...BaseGeneratorFields,

  externalService: Schema.String.annotations({
    title: 'External Service',
    description: "Name of external service being integrated (e.g., 'stripe', 'auth0')"
  }),

  platform: Schema.optional(
    Schema.Literal('node', 'browser', 'universal', 'edge').annotations({
      title: 'Platform',
      description: 'Target platform for the provider'
    })
  ),

  operations: Schema.optional(
    Schema.Array(Schema.Literal('create', 'read', 'update', 'delete', 'query')).pipe(
      Schema.minItems(1),
      Schema.annotations({
        title: 'Operations',
        description: 'Operations to generate (create, read, update, delete, query)'
      })
    )
  )
}) {}

/**
 * Infra Generator Input Schema
 */
export class InfraInputSchema extends Schema.Class<InfraInputSchema>('InfraInput')({
  ...BaseGeneratorFields,

  infraType: Schema.optional(
    Schema.Literal('database', 'cache', 'queue', 'logging', 'metrics', 'pubsub').annotations({
      title: 'Infrastructure Type',
      description: 'Type of infrastructure library to generate'
    })
  ),

  platform: Schema.optional(
    Schema.Literal('node', 'browser', 'universal', 'edge').annotations({
      title: 'Platform',
      description: 'Target platform for the infrastructure'
    })
  ),

  includeClient: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Include Client',
      description: 'Generate client interface and implementation'
    })
  ),

  includeServer: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Include Server',
      description: 'Generate server implementation (Node.js specific)'
    })
  ),

  includeClientServer: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Include Client/Server',
      description: 'Generate both client and server implementations'
    })
  )
}) {}

// ============================================================================
// Decoders
// ============================================================================

/**
 * Decode functions for each schema
 */
export const decodeContractInput = Schema.decodeUnknown(ContractInputSchema)
export const decodeDataAccessInput = Schema.decodeUnknown(DataAccessInputSchema)
export const decodeFeatureInput = Schema.decodeUnknown(FeatureInputSchema)
export const decodeProviderInput = Schema.decodeUnknown(ProviderInputSchema)
export const decodeInfraInput = Schema.decodeUnknown(InfraInputSchema)

// ============================================================================
// Type Exports
// ============================================================================

/**
 * Type exports for TypeScript
 */
export type ContractInput = Schema.Schema.Type<typeof ContractInputSchema>
export type DataAccessInput = Schema.Schema.Type<typeof DataAccessInputSchema>
export type FeatureInput = Schema.Schema.Type<typeof FeatureInputSchema>
export type ProviderInput = Schema.Schema.Type<typeof ProviderInputSchema>
export type InfraInput = Schema.Schema.Type<typeof InfraInputSchema>
