# Architecture Guide for AI Agents

**Purpose**: This document provides comprehensive architectural guidance for AI agents working in Effect.ts monorepos generated with the library generator. Copy this file to your monorepo's `libs/AGENTS.md` or root `AGENTS.md` to help AI understand your codebase architecture.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Library Types and Roles](#library-types-and-roles)
3. [Architectural Principles](#architectural-principles)
4. [Design Decisions and Rationale](#design-decisions-and-rationale)
5. [Integration Patterns](#integration-patterns)
6. [Maintenance Patterns](#maintenance-patterns)
7. [Development Workflow](#development-workflow)
8. [Common Patterns](#common-patterns)
9. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
10. [References](#references)

---

## Architecture Overview

This monorepo follows a **layered architecture** using Effect.ts patterns with five library types:

```
┌────────────────────────────────────────────────────────────────┐
│                    Application Layer                           │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  feature/*                                                │ │
│  │  Role: Orchestrate business logic, compose services      │ │
│  │  Pattern: Service Layer (Application Logic)              │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────┬────────────────────────────────────────┘
                        │ depends on
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│data-access/* │ │   infra/*    │ │  provider/*  │
│              │ │              │ │              │
│Role: Persist │ │Role: Cross-  │ │Role: Wrap    │
│domain data   │ │cutting       │ │external SDKs │
│              │ │services      │ │              │
│Pattern:      │ │Pattern:      │ │Pattern:      │
│Repository    │ │Infrastructure│ │Adapter       │
└──────┬───────┘ └──────────────┘ └──────┬───────┘
       │ depends on                       │
       │                                  │
       └──────────────┐          ┌────────┘
                      │          │
                      ▼          ▼
              ┌──────────────────────┐
              │    contract/*        │
              │                      │
              │ Role: Define domain  │
              │ boundaries & types   │
              │                      │
              │ Pattern: Contract    │
              │ First Architecture   │
              └──────────────────────┘
```

### Dependency Rules

1. **Downward Dependencies Only**: Higher layers depend on lower layers, never upward
2. **Contract as Foundation**: All implementations depend on contract abstractions
3. **No Circular Dependencies**: Libraries form a directed acyclic graph (DAG)
4. **Platform Isolation**: Platform-specific code isolated to appropriate entry points

---

## Library Types and Roles

### 1. Contract Libraries (`libs/contract/*`)

**Role**: Define domain boundaries with type-safe contracts (the "what")

**Responsibility**:
- Domain entities (Effect Schema)
- Domain errors (Data.TaggedError)
- Service interfaces (Context.Tag)
- Domain events
- CQRS definitions (optional)
- RPC schemas (optional)

**Key Characteristics**:
- **Type-Only**: No runtime code, only TypeScript types and schemas
- **Platform-Agnostic**: No Node.js or browser dependencies
- **Zero Business Logic**: Pure declarations, no implementations
- **Stable API**: Changes here affect all dependent libraries

**Example**:
```typescript
// libs/contract/user/src/lib/entities.ts
export const User = Schema.Struct({
  id: Schema.String.pipe(Schema.uuid()),
  email: Schema.String.pipe(Schema.pattern(/^[^@]+@[^@]+\.[^@]+$/)),
  name: Schema.String
})

// libs/contract/user/src/lib/ports.ts
export class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    readonly findById: (id: string) => Effect.Effect<User, UserNotFoundError>
  }
>() {}
```

**When to Create**:
- Starting a new domain (User, Product, Order)
- Defining service boundaries
- Before creating implementations

**Dependencies**: None (foundation layer)

---

### 2. Data-Access Libraries (`libs/data-access/*`)

**Role**: Implement repository pattern for database operations (the "how" for persistence)

**Responsibility**:
- Implement contract repository interfaces
- Database queries and transactions
- Database error mapping to domain errors
- Query builders and fragments
- Connection management (via provider layers)

**Key Characteristics**:
- **Server-Only**: Uses Node.js database clients
- **Contract Implementation**: Validates contract library exists
- **Single Entry Point**: All exports in `index.ts` (no platform split)
- **Effect Layers**: Uses Layer system for dependency injection

**Example**:
```typescript
// libs/data-access/user/src/lib/repository.ts
export const UserRepositoryLive = Layer.effect(
  UserRepository,
  Effect.gen(function*() {
    const db = yield* KyselyService

    return UserRepository.of({
      findById: (id) => Effect.gen(function*() {
        const row = yield* db
          .selectFrom("users")
          .where("id", "=", id)
          .selectAll()
          .executeTakeFirst()

        if (!row) {
          return yield* Effect.fail(new UserNotFoundError({ userId: id }))
        }

        return yield* Schema.decode(User)(row)
      })
    })
  })
)
```

**When to Create**:
- After contract library exists
- Implementing database persistence
- Creating query builders

**Dependencies**:
- `contract/*` (required)
- `provider/*` (database clients like kysely, postgres)

---

### 3. Feature Libraries (`libs/feature/*`)

**Role**: Orchestrate business logic by composing services (the "how" for use cases)

**Responsibility**:
- Implement complex use cases and workflows
- Coordinate multiple repositories and services
- Business rule validation
- Optional RPC endpoints
- Optional React hooks and state management

**Key Characteristics**:
- **Universal Platform**: Can run server, client, or both
- **Service Composition**: Coordinates multiple dependencies
- **Business Logic**: Implements domain rules and workflows
- **Platform Exports**: Can export server.ts, client.ts, edge.ts

**Example**:
```typescript
// libs/feature/payment/src/lib/server/service.ts
export const processPayment = (amount: number, customerId: string) =>
  Effect.gen(function*() {
    // Orchestrate multiple services
    const paymentRepo = yield* PaymentRepository
    const stripe = yield* StripeService
    const logger = yield* LoggingService

    // 1. Charge via Stripe
    const charge = yield* stripe.createCharge({ amount, customerId })

    // 2. Persist payment
    const payment = yield* paymentRepo.create({
      chargeId: charge.id,
      amount,
      status: "completed"
    })

    // 3. Log audit trail
    yield* logger.info(`Payment processed: ${payment.id}`)

    return payment
  })
```

**When to Create**:
- Implementing complex business workflows
- Coordinating multiple services
- Creating API endpoints (with RPC)
- Building React features (with client hooks)

**Dependencies**:
- `contract/*` (types and interfaces)
- `data-access/*` (repositories)
- `infra/*` (logging, cache, metrics)
- `provider/*` (external services)

---

### 4. Infrastructure Libraries (`libs/infra/*`)

**Role**: Provide cross-cutting infrastructure services

**Responsibility**:
- Cache abstraction (Redis, in-memory, localStorage)
- Logging service (structured logging)
- Metrics collection (counters, gauges, histograms)
- Configuration management (type-safe env vars)
- Storage abstraction (S3, filesystem, browser)

**Key Characteristics**:
- **Interface-First**: Define Context.Tag with multiple implementations
- **Platform-Agnostic**: Can support server, client, or both
- **Configuration as Layer**: Uses Effect Config
- **Multiple Implementations**: Redis cache, memory cache, etc.

**Example**:
```typescript
// libs/infra/cache/src/lib/service/interface.ts
export class CacheService extends Context.Tag("CacheService")<
  CacheService,
  {
    readonly get: (key: string) => Effect.Effect<Option.Option<string>>
    readonly set: (key: string, value: string, ttl?: number) => Effect.Effect<void>
  }
>() {}

// libs/infra/cache/src/lib/providers/memory.ts
export const CacheServiceMemory = Layer.sync(
  CacheService,
  () => {
    const store = new Map<string, string>()
    return CacheService.of({
      get: (key) => Effect.sync(() => Option.fromNullable(store.get(key))),
      set: (key, value) => Effect.sync(() => { store.set(key, value) })
    })
  }
)
```

**When to Create**:
- Need cross-cutting service (used by multiple features)
- Abstracting infrastructure concerns
- Supporting multiple implementations

**Dependencies**: Minimal (foundation layer for features)

---

### 5. Provider Libraries (`libs/provider/*`)

**Role**: Wrap external service SDKs with Effect-based APIs (Adapter Pattern)

**Responsibility**:
- Convert callback/promise-based SDKs to Effect APIs
- Resource management (connection pooling, cleanup)
- Resilience patterns (retry, circuit breaker, timeout)
- Type-safe configuration
- Health checks

**Key Characteristics**:
- **SDK Wrapping**: Adapts third-party APIs to Effect
- **Scoped Layers**: Uses Layer.scoped for resource cleanup
- **Platform-Specific**: Explicit platform (node, browser, edge)
- **Resilience**: Built-in retry and error handling

**Example**:
```typescript
// libs/provider/stripe/src/lib/service.ts
export const StripeServiceLive = Layer.scoped(
  StripeService,
  Effect.gen(function*() {
    const config = yield* StripeConfig
    const stripe = new Stripe(config.apiKey)

    // Cleanup on scope exit
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => stripe.destroy())
    )

    return StripeService.of({
      createCharge: (req) =>
        Effect.tryPromise({
          try: () => stripe.charges.create(req),
          catch: (error) => new StripeError({ message: String(error) })
        }).pipe(
          Effect.retry(Schedule.exponential("100 millis")),
          Effect.timeout("30 seconds")
        )
    })
  })
)
```

**When to Create**:
- Integrating external service (Stripe, Twilio, SendGrid)
- Wrapping database client (Postgres, Redis, MongoDB)
- Creating resilient API clients

**Dependencies**: External npm packages (SDKs)

---

## Architectural Principles

### 1. Contract-First Architecture

**Principle**: Define contracts (interfaces) before implementations.

**Rationale**:
- **Dependency Inversion**: High-level code depends on abstractions, not concrete implementations
- **Parallel Development**: Teams can work on contracts and implementations simultaneously
- **Testing**: Mock implementations satisfy the same contract as production code
- **Refactoring**: Change implementations without modifying consumers

**Implementation**:
1. Generate contract library first: `nx g contract user`
2. Define entities, errors, and ports
3. Generate implementation: `nx g data-access user`
4. Generator validates contract exists before proceeding

**Example**:
```typescript
// Step 1: Define contract (libs/contract/user)
export class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    readonly findById: (id: string) => Effect.Effect<User, UserNotFoundError>
  }
>() {}

// Step 2: Implement contract (libs/data-access/user)
export const UserRepositoryPostgres = Layer.effect(
  UserRepository,
  /* implementation */
)

// Step 3: Use contract in features (libs/feature/auth)
const program = Effect.gen(function*() {
  const userRepo = yield* UserRepository  // Depends on abstraction
  return yield* userRepo.findById("user-123")
})
```

**References**:
- Dependency Inversion Principle: https://en.wikipedia.org/wiki/Dependency_inversion_principle
- Contract Testing: https://martinfowler.com/bliki/ContractTest.html

---

### 2. Layered Composition with Effect Layers

**Principle**: Use Effect's Layer system for declarative dependency injection.

**Rationale**:
- **Compile-Time Safety**: Missing dependencies cause TypeScript errors
- **Composability**: Layers compose via `Layer.provide()` and `Layer.merge()`
- **Resource Management**: Scoped layers handle acquire/release automatically
- **Testing**: Swap layers for mocks without code changes

**Implementation**:
```typescript
// Define service
export class UserRepository extends Context.Tag("UserRepository")</*...*/> {}

// Create layer
export const UserRepositoryLive = Layer.effect(UserRepository, /* impl */)

// Compose layers
const AppLayer = Layer.mergeAll(
  UserRepositoryLive,
  PaymentServiceLive,
  StripeServiceLive,
  CacheServiceMemory
)

// Provide to program
const program = Effect.gen(function*() {
  const userRepo = yield* UserRepository  // Automatic injection
  const payment = yield* PaymentService
  // ...
}).pipe(Effect.provide(AppLayer))
```

**References**:
- Effect Layer Documentation: https://effect.website/docs/context-management/layers
- Dependency Injection Patterns: https://martinfowler.com/articles/injection.html

---

### 3. Platform-Aware Modularity

**Principle**: Libraries export platform-specific entry points for optimal bundling.

**Rationale**:
- **Bundle Optimization**: Bundlers tree-shake server-only code from client bundles
- **Runtime Safety**: Platform-specific APIs isolated to correct entry points
- **Code Sharing**: Universal libraries work in all environments
- **Edge Compatibility**: Lightweight edge.ts exports for serverless

**Implementation**:

| Entry Point | Purpose | Example Exports |
|-------------|---------|-----------------|
| `index.ts` | Universal exports | Types, schemas, shared utilities |
| `server.ts` | Node.js only | Repositories, database layers, Node.js services |
| `client.ts` | Browser only | React hooks, Jotai atoms, browser storage |
| `edge.ts` | Edge runtime | Middleware, lightweight handlers |

**Platform Matrix**:

| Library Type | index.ts | server.ts | client.ts | edge.ts |
|--------------|----------|-----------|-----------|---------|
| contract | ✅ All | ❌ | ❌ | ❌ |
| data-access | ✅ All | ❌ | ❌ | ❌ |
| feature | ✅ Shared | Optional | Optional | Optional |
| infra | ✅ Shared | Optional | Optional | Optional |
| provider | ✅ Shared | Optional | Optional | Optional |

**Example**:
```typescript
// index.ts (universal)
export * from "./lib/shared/types.js"
export * from "./lib/shared/errors.js"

// server.ts (Node.js only)
export * from "./lib/server/service.js"
export * from "./lib/server/layers.js"

// client.ts (browser only)
export * from "./lib/client/hooks/index.js"
export * from "./lib/client/atoms/index.js"
```

**References**:
- Conditional Exports: https://nodejs.org/api/packages.html#conditional-exports
- Tree Shaking: https://webpack.js.org/guides/tree-shaking/

---

### 4. Type-Driven Development with Effect Schema

**Principle**: Use Effect Schema as single source of truth for types and runtime validation.

**Rationale**:
- **No Duplication**: Schema defines both TypeScript types and validators
- **Guaranteed Sync**: Types and validation can never drift
- **Transformation**: Built-in encoding/decoding for serialization
- **Composition**: Schemas compose and refine with `.pipe()`

**Implementation**:
```typescript
// Define schema (single source of truth)
export const User = Schema.Struct({
  id: Schema.String.pipe(Schema.uuid()),
  email: Schema.String.pipe(Schema.pattern(/^[^@]+@[^@]+\.[^@]+$/)),
  age: Schema.Number.pipe(Schema.int(), Schema.between(18, 120))
})

// Type inference (automatic)
export type User = Schema.Schema.Type<typeof User>

// Runtime validation (automatic)
const decodeUser = Schema.decodeUnknown(User)
const result = decodeUser(unknownData)  // Effect.Effect<User, ParseError>
```

**References**:
- Effect Schema: https://effect.website/docs/schema/introduction
- Runtime Type Validation: https://github.com/moltar/typescript-runtime-type-benchmarks

---

## Design Decisions and Rationale

### Why Context.Tag instead of Plain Interfaces?

**Decision**: Use `Context.Tag` for service definitions.

**Alternative**: Plain TypeScript interfaces with manual DI
```typescript
// ❌ Plain interface (no Effect integration)
interface UserRepository {
  findById(id: string): Promise<User | null>
}

function createService(repo: UserRepository) {
  // Manual dependency injection
}
```

**Rationale**:
- **Compile-Time Safety**: Missing dependencies cause TypeScript errors at build time
- **Type-Safe Errors**: Error channels tracked in type system
- **Automatic Resource Management**: Scoped layers clean up resources
- **Testing**: Swap implementations with `Effect.provide()` (no mocking library needed)

**Pattern**:
```typescript
// Context.Tag definition
export class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    readonly findById: (id: string) => Effect.Effect<User, UserNotFoundError>
  }
>() {}

// Automatic injection
const program = Effect.gen(function*() {
  const repo = yield* UserRepository  // Type-safe injection
  return yield* repo.findById("user-123")
})
```

---

### Why Data.TaggedError instead of Error class?

**Decision**: Use `Data.TaggedError` for domain errors.

**Alternative**: Plain Error classes with `instanceof` checks
```typescript
// ❌ Plain Error (runtime checks, not type-safe)
class UserNotFoundError extends Error {
  constructor(readonly userId: string) {
    super(`User not found: ${userId}`)
  }
}

// Runtime check (not type-safe)
if (error instanceof UserNotFoundError) {
  // Handle...
}
```

**Rationale**:
- **Compile-Time Exhaustiveness**: TypeScript enforces handling all error types
- **Discriminated Unions**: Errors have `_tag` field for pattern matching
- **Type-Safe Access**: Error properties are fully typed
- **Error Channels**: Tracked in Effect type signature

**Pattern**:
```typescript
// Tagged error definition
export class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly userId: string
}> {}

// Type-safe exhaustive handling
result.pipe(
  Effect.catchTags({
    UserNotFoundError: (error) => Effect.succeed(defaultUser),
    UserEmailTakenError: (error) => Effect.fail(new ConflictError())
    // TypeScript error if we forget to handle an error!
  })
)
```

---

### Why Repository Pattern for Data Access?

**Decision**: Centralize data access in repository libraries.

**Alternative**: Direct database access throughout codebase
```typescript
// ❌ Direct database access (scattered, duplicated)
async function getUserOrders(userId: string) {
  const user = await db.query("SELECT * FROM users WHERE id = $1", [userId])
  const orders = await db.query("SELECT * FROM orders WHERE user_id = $1", [userId])
  // Business logic mixed with SQL
}
```

**Rationale**:
- **Separation of Concerns**: Business logic doesn't know about database
- **Testability**: Easy to swap in-memory implementation for tests
- **Centralized Queries**: Reusable query fragments
- **Database Independence**: Can swap databases without changing consumers

**Pattern**:
```typescript
// Repository abstraction
const program = Effect.gen(function*() {
  const userRepo = yield* UserRepository
  const orderRepo = yield* OrderRepository

  const user = yield* userRepo.findById(userId)
  const orders = yield* orderRepo.findByUserId(userId)

  return { user, orders }
})

// Test with in-memory implementation
program.pipe(Effect.provide(UserRepositoryMemory))

// Production with Postgres
program.pipe(Effect.provide(UserRepositoryPostgres))
```

---

### Why Scoped Layers for Providers?

**Decision**: Use `Layer.scoped` for providers managing resources.

**Alternative**: `Layer.succeed` without cleanup
```typescript
// ❌ No cleanup (resource leak)
export const RedisServiceLive = Layer.succeed(
  RedisService,
  RedisService.of({
    get: (key) => Effect.promise(() => client.get(key))
  })
)
// Redis connection never closed!
```

**Rationale**:
- **Resource Safety**: Guarantees cleanup even on errors
- **Connection Pooling**: Proper acquire/release of connections
- **Memory Safety**: No resource leaks
- **Explicit Lifecycle**: Clear acquisition and release points

**Pattern**:
```typescript
// Scoped layer with cleanup
export const RedisServiceLive = Layer.scoped(
  RedisService,
  Effect.gen(function*() {
    const client = yield* Effect.acquireRelease(
      Effect.sync(() => new Redis()),
      (client) => Effect.sync(() => client.disconnect())
    )

    return RedisService.of({
      get: (key) => Effect.tryPromise(() => client.get(key))
    })
  })
)
```

---

## Integration Patterns

### Pattern 1: Feature Orchestrating Multiple Services

**Use Case**: Payment feature needs repositories, external services, and infrastructure.

```typescript
// libs/feature/payment/src/lib/server/service.ts
export const processPayment = (amount: number, customerId: string) =>
  Effect.gen(function*() {
    // Inject all dependencies via yield*
    const paymentRepo = yield* PaymentRepository
    const customerRepo = yield* CustomerRepository
    const stripe = yield* StripeService
    const logger = yield* LoggingService
    const cache = yield* CacheService

    // 1. Validate customer exists
    const customer = yield* customerRepo.findById(customerId)

    // 2. Charge via Stripe
    const charge = yield* stripe.createCharge({
      amount,
      customerId: customer.stripeId
    })

    // 3. Persist payment record
    const payment = yield* paymentRepo.create({
      chargeId: charge.id,
      customerId,
      amount,
      status: "completed"
    })

    // 4. Log audit trail
    yield* logger.info(`Payment processed`, {
      paymentId: payment.id,
      customerId,
      amount
    })

    // 5. Invalidate cache
    yield* cache.delete(`customer:${customerId}:payments`)

    return payment
  })

// libs/feature/payment/src/lib/server/layers.ts
export const PaymentServiceLive = Layer.mergeAll(
  PaymentRepositoryPostgres,
  CustomerRepositoryPostgres,
  StripeServiceLive,
  LoggingServiceLive,
  CacheServiceRedis
)
```

---

### Pattern 2: Repository with Database Provider

**Use Case**: User repository needs database connection.

```typescript
// libs/data-access/user/src/lib/repository.ts
export const UserRepositoryLive = Layer.effect(
  UserRepository,
  Effect.gen(function*() {
    const db = yield* KyselyService  // Inject database

    return UserRepository.of({
      findById: (id) => Effect.gen(function*() {
        const row = yield* db
          .selectFrom("users")
          .where("id", "=", id)
          .selectAll()
          .executeTakeFirst()

        if (!row) {
          return yield* Effect.fail(new UserNotFoundError({ userId: id }))
        }

        return yield* Schema.decode(User)(row)
      })
    })
  })
)

// libs/data-access/user/src/lib/server/layers.ts
export const UserRepositoryPostgres = UserRepositoryLive.pipe(
  Layer.provide(KyselyServiceLive)
)
```

---

### Pattern 3: Testing with Mock Layers

**Use Case**: Test feature without real database or external services.

```typescript
// libs/feature/payment/src/lib/server/service.spec.ts
import { describe, it, expect } from "vitest"

// Mock layers for testing
const MockPaymentRepo = Layer.succeed(
  PaymentRepository,
  PaymentRepository.of({
    create: (data) => Effect.succeed({
      id: "pay_123",
      ...data,
      createdAt: new Date()
    })
  })
)

const MockStripe = Layer.succeed(
  StripeService,
  StripeService.of({
    createCharge: (req) => Effect.succeed({
      id: "ch_123",
      amount: req.amount
    })
  })
)

const MockLogger = Layer.succeed(
  LoggingService,
  LoggingService.of({
    info: () => Effect.void
  })
)

const MockCache = Layer.succeed(
  CacheService,
  CacheService.of({
    delete: () => Effect.void
  })
)

const TestLayer = Layer.mergeAll(
  MockPaymentRepo,
  MockStripe,
  MockLogger,
  MockCache
)

describe("Payment Service", () => {
  it("processes payment successfully", async () => {
    const program = processPayment(1000, "cust_123").pipe(
      Effect.provide(TestLayer)
    )

    const payment = await Effect.runPromise(program)
    expect(payment.amount).toBe(1000)
  })
})
```

---

### Pattern 4: Infrastructure Service with Multiple Implementations

**Use Case**: Cache service with Redis (production) and in-memory (development/testing).

```typescript
// libs/infra/cache/src/lib/service/interface.ts
export class CacheService extends Context.Tag("CacheService")<
  CacheService,
  {
    readonly get: (key: string) => Effect.Effect<Option.Option<string>>
    readonly set: (key: string, value: string, ttl?: number) => Effect.Effect<void>
  }
>() {}

// libs/infra/cache/src/lib/layers/server-layers.ts (Redis)
export const CacheServiceRedis = Layer.scoped(
  CacheService,
  Effect.gen(function*() {
    const redis = yield* RedisService
    return CacheService.of({
      get: (key) => redis.get(key),
      set: (key, value, ttl) => redis.set(key, value, ttl)
    })
  })
)

// libs/infra/cache/src/lib/providers/memory.ts (In-memory)
export const CacheServiceMemory = Layer.sync(
  CacheService,
  () => {
    const store = new Map<string, string>()
    return CacheService.of({
      get: (key) => Effect.sync(() => Option.fromNullable(store.get(key))),
      set: (key, value) => Effect.sync(() => { store.set(key, value) })
    })
  }
)

// Usage: swap implementations based on environment
const CacheLayer = process.env.NODE_ENV === "production"
  ? CacheServiceRedis
  : CacheServiceMemory
```

---

## Maintenance Patterns

### Adding a New Domain

**Steps**:
1. Generate contract library
2. Define entities, errors, and ports
3. Generate data-access library
4. Implement repository
5. Generate feature library (if needed)
6. Implement business logic

**Example**:
```bash
# 1. Create contract
nx g contract product

# 2. Customize contract files
# Edit libs/contract/product/src/lib/entities.ts
# Edit libs/contract/product/src/lib/ports.ts

# 3. Create data-access
nx g data-access product

# 4. Implement repository
# Edit libs/data-access/product/src/lib/repository.ts

# 5. Create feature (if complex logic needed)
nx g feature product-catalog

# 6. Implement feature service
# Edit libs/feature/product-catalog/src/lib/server/service.ts
```

---

### Migrating to New Database Provider

**Steps**:
1. Create new provider library for new database
2. Create new repository implementation using new provider
3. Update layer composition to use new implementation
4. Test with new implementation
5. Deploy and monitor
6. Remove old provider

**Example**:
```bash
# 1. Create new provider (e.g., MongoDB)
nx g provider mongo --externalService="MongoDB"

# 2. Create new repository implementation
# libs/data-access/user/src/lib/repository-mongo.ts
export const UserRepositoryMongo = Layer.effect(
  UserRepository,
  Effect.gen(function*() {
    const mongo = yield* MongoService
    // Implementation using MongoDB
  })
)

# 3. Update layers
// Before
export const AppLayer = Layer.mergeAll(
  UserRepositoryPostgres,
  // ...
)

// After
export const AppLayer = Layer.mergeAll(
  UserRepositoryMongo,  // Swap implementation
  // ...
)
```

---

### Adding Retry Logic to Provider

**Pattern**: Wrap SDK calls with Effect retry schedules.

```typescript
// libs/provider/stripe/src/lib/service.ts
import { Schedule } from "effect"

export const StripeServiceLive = Layer.scoped(
  StripeService,
  Effect.gen(function*() {
    const stripe = new Stripe(apiKey)

    return StripeService.of({
      createCharge: (req) =>
        Effect.tryPromise({
          try: () => stripe.charges.create(req),
          catch: (error) => new StripeError({ message: String(error) })
        }).pipe(
          // Retry with exponential backoff
          Effect.retry(
            Schedule.exponential("100 millis").pipe(
              Schedule.compose(Schedule.recurs(3))  // Max 3 retries
            )
          ),
          // Timeout after 30 seconds
          Effect.timeout("30 seconds")
        )
    })
  })
)
```

---

### Caching Repository Results

**Pattern**: Compose repository with cache layer.

```typescript
// libs/data-access/user/src/lib/repository-cached.ts
export const UserRepositoryCached = Layer.effect(
  UserRepository,
  Effect.gen(function*() {
    const baseRepo = yield* UserRepository
    const cache = yield* CacheService

    return UserRepository.of({
      findById: (id) =>
        Effect.gen(function*() {
          // Check cache first
          const cached = yield* cache.get(`user:${id}`)

          if (Option.isSome(cached)) {
            return yield* Schema.decode(User)(JSON.parse(cached.value))
          }

          // Cache miss: fetch from database
          const user = yield* baseRepo.findById(id)

          // Store in cache
          yield* cache.set(`user:${id}`, JSON.stringify(user), 3600)

          return user
        })
    })
  })
)

// Composition
export const UserRepositoryWithCache = UserRepositoryCached.pipe(
  Layer.provide(UserRepositoryPostgres),
  Layer.provide(CacheServiceRedis)
)
```

---

## Development Workflow

### 1. Implementing a New Feature

**Workflow**:
```
1. Identify contracts needed
   ├─ New domain? → Create contract library
   └─ Existing domain? → Use existing contract

2. Identify data persistence needs
   └─ Create or extend data-access library

3. Identify external services needed
   └─ Create provider libraries for external SDKs

4. Create feature library
   └─ Implement business logic by composing services

5. Write tests
   ├─ Unit tests with mock layers
   └─ Integration tests with real implementations
```

**Example**: Implementing "Send Welcome Email on User Registration"

```bash
# Step 1: Check contracts
# Use existing libs/contract/user

# Step 2: Check data access
# Use existing libs/data-access/user

# Step 3: Create email provider
nx g provider sendgrid --externalService="SendGrid"

# Step 4: Create feature
nx g feature user-registration

# Step 5: Implement service
# libs/feature/user-registration/src/lib/server/service.ts
export const registerUser = (data: CreateUserData) =>
  Effect.gen(function*() {
    const userRepo = yield* UserRepository
    const sendgrid = yield* SendGridService
    const logger = yield* LoggingService

    // 1. Create user
    const user = yield* userRepo.create(data)

    // 2. Send welcome email
    yield* sendgrid.sendEmail({
      to: user.email,
      template: "welcome",
      data: { userName: user.name }
    })

    // 3. Log event
    yield* logger.info("User registered", { userId: user.id })

    return user
  })
```

---

### 2. Debugging Effect Programs

**Pattern**: Use `Effect.tap` and `Effect.tapError` for debugging.

```typescript
const program = Effect.gen(function*() {
  const userRepo = yield* UserRepository

  const user = yield* userRepo.findById("user-123").pipe(
    // Log successful result
    Effect.tap((user) =>
      Effect.sync(() => console.log("Found user:", user))
    ),
    // Log errors
    Effect.tapError((error) =>
      Effect.sync(() => console.error("Error finding user:", error))
    )
  )

  return user
})
```

---

### 3. Adding Telemetry/Observability

**Pattern**: Compose with logging/metrics services.

```typescript
export const processPaymentWithTelemetry = (amount: number, customerId: string) =>
  Effect.gen(function*() {
    const metrics = yield* MetricsService
    const logger = yield* LoggingService

    // Increment counter
    yield* metrics.counter("payment.attempts")

    const startTime = Date.now()

    const payment = yield* processPayment(amount, customerId).pipe(
      Effect.tap(() => {
        // Record success metrics
        const duration = Date.now() - startTime
        return Effect.all([
          metrics.counter("payment.success"),
          metrics.histogram("payment.duration", duration),
          logger.info("Payment successful", { paymentId: payment.id, duration })
        ])
      }),
      Effect.tapError((error) => {
        // Record failure metrics
        return Effect.all([
          metrics.counter("payment.failure"),
          logger.error("Payment failed", error, { customerId, amount })
        ])
      })
    )

    return payment
  })
```

---

## Common Patterns

### Pattern: Transaction Management

```typescript
export const transferFunds = (fromId: string, toId: string, amount: number) =>
  Effect.gen(function*() {
    const db = yield* KyselyService

    return yield* db.transaction().execute(async (trx) => {
      // Debit from account
      const from = yield* trx
        .updateTable("accounts")
        .set({ balance: sql`balance - ${amount}` })
        .where("id", "=", fromId)
        .returningAll()
        .executeTakeFirstOrThrow()

      // Credit to account
      const to = yield* trx
        .updateTable("accounts")
        .set({ balance: sql`balance + ${amount}` })
        .where("id", "=", toId)
        .returningAll()
        .executeTakeFirstOrThrow()

      return { from, to }
    })
  })
```

---

### Pattern: Batch Operations

```typescript
export const createUsers = (users: Array<CreateUserData>) =>
  Effect.gen(function*() {
    const userRepo = yield* UserRepository

    // Process all in parallel
    return yield* Effect.all(
      users.map((data) => userRepo.create(data)),
      { concurrency: 10 }  // Limit concurrency
    )
  })
```

---

### Pattern: Circuit Breaker

```typescript
import { CircuitBreaker } from "effect"

export const ExternalAPIServiceLive = Layer.scoped(
  ExternalAPIService,
  Effect.gen(function*() {
    const breaker = yield* CircuitBreaker.make({
      maxFailures: 5,
      resetTimeout: Duration.seconds(60)
    })

    return ExternalAPIService.of({
      call: (endpoint) =>
        breaker.withCircuitBreaker(
          Effect.tryPromise({
            try: () => fetch(endpoint),
            catch: () => new APIError()
          })
        )
    })
  })
)
```

---

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Direct Database Access in Features

**Bad**:
```typescript
// libs/feature/payment/src/lib/server/service.ts
export const processPayment = Effect.gen(function*() {
  const db = yield* KyselyService

  // ❌ Direct SQL in feature layer
  const payment = yield* db
    .insertInto("payments")
    .values({ amount: 1000 })
    .execute()
})
```

**Good**:
```typescript
export const processPayment = Effect.gen(function*() {
  const paymentRepo = yield* PaymentRepository

  // ✅ Use repository abstraction
  const payment = yield* paymentRepo.create({ amount: 1000 })
})
```

---

### ❌ Anti-Pattern 2: Upward Dependencies

**Bad**:
```typescript
// libs/contract/user/src/lib/ports.ts
import { UserRepositoryPostgres } from "@myorg/data-access-user"  // ❌ Contract depends on implementation!
```

**Good**:
```typescript
// libs/contract/user/src/lib/ports.ts
export class UserRepository extends Context.Tag("UserRepository")</*...*/> {}

// libs/data-access/user/src/lib/repository.ts
import { UserRepository } from "@myorg/contract-user"  // ✅ Implementation depends on contract
```

---

### ❌ Anti-Pattern 3: Missing Resource Cleanup

**Bad**:
```typescript
// ❌ No cleanup (resource leak)
export const RedisServiceLive = Layer.succeed(
  RedisService,
  RedisService.of({
    get: (key) => Effect.promise(() => client.get(key))
  })
)
```

**Good**:
```typescript
// ✅ Scoped layer with cleanup
export const RedisServiceLive = Layer.scoped(
  RedisService,
  Effect.gen(function*() {
    const client = yield* Effect.acquireRelease(
      Effect.sync(() => new Redis()),
      (client) => Effect.sync(() => client.disconnect())
    )

    return RedisService.of({
      get: (key) => Effect.tryPromise(() => client.get(key))
    })
  })
)
```

---

### ❌ Anti-Pattern 4: Exposing Implementation Details

**Bad**:
```typescript
// ❌ Exposing database errors to consumers
export const findUser = (id: string) =>
  db.selectFrom("users").where("id", "=", id).executeTakeFirst()
// If query fails, consumers see Postgres error codes!
```

**Good**:
```typescript
// ✅ Map to domain errors
export const findUser = (id: string) =>
  Effect.tryPromise({
    try: () => db.selectFrom("users").where("id", "=", id).executeTakeFirst(),
    catch: (error) => {
      if (error.code === "CONNECTION_ERROR") {
        return new DatabaseConnectionError({ cause: error })
      }
      return new DatabaseQueryError({ cause: error })
    }
  }).pipe(
    Effect.flatMap((row) =>
      row
        ? Effect.succeed(row)
        : Effect.fail(new UserNotFoundError({ userId: id }))
    )
  )
```

---

## References

### Effect.ts Documentation
- **Effect Website**: https://effect.website
- **Context Management**: https://effect.website/docs/context-management/services
- **Layer System**: https://effect.website/docs/context-management/layers
- **Error Handling**: https://effect.website/docs/error-management/expected-errors
- **Effect Schema**: https://effect.website/docs/schema/introduction
- **Resource Management**: https://effect.website/docs/resource-management/scope

### Design Patterns
- **Domain-Driven Design**: https://martinfowler.com/tags/domain%20driven%20design.html
- **Repository Pattern**: https://martinfowler.com/eaaCatalog/repository.html
- **Service Layer Pattern**: https://martinfowler.com/eaaCatalog/serviceLayer.html
- **Adapter Pattern**: https://refactoring.guru/design-patterns/adapter
- **Dependency Inversion**: https://en.wikipedia.org/wiki/Dependency_inversion_principle

### Architecture
- **Layered Architecture**: https://herbertograca.com/2017/08/03/layered-architecture/
- **Hexagonal Architecture**: https://herbertograca.com/2017/09/14/ports-adapters-architecture/
- **Clean Architecture**: https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html

---

## Summary

This monorepo follows a **layered Effect.ts architecture** with five library types:

1. **contract**: Domain types and interfaces (foundation layer)
2. **data-access**: Repository implementations (persistence layer)
3. **feature**: Business logic orchestration (application layer)
4. **infra**: Cross-cutting services (infrastructure layer)
5. **provider**: External SDK adapters (adapter layer)

**Key Principles**:
- Contract-First Architecture (define interfaces before implementations)
- Layered Composition (use Effect Layers for dependency injection)
- Platform-Aware Modularity (separate server/client/edge exports)
- Type-Driven Development (Effect Schema for types and validation)

**Development Workflow**:
1. Create contract library (define domain)
2. Create data-access library (implement persistence)
3. Create provider libraries (wrap external services)
4. Create feature library (orchestrate business logic)
5. Test with mock layers (fast unit tests)

Copy this file to your monorepo to help AI agents understand your architecture!
