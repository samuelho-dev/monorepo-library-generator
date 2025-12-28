/**
 * Command Help Content
 *
 * Enhanced help text for each CLI command
 *
 * @module monorepo-library-generator/cli/help/commands
 */

import { createEnhancedHelp, type EnhancedHelpConfig } from './index'

/**
 * Contract command help
 */
export const contractHelp: EnhancedHelpConfig = {
  description: 'Generate a contract library with domain types, schemas, and interfaces',
  examples: [
    {
      command: 'mlg generate contract product',
      description: 'Basic contract library with RPC (always included)'
    },
    {
      command: 'mlg generate contract --includeCQRS user',
      description: 'With CQRS patterns (commands, queries, projections)'
    }
  ],
  outputStructure: [
    'libs/contract/{name}/',
    '  src/index.ts           - Main entry point',
    '  src/lib/entities.ts    - Domain entities (Effect Schema)',
    '  src/lib/errors.ts      - Tagged error types',
    '  src/lib/events.ts      - Domain events',
    '  src/lib/ports.ts       - Service interfaces',
    '  src/lib/rpc.ts         - RPC definitions'
  ],
  notes: [
    'Options must come BEFORE the library name (POSIX convention)',
    'Use --includeCQRS to add commands.ts, queries.ts, projections.ts',
    'RPC is always included by default'
  ]
}

/**
 * Data-access command help
 */
export const dataAccessHelp: EnhancedHelpConfig = {
  description: 'Generate a data-access library with repository and database operations',
  examples: [
    {
      command: 'mlg generate data-access user',
      description: 'Basic repository library'
    },
    {
      command: 'mlg generate data-access --description "User repository" product',
      description: 'With custom description'
    }
  ],
  outputStructure: [
    'libs/data-access/{name}/',
    '  src/index.ts              - Main entry point',
    '  src/lib/repository.ts     - Repository implementation',
    '  src/lib/repository.spec.ts - Repository tests',
    '  src/lib/types.ts          - Data access types'
  ],
  notes: [
    'Repository implements port interface from contract library',
    'Includes Effect-based database operations with proper error handling'
  ]
}

/**
 * Feature command help
 */
export const featureHelp: EnhancedHelpConfig = {
  description: 'Generate a feature library with business logic, RPC, and server/client support',
  examples: [
    {
      command: 'mlg generate feature auth',
      description: 'Feature library with RPC (always included)'
    },
    {
      command: 'mlg generate feature --includeClientServer checkout',
      description: 'With separate client and server exports'
    },
    {
      command: 'mlg generate feature --includeCQRS notification',
      description: 'With CQRS patterns'
    }
  ],
  outputStructure: [
    'libs/feature/{name}/',
    '  src/index.ts           - Main entry point',
    '  src/lib/service.ts     - Feature service',
    '  src/lib/service.spec.ts - Service tests',
    '  src/lib/server.ts      - Server-side logic (optional)',
    '  src/lib/client.ts      - Client-side logic (optional)'
  ],
  notes: [
    '--platform sets the target environment (node, browser, universal, edge)',
    'RPC handlers are always included by default'
  ]
}

/**
 * Infra command help
 */
export const infraHelp: EnhancedHelpConfig = {
  description: 'Generate an infrastructure library with services and implementations',
  examples: [
    {
      command: 'mlg generate infra cache',
      description: 'Basic infrastructure service'
    },
    {
      command: 'mlg generate infra --includeClientServer logging',
      description: 'With client and server implementations'
    }
  ],
  outputStructure: [
    'libs/infra/{name}/',
    '  src/index.ts           - Main entry point',
    '  src/lib/service.ts     - Service implementation',
    '  src/lib/service.spec.ts - Service tests',
    '  src/lib/layers.ts      - Effect layers',
    '  src/lib/types.ts       - Service types'
  ],
  notes: [
    'Infrastructure libraries provide cross-cutting concerns',
    'Layers follow Live/Test/Dev pattern for dependency injection'
  ]
}

/**
 * Provider command help
 */
export const providerHelp: EnhancedHelpConfig = {
  description: 'Generate a provider library for external service integration',
  examples: [
    {
      command: 'mlg generate provider stripe Stripe',
      description: 'Stripe payment provider'
    },
    {
      command: 'mlg generate provider email SendGrid',
      description: 'SendGrid email provider'
    },
    {
      command: 'mlg generate provider storage S3',
      description: 'AWS S3 storage provider'
    }
  ],
  outputStructure: [
    'libs/provider/{name}/',
    '  src/index.ts            - Main entry point',
    '  src/lib/service.ts      - Provider service',
    '  src/lib/service.spec.ts - Service tests',
    '  src/lib/layers.ts       - Effect layers (Live, Test, Dev)',
    '  src/lib/types.ts        - Provider types and config',
    '  src/lib/errors.ts       - Provider error types',
    '  CLAUDE.md               - AI-optimized SDK integration guide'
  ],
  notes: [
    'First argument is library name, second is external service name',
    'Includes baseline implementation with in-memory storage for testing',
    'See CLAUDE.md for SDK integration checklist'
  ]
}

/**
 * Domain command help
 */
export const domainHelp: EnhancedHelpConfig = {
  description: 'Generate a complete domain with pre-wired contract, data-access, and feature',
  examples: [
    {
      command: 'mlg generate domain user',
      description: 'Complete domain with RPC and cache'
    },
    {
      command: 'mlg generate domain --includeCQRS order',
      description: 'With CQRS patterns'
    },
    {
      command: 'mlg generate domain --includeClientServer checkout',
      description: 'With client/server exports'
    }
  ],
  outputStructure: [
    'libs/contract/{name}/    - Domain types and schemas',
    'libs/data-access/{name}/ - Repository with cache integration',
    'libs/feature/{name}/     - Service with RPC handlers'
  ],
  notes: [
    'RPC and cache are always included',
    'Creates three coordinated libraries with proper dependencies',
    'Ideal for vertical slice architecture'
  ]
}

/**
 * Init command help
 */
export const initHelp: EnhancedHelpConfig = {
  description: 'Initialize libs/ directory architecture with built-in Effect libraries',
  examples: [
    {
      command: 'mlg init',
      description: 'Initialize with all defaults'
    },
    {
      command: 'mlg init --skip-providers',
      description: 'Skip generating built-in provider libraries'
    },
    {
      command: 'mlg init --skip-infra',
      description: 'Skip generating built-in infrastructure libraries'
    }
  ],
  outputStructure: [
    'libs/provider/       - Built-in providers (kysely, supabase)',
    'libs/infra/          - Built-in infrastructure (cache, database, logging, etc.)',
    'libs/env/            - Environment configuration library'
  ],
  notes: [
    'Generates only the libs/ directory structure',
    'Use individual generators (contract, feature, etc.) after init'
  ]
}

/**
 * Get enhanced help text for a command
 */
export function getCommandHelp(
  command: 'contract' | 'data-access' | 'feature' | 'infra' | 'provider' | 'domain' | 'init'
) {
  const configs: Record<typeof command, EnhancedHelpConfig> = {
    contract: contractHelp,
    'data-access': dataAccessHelp,
    feature: featureHelp,
    infra: infraHelp,
    provider: providerHelp,
    domain: domainHelp,
    init: initHelp
  }

  return createEnhancedHelp(configs[command])
}
