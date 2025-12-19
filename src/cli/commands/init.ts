/**
 * Monorepo Initialization Command
 *
 * Initializes a complete Effect-based monorepo with:
 * - Workspace-level dotfiles (.editorconfig, .vscode/*)
 * - Built-in provider libraries (wraps Effect.Cache, Effect.Logger, etc.)
 * - Built-in infrastructure libraries (orchestrates providers)
 *
 * This command provides a batteries-included setup for Effect-native monorepos.
 *
 * Usage:
 * ```bash
 * npx mlg init
 * ```
 *
 * @module cli/commands/init
 */

import { Console, Effect } from "effect"
import { generateEnv } from "../generators/env"
import { generateInfra } from "../generators/infra"
import { generateProvider } from "../generators/provider"
import { generateIntegrationExample } from "./init-integration-example"
import { scaffoldPrismaStructure } from "./init-prisma"
import { initWorkspace, type InitWorkspaceOptions } from "./init-workspace"
import { generateWorkspaceFiles } from "./init-workspace-files"

/**
 * Monorepo initialization options
 */
export interface InitOptions extends InitWorkspaceOptions {
  /**
   * Whether to generate built-in provider libraries
   * @default true
   */
  readonly includeProviders?: boolean | undefined

  /**
   * Whether to generate built-in infrastructure libraries
   * @default true
   */
  readonly includeInfra?: boolean | undefined

  /**
   * Whether to scaffold Prisma directory structure for schema-driven development
   * @default false
   */
  readonly includePrisma?: boolean | undefined
}

/**
 * Built-in Effect provider libraries to generate
 *
 * These wrap Effect built-ins with tracing and consistent interfaces
 */
interface BuiltinProvider {
  readonly name: string
  readonly externalService: string
  readonly description: string
}

const BUILTIN_PROVIDERS: ReadonlyArray<BuiltinProvider> = Object.freeze([
  Object.freeze({
    name: "effect-cache",
    externalService: "Effect.Cache",
    description: "Effect.Cache provider for caching operations"
  }),
  Object.freeze({
    name: "effect-logger",
    externalService: "Effect.Logger",
    description: "Effect.Logger provider for logging operations"
  }),
  Object.freeze({
    name: "effect-metrics",
    externalService: "Effect.Metrics",
    description: "Effect.Metrics provider for metrics collection with Supervisor"
  }),
  Object.freeze({
    name: "effect-queue",
    externalService: "Effect.Queue",
    description: "Effect.Queue provider for queue operations"
  }),
  Object.freeze({
    name: "effect-pubsub",
    externalService: "Effect.PubSub",
    description: "Effect.PubSub provider for pub/sub messaging"
  }),
  Object.freeze({
    name: "kysely",
    externalService: "Kysely",
    description: "Kysely provider for type-safe database queries with migrations"
  })
])

/**
 * Built-in infrastructure libraries to generate
 *
 * These orchestrate provider libraries and provide unified interfaces
 */
interface BuiltinInfra {
  readonly name: string
  readonly description: string
}

const BUILTIN_INFRA: ReadonlyArray<BuiltinInfra> = Object.freeze([
  Object.freeze({
    name: "env",
    description: "Environment variable access with type-safe configuration"
  }),
  Object.freeze({
    name: "cache",
    description: "Cache orchestration infrastructure (coordinates cache providers)"
  }),
  Object.freeze({
    name: "database",
    description: "Database orchestration infrastructure (coordinates database providers like Kysely)"
  }),
  Object.freeze({
    name: "logging",
    description: "Logging orchestration infrastructure (coordinates logging providers)"
  }),
  Object.freeze({
    name: "metrics",
    description: "Metrics orchestration infrastructure with Supervisor for fiber tracking"
  }),
  Object.freeze({
    name: "queue",
    description: "Queue orchestration infrastructure with Supervisor for background workers"
  }),
  Object.freeze({
    name: "pubsub",
    description: "PubSub orchestration infrastructure (coordinates pubsub providers)"
  })
])

/**
 * Generate all built-in provider libraries
 */
function generateBuiltinProviders() {
  return Effect.gen(function*() {
    yield* Console.log("📦 Generating built-in provider libraries...")
    yield* Console.log("")

    for (const provider of BUILTIN_PROVIDERS) {
      yield* Console.log(`  Generating provider-${provider.name}...`)

      yield* generateProvider({
        name: provider.name,
        externalService: provider.externalService,
        description: provider.description,
        tags: "provider,effect,builtin",
        platform: "node"
      })

      yield* Console.log(`  ✓ provider-${provider.name} created`)
    }

    yield* Console.log("")
    yield* Console.log(`✨ Generated ${BUILTIN_PROVIDERS.length} provider libraries`)
  })
}

/**
 * Generate all built-in infrastructure libraries
 */
