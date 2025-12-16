# Integration Example: 5-Layer Architecture

This example demonstrates how all 5 layers of the architecture work together.

## Architecture Layers

```
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
```

## Integration Flow

### 1. Contract Layer (Domain Types)

**Generated from**: `prisma/schemas/user.prisma`

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Generates**: `@custom-repo/contract-user`
- Types: `User`, `CreateUserInput`, `UpdateUserInput`
- Schemas: `UserSchema`, `CreateUserInputSchema`
- Events: `UserCreated`, `UserUpdated`

### 2. Provider Layer (Kysely)

**Already generated**: `@custom-repo/provider-kysely`

Provides low-level database operations:
- `get(id)` - Retrieve by ID
- `create(data)` - Insert record
- `update(id, data)` - Update record
- `delete(id)` - Delete record

### 3. Infrastructure Layer (Database)

**Already generated**: `@custom-repo/infra-database`

**Auto-integrates with provider**:
```typescript
import { Kysely } from "@custom-repo/provider-kysely"

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
```

### 4. Data-Access Layer (User Repository)

**Generate with**: `mlg generate data-access user`

```typescript
import { DatabaseService } from "@custom-repo/infra-database"
import { UserSchema } from "@custom-repo/contract-user"

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
```

### 5. Feature Layer (User Service)

**Generate with**: `mlg generate feature user-management`

```typescript
import { UserRepository } from "@custom-repo/data-access-user"

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
```

## Layer Composition

The magic happens when composing layers:

```typescript
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
```

## Running the Example

### Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Build all libraries
pnpm build

# 3. Run the example
tsx examples/app.ts
```

### Step-by-Step Setup

```bash
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
```

## Key Patterns

### 1. Dependency Injection

```typescript
Effect.gen(function* () {
  // Inject service via yield*
  const service = yield* SomeService

  // Use service
  const result = yield* service.doSomething()
})
```

### 2. Layer Composition

```typescript
// Provide dependencies bottom-up
const layer = TopLayer.pipe(
  Layer.provide(MiddleLayer),
  Layer.provide(BottomLayer)
)
```

### 3. Error Handling

```typescript
Effect.gen(function* () {
  const result = yield* riskyOperation.pipe(
    Effect.catchTag("NotFoundError", () =>
      Effect.succeed(null)
    )
  )
})
```

### 4. Effect Composition

```typescript
const composed = operation1.pipe(
  Effect.flatMap((result1) => operation2(result1)),
  Effect.map((result2) => transform(result2))
)
```

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

1. **Explore Generated Code**: Check out `libs/provider/`, `libs/infra/`
2. **Create Your Domain**: Add Prisma schemas in `prisma/schemas/`
3. **Generate Layers**: Use `mlg generate` commands
4. **Build Features**: Compose layers to create business logic
5. **Deploy**: All libraries are production-ready

## Resources

- **Architecture Guide**: See ARCHITECTURE.md
- **Effect Patterns**: See EFFECT_PATTERNS.md (in generated libraries)
- **Integration Audit**: See /tmp/audit-init/INTEGRATION_AUDIT.md

---

Generated by: `mlg init --includePrisma`
