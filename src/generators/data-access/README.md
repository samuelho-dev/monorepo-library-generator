# Data-Access Library Generator

Generate repository-oriented data access libraries that implement contract interfaces with type-safe database queries using Effect.ts patterns.

## Purpose

Data-access libraries implement the **Repository Pattern** for database operations:
- Implement contract library interfaces (Contract-First Architecture)
- Provide type-safe query builders using Effect
- Manage database transactions and connections
- Wrap database errors in domain errors
- Enable testing with in-memory implementations

## Design Rationale

### Why Repository Pattern?

**Problem**: Direct database access scattered throughout the codebase leads to:
- Duplicated query logic
- Tight coupling to database technology
- Difficult testing (can't mock database easily)
- Business logic mixed with persistence logic

**Solution**: Repository pattern centralizes data access:

```typescript
// ❌ BAD: Direct database access in business logic
async function getUserOrders(userId: string) {
  const user = await db.query("SELECT * FROM users WHERE id = $1", [userId])
  const orders = await db.query("SELECT * FROM orders WHERE user_id = $1", [userId])
  // Business logic mixed with SQL
}

// ✅ GOOD: Repository abstraction
const program = Effect.gen(function*() {
  const userRepo = yield* UserRepository
  const orderRepo = yield* OrderRepository

  const user = yield* userRepo.findById(userId)
  const orders = yield* orderRepo.findByUserId(userId)

  return { user, orders }
})
```

**Benefits**:
1. **Separation of Concerns**: Business logic doesn't know about SQL/database
2. **Testability**: Easy to swap in-memory implementation for tests
3. **Centralized Query Logic**: Reusable query fragments
4. **Database Independence**: Can swap databases without changing consumers

### Why Contract-First Validation?

The generator **validates that the corresponding contract library exists** before proceeding:

```typescript
const contractLibPath = `libs/contract/${options.fileName}`;
if (!tree.exists(contractLibPath)) {
  console.warn('WARNING: Contract library not found. Contract-First Architecture requires contract to exist first.')
}
```

**Rationale**:
- Enforces dependency inversion (implementation depends on contract)
- Prevents creating repositories without defined interfaces
- Ensures type safety between contract and implementation
- Documents the architectural pattern through tooling

### Why Server-Only (No Platform Split)?

Data-access libraries are tagged with `platform:server` but export everything from `index.ts` (no separate `server.ts`):

**Rationale**:
- Database clients are inherently Node.js-only (Postgres, MySQL drivers)
- No client-side variant exists (can't run database queries in browser)
- Simplifies imports: `import { UserRepository } from "@myorg/data-access-user"`
- Clear architectural boundary: data-access is always server-side

### Why Effect Query Composition?

Traditional approach (raw SQL strings):
```typescript
// ❌ Unsafe: SQL injection risk, no type checking
const query = `SELECT * FROM users WHERE email = '${email}'`
const results = await db.query(query)
```

Effect approach (composable query builders):
```typescript
// ✅ Safe: Type-checked, composable, SQL injection-proof
const program = Effect.gen(function*() {
  const db = yield* KyselyService

  const user = yield* db
    .selectFrom("users")
    .where("email", "=", email)
    .selectAll()
    .executeTakeFirst()

  if (!user) {
    return yield* Effect.fail(new UserNotFoundError({ userId: email }))
  }

  return yield* Schema.decode(User)(user)
})
```

**Benefits**:
- **Type Safety**: Column names and types are checked at compile time
- **Composition**: Queries compose via Effect.gen
- **Error Handling**: Database errors become typed Effect errors
- **Validation**: Effect Schema validates database rows match domain types

## Generated Files

### Core Files (Always Generated)

#### `lib/shared/types.ts`
Database-specific types and query filters.

**Purpose**: Define types used by queries but not exposed in contracts.

**Example**:
```typescript
import { Schema } from "effect"

/**
 * Database row type (matches table schema)
 */
export interface UserRow {
  readonly id: string
  readonly email: string
  readonly name: string
  readonly role: string
  readonly created_at: Date
  readonly updated_at: Date
}

/**
 * Query filter options
 */
export const UserFilter = Schema.Struct({
  role: Schema.optional(Schema.Literal("admin", "user", "guest")),
  createdAfter: Schema.optional(Schema.Date),
  limit: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.positive())),
  offset: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.nonNegative()))
})

export type UserFilter = Schema.Schema.Type<typeof UserFilter>
```

**Best Practices**:
- Keep database types separate from domain types (different concerns)
- Use snake_case for database columns (database convention)
- Document database constraints (indexes, foreign keys)

#### `lib/shared/errors.ts`
Repository-specific errors.

**Purpose**: Errors specific to database operations (not domain errors from contract).

**Example**:
```typescript
import { Data } from "effect"

/**
 * Database connection error
 */
export class DatabaseConnectionError extends Data.TaggedError("DatabaseConnectionError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

/**
 * Database query error (syntax, constraint violations)
 */
export class DatabaseQueryError extends Data.TaggedError("DatabaseQueryError")<{
  readonly message: string
  readonly query?: string
  readonly cause?: unknown
}> {}

/**
 * Database transaction error
 */
export class DatabaseTransactionError extends Data.TaggedError("DatabaseTransactionError")<{
  readonly message: string
  readonly operation: string
  readonly cause?: unknown
}> {}
```

**Best Practices**:
- Use repository errors for infrastructure failures
- Use domain errors (from contract) for business rule violations
- Include `cause` field for debugging (original database error)

#### `lib/shared/validation.ts`
Input validation using Effect Schema.

**Purpose**: Validate repository method inputs before database operations.

**Example**:
```typescript
import { Schema } from "effect"

/**
 * Validate user ID format (UUID)
 */
export const validateUserId = Schema.decodeUnknown(
  Schema.String.pipe(Schema.uuid())
)

/**
 * Validate pagination parameters
 */
export const PaginationParams = Schema.Struct({
  limit: Schema.Number.pipe(
    Schema.int(),
    Schema.between(1, 100),
    Schema.withDefault(() => 20)
  ),
  offset: Schema.Number.pipe(
    Schema.int(),
    Schema.nonNegative(),
    Schema.withDefault(() => 0)
  )
})

export type PaginationParams = Schema.Schema.Type<typeof PaginationParams>
```

**Best Practices**:
- Validate inputs at repository boundary
- Use Schema.withDefault for optional parameters
- Fail fast with validation errors (before database query)

#### `lib/queries.ts`
Reusable query fragments and builders.

**Purpose**: Centralize common query patterns for reuse.

**Example**:
```typescript
import { Effect } from "effect"
import type { Kysely } from "kysely"
import type { Database } from "./types.js"

/**
 * Base user query with common joins
 */
export const baseUserQuery = (db: Kysely<Database>) =>
  db
    .selectFrom("users")
    .select([
      "users.id",
      "users.email",
      "users.name",
      "users.role",
      "users.created_at",
      "users.updated_at"
    ])

/**
 * Find user by ID (reusable fragment)
 */
export const findUserById = (db: Kysely<Database>, id: string) =>
  Effect.tryPromise({
    try: () => baseUserQuery(db)
      .where("users.id", "=", id)
      .executeTakeFirst(),
    catch: (error) => new DatabaseQueryError({
      message: "Failed to find user by ID",
      cause: error
    })
  })

/**
 * Find users by role (reusable fragment)
 */
export const findUsersByRole = (
  db: Kysely<Database>,
  role: string,
  limit = 20
) =>
  Effect.tryPromise({
    try: () => baseUserQuery(db)
      .where("users.role", "=", role)
      .limit(limit)
      .execute(),
    catch: (error) => new DatabaseQueryError({
      message: "Failed to find users by role",
      cause: error
    })
  })
```

**Best Practices**:
- Extract common query patterns
- Compose complex queries from simple fragments
- Wrap queries in Effect for error handling
- Document query performance considerations (indexes needed)

#### `lib/repository.ts`
Repository implementation with Context.Tag.

**Purpose**: Implement the contract interface using database queries.

**Example**:
```typescript
import { Context, Effect, Layer } from "effect"
import { Schema } from "effect"
import { UserRepository } from "@myorg/contract-user"
import { KyselyService } from "@myorg/provider-kysely"
import type { User, CreateUserData } from "@myorg/contract-user"
import { UserNotFoundError, UserEmailTakenError } from "@myorg/contract-user"
import { DatabaseConnectionError, DatabaseQueryError } from "./shared/errors.js"
import { findUserById } from "./queries.js"

/**
 * PostgreSQL implementation of UserRepository
 */
export const UserRepositoryLive = Layer.effect(
  UserRepository,
  Effect.gen(function*() {
    const db = yield* KyselyService

    return UserRepository.of({
      findById: (id: string) =>
        Effect.gen(function*() {
          const row = yield* findUserById(db, id)

          if (!row) {
            return yield* Effect.fail(
              new UserNotFoundError({ userId: id })
            )
          }

          // Validate database row matches domain schema
          return yield* Schema.decode(User)(row)
        }),

      create: (data: CreateUserData) =>
        Effect.gen(function*() {
          const row = yield* Effect.tryPromise({
            try: () => db
              .insertInto("users")
              .values({
                id: crypto.randomUUID(),
                email: data.email,
                name: data.name,
                role: data.role,
                created_at: new Date(),
                updated_at: new Date()
              })
              .returningAll()
              .executeTakeFirstOrThrow(),
            catch: (error) => {
              // Check for unique constraint violation (email already exists)
              if (error.code === "23505") {
                return new UserEmailTakenError({ email: data.email })
              }
              return new DatabaseQueryError({
                message: "Failed to create user",
                cause: error
              })
            }
          })

          return yield* Schema.decode(User)(row)
        }),

      update: (id: string, updates: Partial<User>) =>
        Effect.gen(function*() {
          const row = yield* Effect.tryPromise({
            try: () => db
              .updateTable("users")
              .set({
                ...updates,
                updated_at: new Date()
              })
              .where("id", "=", id)
              .returningAll()
              .executeTakeFirstOrThrow(),
            catch: (error) =>
              new DatabaseQueryError({
                message: "Failed to update user",
                cause: error
              })
          })

          return yield* Schema.decode(User)(row)
        }),

      delete: (id: string) =>
        Effect.gen(function*() {
          const result = yield* Effect.tryPromise({
            try: () => db
              .deleteFrom("users")
              .where("id", "=", id)
              .executeTakeFirst(),
            catch: (error) =>
              new DatabaseQueryError({
                message: "Failed to delete user",
                cause: error
              })
          })

          if (result.numDeletedRows === 0n) {
            return yield* Effect.fail(
              new UserNotFoundError({ userId: id })
            )
          }

          return void 0
        })
    })
  })
)
```

**Best Practices**:
- Use Layer.effect (not Layer.succeed) for async setup
- Validate database rows with Schema.decode (safety check)
- Map database errors to domain errors (UserNotFoundError)
- Use Effect.gen for readable query composition
- Handle constraint violations explicitly (unique, foreign key)

#### `lib/server/layers.ts`
Layer compositions for dependency injection.

**Purpose**: Compose repository layer with database provider layer.

**Example**:
```typescript
import { Layer } from "effect"
import { UserRepositoryLive } from "../repository.js"
import { KyselyServiceLive } from "@myorg/provider-kysely"

/**
 * Complete user repository layer with database dependency
 */
export const UserRepositoryPostgres = UserRepositoryLive.pipe(
  Layer.provide(KyselyServiceLive)
)

/**
 * In-memory implementation for testing
 */
export const UserRepositoryMemory = Layer.succeed(
  UserRepository,
  UserRepository.of({
    findById: (id) => {
      const store = new Map<string, User>()
      const user = store.get(id)
      return user
        ? Effect.succeed(user)
        : Effect.fail(new UserNotFoundError({ userId: id }))
    },
    // ... other methods
  })
)
```

**Best Practices**:
- Provide production layer with database dependency
- Provide test layer with in-memory implementation
- Use Layer.provide to compose dependencies
- Document layer dependencies in JSDoc

### Test Files (Always Generated)

#### `lib/repository.spec.ts`
Unit tests for repository methods.

**Example**:
```typescript
import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { UserRepository } from "@myorg/contract-user"
import { UserRepositoryMemory } from "./server/layers.js"

describe("UserRepository", () => {
  it("finds user by ID", async () => {
    const program = Effect.gen(function*() {
      const repo = yield* UserRepository
      const user = yield* repo.findById("user-123")
      return user
    }).pipe(Effect.provide(UserRepositoryMemory))

    const user = await Effect.runPromise(program)
    expect(user.id).toBe("user-123")
  })

  it("fails when user not found", async () => {
    const program = Effect.gen(function*() {
      const repo = yield* UserRepository
      return yield* repo.findById("nonexistent")
    }).pipe(Effect.provide(UserRepositoryMemory))

    await expect(Effect.runPromise(program)).rejects.toThrow()
  })
})
```

#### `lib/layers.spec.ts`
Integration tests for layer composition.

**Example**:
```typescript
import { describe, it, expect } from "vitest"
import { Effect, Layer } from "effect"
import { UserRepository } from "@myorg/contract-user"
import { UserRepositoryPostgres } from "./server/layers.js"

describe("UserRepository Layers", () => {
  it("composes with database layer", async () => {
    const program = Effect.gen(function*() {
      const repo = yield* UserRepository
      return yield* repo.findById("user-123")
    })

    // Test that layer composes correctly
    const testLayer = Layer.mergeAll(UserRepositoryPostgres)
    const result = program.pipe(Effect.provide(testLayer))

    expect(result).toBeDefined()
  })
})
```

## Usage

### Basic Usage

1. **Generate contract first**:
   ```bash
   pnpm exec nx g @tools/workspace-plugin:contract user
   ```

2. **Define contract interface** in `libs/contract/user/src/lib/ports.ts`:
   ```typescript
   export class UserRepository extends Context.Tag("UserRepository")<
     UserRepository,
     {
       readonly findById: (id: string) => Effect.Effect<User, UserNotFoundError>
     }
   >() {}
   ```

3. **Generate data-access**:
   ```bash
   pnpm exec nx g @tools/workspace-plugin:data-access user
   ```

4. **Implement repository** in `libs/data-access/user/src/lib/repository.ts`:
   ```typescript
   export const UserRepositoryLive = Layer.effect(
     UserRepository,
     Effect.gen(function*() {
       const db = yield* KyselyService
       return UserRepository.of({
         findById: (id) => /* implementation */
       })
     })
   )
   ```

5. **Use in feature**:
   ```typescript
   const program = Effect.gen(function*() {
     const userRepo = yield* UserRepository
     return yield* userRepo.findById("user-123")
   }).pipe(Effect.provide(UserRepositoryPostgres))
   ```

### With Database Provider

Compose with database provider layer:

```typescript
import { Layer } from "effect"
import { UserRepositoryLive } from "@myorg/data-access-user"
import { KyselyServiceLive } from "@myorg/provider-kysely"

// Production layer with real database
export const UserRepositoryPostgres = UserRepositoryLive.pipe(
  Layer.provide(KyselyServiceLive)
)
```

### Testing with In-Memory

Swap implementation for tests:

```typescript
// Production code
const program = Effect.gen(function*() {
  const userRepo = yield* UserRepository
  const orderRepo = yield* OrderRepository

  const user = yield* userRepo.findById(userId)
  const orders = yield* orderRepo.findByUserId(userId)

  return { user, orders }
})

// Test with in-memory implementations
const testLayer = Layer.mergeAll(
  UserRepositoryMemory,
  OrderRepositoryMemory
)

const result = await Effect.runPromise(
  program.pipe(Effect.provide(testLayer))
)
```

## Architecture Decisions

### Why Layer.effect vs Layer.succeed?

**Layer.succeed**: Synchronous layer creation
```typescript
// ❌ BAD: Database connection is async but using succeed
export const UserRepositoryLive = Layer.succeed(
  UserRepository,
  UserRepository.of({ /* implementation */ })
)
```

**Layer.effect**: Asynchronous layer creation
```typescript
// ✅ GOOD: Database connection is properly async
export const UserRepositoryLive = Layer.effect(
  UserRepository,
  Effect.gen(function*() {
    const db = yield* KyselyService  // Async dependency injection
    return UserRepository.of({ /* implementation */ })
  })
)
```

**Rationale**:
- Database providers are async (connection pooling, initialization)
- Layer.effect supports yielding dependencies
- Proper resource management (acquire/release)

### Why Validate Database Rows?

```typescript
// Without validation (unsafe)
const row = yield* db.selectFrom("users").selectAll().executeTakeFirst()
return row  // What if database schema changed?

// With validation (safe)
const row = yield* db.selectFrom("users").selectAll().executeTakeFirst()
return yield* Schema.decode(User)(row)  // TypeScript + runtime check
```

**Rationale**:
- Database schema and domain types can drift
- Schema validation catches mismatches at runtime
- Provides clear error messages for data issues
- Documents the contract between database and domain

### Why Map Database Errors to Domain Errors?

```typescript
// ❌ BAD: Expose database implementation details
catch: (error) => error  // Exposes Postgres error codes

// ✅ GOOD: Map to domain errors
catch: (error) => {
  if (error.code === "23505") {  // Unique constraint
    return new UserEmailTakenError({ email: data.email })
  }
  return new DatabaseQueryError({ message: "Failed", cause: error })
}
```

**Rationale**:
- Consumers shouldn't know about database technology
- Domain errors communicate business meaning
- Easy to change database without breaking consumers
- Preserves architectural boundaries

## Testing Patterns

### Repository Unit Tests

Test repository methods with mocked dependencies:

```typescript
const MockKyselyService = Layer.succeed(
  KyselyService,
  createMockDatabase()
)

const testLayer = UserRepositoryLive.pipe(
  Layer.provide(MockKyselyService)
)

const program = Effect.gen(function*() {
  const repo = yield* UserRepository
  return yield* repo.findById("user-123")
}).pipe(Effect.provide(testLayer))

await Effect.runPromise(program)
```

### Integration Tests

Test with real database (Docker container):

```typescript
import { setupTestDatabase, teardownTestDatabase } from "./test-utils.js"

beforeAll(async () => {
  await setupTestDatabase()
})

afterAll(async () => {
  await teardownTestDatabase()
})

it("creates user in database", async () => {
  const program = Effect.gen(function*() {
    const repo = yield* UserRepository
    return yield* repo.create({
      email: "test@example.com",
      name: "Test User",
      role: "user"
    })
  }).pipe(Effect.provide(UserRepositoryPostgres))

  const user = await Effect.runPromise(program)
  expect(user.email).toBe("test@example.com")
})
```

### Property-Based Testing

Test repository invariants with fast-check:

```typescript
import { fc } from "@fast-check/vitest"

fc.test.prop([fc.uuid()])(
  "findById returns same user when called twice",
  async (userId) => {
    const program = Effect.gen(function*() {
      const repo = yield* UserRepository
      const user1 = yield* repo.findById(userId)
      const user2 = yield* repo.findById(userId)
      return user1.id === user2.id
    }).pipe(Effect.provide(UserRepositoryMemory))

    const result = await Effect.runPromise(program)
    expect(result).toBe(true)
  }
)
```

## Migration Patterns

### From Existing Repository

Migrate existing repository to Effect pattern:

```typescript
// Before (callback-based)
class UserRepository {
  async findById(id: string): Promise<User | null> {
    const row = await this.db.query("SELECT * FROM users WHERE id = $1", [id])
    return row[0] || null
  }
}

// After (Effect-based)
export const UserRepositoryLive = Layer.effect(
  UserRepository,
  Effect.gen(function*() {
    const db = yield* KyselyService

    return UserRepository.of({
      findById: (id) =>
        Effect.gen(function*() {
          const row = yield* Effect.tryPromise({
            try: () => db
              .selectFrom("users")
              .where("id", "=", id)
              .selectAll()
              .executeTakeFirst(),
            catch: (error) => new DatabaseQueryError({ message: String(error) })
          })

          if (!row) {
            return yield* Effect.fail(new UserNotFoundError({ userId: id }))
          }

          return yield* Schema.decode(User)(row)
        })
    })
  })
)
```

## References

- **Repository Pattern**: https://martinfowler.com/eaaCatalog/repository.html
- **Effect Layers**: https://effect.website/docs/context-management/layers
- **Effect Error Handling**: https://effect.website/docs/error-management/expected-errors
- **Kysely Query Builder**: https://kysely.dev
- **Effect Schema**: https://effect.website/docs/schema/introduction
- **Database Testing Patterns**: https://martinfowler.com/articles/practical-test-pyramid.html
