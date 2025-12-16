/**
 * Domain Generator for CLI
 *
 * Generates a complete domain with pre-wired dependencies:
 * - Contract library (types/schemas)
 * - Data-Access library (repository) - references contract
 * - Feature library (business logic) - references data-access
 *
 * Single command replaces 3 separate generator calls and manual wiring.
 *
 * @module monorepo-library-generator/cli/generators/domain
 */

import { Console, Effect } from "effect"
import { generateContract } from "./contract"
import { generateDataAccess } from "./data-access"
import { generateFeature } from "./feature"
import { getPackageName } from "../../utils/workspace-config"

/**
 * Domain Generator Options (CLI)
 */
export interface DomainGeneratorOptions {
  readonly name: string
  readonly description?: string
  readonly tags?: string
  readonly scope?: string
  readonly includeCache?: boolean
  readonly includeClientServer?: boolean
  readonly includeRPC?: boolean
  readonly includeCQRS?: boolean
  readonly includeEdge?: boolean
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
  return Effect.gen(function* () {
    const { name, description, tags, scope, includeCache, includeClientServer, includeRPC, includeCQRS, includeEdge } = options

    yield* Console.log(`\n🏗️  Generating complete domain: ${name}`)
    yield* Console.log("=" .repeat(60))

    // Step 1: Generate Contract Library
    yield* Console.log("\n📦 Step 1/3: Generating contract library...")
    yield* generateContract({
      name,
      description: description ?? `${name} domain contracts`,
      tags: tags ?? "domain:contract"
    })
    yield* Console.log(`✅ Contract library created: libs/contract/${name}`)

    // Step 2: Generate Data-Access Library (with contract reference)
    yield* Console.log("\n📦 Step 2/3: Generating data-access library...")
    yield* generateDataAccess({
      name,
      description: description ?? `${name} data access`,
      tags: tags ?? "domain:data-access",
      ...(includeCache !== undefined && { includeCache }),
      contractLibrary: getPackageName("contract", name) // Pre-wire to contract
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
      ...(includeRPC !== undefined && { includeRPC }),
      ...(includeCQRS !== undefined && { includeCQRS }),
      ...(includeEdge !== undefined && { includeEdge })
    })
    yield* Console.log(`✅ Feature library created: libs/feature/${name}`)

    // Success Summary
    yield* Console.log("\n" + "=".repeat(60))
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

    yield* Console.log("\n" + "=".repeat(60))
  })
}
