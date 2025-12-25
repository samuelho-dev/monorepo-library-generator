# Architecture Overview - Monorepo

> **📚 Related Documentation:**
>
> - [Effect Patterns Guide](./EFFECT_PATTERNS.md) - Effect.ts patterns and best practices
> - [Nx Standards](./NX_STANDARDS.md) - Naming conventions and workspace organization
> - [Export Patterns Guide](./EXPORT_PATTERNS.md) - Platform-aware exports and barrel patterns
> - [Contract Libraries](./CONTRACT.md) - Domain interfaces and ports
> - [Data-Access Libraries](./DATA-ACCESS.md) - Repository implementations
> - [Feature Libraries](./FEATURE.md) - Business logic and services
> - [Infrastructure Libraries](./INFRA.md) - Cross-cutting concerns
> - [Provider Libraries](./PROVIDER.md) - External service adapters

## Quick Reference

This document provides a high-level overview of the library architecture, dependency relationships, and common integration patterns for the Nx monorepo.

## Library Type Reference

### Contract Libraries (`libs/contract/{domain}`)

**Purpose**: Define domain boundaries through interfaces, entities, and errors

**Naming**: `@samuelho-dev/contract-{domain}`

**Contains**:

- Domain entities (Product, User, Order)
- Repository interfaces (ports)
- Domain events
- Domain errors (Data.TaggedError)

**Dependencies**: `types-database`, `util-*`

**Used By**: data-access, feature

**Key Files**:

- `src/lib/entities.ts` - Domain entities
- `src/lib/ports.ts` - Repository interfaces
- `src/lib/errors.ts` - Domain errors
- `src/lib/events.ts` - Domain events

---

### Data-Access Libraries (`libs/data-access/{domain}`)

**Purpose**: Implement repository pattern with database operations

**Naming**: `@samuelho-dev/data-access-{domain}`

**Contains**:

- Repository implementations (fulfill contract ports)
- Database queries (Kysely)
- Data transformations
- Query builders

**Dependencies**:

- `contract-{domain}` (implements interfaces)
- `infra-database` (database service)
- `infra-cache` (optional caching)
- `provider-kysely` (query builder)
- `types-database` (database types)

**Used By**: feature

**Key Files**:

- `src/lib/server/repository.ts` - Repository implementation
- `src/lib/server/layers.ts` - Layer composition
- `src/lib/server/repository.spec.ts` - Tests with @effect/vitest

---

### Feature Libraries (`libs/feature/{name}`)

**Purpose**: Implement business logic and application features

**Naming**: `@samuelho-dev/feature-{name}`

**Contains**:

- Business logic services
- Use case orchestration
- Feature-specific RPC endpoints
- Business rules and validation

**Dependencies**:

- `data-access-{domain}` (repositories)
- `contract-{domain}` (domain interfaces)
- `infra-*` (logging, caching, etc.)
- `provider-*` (external services)

**Used By**: apps (web, api)

**Key Files**:

- `src/lib/server/service.ts` - Business logic service
- `src/lib/server/layers.ts` - Layer composition
- `src/lib/rpc/*.ts` - RPC endpoint definitions
- `src/lib/server/service.spec.ts` - Tests

---

### Infrastructure Libraries (`libs/infra/{concern}`)

**Purpose**: Provide cross-cutting concerns and resource management

**Naming**: `@samuelho-dev/infra-{concern}`

**Contains**:

- Resource management (database, cache, storage)
- Cross-cutting services (logging, telemetry)
- Platform-specific implementations (client/server/edge)

**Common Libraries**:

- `infra-database` - Database service with Kysely
- `infra-cache` - Caching with Redis
- `infra-storage` - File storage with Supabase
- `infra-observability` - Structured logging
- `infra-error-tracking` - Error tracking with Sentry
- `infra-webhooks` - Webhook handling

**Dependencies**:

- `provider-*` (external service adapters)
- `util-*` (utility functions)
- Other `infra-*` (cross-infra dependencies allowed)