function generateBuiltinInfra() {
  return Effect.gen(function*() {
    yield* Console.log("📦 Generating built-in infrastructure libraries...")
    yield* Console.log("")

    for (const infra of BUILTIN_INFRA) {
      // Special handling for env library (standalone, uses custom generator)
      if (infra.name === "env") {
        yield* Console.log(`  Generating env...`)

        // Generate type-safe env implementation directly (no infra scaffold needed)
        yield* generateEnv({
          projectRoot: "libs/env"
        })

        yield* Console.log(`  ✓ env created`)
      } else {
        yield* Console.log(`  Generating infra-${infra.name}...`)

        // Standard infra generation for other libraries
        yield* generateInfra({
          name: infra.name,
          description: infra.description,
          tags: "infra,orchestration,builtin",
          platform: "node",
          includeClientServer: true
        })

        yield* Console.log(`  ✓ infra-${infra.name} created`)
      }
    }

    yield* Console.log("")
    yield* Console.log(`✨ Generated ${BUILTIN_INFRA.length} infrastructure libraries`)
  })
}

/**
 * Initialize Effect-based monorepo with built-in libraries
 *
 * Generates:
 * 1. Workspace-level dotfiles (.editorconfig, .vscode/*)
 * 2. Built-in provider libraries (provider-effect-cache, etc.)
 * 3. Built-in infrastructure libraries (infra-cache, etc.)
 *
 * This provides a batteries-included monorepo setup with observability,
 * caching, logging, metrics, queues, and pub/sub out of the box.
 */
export function init(options: InitOptions = {}) {
  return Effect.gen(function*() {
    const includeProviders = options.includeProviders ?? true
    const includeInfra = options.includeInfra ?? true
    const includePrisma = options.includePrisma ?? false

    yield* Console.log("🚀 Initializing Effect-based monorepo...")
    yield* Console.log("")

    // 1. Initialize workspace-level dotfiles
    yield* Console.log("📁 Setting up workspace configuration...")
    yield* initWorkspace(options)
    yield* Console.log("")

    // 2. Generate workspace configuration files
    yield* generateWorkspaceFiles({
      packageManager: "pnpm"
    })
    yield* Console.log("")

    // 3. Scaffold Prisma directory structure (if requested)
    if (includePrisma) {
      yield* scaffoldPrismaStructure()
      yield* Console.log("")
    }

    // 4. Generate built-in provider libraries
    if (includeProviders) {
      yield* generateBuiltinProviders()
      yield* Console.log("")
    }

    // 5. Generate built-in infrastructure libraries
    if (includeInfra) {
      yield* generateBuiltinInfra()
      yield* Console.log("")
    }

    // 6. Generate integration example
    yield* generateIntegrationExample()
    yield* Console.log("")

    // 7. Final summary
    yield* Console.log("✅ Monorepo initialization complete!")
    yield* Console.log("")
    yield* Console.log("📚 What was generated:")
    yield* Console.log("  ✓ Workspace configuration:")
    yield* Console.log("    - package.json (with workspaces and scripts)")
    yield* Console.log("    - pnpm-workspace.yaml")
    yield* Console.log("    - .npmrc")
    yield* Console.log("  ✓ Workspace dotfiles (.editorconfig, .vscode/*)")

    if (includePrisma) {
      yield* Console.log("  ✓ Prisma directory structure:")
      yield* Console.log("    - prisma/schema.prisma (multi-domain configuration)")
      yield* Console.log("    - prisma/schemas/ (for domain-specific models)")
      yield* Console.log("    - .env (DATABASE_URL template)")
    }

    if (includeProviders) {
      yield* Console.log(`  ✓ Provider libraries (${BUILTIN_PROVIDERS.length}):`)
      BUILTIN_PROVIDERS.forEach((p) => Console.log(`    - provider-${p.name}`))
    }

    if (includeInfra) {
      yield* Console.log(`  ✓ Infrastructure libraries (${BUILTIN_INFRA.length}):`)
      BUILTIN_INFRA.forEach((i) => Console.log(`    - ${i.name === "env" ? "env" : `infra-${i.name}`}`))
    }

    yield* Console.log("  ✓ Integration example:")
    yield* Console.log("    - examples/app.ts (complete 5-layer demo)")
    yield* Console.log("    - examples/README.md (integration guide)")
    yield* Console.log("    - examples/user.prisma (example schema)")
    yield* Console.log("")
    yield* Console.log("💡 Next steps:")
    yield* Console.log("  1. Install dependencies: pnpm install")
    yield* Console.log("  2. Build all libraries: pnpm build")
    yield* Console.log("  3. Explore: examples/README.md for complete integration walkthrough")

    if (includePrisma) {
      yield* Console.log("  4. Define Prisma models in prisma/schemas/<domain>.prisma")
      yield* Console.log("  5. Generate Effect schemas: pnpm prisma:generate")
      yield* Console.log("  6. Generate data access layers: mlg generate data-access <name>")
    } else {
      yield* Console.log("  4. Generate your domain contracts: mlg generate contract <name>")
      yield* Console.log("  5. Generate data access layers: mlg generate data-access <name>")
      yield* Console.log("  6. Generate features: mlg generate feature <name>")
    }
    yield* Console.log("")
    yield* Console.log("📖 For custom providers (Redis, Pino, etc.):")
    yield* Console.log("   mlg generate provider <name> <external-service>")
    yield* Console.log("")
    yield* Console.log("🚀 Quick start:")
    yield* Console.log("   pnpm install && pnpm build && pnpm test")

    return {
      dotfilesInitialized: true,
      providersGenerated: includeProviders ? BUILTIN_PROVIDERS.length : 0,
      infraGenerated: includeInfra ? BUILTIN_INFRA.length : 0
    }
  })
}
