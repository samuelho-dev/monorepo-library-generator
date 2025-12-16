/**
 * Integration Example Generation
 *
 * Generates a complete working example showing all 5 layers:
 * 1. Contract (domain types)
 * 2. Provider (Kysely)
 * 3. Infrastructure (Database)
 * 4. Data-Access (User repository)
 * 5. Feature (User service)
 *
 * This demonstrates the complete integration story with Layer composition.
 *
 * @module cli/commands/init-integration-example
 */

import { Console, Effect } from "effect"
import { FileSystem } from "@effect/platform"
import { getPackageName } from "../../utils/workspace-config"

/**
 * Generate complete integration example
 *
 * Creates:
 * - example/app.ts - Complete application showing all layers
 * - example/README.md - Integration explanation
 * - example/user.prisma - Example Prisma schema
 */
export function generateIntegrationExample() {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem

    // Get dynamic package names
    const featureUserPackage = getPackageName("feature", "user-management")
    const dataAccessUserPackage = getPackageName("data-access", "user")
    const infraDatabasePackage = getPackageName("infra", "database")
    const providerKyselyPackage = getPackageName("provider", "kysely")
    const contractUserPackage = getPackageName("contract", "user")

    yield* Console.log("📚 Generating integration example...")

    // Create examples directory
    yield* fs.makeDirectory("examples", { recursive: true })

    // 1. Example Prisma schema
    const prismaSchema = `// Example User domain model
// Copy this to prisma/schemas/user.prisma to generate contract library

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`

    yield* fs.writeFileString("examples/user.prisma", prismaSchema)
    yield* Console.log("  ✓ Created examples/user.prisma")

    // 2. Complete application example
    const appExample = `/**
 * Complete Integration Example
 *
 * This example demonstrates all 5 layers of the architecture working together:
 *
 * 1. CONTRACT: Domain types and schemas (generated from Prisma)
 * 2. PROVIDER: External service adapters (Kysely for database)
 * 3. INFRASTRUCTURE: Service orchestration (Database service)
 * 4. DATA-ACCESS: Repository pattern (UserRepository)
 * 5. FEATURE: Business logic (UserService)
 *
 * The key is understanding Layer composition:
 * - Each layer depends on layers below it
 * - Layer.provide chains dependencies together
 * - Effect.gen accesses services via yield*
 */

import { Effect, Layer, Console } from "effect"

// ============================================================================
// LAYER 5: FEATURE (Business Logic)
// ============================================================================
//
// After running: mlg generate feature user-management
// You would have: ${featureUserPackage}
//
// For now, we'll simulate the feature service:

import type { Context } from "effect"

// Simulated UserService (would come from feature library)
class UserService extends Context.Tag("UserService")<
  UserService,
  {
    readonly createUser: (email: string, name?: string) => Effect.Effect<
      { id: string; email: string; name?: string },
      Error
    >
    readonly getUserByEmail: (email: string) => Effect.Effect<
      { id: string; email: string; name?: string } | null,
      Error
    >
  }
>() {}

// ============================================================================
// LAYER 4: DATA-ACCESS (Repository Pattern)
// ============================================================================
//
// After running: mlg generate data-access user
// You would have: ${dataAccessUserPackage}
//
// For now, we'll simulate the repository:

import type { DatabaseService } from "${infraDatabasePackage}"

const UserRepositoryLive = Layer.effect(
  UserService,
  Effect.gen(function* () {
    // Depend on infrastructure layer
    const db = yield* DatabaseService

    return {
      createUser: (email: string, name?: string) =>
        Effect.gen(function* () {
          yield* Console.log(\`📝 Creating user: \${email}\`)

          // Use database infrastructure
          const user = yield* db.create({ email, name })

          yield* Console.log(\`✅ User created: \${user.id}\`)
          return user as { id: string; email: string; name?: string }
        }),

      getUserByEmail: (email: string) =>
        Effect.gen(function* () {
          yield* Console.log(\`🔍 Finding user: \${email}\`)

          // Use database infrastructure
          const result = yield* db.findByCriteria({ email }, 0, 1)

          if (result.length === 0) {
            yield* Console.log(\`❌ User not found: \${email}\`)
            return null
          }

          const user = result[0] as { id: string; email: string; name?: string }
          yield* Console.log(\`✅ User found: \${user.id}\`)
          return user
        })
    }
  })
)

// ============================================================================
// LAYER 3: INFRASTRUCTURE (Service Orchestration)
// ============================================================================
//
// Already generated: ${infraDatabasePackage}
// Auto-imports and uses: ${providerKyselyPackage}
//
// This layer is generated by: mlg init
// It automatically integrates with the Kysely provider

import { DatabaseService } from "${infraDatabasePackage}"

// ============================================================================
// LAYER 2: PROVIDER (External Service Adapter)
// ============================================================================
//
// Already generated: ${providerKyselyPackage}
// Wraps Kysely SDK with Effect interface
//
// This layer is generated by: mlg init
// It provides the low-level database operations

import { Kysely } from "${providerKyselyPackage}"

// ============================================================================
// LAYER 1: CONTRACT (Domain Types)
// ============================================================================
//
// After creating prisma/schemas/user.prisma and running:
// pnpm prisma:generate
//
// You would have: ${contractUserPackage}
// With: UserSchema, User type, CreateUserInput, etc.
//
// For this example, we define types inline:

// import { User, UserSchema } from "${contractUserPackage}"

// ============================================================================
// COMPLETE LAYER COMPOSITION
// ============================================================================

/**
 * Complete application layer
 *
 * This shows how all layers compose together:
 *
 * UserService (Feature)
 *   ↓ depends on
 * DatabaseService (Infrastructure)
 *   ↓ depends on
 * Kysely (Provider)
 *
 * Layer.provide chains them: Feature → Infra → Provider
 */
const AppLayer = UserRepositoryLive.pipe(
  Layer.provide(DatabaseService.Live),
  Layer.provide(Kysely.Live)
)

// ============================================================================
// EXAMPLE APPLICATION
// ============================================================================

const program = Effect.gen(function* () {
  const userService = yield* UserService

  yield* Console.log("\\n🚀 Starting User Management Example\\n")
  yield* Console.log("=" + "=".repeat(50) + "\\n")

  // Create a user
  yield* Console.log("📋 Step 1: Create User")
  const newUser = yield* userService.createUser(
    "alice@example.com",
    "Alice Smith"
  )
  yield* Console.log(\`   User ID: \${newUser.id}\\n\`)

  // Find the user
  yield* Console.log("📋 Step 2: Find User by Email")
  const foundUser = yield* userService.getUserByEmail("alice@example.com")
  if (foundUser) {
    yield* Console.log(\`   Found: \${foundUser.name} (\${foundUser.email})\\n\`)
  }

  // Try to find non-existent user
  yield* Console.log("📋 Step 3: Find Non-Existent User")
  const notFound = yield* userService.getUserByEmail("bob@example.com")
  yield* Console.log(\`   Result: \${notFound ? "Found" : "Not found"}\\n\`)

  yield* Console.log("=" + "=".repeat(50))
  yield* Console.log("\\n✅ Example completed successfully!\\n")

  return "Success"
})

// ============================================================================
// RUN THE APPLICATION
// ============================================================================

/**
 * Run this example:
 *
 * 1. Install dependencies:
 *    pnpm install
 *
 * 2. Build all libraries:
 *    pnpm build
 *
 * 3. Run the example:
 *    tsx examples/app.ts
 *
 * Expected output:
 * - User creation with auto-generated ID
 * - User lookup by email (success)
 * - User lookup by email (not found)
 */

// Uncomment to run:
// program.pipe(
//   Effect.provide(AppLayer),
//   Effect.runPromise
// ).then(
//   (result) => console.log("Result:", result),
//   (error) => console.error("Error:", error)
// )

/**
 * Key Takeaways:
 *
 * 1. **Layer Composition**: Use Layer.provide to chain dependencies
 * 2. **Dependency Injection**: Use yield* to access services
 * 3. **Type Safety**: All services are fully typed
 * 4. **Effect Patterns**: Use Effect.gen for sequential operations
 * 5. **Clean Architecture**: Each layer has a single responsibility
 *
 * Next Steps:
 *
 * 1. Create actual Prisma schema: prisma/schemas/user.prisma
 * 2. Generate contract: pnpm prisma:generate
 * 3. Generate data-access: mlg generate data-access user
 * 4. Generate feature: mlg generate feature user-management
 * 5. Replace simulated layers with actual generated libraries
 */

export { program, AppLayer }
`

    yield* fs.writeFileString("examples/app.ts", appExample)
    yield* Console.log("  ✓ Created examples/app.ts")

    // 3. README with integration explanation
    const readme = `# Integration Example: 5-Layer Architecture

This example demonstrates how all 5 layers of the architecture work together.

## Architecture Layers

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│ 5. FEATURE (Business Logic)                                │
│    Location: libs/feature/user-management/                 │
│    Purpose: User management use cases                       │
│    Example: UserService with createUser, getUserByEmail    │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on
┌─────────────────────────────────────────────────────────────┐
│ 4. DATA-ACCESS (Repository Pattern)                        │
│    Location: libs/data-access/user/                         │
│    Purpose: User data persistence                           │
│    Example: UserRepository with CRUD operations            │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on
┌─────────────────────────────────────────────────────────────┐
│ 3. INFRASTRUCTURE (Service Orchestration)                  │
│    Location: libs/infra/database/                           │
│    Purpose: Orchestrate database operations                 │
│    Example: DatabaseService (auto-uses Kysely provider)    │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on
┌─────────────────────────────────────────────────────────────┐
│ 2. PROVIDER (External Service Adapter)                     │
│    Location: libs/provider/kysely/                          │
│    Purpose: Wrap Kysely SDK with Effect interface          │
│    Example: Kysely service with type-safe queries          │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on
┌─────────────────────────────────────────────────────────────┐
│ 1. CONTRACT (Domain Types & Schemas)                       │
│    Location: libs/contract/user/                            │
│    Purpose: Shared types and schemas                        │
│    Example: User type, UserSchema, CreateUserInput         │
└─────────────────────────────────────────────────────────────┘
\`\`\`

## Integration Flow

### 1. Contract Layer (Domain Types)

**Generated from**: \`prisma/schemas/user.prisma\`

\`\`\`prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
\`\`\`

**Generates**: \`${contractUserPackage}\`
- Types: \`User\`, \`CreateUserInput\`, \`UpdateUserInput\`
- Schemas: \`UserSchema\`, \`CreateUserInputSchema\`
- Events: \`UserCreated\`, \`UserUpdated\`

### 2. Provider Layer (Kysely)

**Already generated**: \`${providerKyselyPackage}\`

Provides low-level database operations:
- \`get(id)\` - Retrieve by ID
- \`create(data)\` - Insert record
- \`update(id, data)\` - Update record
- \`delete(id)\` - Delete record

### 3. Infrastructure Layer (Database)

**Already generated**: \`${infraDatabasePackage}\`

**Auto-integrates with provider**:
\`\`\`typescript
import { Kysely } from "${providerKyselyPackage}"

export class DatabaseService extends Context.Tag(...)<...>() {
  static readonly Live = Layer.scoped(this, Effect.gen(function* () {
    // Auto-injected provider
    const provider = yield* Kysely

    return {
      // Auto-delegates to provider
      get: (id) => provider.get(id),
      create: (data) => provider.create(data)
    }
  }))
}
\`\`\`

### 4. Data-Access Layer (User Repository)

**Generate with**: \`mlg generate data-access user\`

\`\`\`typescript
import { DatabaseService } from "${infraDatabasePackage}"
import { UserSchema } from "${contractUserPackage}"

export class UserRepository extends Context.Tag(...)<...>() {
  static readonly Live = Layer.effect(this, Effect.gen(function* () {
    const db = yield* DatabaseService

    return {
      findByEmail: (email) =>
        db.findByCriteria({ email }, 0, 1)
          .pipe(Effect.map((results) => results[0]))
    }
  }))
}
\`\`\`

### 5. Feature Layer (User Service)

**Generate with**: \`mlg generate feature user-management\`

\`\`\`typescript
import { UserRepository } from "${dataAccessUserPackage}"

export class UserService extends Context.Tag(...)<...>() {
  static readonly Live = Layer.effect(this, Effect.gen(function* () {
    const repo = yield* UserRepository

    return {
      registerUser: (email, name) =>
        Effect.gen(function* () {
          // Business logic
          const existing = yield* repo.findByEmail(email)
          if (existing) {
            return yield* Effect.fail(new UserAlreadyExists({ email }))
          }

          return yield* repo.create({ email, name })
        })
    }
  }))
}
\`\`\`

## Layer Composition

The magic happens when composing layers:

\`\`\`typescript
// Complete application layer
const AppLayer =
  UserService.Live.pipe(
    Layer.provide(UserRepository.Live),
    Layer.provide(DatabaseService.Live),
    Layer.provide(Kysely.Live)
  )

// Use in application
const program = Effect.gen(function* () {
  const userService = yield* UserService
  const user = yield* userService.registerUser("alice@example.com", "Alice")
  return user
})

// Run with all dependencies
program.pipe(
  Effect.provide(AppLayer),
  Effect.runPromise
)
\`\`\`

## Running the Example

### Quick Start

\`\`\`bash
# 1. Install dependencies
pnpm install

# 2. Build all libraries
pnpm build

# 3. Run the example
tsx examples/app.ts
\`\`\`

### Step-by-Step Setup

\`\`\`bash
# 1. Create Prisma schema
cp examples/user.prisma prisma/schemas/user.prisma

# 2. Generate contract library
pnpm prisma:generate

# 3. Generate data-access library
mlg generate data-access user

# 4. Generate feature library
mlg generate feature user-management --includeClientServer

# 5. Update examples/app.ts to use generated libraries

# 6. Run the example
tsx examples/app.ts
\`\`\`

## Key Patterns

### 1. Dependency Injection

\`\`\`typescript
Effect.gen(function* () {
  // Inject service via yield*
  const service = yield* SomeService

  // Use service
  const result = yield* service.doSomething()
})
\`\`\`

### 2. Layer Composition

\`\`\`typescript
// Provide dependencies bottom-up
const layer = TopLayer.pipe(
  Layer.provide(MiddleLayer),
  Layer.provide(BottomLayer)
)
\`\`\`

### 3. Error Handling

\`\`\`typescript
Effect.gen(function* () {
  const result = yield* riskyOperation.pipe(
    Effect.catchTag("NotFoundError", () =>
      Effect.succeed(null)
    )
  )
})
\`\`\`

### 4. Effect Composition

\`\`\`typescript
const composed = operation1.pipe(
  Effect.flatMap((result1) => operation2(result1)),
  Effect.map((result2) => transform(result2))
)
\`\`\`

## Benefits

### ✅ Type Safety
Every layer is fully typed. TypeScript catches integration errors at compile time.

### ✅ Testability
Each layer can be tested in isolation with mock implementations.

### ✅ Maintainability
Clear separation of concerns makes code easy to understand and modify.

### ✅ Composability
Layers compose together using Effect's Layer system.

### ✅ Automatic Integration
Infrastructure auto-integrates with providers (Phase 2 feature).

## Next Steps

1. **Explore Generated Code**: Check out \`libs/provider/\`, \`libs/infra/\`
2. **Create Your Domain**: Add Prisma schemas in \`prisma/schemas/\`
3. **Generate Layers**: Use \`mlg generate\` commands
4. **Build Features**: Compose layers to create business logic
5. **Deploy**: All libraries are production-ready

## Resources

- **Architecture Guide**: See ARCHITECTURE.md
- **Effect Patterns**: See EFFECT_PATTERNS.md (in generated libraries)
- **Integration Audit**: See /tmp/audit-init/INTEGRATION_AUDIT.md

---

Generated by: \`mlg init --includePrisma\`
`

    yield* fs.writeFileString("examples/README.md", readme)
    yield* Console.log("  ✓ Created examples/README.md")

    yield* Console.log("")
    yield* Console.log("✨ Integration example generated!")
    yield* Console.log("")
    yield* Console.log("📁 Files created:")
    yield* Console.log("  - examples/app.ts - Complete 5-layer example")
    yield* Console.log("  - examples/README.md - Integration guide")
    yield* Console.log("  - examples/user.prisma - Example schema")
    yield* Console.log("")
  })
}