**Used By**: data-access, feature, apps

**Key Files**:

- `src/lib/service/service.ts` - Service implementation
- `src/lib/service/interface.ts` - Service interface
- `src/lib/layers/server-layers.ts` - Server-side layers
- `src/lib/layers/client-layers.ts` - Client-side layers (if applicable)
- `src/lib/layers/edge-layers.ts` - Edge runtime layers (if applicable)

---

### Provider Libraries (`libs/provider/{service}`)

**Purpose**: Wrap external SDKs with consistent Effect interfaces

**Naming**: `@samuelho-dev/provider-{service}`

**Contains**:

- SDK adapters (Stripe, Supabase, Redis, etc.)
- Error transformation from SDK errors to Effect errors
- Type-safe API wrappers
- Mock factories for testing

**Common Libraries**:

- `provider-stripe` - Stripe payments
- `provider-supabase` - Supabase client
- `provider-kysely` - Kysely query builder
- `provider-redis` - Redis client
- `provider-sentry` - Sentry error tracking
- `provider-posthog` - PostHog analytics
- `provider-resend` - Resend email

**Dependencies**:

- `infra-observability` (for adapter logging)
- External SDKs (stripe, @supabase/supabase-js, etc.)
- `util-*` (utility functions)

**Used By**: infra, feature, data-access

**Key Files**:

- `src/lib/service.ts` - SDK adapter service
- `src/lib/interface.ts` - Service interface
- `src/lib/layers.ts` - Layer composition
- `src/lib/errors.ts` - Error transformations
- `src/__tests__/service.spec.ts` - Tests with mocks

---

## Library Dependency Flow

```
Apps (web, api)
    ↓
Feature Libraries (business logic)
    ↓
├─→ Data-Access Libraries (repositories)
│       ↓
│   Contract Libraries (interfaces)
│
├─→ Infrastructure Libraries (cross-cutting)
│       ↓
│   Provider Libraries (external SDKs)
│
└─→ Provider Libraries (external services)
```

## Module Boundary Rules (Enforced by Nx)

### Apps

- ✅ Can depend on: feature, ui, data-access, util, types, infra, provider
- ❌ Cannot depend on: contracts (use through data-access)

### Feature Libraries

- ✅ Can depend on: data-access, contract, ui, util, types, infra, provider
- ❌ Cannot depend on: apps, other features

### Data-Access Libraries

- ✅ Can depend on: contract, util, types, infra, provider
- ❌ Cannot depend on: apps, feature, ui, other data-access

### Infrastructure Libraries

- ✅ Can depend on: provider, util, types, other infra
- ❌ Cannot depend on: apps, feature, data-access, contract, ui

### Provider Libraries

- ✅ Can depend on: util, types, infra (for logging only)
- ❌ Cannot depend on: apps, feature, data-access, contract, ui, other providers

### Contract Libraries

- ✅ Can depend on: types, util, other contracts
- ❌ Cannot depend on: apps, feature, data-access, ui, infra, provider

### Types Libraries

- ✅ No dependencies (leaf nodes)
- ❌ Cannot depend on anything

---

## Common Integration Patterns

### Pattern 1: Feature Using Repository

```typescript
// Feature: Purchase Order Service
export class PurchaseOrderService extends Context.Tag("PurchaseOrderService")<
  PurchaseOrderService,
  {
    readonly createOrder: (params: CreateOrderParams) => Effect.Effect<Order, OrderError>
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function*() {
      // Depend on repositories from data-access
      const productRepo = yield* ProductRepository;
      const orderRepo = yield* OrderRepository;

      // Depend on external services from providers
      const stripe = yield* StripeService;

      // Depend on infrastructure services
      const logger = yield* LoggingService;

      return {
        createOrder: (params) =>
          Effect.gen(function*() {
            // Business logic orchestration
            const product = yield* productRepo.findById(params.productId);
            const payment = yield* stripe.paymentIntents.create({...});
            const order = yield* orderRepo.create({...});
            yield* logger.info("Order created", { orderId: order.id });
            return order;
          }),
      };
    })
  );
}
```

