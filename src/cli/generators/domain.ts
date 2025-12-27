/**
 * Domain Generator for CLI
 *
 * Generates a complete domain with pre-wired dependencies:
 * - Contract library (types/schemas)
 * - Data-Access library (repository) - references contract
 * - Feature library (business logic) - references data-access
 *
 * Automatically generates required infrastructure dependencies if they don't exist:
 * - provider-kysely (Kysely database provider)
 * - infra-database (Database orchestration infrastructure)
 *
 * Single command replaces 3 separate generator calls and manual wiring.
 *
 * @module monorepo-library-generator/cli/generators/domain
 */

import { Console, Effect } from "effect"
import * as fs from "node:fs"
import * as path from "node:path"
import { getPackageName } from "../../utils/workspace-config"
import { generateContract } from "./contract"
import { generateDataAccess } from "./data-access"
import { generateFeature } from "./feature"
import { generateInfra } from "./infra"
import { generateProvider } from "./provider"

/**
 * Check if a library directory exists
 */
function libraryExists(libraryPath: string) {
  const fullPath = path.join(process.cwd(), libraryPath)
  return fs.existsSync(fullPath)
}

/**
 * Ensure required infrastructure dependencies exist
 *
 * Data-access libraries depend on:
 * 1. provider-kysely - Kysely database provider
 * 2. provider-redis - Redis provider for cache/queue/pubsub
 * 3. infra-database - Database orchestration (depends on provider-kysely)
 * 4. infra-cache - Cache orchestration
 * 5. infra-observability - Logging and metrics
 * 6. infra-rpc - RPC middleware and handlers
 * 7. infra-pubsub - Event publishing
 * 8. infra-queue - Job queue processing
 *
 * This function generates these dependencies if they don't exist.
 */
function ensureInfrastructureDependencies() {
  return Effect.gen(function*() {
    // Provider dependencies
    const providerKyselyPath = "libs/provider/kysely"
    const providerRedisPath = "libs/provider/redis"

    // Infrastructure dependencies
    const infraDatabasePath = "libs/infra/database"
    const infraCachePath = "libs/infra/cache"
    const infraObservabilityPath = "libs/infra/observability"
    const infraRpcPath = "libs/infra/rpc"
    const infraPubsubPath = "libs/infra/pubsub"
    const infraQueuePath = "libs/infra/queue"

    // Check if provider-kysely exists
    if (!libraryExists(providerKyselyPath)) {
      yield* Console.log("\n🔧 Required dependency missing: provider-kysely")
      yield* Console.log("   Generating provider-kysely...")

      yield* generateProvider({
        name: "kysely",
        externalService: "Kysely",
        description: "Kysely provider for type-safe database queries with migrations",
        tags: "provider,database,kysely",
        platform: "node"
      })

      yield* Console.log("   ✅ provider-kysely created")
    }

    // Check if provider-redis exists
    if (!libraryExists(providerRedisPath)) {
      yield* Console.log("\n🔧 Required dependency missing: provider-redis")
      yield* Console.log("   Generating provider-redis...")

      yield* generateProvider({
        name: "redis",
        externalService: "Redis",
        description: "Redis provider for cache, queue, and pubsub operations",
        tags: "provider,redis,cache,queue,pubsub",
        platform: "node"
      })

      yield* Console.log("   ✅ provider-redis created")
    }

    // Check if infra-database exists
    if (!libraryExists(infraDatabasePath)) {
      yield* Console.log("\n🔧 Required dependency missing: infra-database")
      yield* Console.log("   Generating infra-database...")

      yield* generateInfra({
        name: "database",
        description: "Database orchestration infrastructure (coordinates database providers like Kysely)",
        tags: "infra,database,orchestration",
        platform: "node",
        includeClientServer: true
      })

      yield* Console.log("   ✅ infra-database created")
    }

    // Check if infra-cache exists
    if (!libraryExists(infraCachePath)) {
      yield* Console.log("\n🔧 Required dependency missing: infra-cache")
      yield* Console.log("   Generating infra-cache...")

      yield* generateInfra({
        name: "cache",
        description: "Cache orchestration infrastructure (coordinates cache providers)",
        tags: "infra,cache,orchestration",
        platform: "node",
        includeClientServer: true
      })

      yield* Console.log("   ✅ infra-cache created")
    }

    // Check if infra-observability exists
    if (!libraryExists(infraObservabilityPath)) {
      yield* Console.log("\n🔧 Required dependency missing: infra-observability")
      yield* Console.log("   Generating infra-observability...")

      yield* generateInfra({
        name: "observability",
        description: "Observability infrastructure (logging, metrics, tracing)",
        tags: "infra,observability,logging,metrics",
        platform: "node",
        includeClientServer: true
      })

      yield* Console.log("   ✅ infra-observability created")
    }

    // Check if infra-rpc exists
    if (!libraryExists(infraRpcPath)) {
      yield* Console.log("\n🔧 Required dependency missing: infra-rpc")
      yield* Console.log("   Generating infra-rpc...")

      yield* generateInfra({
        name: "rpc",
        description: "RPC infrastructure (middleware, handlers, client)",
        tags: "infra,rpc,api",
        platform: "node",
        includeClientServer: true
      })

      yield* Console.log("   ✅ infra-rpc created")
    }

    // Check if infra-pubsub exists
    if (!libraryExists(infraPubsubPath)) {
      yield* Console.log("\n🔧 Required dependency missing: infra-pubsub")
      yield* Console.log("   Generating infra-pubsub...")

      yield* generateInfra({
        name: "pubsub",
        description: "Pub/sub infrastructure (event publishing and subscription)",
        tags: "infra,pubsub,events",
        platform: "node",
        includeClientServer: true
      })

      yield* Console.log("   ✅ infra-pubsub created")
    }

    // Check if infra-queue exists
    if (!libraryExists(infraQueuePath)) {
      yield* Console.log("\n🔧 Required dependency missing: infra-queue")
      yield* Console.log("   Generating infra-queue...")

      yield* generateInfra({
        name: "queue",
        description: "Queue infrastructure (job queue processing)",
        tags: "infra,queue,jobs",
        platform: "node",
        includeClientServer: true
      })

      yield* Console.log("   ✅ infra-queue created")
    }
  })
}

