/**
 * Command Help Content
 *
 * Enhanced help text for each CLI command
 *
 * @module monorepo-library-generator/cli/help/commands
 */

import { createEnhancedHelp, type EnhancedHelpConfig } from "./index"

/**
 * Contract command help
 */
export const contractHelp: EnhancedHelpConfig = {
  description: "Generate a contract library with domain types, schemas, and interfaces",
  examples: [
    {
      command: "mlg generate contract product",
      description: "Basic contract library"
    },
    {
      command: "mlg generate contract --includeCQRS user",
      description: "With CQRS patterns (commands, queries, projections)"
    },
    {
      command: "mlg generate contract --includeRPC order",
      description: "With RPC definitions"
    }
  ],
  outputStructure: [
    "libs/contract/{name}/",
    "  src/index.ts           - Main entry point",
    "  src/lib/entities.ts    - Domain entities (Effect Schema)",
    "  src/lib/errors.ts      - Tagged error types",
    "  src/lib/events.ts      - Domain events",
    "  src/lib/ports.ts       - Service interfaces"
  ],
  notes: [
    "Options must come BEFORE the library name (POSIX convention)",
    "Use --includeCQRS to add commands.ts, queries.ts, projections.ts"
  ]
}

/**
 * Data-access command help
 */
export const dataAccessHelp: EnhancedHelpConfig = {
  description: "Generate a data-access library with repository and database operations",
  examples: [
    {
      command: "mlg generate data-access user",
      description: "Basic repository library"
    },
    {
      command: "mlg generate data-access --description \"User repository\" product",
      description: "With custom description"
    }
  ],
  outputStructure: [
    "libs/data-access/{name}/",
    "  src/index.ts              - Main entry point",
    "  src/lib/repository.ts     - Repository implementation",
    "  src/lib/repository.spec.ts - Repository tests",
    "  src/lib/types.ts          - Data access types"
  ],
  notes: [
    "Repository implements port interface from contract library",
    "Includes Effect-based database operations with proper error handling"
  ]
}

/**
 * Feature command help
 */
export const featureHelp: EnhancedHelpConfig = {
  description: "Generate a feature library with business logic and server/client support",
  examples: [
    {
      command: "mlg generate feature auth",
      description: "Basic feature library"
    },
    {
      command: "mlg generate feature --includeClientServer checkout",
      description: "With separate client and server exports"
    },
    {
      command: "mlg generate feature --includeCQRS --includeRPC notification",
      description: "With CQRS and RPC support"
    }
  ],
  outputStructure: [
    "libs/feature/{name}/",
    "  src/index.ts           - Main entry point",
    "  src/lib/service.ts     - Feature service",
    "  src/lib/service.spec.ts - Service tests",
    "  src/lib/server.ts      - Server-side logic (optional)",
    "  src/lib/client.ts      - Client-side logic (optional)"
  ],
  notes: [
    "--platform sets the target environment (node, browser, universal, edge)",
    "--includeEdge adds edge runtime optimized exports"
  ]
}

/**
 * Infra command help
 */
export const infraHelp: EnhancedHelpConfig = {
  description: "Generate an infrastructure library with services and implementations",
  examples: [
    {
      command: "mlg generate infra cache",
      description: "Basic infrastructure service"
    },
    {
      command: "mlg generate infra --includeClientServer logging",
      description: "With client and server implementations"
    }
  ],
  outputStructure: [
    "libs/infra/{name}/",
    "  src/index.ts           - Main entry point",
    "  src/lib/service.ts     - Service implementation",
    "  src/lib/service.spec.ts - Service tests",
    "  src/lib/layers.ts      - Effect layers",
    "  src/lib/types.ts       - Service types"
  ],
  notes: [
    "Infrastructure libraries provide cross-cutting concerns",
    "Layers follow Live/Test/Dev pattern for dependency injection"
  ]
}

/**
 * Provider command help
 */
export const providerHelp: EnhancedHelpConfig = {
  description: "Generate a provider library for external service integration",
  examples: [
    {
      command: "mlg generate provider stripe Stripe",
      description: "Stripe payment provider"
    },
    {
      command: "mlg generate provider email SendGrid",
      description: "SendGrid email provider"
    },
    {
      command: "mlg generate provider storage S3",
      description: "AWS S3 storage provider"
    }
  ],
  outputStructure: [
    "libs/provider/{name}/",
    "  src/index.ts            - Main entry point",
    "  src/lib/service.ts      - Provider service",
    "  src/lib/service.spec.ts - Service tests",
    "  src/lib/layers.ts       - Effect layers (Live, Test, Dev)",
    "  src/lib/types.ts        - Provider types and config",
    "  src/lib/errors.ts       - Provider error types",
    "  CLAUDE.md               - AI-optimized SDK integration guide"
  ],
  notes: [
    "First argument is library name, second is external service name",
    "Includes baseline implementation with in-memory storage for testing",
    "See CLAUDE.md for SDK integration checklist"
  ]
}

/**
 * Domain command help
 */
export const domainHelp: EnhancedHelpConfig = {
  description: "Generate a complete domain with pre-wired contract, data-access, and feature",
  examples: [
    {
      command: "mlg generate domain user",
      description: "Complete user domain"
    },
    {
      command: "mlg generate domain --includeCache product",
      description: "With cache integration"
    },
    {
      command: "mlg generate domain --includeCQRS --includeClientServer order",
      description: "With CQRS and client/server exports"
    }
  ],
  outputStructure: [
    "libs/contract/{name}/    - Domain types and schemas",
    "libs/data-access/{name}/ - Repository with wired contract",
    "libs/feature/{name}/     - Service with wired dependencies"
  ],
  notes: [
    "Creates three coordinated libraries with proper dependencies",
    "All libraries share the same scope for dependency injection",
    "Ideal for vertical slice architecture"
  ]
}

/**
 * Init command help
 */
export const initHelp: EnhancedHelpConfig = {
  description: "Initialize Effect-based monorepo with built-in libraries and dotfiles",
  examples: [
    {
      command: "mlg init",
      description: "Initialize with all defaults"
    },
    {
      command: "mlg init --skip-providers",
      description: "Skip generating built-in provider libraries"
    },
    {
      command: "mlg init --includePrisma",
      description: "Include Prisma directory structure"
    }
  ],
  outputStructure: [
    "libs/infra/          - Built-in infrastructure (cache, db, logging, etc.)",
    "libs/provider/       - Built-in providers (stripe, twilio, etc.)",
    ".editorconfig        - Editor configuration",
    ".vscode/             - VS Code settings",
    "prisma/              - Prisma schema (optional)"
  ],
  notes: [
    "Use --merge (default) to preserve existing files",
    "Use --overwrite to replace existing files"
  ]
}

/**
 * Get enhanced help text for a command
 */
export function getCommandHelp(
  command:
    | "contract"
    | "data-access"
    | "feature"
    | "infra"
    | "provider"
    | "domain"
    | "init"
) {
  const configs: Record<typeof command, EnhancedHelpConfig> = {
    "contract": contractHelp,
    "data-access": dataAccessHelp,
    "feature": featureHelp,
    "infra": infraHelp,
    "provider": providerHelp,
    "domain": domainHelp,
    "init": initHelp
  }

  return createEnhancedHelp(configs[command])
}
