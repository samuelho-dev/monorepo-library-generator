/**
 * Monorepo Initialization Command
 *
 * Initializes the libs/ directory architecture with:
 * - Built-in contract libraries (contract-auth - single source of truth for auth types)
 * - Built-in provider libraries (Kysely, Supabase, Redis for external service integration)
 * - Built-in infrastructure libraries (cache, database, observability, queue, pubsub, auth, storage, rpc)
 * - User domain slice (contract-user, data-access-user, feature-user)
 *
 * This command generates the core library structure for Effect-native monorepos.
 *
 * Generation Order (Contract-First Architecture):
 * 1. contract-auth (types must exist before infra-rpc/infra-auth can import them)
 * 2. Providers (Kysely, Supabase, Redis)
 * 3. Infrastructure (cache, database, observability, queue, pubsub, auth, storage, rpc)
 * 4. User domain slice (contract-user, data-access-user, feature-user)
 *
 * Usage:
 * ```bash
 * npx mlg init
 * ```
 *
 * @module cli/commands/init
 */

import { Console, Effect } from "effect"
import { WORKSPACE_CONFIG } from "../../utils/workspace-config"
import { generateContract } from "../generators/contract"
import { generateContractAuth } from "../generators/contract-auth"
import { generateDataAccess } from "../generators/data-access"
import { generateEnv } from "../generators/env"
import { generateFeature } from "../generators/feature"
import { generateInfra } from "../generators/infra"
import { generateProvider } from "../generators/provider"
import { generateTypesDatabase } from "../generators/types-database"

/**
 * Monorepo initialization options
 */
export interface InitOptions {
  /**
   * Whether to generate built-in provider libraries
   * @default true
   */
  readonly includeProviders?: boolean

  /**
   * Whether to generate built-in infrastructure libraries
   * @default true
   */
  readonly includeInfra?: boolean

  /**
   * Skip running prisma generate
   * @default false
   */
  readonly skipPrisma?: boolean
}

/**
 * Built-in contract libraries to generate
 *
 * These define canonical types shared across the monorepo.
 * contract-auth is always generated first as it defines types
 * that infra-rpc and infra-auth depend on.
 */
interface BuiltinContract {
  readonly name: string
  readonly description: string
}

const BUILTIN_CONTRACTS: ReadonlyArray<BuiltinContract> = Object.freeze([
  Object.freeze({
    name: "auth",
    description: "Auth contract - single source of truth for auth types"
  })
])

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
    name: "kysely",
    externalService: "Kysely",
    description: "Kysely provider for type-safe database queries with migrations"
  }),
  Object.freeze({
    name: "supabase",
    externalService: "Supabase",
    description: "Supabase provider for auth, storage, and client operations"
  }),
  Object.freeze({
    name: "redis",
    externalService: "Redis",
    description: "Redis provider for cache, queue, and pubsub backing with ioredis"
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
    name: "observability",
    description: "Unified observability infrastructure with OTEL SDK, LoggingService, and MetricsService"
  }),
  Object.freeze({
    name: "queue",
    description: "Queue orchestration infrastructure with Supervisor for background workers"
  }),
  Object.freeze({
    name: "pubsub",
    description: "PubSub orchestration infrastructure (coordinates pubsub providers)"
  }),
  Object.freeze({
    name: "auth",
    description: "Auth infrastructure with session/token verification and RPC middleware integration"
  }),
  Object.freeze({
    name: "storage",
    description: "Storage infrastructure for file operations (coordinates storage providers)"
  }),
  Object.freeze({
    name: "rpc",
    description: "RPC infrastructure with @effect/rpc middleware, transport, and router"
  })
])

/**
 * Generate all built-in contract libraries
 *
 * Must run FIRST - these define types that infra libraries depend on.
 */
function generateBuiltinContracts() {
  return Effect.gen(function*() {
    yield* Console.log("📜 Generating built-in contract libraries...")
    yield* Console.log("")

    for (const contract of BUILTIN_CONTRACTS) {
      yield* Console.log(`  Generating contract-${contract.name}...`)

      // contract-auth uses specialized generator
      if (contract.name === "auth") {
        yield* generateContractAuth({
          description: contract.description
        })
      }

      yield* Console.log(`  ✓ contract-${contract.name} created`)
    }

    yield* Console.log("")
    yield* Console.log(
      `✨ Generated ${BUILTIN_CONTRACTS.length} contract libraries`
    )
  })
}

/**
 * User Domain Sub-Modules
 *
 * The user domain has exactly 2 sub-modules:
 * - authentication: Login/logout, token management, session handling
 * - profile: User profile modification (name, avatar, settings)
 */
const USER_SUBMODULES = "authentication,profile"

/**
 * Generate user domain slice (contract-user, data-access-user, feature-user)
 *
 * Must run LAST - depends on contract-auth and all infrastructure.
 *
 * Sub-modules:
 * - authentication: Login/logout, token/session management
 * - profile: User profile info modification
 */