### Pattern 2: Repository Implementation

```typescript
// Data-Access: Product Repository
export const ProductRepositoryLive = Layer.effect(
  ProductRepository, // Interface from contract-product
  Effect.gen(function*() {
    // Depend on infrastructure
    const database = yield* DatabaseService;
    const cache = yield* CacheService;

    return {
      findById: (id) =>
        Effect.gen(function*() {
          // Check cache first
          const cached = yield* cache.get<Product>(`product:${id}`);
          if (Option.isSome(cached)) return cached;

          // Query database
          const result = yield* database.query((db) =>
            db
              .selectFrom('products')
              .where('id', '=', id)
              .selectAll()
              .executeTakeFirst(),
          );

          // Cache and return
          if (result) {
            yield* cache.set(`product:${id}`, result, '1 hour');
            return Option.some(result);
          }
          return Option.none();
        }),
    };
  }),
);
```

### Pattern 3: Infrastructure Service

```typescript
// Infrastructure: Cache Service
export class CacheService extends Context.Tag('CacheService')<
  CacheService,
  {
    readonly get: <A>(
      key: string,
    ) => Effect.Effect<Option.Option<A>, CacheError>;
    readonly set: <A>(
      key: string,
      value: A,
      ttl?: string,
    ) => Effect.Effect<void, CacheError>;
  }
>() {
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function*() {
      // Depend on provider
      const redis = yield* RedisService;
      const logger = yield* LoggingService;

      // Register cleanup
      yield* Effect.addFinalizer(() =>
        Effect.gen(function*() {
          yield* logger.info('Closing cache connections');
          yield* redis.quit();
        }),
      );

      return {
        get: (key) =>
          Effect.gen(function*() {
            const value = yield* redis.get(key);
            return value ? Option.some(JSON.parse(value)) : Option.none();
          }),
        set: (key, value, ttl) =>
          Effect.gen(function*() {
            const serialized = JSON.stringify(value);
            yield* redis.set(key, serialized, ttl);
          }),
      };
    }),
  );
}
```

### Pattern 4: Provider Adapter

```typescript
// Provider: Stripe Service
export class StripeService extends Context.Tag('StripeService')<
  StripeService,
  {
    readonly paymentIntents: {
      readonly create: (
        params: CreatePaymentIntentParams,
      ) => Effect.Effect<PaymentIntent, StripeError>;
    };
  }
>() {
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function*() {
      const config = yield* StripeConfig;
      const logger = yield* LoggingService;

      // Initialize SDK
      const stripe = new Stripe(config.apiKey, {
        apiVersion: '2024-11-20.acacia',
      });

      // Register cleanup function for resource management
      yield* Effect.addFinalizer(() =>
        Effect.gen(function*() {
          yield* logger.info('Cleaning up Stripe client resources');
          // Add any SDK-specific cleanup here if available
        }),
      );

      return {
        paymentIntents: {
          create: (params) =>
            Effect.gen(function*() {
              yield* logger.debug('Creating payment intent', { params });

              // Transform SDK errors to Effect errors
              const result = yield* Effect.tryPromise({
                try: () => stripe.paymentIntents.create(params),
                catch: (error) => new StripeError({ cause: error }),
              });

              return result;
            }),
        },
      };
    }),
  );
}
```

### Pattern 5: Stream-Based Data Processing

For large datasets or paginated APIs, use Stream for constant-memory processing:

```typescript
// Feature: Order Processing Service with Stream
export class OrderProcessingService extends Context.Tag('OrderProcessingService')<
  OrderProcessingService,
  {
    readonly processAllOrders: () => Effect.Effect<
      ProcessingSummary,
      OrderError,
      OrderRepository
    >;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function*() {
      return {
        processAllOrders: () =>
          Effect.gen(function*() {
            const repo = yield* OrderRepository;

            // Stream all orders with constant memory usage
            const summary = yield* repo.streamAll({ batchSize: 100 }).pipe(
              // Process each order
              Stream.mapEffect((order) =>
                Effect.gen(function*() {
                  yield* validateOrder(order);
                  yield* enrichOrder(order);
                  return order;
                }),
              ),
              // Group into batches for bulk operations
              Stream.grouped(50),
              Stream.mapEffect((batch) => saveBatch(batch)),
              // Collect results
              Stream.runCollect,
              Effect.map((results) => ({
                processed: Chunk.size(results),
                success: true,
              })),
            );

            return summary;
          }),
      };
    }),
  );
}
```

**Benefits:**
- **Constant Memory:** Process millions of records without loading all into memory
- **Backpressure:** Prevents overwhelming downstream systems
- **Composable:** Easy to add transformations, filtering, and batching

**See:** [EFFECT_PATTERNS.md - Streaming & Queuing Patterns](./EFFECT_PATTERNS.md#streaming--queuing-patterns)

---

## Layer Composition Strategies

### Strategy 1: Application-Level Composition (REQUIRED)

**This is the required pattern for all libraries.** Services MUST NOT pre-wire their dependencies.

Compose all layers at the application entry point:

```typescript
// apps/api/src/main.ts
import { Layer } from 'effect';
import { ProductRepositoryLive } from '@samuelho-dev/data-access-product';
import { ProductServiceLive } from '@samuelho-dev/feature-product';
import { DatabaseServiceLive } from '@samuelho-dev/infra-database';
import { CacheServiceLive } from '@samuelho-dev/infra-cache';
import { StripeServiceLive } from '@samuelho-dev/provider-stripe';

// Compose all dependencies in one place
const AppLayer = Layer.mergeAll(
  // Infrastructure foundation
  DatabaseServiceLive,
  CacheServiceLive,

  // External providers
  StripeServiceLive,

  // Data access
  ProductRepositoryLive,

  // Features
  ProductServiceLive,
);

// Provide to your application
const program = Effect.gen(function*() {
  const productService = yield* ProductService;
  // ... use services
});

Effect.runPromise(program.pipe(Effect.provide(AppLayer)));
```

**Rationale for Required Pattern:**
- **Flexibility:** Applications control the full dependency graph
- **Testability:** Can mock individual dependencies without unwrapping
- **Transparency:** All dependencies visible at application level
- **Consistency:** Single pattern across all libraries reduces cognitive load

---

### ⚠️ Strategy 2: Library-Level Pre-Wiring (Exceptions Only)

**This pattern is generally prohibited.** Only use when ALL conditions are met:

1. ✅ Internal implementation detail (NOT exported in public API)
2. ✅ Services are tightly coupled (always used together)
3. ✅ Both services in SAME library (no cross-library dependencies)

Each library provides its own layer with dependencies (NOT RECOMMENDED):

```typescript
// libs/feature/product/src/lib/server/layers.ts
export const ProductFeatureLayer = ProductServiceLive.pipe(
  Layer.provide(ProductRepositoryLive),
  Layer.provide(StripeServiceLive),
);

// Apps just need to provide infrastructure
const AppLayer = Layer.mergeAll(
  DatabaseServiceLive,
  CacheServiceLive,
  ProductFeatureLayer, // Pre-wired (NOT RECOMMENDED)
);
```

**Example of Acceptable Exception:**

```typescript
// ✅ ACCEPTABLE: Internal implementation detail within same library
// libs/infra/cache/src/lib/internal/layers.ts (NOT exported in index.ts)
const InternalCacheLayer = MemoryCacheService.Live.pipe(
  Layer.provide(LocalStorageService.Live) // Both in same infra library
);
```

**Prohibited Patterns:**

```typescript
// ❌ WRONG: Cross-library pre-wiring
export const ProductFeatureLayer = ProductService.Live.pipe(
  Layer.provide(ProductRepository.Live), // From different library
);

// ❌ WRONG: Feature services pre-wiring repositories
export const UserFeatureLayer = UserService.Live.pipe(
  Layer.provide(UserRepository.Live), // Should be app-level
);

// ❌ WRONG: Infrastructure services pre-wiring providers
export const DatabaseLayer = DatabaseService.Live.pipe(
  Layer.provide(PostgresProvider.Live), // Should be app-level
);

// ❌ WRONG: Any exported layer with pre-wired dependencies
export const AnythingWithDependencies = Service.Live.pipe(
  Layer.provide(AnyOtherService.Live), // Violates transparency
);
```

**Enforcement:** Generators produce layers WITHOUT pre-wiring. Applications compose at entry point.

---

## Platform-Aware Exports

Libraries support platform-specific exports to enable tree-shaking and runtime compatibility:

### Export Pattern

```typescript
// Main index.ts - Universal exports
export type * from './lib/types';
export * from './lib/errors';
export { MyService } from './lib/service';

// server.ts - Node.js specific
export * from './index';
export * from './lib/layers/server-layers';
export { serverOnlyFunction } from './lib/server-utils';

// client.ts - Browser specific
export type * from './lib/types';
export * from './lib/errors';
export { MyService } from './lib/service';
export * from './lib/layers/client-layers';

// edge.ts - Edge runtime specific
export type * from './lib/types';
export * from './lib/errors';
export { MyService } from './lib/service';
export * from './lib/layers/edge-layers';
```

### Usage in Applications

```typescript
// Node.js application
import { MyService, MyServiceLive } from '@my-scope/infra-service/server';

// Browser application
import { MyService, MyServiceLive } from '@my-scope/infra-service/client';

// Edge runtime (Cloudflare Workers, Vercel Edge)
import { MyService, MyServiceLive } from '@my-scope/infra-service/edge';
```

### Platform Configuration

When generating libraries, specify the platform:

```bash
# Node.js only (default)
npx monorepo-library-generator provider my-service --platform=node

# Browser only
npx monorepo-library-generator provider my-service --platform=browser

# Edge runtime
npx monorepo-library-generator provider my-service --platform=edge

# Universal (generates all exports)
npx monorepo-library-generator provider my-service --platform=universal
```

---

## Workspace-Agnostic Architecture

The generator supports multiple monorepo tools without vendor lock-in:

### Supported Workspace Tools

- ✅ **Nx** - Full integration with Nx workspace features
- ✅ **pnpm Workspaces** - Works with pnpm workspace protocol
- ✅ **Yarn Workspaces** - Compatible with Yarn v1/v2/v3
- ✅ **Turborepo** - No workspace-specific dependencies

### Dynamic Package Scope Detection

The generator automatically detects your workspace's package scope:

```json
// package.json
{
  "name": "@my-company/root"
}
```

All generated libraries will use `@my-company` scope automatically.

### CLI vs Nx Generators

Both interfaces share the same core logic:

```bash
# Nx generator (if Nx is installed)
nx g @my-scope/monorepo-library-generator:provider stripe

# Standalone CLI (works anywhere)
npx monorepo-library-generator provider stripe
```

### TypeScript Project References

Automatic dependency detection with graceful fallbacks:

- **With Nx**: Uses project graph for automatic references
- **Without Nx**: Manual configuration or empty references
- Both support incremental compilation and composite projects

---

## Testing Patterns

> **📘 Comprehensive Testing Guide:** See [TESTING_PATTERNS.md](./TESTING_PATTERNS.md) for complete testing standards, patterns, and anti-patterns.

All tests follow standardized @effect/vitest patterns:
- ✅ ALL imports from `@effect/vitest`
- ✅ ALL tests use `it.scoped()`
- ✅ ALL layers wrapped with `Layer.fresh()`

### Repository Testing (with @effect/vitest)

```typescript
import { expect, it } from '@effect/vitest'; // ✅ All from @effect/vitest
import { Effect, Layer, Option } from 'effect';
import { ProductRepository } from '@samuelho-dev/contract-product';
import { ProductRepositoryLive } from '../repository';

// Mock infrastructure dependencies
const MockDatabaseLayer = Layer.succeed(DatabaseService, {
  query: () => Effect.succeed({ id: 'test', name: 'Test Product' }),
});

it.scoped('findById returns product', () => // ✅ Always it.scoped
  Effect.gen(function*() {
    const repo = yield* ProductRepository;
    const result = yield* repo.findById('test');

    expect(Option.isSome(result)).toBe(true);
  }).pipe(
    Effect.provide(
      Layer.fresh( // ✅ Always Layer.fresh
        ProductRepositoryLive.pipe(Layer.provide(MockDatabaseLayer))
      )
    ),
  ),
);
```

### Service Testing (with mocked dependencies)

```typescript
import { expect, it } from '@effect/vitest'; // ✅ All from @effect/vitest
import { Effect, Layer } from 'effect';
import { ProductService } from '../service';

const MockProductRepository = Layer.succeed(ProductRepository, {
  findById: () => Effect.succeed(Option.some(mockProduct)),
});

it.scoped('createOrder validates product', () => // ✅ Always it.scoped
  Effect.gen(function*() {
    const service = yield* ProductService;
    const result = yield* service.createOrder({ productId: 'test' });

    expect(result.productId).toBe('test');
  }).pipe(
    Effect.provide(
      Layer.fresh( // ✅ Always Layer.fresh
        ProductServiceLive.pipe(Layer.provide(MockProductRepository))
      )
    ),
  ),
);
```

---

## TypeScript Project References

All libraries use TypeScript composite projects for incremental compilation:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "../../dist/out-tsc",
    "tsBuildInfoFile": "../../.tsbuildinfo/data-access-product.tsbuildinfo"
  },
  "references": [
    { "path": "../contract-product" },
    { "path": "../infra-database" },
    { "path": "../infra-cache" },
    { "path": "../types-database" }
  ]
}
```

**Benefits**:

- ✅ Incremental compilation (only rebuild what changed)
- ✅ Enforced dependency graph
- ✅ Faster CI builds with Nx
- ✅ Better IDE performance

---

## Quick Decision Tree

### "Which library type should I create?"

1. **Defining domain interfaces?** → `contract-{domain}`
2. **Implementing database operations?** → `data-access-{domain}`
3. **Implementing business logic?** → `feature-{name}`
4. **Wrapping an external SDK?** → `provider-{service}`
5. **Cross-cutting concern (logging, caching)?** → `infra-{concern}`
6. **Shared types?** → `types-{category}`
7. **Utility functions?** → `util-{category}`

### "Where does this code belong?"

1. **Repository interface?** → `contract-{domain}/src/lib/ports.ts`
2. **Repository implementation?** → `data-access-{domain}/src/lib/server/repository.ts`
3. **Business logic?** → `feature-{name}/src/lib/server/service.ts`
4. **SDK adapter?** → `provider-{service}/src/lib/service.ts`
5. **Database service?** → `infra-database/src/lib/service/service.ts`

---

## Library Inventory

### Contract Libraries

- `contract-product` - Product domain interfaces
- `contract-seller` - Seller domain interfaces
- `contract-user` - User domain interfaces
- `contract-payment` - Payment domain interfaces
- `contract-messaging` - Messaging domain interfaces
- `contract-common` - Shared domain interfaces

### Data-Access Libraries

- `data-access-product` - Product repository
- `data-access-seller` - Seller repository
- `data-access-user` - User repository

### Feature Libraries

- `feature-advertising` - Ad auction and targeting
- `feature-analytics` - Analytics and metrics
- `feature-auth` - Authentication
- `feature-cohorts` - User cohorts
- `feature-email` - Email campaigns
- `feature-form` - Form management
- `feature-marketplace` - Marketplace orchestration
- `feature-search` - Search with Typesense

### Infrastructure Libraries

- `infra-cache` - Caching with Redis
- `infra-database` - Database service with Kysely
- `infra-error-tracking` - Error tracking with Sentry
- `infra-observability` - Structured logging
- `infra-messaging` - Message queue
- `infra-rpc` - RPC framework
- `infra-storage` - File storage with Supabase
- `infra-webhooks` - Webhook handling

### Provider Libraries

- `provider-cloudamqp` - CloudAMQP client
- `provider-kysely` - Kysely query builder
- `provider-posthog` - PostHog analytics
- `provider-redis` - Redis client
- `provider-resend` - Resend email
- `provider-sentry` - Sentry error tracking
- `provider-stripe` - Stripe payments
- `provider-supabase` - Supabase client

---

## Pre-Wiring Configuration

### Contract Libraries

**Auto-wired dependencies**:

- `types-database` (for database-backed entities)
- `util-common` (for utility functions)

**Auto-generated files**:

- `src/lib/entities.ts` - Domain entities
- `src/lib/ports.ts` - Repository interfaces
- `src/lib/errors.ts` - Domain errors
- `src/lib/events.ts` - Domain events

### Data-Access Libraries

**Auto-wired dependencies**:

- `contract-{domain}` (implements interfaces)
- `infra-database` (database service)
- `provider-kysely` (query builder)
- `types-database` (database types)

**Auto-generated files**:

- `src/lib/server/repository.ts` - Repository implementation
- `src/lib/server/layers.ts` - Layer composition
- `src/lib/server/repository.spec.ts` - Tests

### Feature Libraries

**Auto-wired dependencies**:

- `data-access-{relevant-domains}` (repositories)
- `infra-observability` (logging service)
- `infra-rpc` (RPC framework)

**Auto-generated files**:

- `src/lib/server/service.ts` - Business logic service
- `src/lib/server/layers.ts` - Layer composition
- `src/lib/rpc/{name}-rpc.ts` - RPC endpoints
- `src/lib/server/service.spec.ts` - Tests

### Infrastructure Libraries

**Auto-wired dependencies**:

- `util-common` (utility functions)
- `infra-observability` (for service logging)

**Auto-generated files**:

- `src/lib/service/service.ts` - Service implementation
- `src/lib/service/interface.ts` - Service interface
- `src/lib/layers/server-layers.ts` - Server layers
- `src/lib/service/service.spec.ts` - Tests

### Provider Libraries

**Auto-wired dependencies**:

- `infra-observability` (for adapter logging)
- External SDK package (Stripe, AWS, etc.)

**Auto-generated files**:

- `src/lib/service.ts` - SDK adapter
- `src/lib/interface.ts` - Service interface
- `src/lib/layers.ts` - Layer composition
- `src/lib/errors.ts` - Error transformations
- `src/__tests__/service.spec.ts` - Tests with mocks
- `src/__tests__/test-layer.ts` - Test utilities

---

## Common Pitfalls

### ❌ Don't: Implement repositories in providers

```typescript
// WRONG: provider-supabase implementing ProductRepository
export const ProductRepositoryLive = Layer.effect(/* ... */);
```

### ✅ Do: Implement repositories in data-access

```typescript
// CORRECT: data-access-product implementing ProductRepository
export const ProductRepositoryLive = Layer.effect(/* ... */);
```

---

### ❌ Don't: Put business logic in data-access

```typescript
// WRONG: Pricing logic in repository
findById: (id) => {
  const product = /* query */;
  const discountedPrice = product.price * 0.9; // ❌ Business logic
  return { ...product, price: discountedPrice };
}
```

### ✅ Do: Keep data-access focused on queries

```typescript
// CORRECT: Just query and return
findById: (id) => {
  const product = /* query */;
  return Option.some(product); // ✅ Pure data access
}
```

---

### ❌ Don't: Create circular dependencies

```typescript
// WRONG: feature-product depends on feature-order which depends on feature-product
```

### ✅ Do: Extract shared logic to a new library

```typescript
// CORRECT: Create feature-shared or data-access-shared
```

---

## Resources

- [Effect.ts Documentation](https://effect.website/)
- [Nx Documentation](https://nx.dev/)
- [Kysely Documentation](https://kysely.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