/**
 * Domain Generator Options (CLI)
 */
export interface DomainGeneratorOptions {
  readonly name: string
  readonly description?: string
  readonly tags?: string
  readonly scope?: string
  readonly includeClientServer?: boolean
  readonly includeCQRS?: boolean
}

/**
 * Generate Complete Domain (CLI)
 *
 * Generates 3 pre-wired libraries:
 * 1. Contract library - Domain types and schemas
 * 2. Data-Access library - Repository with contract reference
 * 3. Feature library - Business logic with data-access reference
 *
 * @example
 * ```bash
 * # Generate product domain
 * mlg generate domain product
 *
 * # With options
 * mlg generate domain order --include-rpc --include-cache
 * ```
 */
export function generateDomain(options: DomainGeneratorOptions) {
  return Effect.gen(function*() {
    const { description, includeCQRS, includeClientServer, name, scope, tags } = options

    yield* Console.log(`\n🏗️  Generating complete domain: ${name}`)
    yield* Console.log("=".repeat(60))

    // Step 1: Generate Contract Library
    // Pass typesDatabasePackage to import from types-database instead of local path
    const typesDatabasePkg = getPackageName("types", "database")
    yield* Console.log("\n📦 Step 1/3: Generating contract library...")
    yield* generateContract({
      name,
      description: description ?? `${name} domain contracts`,
      tags: tags ?? "domain:contract",
      typesDatabasePackage: typesDatabasePkg
    })
    yield* Console.log(`✅ Contract library created: libs/contract/${name}`)

    // Ensure infrastructure dependencies exist before data-access generation
    yield* ensureInfrastructureDependencies()

    // Step 2: Generate Data-Access Library (with contract reference)
    yield* Console.log("\n📦 Step 2/3: Generating data-access library...")
    yield* generateDataAccess({
      name,
      description: description ?? `${name} data access`,
      tags: tags ?? "domain:data-access",
      contractLibrary: getPackageName("contract", name)
    })
    yield* Console.log(`✅ Data-access library created: libs/data-access/${name}`)

    // Step 3: Generate Feature Library (with data-access reference)
    yield* Console.log("\n📦 Step 3/3: Generating feature library...")
    yield* generateFeature({
      name,
      description: description ?? `${name} feature`,
      tags: tags ?? "domain:feature",
      ...(scope !== undefined && { scope }),
      ...(includeClientServer !== undefined && { includeClientServer }),
      ...(includeCQRS !== undefined && { includeCQRS })
    })
    yield* Console.log(`✅ Feature library created: libs/feature/${name}`)

    // Success Summary
    yield* Console.log(`\n${"=".repeat(60)}`)
    yield* Console.log(`\n✨ Domain "${name}" created successfully!`)
    yield* Console.log("\n📦 Generated Libraries:")
    yield* Console.log(`   1. libs/contract/${name}      - ${getPackageName("contract", name)}`)
    yield* Console.log(`   2. libs/data-access/${name}   - ${getPackageName("data-access", name)}`)
    yield* Console.log(`   3. libs/feature/${name}       - ${getPackageName("feature", name)}`)

    yield* Console.log("\n🔗 Pre-Wired Dependencies:")
    yield* Console.log(`   - data-access-${name} → contract-${name}`)
    yield* Console.log(`   - feature-${name} → data-access-${name}`)

    yield* Console.log("\n📝 Next Steps:")
    yield* Console.log("   1. pnpm install           # Install dependencies")
    yield* Console.log("   2. pnpm build             # Build all libraries")
    yield* Console.log(`   3. Customize libs/data-access/${name}/src/lib/repository/operations/`)
    yield* Console.log(`   4. Implement libs/feature/${name}/src/lib/server/service.ts`)

    yield* Console.log("\n💡 Quick Test:")
    yield* Console.log(`   cd libs/data-access/${name}`)
    yield* Console.log("   pnpm test")

    yield* Console.log(`\n${"=".repeat(60)}`)
  })
}