function generateUserDomainSlice() {
  return Effect.gen(function*() {
    yield* Console.log("👤 Generating user domain slice...")
    yield* Console.log("")

    // Get types-database package name for imports
    const typesDatabasePackage = `${WORKSPACE_CONFIG.getScope()}/types-database`

    // 1. Generate contract-user with authentication and profile sub-modules
    yield* Console.log("  Generating contract-user (with authentication, profile sub-modules)...")
    yield* generateContract({
      name: "user",
      description: "User domain contract with auth integration",
      tags: "contract,domain,user,builtin",
      includeSubModules: true,
      subModules: USER_SUBMODULES,
      typesDatabasePackage
    })
    yield* Console.log("  ✓ contract-user created")

    // 2. Generate data-access-user with sub-module repositories
    yield* Console.log("  Generating data-access-user (with authentication, profile sub-modules)...")
    yield* generateDataAccess({
      name: "user",
      description: "User data access with cache integration",
      tags: "data-access,domain,user,builtin",
      includeSubModules: true,
      subModules: USER_SUBMODULES
    })
    yield* Console.log("  ✓ data-access-user created")

    // 3. Generate feature-user with sub-module services
    yield* Console.log("  Generating feature-user (with authentication, profile sub-modules)...")
    yield* generateFeature({
      name: "user",
      description: "User feature with CurrentUser integration",
      tags: "feature,domain,user,builtin",
      includeSubModules: true,
      subModules: USER_SUBMODULES
    })
    yield* Console.log("  ✓ feature-user created")

    yield* Console.log("")
    yield* Console.log("✨ Generated user domain slice (3 libraries with authentication + profile sub-modules)")
  })
}

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
    yield* Console.log(
      `✨ Generated ${BUILTIN_PROVIDERS.length} provider libraries`
    )
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
    yield* Console.log(
      `✨ Generated ${BUILTIN_INFRA.length} infrastructure libraries`
    )
  })
}

/**
 * Initialize libs/ directory architecture with built-in libraries
 *
 * Generation Order (Contract-First Architecture):
 * 1. contract-auth (types must exist before infra can import them)
 * 2. Providers (Kysely, Supabase, Redis)
 * 3. Infrastructure (cache, database, observability, queue, pubsub, auth, storage, rpc)
 * 4. User domain slice (contract-user, data-access-user, feature-user)
 *
 * This provides core infrastructure for Effect-native monorepos with
 * caching, logging, metrics, queues, and pub/sub out of the box.
 */
export function init(options: InitOptions = {}) {
  return Effect.gen(function*() {
    const includeProviders = options.includeProviders ?? true
    const includeInfra = options.includeInfra ?? true
    const skipPrisma = options.skipPrisma ?? false

    yield* Console.log("🚀 Initializing Effect-based libs/ architecture...")
    yield* Console.log("")

    // 1. Generate types-database FIRST (Prisma types needed by providers and data-access)
    yield* Console.log("🗃️  Generating types-database library...")
    yield* generateTypesDatabase({
      skipGenerate: skipPrisma
    })
    yield* Console.log("  ✓ types-database created")
    yield* Console.log("")

    // 2. Generate built-in contract libraries (types before infra)
    yield* generateBuiltinContracts()
    yield* Console.log("")

    // 3. Generate built-in provider libraries
    if (includeProviders) {
      yield* generateBuiltinProviders()
      yield* Console.log("")
    }

    // 4. Generate built-in infrastructure libraries
    if (includeInfra) {
      yield* generateBuiltinInfra()
      yield* Console.log("")
    }

    // 5. Generate user domain slice LAST (depends on contract-auth and infra)
    yield* generateUserDomainSlice()
    yield* Console.log("")

    // 6. Final summary
    yield* Console.log("✅ libs/ architecture initialized!")
    yield* Console.log("")
    yield* Console.log("📚 Generated libraries:")

    yield* Console.log("  ✓ Types library (1):")
    yield* Console.log("    - libs/types/database/")

    yield* Console.log(
      `  ✓ Contract libraries (${BUILTIN_CONTRACTS.length}):`
    )
    for (const c of BUILTIN_CONTRACTS) {
      yield* Console.log(`    - libs/contract/${c.name}/`)
    }

    if (includeProviders) {
      yield* Console.log(
        `  ✓ Provider libraries (${BUILTIN_PROVIDERS.length}):`
      )
      for (const p of BUILTIN_PROVIDERS) {
        yield* Console.log(`    - libs/provider/${p.name}/`)
      }
    }

    if (includeInfra) {
      yield* Console.log(
        `  ✓ Infrastructure libraries (${BUILTIN_INFRA.length}):`
      )
      for (const i of BUILTIN_INFRA) {
        yield* Console.log(
          `    - libs/${i.name === "env" ? "env" : `infra/${i.name}`}/`
        )
      }
    }

    yield* Console.log("  ✓ User domain slice (3):")
    yield* Console.log("    - libs/contract/user/")
    yield* Console.log("    - libs/data-access/user/")
    yield* Console.log("    - libs/feature/user/")

    yield* Console.log("")
    yield* Console.log("💡 Next steps:")
    yield* Console.log("  1. Update prisma/schema.prisma with your models")
    yield* Console.log("  2. Run: pnpm prisma generate")
    yield* Console.log("  3. Generate domain contracts: mlg generate contract <name>")
    yield* Console.log("  4. Generate data access: mlg generate data-access <name>")
    yield* Console.log("  5. Generate features: mlg generate feature <name>")

    return {
      typesDatabaseGenerated: 1,
      contractsGenerated: BUILTIN_CONTRACTS.length,
      providersGenerated: includeProviders ? BUILTIN_PROVIDERS.length : 0,
      infraGenerated: includeInfra ? BUILTIN_INFRA.length : 0,
      userDomainGenerated: 3
    }
  })
}
