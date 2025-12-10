# Data-Access Library Architecture

> **📚 Related Documentation:**
>
> - [Architecture Overview](./ARCHITECTURE_OVERVIEW.md) - Library inventory and integration patterns
> - [Nx Standards](./NX_STANDARDS.md) - Naming conventions (`data-access-{domain}` pattern)
> - [Effect Patterns Guide](./EFFECT_PATTERNS.md) - Repository service patterns and Layer composition
> - [Contract Libraries](./CONTRACT.md) - Repository interfaces you implement (contract fulfillment)
> - [Feature Libraries](./FEATURE.md) - Services that consume your repository implementations
> - [Infrastructure Libraries](./INFRA.md) - Database and storage services you depend on

## Overview

Data-access libraries implement the repository pattern, fulfilling contracts defined in the contracts layer. They handle all database operations, query building, and data persistence using Effect.ts patterns with Kysely for type-safe SQL.

## Core Principles

1. **Repository Implementation**: Implements interfaces defined in contracts
2. **Type-Safe Queries**: Uses Kysely with generated database types
3. **Effect-First**: All operations return Effect types with proper error handling
4. **Transaction Support**: Manages database transactions with Effect
5. **No Business Logic**: Pure data operations only
6. **Platform-Agnostic**: Server-only, no client/edge exports
7. **No RPC Code**: Data-access libraries do NOT handle RPC - repositories are consumed by **feature** services, which are then exposed via RPC routers in feature libraries
8. **Error Transformation**: Convert database and provider errors to domain errors defined in contract libraries, ensuring errors follow the contract's error model
9. **Contract Fulfillment Testing**: Use @effect/vitest to verify that repository implementations correctly fulfill the contract interfaces they implement

## State Management in Data-Access Layer

**Data-access libraries are server-side only and use Effect Ref for concurrent state management.**

### When Data-Access Uses Ref/SynchronizedRef

Data-access repositories should use Ref or SynchronizedRef ONLY for infrastructure-level concurrent state:

| Use Case                | Pattern               | Example                                    |
| ----------------------- | --------------------- | ------------------------------------------ |
| **Connection pooling**  | Ref.make + Ref.get    | Track active database connections          |
| **Cache entries**       | Ref.make + Ref.update | Pre-fetched data that needs atomic updates |
| **Rate limiting**       | Ref.make + Ref.update | Request counters for rate limiting         |
| **Query deduplication** | FiberMap              | Prevent duplicate concurrent queries       |

### State NOT Managed Here

- ❌ **React component state** → Use `@effect-atom/atom` in feature layer
- ❌ **User preferences** → Store in database, not in-memory
- ❌ **Form state** → Managed by feature layer with Atoms
- ❌ **Business state** → Should be persisted to database

### Example: Query Deduplication with State

```typescript
// ✅ Use FiberMap to prevent duplicate concurrent queries
import { FiberMap, Option } from 'effect';

export class UserRepository extends Context.Tag('UserRepository')<
  UserRepository,
  {
    readonly findById: (
      id: string,
    ) => Effect.Effect<Option.Option<User>, RepositoryError>;
  }
>() {
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function* () {
      const database = yield* DatabaseService;

      // Fiber map to deduplicate queries by user ID
      const queryDedup = yield* FiberMap.make<string>();

      return {
        findById: (id: string) =>
          Effect.gen(function* () {
            // Check if already querying this user
            const existing = yield* FiberMap.get(queryDedup, id);
            if (Option.isSome(existing)) {
              // Wait for existing query to complete
              return yield* Fiber.join(existing.value);
            }

            // Start new query
            yield* FiberMap.run(
              queryDedup,
              id,
              database.query((db) =>
                db
                  .selectFrom('users')
                  .where('id', '=', id)
                  .selectAll()
                  .executeTakeFirst()
                  .then(Option.fromNullable),
              ),
            );
          }),
      };
    }),
  );
}
```

See [EFFECT_PATTERNS.md - State Management section](./EFFECT_PATTERNS.md#state-management-with-effect-ref) for detailed Ref patterns.

## Projection Repository Pattern (CQRS Read Models)

Projection repositories build denormalized read models **from existing tables** using complex queries. They are NOT separate tables.

### Key Concept: Projections = Query Results

**Projections are TypeScript types describing query results, NOT database tables.**

```
Existing Tables (normalized):
├── products
├── sellers
├── categories
└── reviews

↓ Complex JOIN Query ↓

Projection Result (denormalized):
{
  productId, name, price,
  sellerName,        // from JOIN
  categoryName,      // from JOIN
  reviewCount        // from aggregation
}
```

### Projection vs Write Repository

| Aspect          | Write Repository            | Projection Repository     |
| --------------- | --------------------------- | ------------------------- |
| **Data Source** | Single table (canonical)    | Multiple tables (JOINed)  |
| **Operations**  | CRUD (create/update/delete) | Read-only queries         |
| **Caching**     | Minimal (write-through)     | Heavy (read-optimized)    |
| **Updates**     | Direct mutations            | Re-query to rebuild       |
| **Schema**      | Normalized DB schema        | Denormalized query result |

### Example: Product List Projection Repository

```typescript
// libs/data-access/product/src/lib/projection-repository.ts
import { Context, Effect, Layer, Option } from 'effect';
import {
  ProductProjectionRepository,
  ProductListProjection,
} from '@samuelho-dev/contract-product';
import { DatabaseService } from '@samuelho-dev/infra-database/server';
import { CacheService } from '@samuelho-dev/infra-cache/server';

export const ProductProjectionRepositoryLive = Layer.effect(
  ProductProjectionRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const cache = yield* CacheService;

    return {
      // Build projection via JOIN query from existing tables
      findListProjection: (query) =>
        Effect.gen(function* () {
          const cacheKey = `projection:list:${JSON.stringify(query)}`;

          // Check cache first
          const cached = yield* cache.get<ProductListProjection[]>(cacheKey);

          // Use Option.match for clearer intent (Effect best practice)
          return yield* Option.match(cached, {
            onSome: (value) => Effect.succeed(value),
            onNone: () =>
              Effect.gen(function* () {
                // Build projection from existing tables via JOINs
                const results = yield* db.query((kysely) =>
                  kysely
                    .selectFrom('products as p')
                    .innerJoin('sellers as s', 's.id', 'p.seller_id')
                    .innerJoin('categories as c', 'c.id', 'p.category_id')
                    .leftJoin('reviews as r', 'r.product_id', 'p.id')
                    .select([
                      'p.id as productId',
                      'p.name',
                      'p.price',
                      'p.thumbnail_url as thumbnailUrl',

                      // Denormalized seller (from JOIN)
                      's.id as sellerId',
                      's.name as sellerName',
                      's.avatar_url as sellerAvatarUrl',

                      // Denormalized category (from JOIN)
                      'c.id as categoryId',
                      'c.name as categoryName',

                      // Aggregated stats
                      (eb) => eb.fn.count('r.id').as('reviewCount'),
                      (eb) => eb.fn.avg('r.rating').as('averageRating'),
                    ])
                    .groupBy(['p.id', 's.id', 'c.id'])
                    .limit(query.limit)
                    .offset((query.page - 1) * query.limit)
                    .execute(),
                );

                const total = yield* db.query((kysely) =>
                  kysely
                    .selectFrom('products')
                    .select((eb) => eb.fn.countAll().as('count'))
                    .executeTakeFirstOrThrow(),
                );

                const result = {
                  items: results,
                  total: Number(total.count),
                };

                // Cache the built projection
                yield* cache.set(cacheKey, result, { ttl: '5 minutes' });

                return result;
              }),
          });
        }),

      // Invalidate cache - next query rebuilds projection
      invalidateProjectionCache: (productId) =>
        cache.invalidatePattern(`projection:*:*${productId}*`),
    };
  }),
);
```

### Cache Invalidation Strategy (Event-Driven)

Commands invalidate projection caches via events:

```typescript
// In feature command handler
yield* repository.updateProduct(productId, changes);

// Publish event
yield* messaging.publish("product.updated", new ProductUpdatedEvent({ ... }));

// Event handler invalidates cache
yield* projectionRepository.invalidateProjectionCache(productId);

// Next query automatically rebuilds projection from current DB state
```

### When to Use Projection Repositories

✅ **Use when:**

- Complex JOINs needed for read operations
- Aggregated statistics required (counts, averages, sums)
- Read operations significantly outnumber writes
- Denormalized data improves query performance

❌ **Don't use when:**

- Simple single-table queries (use write repository)
- Real-time consistency critical (projections are eventually consistent)
- Write operations are frequent (cache churn)

**See Also:**

- [Contract Projection Schemas](./CONTRACT.md#projection-schemas-read-models) - Projection TypeScript types
- [Feature CQRS Handlers](./FEATURE.md#cqrs-architecture-pattern) - Command/query implementation
- [Infrastructure Cache](./INFRA.md#infra-cache) - Caching strategies
- [Infrastructure Messaging](./INFRA.md#messagingservice-integration-with-cqrs) - Event-driven updates

## Directory Structure

### With CQRS (Commands + Queries)

When contract library defines separate command and query ports, generator creates CQRS structure:

```
libs/data-access/{domain}/
├── src/
│   ├── lib/
│   │   ├── commands/
│   │   │   ├── create.ts         # CreateCommand + handler
│   │   │   ├── create.spec.ts    # Command tests
│   │   │   ├── update.ts         # UpdateCommand + handler
│   │   │   ├── update.spec.ts    # Command tests
│   │   │   ├── delete.ts         # DeleteCommand + handler
│   │   │   ├── delete.spec.ts    # Command tests
│   │   │   └── index.ts          # Export all commands
│   │   │
│   │   ├── queries/
│   │   │   ├── get.ts            # GetQuery + handler (single item)
│   │   │   ├── get.spec.ts       # Query tests
│   │   │   ├── list.ts           # ListQuery + handler (filters + pagination)
│   │   │   ├── list.spec.ts      # Query tests
│   │   │   └── index.ts          # Export all queries
│   │   │
│   │   ├── layers.ts             # CommandLayer + QueryLayer + Combined
│   │   ├── layers.spec.ts        # Layer composition tests
│   │   │
│   │   └── shared/
│   │       ├── errors.ts         # Domain-specific errors
│   │       ├── types.ts          # Shared types
│   │       └── validation.ts     # Input validators
│   │
│   └── index.ts                  # Public API exports
├── project.json
├── tsconfig.json
├── vitest.config.ts
├── package.json
└── README.md
```

**CQRS Structure Notes:**

- ✅ Commands handle CREATE, UPDATE, DELETE operations
- ✅ Queries handle GET (single item) and LIST (multiple with filters/pagination)
- ✅ NO repository - CQRS replaces the repository pattern entirely
- ✅ Each implementation file has `.spec.ts` for testing
- ✅ Separate layers for commands vs queries (different infrastructure dependencies)

### Without CQRS (Standard Repository)

When contract library defines single repository interface:

```
libs/data-access/{domain}/
├── src/
│   ├── lib/
│   │   ├── repository.ts         # CRUD implementation (findById, findAll, create, update, delete)
│   │   ├── repository.spec.ts    # Repository tests
│   │   ├── queries.ts            # Kysely query builder helpers
│   │   ├── layers.ts             # Repository layer
│   │   ├── layers.spec.ts        # Layer composition tests
│   │   │
│   │   └── shared/
│   │       ├── errors.ts         # Domain-specific errors
│   │       ├── types.ts          # Shared types
│   │       └── validation.ts     # Input validators
│   │
│   └── index.ts                  # Public API exports
├── project.json
├── tsconfig.json
├── vitest.config.ts
├── package.json
└── README.md
```

**Generator Decision Logic:**

```typescript
if (contractHasSeparateCommandAndQueryPorts) {
  generateCQRSStructure(); // commands/ + queries/
} else {
  generateStandardRepository(); // repository.ts
}
```

**Generator Must Create:**

- ✅ `index.ts` - All exports (layers, types, errors)
- ✅ All command/query handlers with `.spec.ts` files
- ✅ `layers.ts` - Effect layer composition (CommandLayer/QueryLayer or RepositoryLayer)
- ✅ `layers.spec.ts` - Layer tests
- ✅ `shared/errors.ts`, `shared/types.ts`, `shared/validation.ts`

**Generator Must NOT Create:**

- ❌ `server.ts` / `client.ts` / `edge.ts` - Data-access is server-only
- ❌ RPC routers/procedures - Belongs in feature layer
- ❌ Business logic - Pure data operations only

---

## CQRS Implementation Examples

### Command Structure (Write Operations)

Commands handle state-changing operations. Each command includes the command definition and its handler in the same file:

```typescript
// libs/data-access/product/src/lib/commands/create.ts
import { Effect, Schema } from 'effect';
import { DatabaseService } from '@samuelho-dev/infra-database';
import { EventBus } from '@samuelho-dev/infra-messaging';
import { ProductCreatedEvent } from '@samuelho-dev/contract-product';
import type { ProductInsert } from '@samuelho-dev/types-database';

/**
 * Create Product Command
 */
export class CreateProductCommand extends Schema.Class<CreateProductCommand>(
  'CreateProductCommand',
)({
  name: Schema.String,
  price: Schema.Number,
  sellerId: Schema.UUID,
}) {}

/**
 * Create Product Handler
 * Handles product creation with persistence and event publishing
 */
export const createProductHandler = (cmd: CreateProductCommand) =>
  Effect.gen(function* () {
    const database = yield* DatabaseService;
    const events = yield* EventBus;

    // Map command to database insert
    const productData: ProductInsert = {
      name: cmd.name,
      price: cmd.price,
      seller_id: cmd.sellerId,
    };

    // Persist to database
    const product = yield* database.query((db) =>
      db
        .insertInto('products')
        .values(productData)
        .returningAll()
        .executeTakeFirstOrThrow(),
    );

    // Publish domain event
    yield* events.publish(
      ProductCreatedEvent.create({
        productId: product.id,
        aggregateVersion: 1,
      }),
    );

    return product;
  });
```

**Command Test Pattern:**

```typescript
// libs/data-access/product/src/lib/commands/create.spec.ts
import { Effect } from 'effect';
import { describe, it, expect } from 'vitest';
import { CreateProductCommand, createProductHandler } from './create';
import { DatabaseService } from '@samuelho-dev/infra-database';
import { EventBus } from '@samuelho-dev/infra-messaging';

describe('CreateProductCommand', () => {
  it.scoped('creates product and publishes event', () =>
    Effect.gen(function* () {
      // Mock layers with Layer.succeed
      // Execute handler with test data
      // Verify product was created and event published
    }),
  );
});
```

### Query Structure (Read Operations)

Queries retrieve data directly from the database without repository abstraction. Read operations are optimized for specific views:

```typescript
// libs/data-access/product/src/lib/queries/get.ts
import { Effect, Option, Schema } from 'effect';
import { DatabaseService } from '@samuelho-dev/infra-database';
import { CacheService } from '@samuelho-dev/infra-cache';
import type { ProductSelect } from '@samuelho-dev/types-database';

/**
 * Get Product Query
 */
export class GetProductQuery extends Schema.Class<GetProductQuery>(
  'GetProductQuery',
)({
  productId: Schema.UUID,
}) {}

/**
 * Get Product Handler
 * Direct database query optimized for single item retrieval
 */
export const getProductHandler = (query: GetProductQuery) =>
  Effect.gen(function* () {
    const database = yield* DatabaseService;
    const cache = yield* CacheService;

    // Check cache first
    const cacheKey = `product:${query.productId}`;
    const cached = yield* cache.get<ProductSelect>(cacheKey);

    if (Option.isSome(cached)) {
      return cached;
    }

    // Direct query - optimized for this specific read
    const result = yield* database.query((db) =>
      db
        .selectFrom('products')
        .selectAll()
        .where('id', '=', query.productId)
        .where('deleted_at', 'is', null)
        .executeTakeFirst(),
    );

    // Cache result
    if (result) {
      yield* cache.set(cacheKey, result, { ttl: '5 minutes' });
    }

    return Option.fromNullable(result);
  });
```

```typescript
// libs/data-access/product/src/lib/queries/list.ts
import { Effect, Schema } from 'effect';
import { DatabaseService } from '@samuelho-dev/infra-database';
import type { ProductSelect } from '@samuelho-dev/types-database';

/**
 * List Products Query
 */
export class ListProductsQuery extends Schema.Class<ListProductsQuery>(
  'ListProductsQuery',
)({
  category: Schema.optional(Schema.String),
  sellerId: Schema.optional(Schema.UUID),
  search: Schema.optional(Schema.String),
  limit: Schema.optional(Schema.Number.pipe(Schema.int())),
  offset: Schema.optional(Schema.Number.pipe(Schema.int())),
}) {}

/**
 * List Products Handler
 * Query with dynamic filters and pagination
 */
export const listProductsHandler = (query: ListProductsQuery) =>
  Effect.gen(function* () {
    const database = yield* DatabaseService;

    const result = yield* database.query((db) => {
      let q = db
        .selectFrom('products')
        .selectAll()
        .where('deleted_at', 'is', null);

      // Apply filters dynamically
      if (query.category) {
        q = q.where('category', '=', query.category);
      }
      if (query.sellerId) {
        q = q.where('seller_id', '=', query.sellerId);
      }
      if (query.search) {
        q = q.where('name', 'ilike', `%${query.search}%`);
      }

      // Pagination
      const limit = query.limit ?? 50;
      const offset = query.offset ?? 0;

      return q
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();
    });

    return result;
  });
```

### Layer Composition (CQRS)

Separate layers for commands and queries with appropriate dependencies:

```typescript
// libs/data-access/product/src/lib/layers.ts
import { Effect, Layer } from 'effect';
import {
  ProductCommandPort,
  ProductQueryPort,
} from '@samuelho-dev/contract-product';
import { DatabaseServiceLive } from '@samuelho-dev/infra-database';
import { CacheServiceLive } from '@samuelho-dev/infra-cache';
import { EventBusServiceLive } from '@samuelho-dev/infra-messaging';
import {
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
} from './commands';
import { getProductHandler, listProductsHandler } from './queries';

/**
 * Command Layer (Write Side)
 * Dependencies: Database + EventBus
 */
export const ProductCommandLayer = Layer.effect(
  ProductCommandPort,
  Effect.gen(function* () {
    return {
      createProduct: createProductHandler,
      updateProduct: updateProductHandler,
      deleteProduct: deleteProductHandler,
    };
  }),
).pipe(Layer.provide(DatabaseServiceLive), Layer.provide(EventBusServiceLive));

/**
 * Query Layer (Read Side)
 * Dependencies: Database + Cache (lighter than commands)
 */
export const ProductQueryLayer = Layer.effect(
  ProductQueryPort,
  Effect.gen(function* () {
    return {
      getProduct: getProductHandler,
      listProducts: listProductsHandler,
    };
  }),
).pipe(Layer.provide(DatabaseServiceLive), Layer.provide(CacheServiceLive));

/**
 * Combined Layer
 * For consumers needing both commands and queries
 */
export const ProductLayer = Layer.merge(ProductCommandLayer, ProductQueryLayer);
```

### Standard Repository (Non-CQRS)

For domains without CQRS, use a single repository with standard CRUD operations:

```typescript
// libs/data-access/product/src/lib/repository.ts
import { Effect, Layer, Option } from 'effect';
import { ProductRepository } from '@samuelho-dev/contract-product';
import { DatabaseService } from '@samuelho-dev/infra-database';
import { CacheService } from '@samuelho-dev/infra-cache';
import type {
  ProductSelect,
  ProductInsert,
  ProductUpdate,
} from '@samuelho-dev/types-database';

export const ProductRepositoryLive = Layer.effect(
  ProductRepository,
  Effect.gen(function* () {
    const database = yield* DatabaseService;
    const cache = yield* CacheService;

    return {
      findById: (id: string) =>
        Effect.gen(function* () {
          const cacheKey = `product:${id}`;
          const cached = yield* cache.get<ProductSelect>(cacheKey);

          if (Option.isSome(cached)) return cached;

          const result = yield* database.query((db) =>
            db
              .selectFrom('products')
              .selectAll()
              .where('id', '=', id)
              .where('deleted_at', 'is', null)
              .executeTakeFirst(),
          );

          if (result) {
            yield* cache.set(cacheKey, result, { ttl: '5 minutes' });
          }

          return Option.fromNullable(result);
        }),

      findAll: (filters) =>
        Effect.gen(function* () {
          const result = yield* database.query((db) => {
            let q = db
              .selectFrom('products')
              .selectAll()
              .where('deleted_at', 'is', null);

            // Apply filters
            if (filters?.category) {
              q = q.where('category', '=', filters.category);
            }

            return q
              .orderBy('created_at', 'desc')
              .limit(filters?.limit ?? 50)
              .offset(filters?.offset ?? 0)
              .execute();
          });

          return result;
        }),

      create: (input: ProductInsert) =>
        Effect.gen(function* () {
          const result = yield* database.query((db) =>
            db
              .insertInto('products')
              .values(input)
              .returningAll()
              .executeTakeFirstOrThrow(),
          );

          yield* cache.invalidatePattern('product:*');

          return result;
        }),

      update: (id: string, input: ProductUpdate) =>
        Effect.gen(function* () {
          const result = yield* database.query((db) =>
            db
              .updateTable('products')
              .set(input)
              .where('id', '=', id)
              .returningAll()
              .executeTakeFirstOrThrow(),
          );

          yield* cache.delete(`product:${id}`);

          return result;
        }),

      delete: (id: string) =>
        Effect.gen(function* () {
          yield* database.query((db) =>
            db
              .updateTable('products')
              .set({ deleted_at: new Date() })
              .where('id', '=', id)
              .execute(),
          );

          yield* cache.delete(`product:${id}`);
        }),
    };
  }),
);
```

---

## Executive Summary

This document defines the architecture for **18 data-access libraries** that provide repository-oriented database access across the samuelho-dev platform. These libraries implement the **Repository Pattern** using Effect.ts for dependency injection, error handling, and functional composition.

### Data-Access Libraries (18 Total)

**Core Domain (9 libraries - 34 tables)**

- `@samuelho-dev/data-access-product` - Product catalog (11 tables)
- `@samuelho-dev/data-access-user` - Identity & users (6 tables)
- `@samuelho-dev/data-access-seller` - Seller accounts (4 tables)
- `@samuelho-dev/data-access-review` - Product reviews (2 tables)
- `@samuelho-dev/data-access-transaction` - Order processing (3 tables)
- `@samuelho-dev/data-access-payment` - Payment processing (3 tables)
- `@samuelho-dev/data-access-refund` - Refunds (1 table)
- `@samuelho-dev/data-access-discount` - Discounts (1 table)
- `@samuelho-dev/data-access-dispute` - Disputes (3 tables)

**Supporting Domain (7 libraries - 30+ tables)**

- `@samuelho-dev/data-access-license` - License keys (4 tables)
- `@samuelho-dev/data-access-document` - Document management (3+ tables)
- `@samuelho-dev/data-access-advertising` - Ad campaigns (8 tables)
- `@samuelho-dev/data-access-email` - Email campaigns (7 tables)
- `@samuelho-dev/data-access-blog` - Blog content (3 tables)
- `@samuelho-dev/data-access-support` - Support tickets (5 tables)
- `@samuelho-dev/data-access-posthog` - PostHog analytics integration

**Infrastructure (2 libraries - 8 tables)**

- `@samuelho-dev/data-access-audit-log` - Event audit trail (webhook logs, search logs - 2 tables) **[Target - to be created]**
- `@samuelho-dev/data-access-analytics` - Metrics (6 tables)

**Total:** 70+ tables across 17 libraries (16 current + 1 target audit-log)

**Source:** [Nx Data-Access Library Convention](https://nx.dev/concepts/decisions/project-dependency-rules) - Official Nx naming patterns.

---

## Repository Pattern: When to Use (and When NOT to Use)

### The Repository Pattern (Martin Fowler, 2002)

**Definition:** A Repository mediates between the domain and data mapping layers, acting like an in-memory collection of domain objects.

**Source:** [Martin Fowler - Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html) - Original repository pattern definition.

### When to Use Repository Pattern

Use repositories when you need:

1. **Domain-Persistence Separation**: Isolate domain logic from database implementation details
2. **Multiple Data Sources**: Abstract over different storage mechanisms (SQL, NoSQL, APIs)
3. **Complex Query Construction**: Hide intricate query building from domain logic
4. **Infrastructure Coordination**: Integrate caching, logging, telemetry alongside queries
5. **Domain Events**: Emit events alongside database operations
6. **Testability**: Replace database with in-memory implementations for testing

**✅ Valid Repository Use Case:**

```typescript
import { Effect, Layer, Option } from 'effect';
import type {
  ProductSelect,
  ProductInsert,
} from '@samuelho-dev/types-database';
import { ProductRepository } from '@samuelho-dev/contract-product';

// Implementation class following the contract
export class ProductRepositoryImpl implements ProductRepository {
  constructor(
    private readonly database: DatabaseService,
    private readonly cache: CacheService,
    private readonly logger: LoggingService,
    private readonly eventBus: MessagePublisher,
  ) {}

  readonly findById = (id: string) =>
    Effect.gen(function* () {
      yield* this.logger.debug('Finding product', { productId: id });

      // Check cache first
      const cached = yield* this.cache.get<ProductSelect>(`product:${id}`);
      if (Option.isSome(cached)) {
        yield* this.logger.debug('Cache hit', { productId: id });
        return cached;
      }

      // Query database
      const product = yield* this.database.query((db) =>
        db
          .selectFrom('product')
          .where('id', '=', id)
          .selectAll()
          .executeTakeFirst(),
      );

      // Cache result and emit metrics
      if (product) {
        yield* this.cache.set(`product:${id}`, product, 300);
        yield* this.eventBus.emit(new ProductAccessedEvent(product.id));
      }

      return Option.fromNullable(product);
    }).pipe(
      Effect.mapError(toRepositoryError),
      Effect.withSpan('ProductRepository.findById', {
        attributes: { productId: id },
      }),
    );

  // ... other methods
}

// Layer creation
export const ProductRepositoryLive = Layer.effect(
  ProductRepository,
  Effect.gen(function* () {
    const database = yield* DatabaseService;
    const cache = yield* CacheService;
    const logger = yield* LoggingService;
    const eventBus = yield* MessagePublisher;

    return new ProductRepositoryImpl(database, cache, logger, eventBus);
  }),
);
```

**Why This Adds Value:**

- ✅ Coordinates multiple infrastructure services (cache, logging, telemetry)
- ✅ Implements cache-aside pattern consistently
- ✅ Emits domain events
- ✅ Transforms database errors to domain errors
- ✅ Adds tracing/observability spans
- ✅ Business logic (status checks, validation) can be added

### When NOT to Use Repository Pattern (2024-2025 Perspective)

Modern type-safe query builders have changed the landscape. **Skip repositories** when:

1. **Simple CRUD with Modern ORM**: Prisma, Drizzle, Kysely already provide type-safe queries
2. **No Infrastructure Coordination**: Just querying database, no caching/logging/events
3. **Single Data Source**: Always PostgreSQL, never switching
4. **Over-Abstraction**: Repository merely wraps query builder without adding value
5. **No Domain Events**: Not emitting events on data changes
6. **No Error Translation**: Database errors are acceptable at domain layer

**❌ Anti-Pattern Example (Unnecessary Repository):**

```typescript
// Repository that adds NO value - just wraps query builder
export const ProductRepository = {
  findById: (id: string) =>
    db
      .selectFrom('product')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst(),
};

// Just use Kysely directly in your feature service:
const product = await db
  .selectFrom('product')
  .where('id', '=', id)
  .selectAll()
  .executeTakeFirst();
```

**Why This Adds No Value:**

- ❌ No caching, logging, or events
- ❌ No error transformation
- ❌ No business logic
- ❌ Just wraps query builder 1:1
- ❌ Makes code harder to navigate (extra indirection)

### The Repository Decision Matrix

| Factor                      | Use Repository          | Skip Repository       |
| --------------------------- | ----------------------- | --------------------- |
| **Multiple Infrastructure** | ✅ Cache + DB + Events  | ❌ Just DB            |
| **Domain Events**           | ✅ Emit on changes      | ❌ No events          |
| **Error Translation**       | ✅ Domain errors        | ❌ DB errors OK       |
| **Testing Strategy**        | ✅ In-memory impl       | ❌ Test DB sufficient |
| **Query Complexity**        | ✅ Complex aggregations | ❌ Simple CRUD        |
| **Cross-Cutting Concerns**  | ✅ Logging, metrics     | ❌ None needed        |

**Source:** [The Repository Pattern Is Dead (2024)](https://khalilstemmler.com/articles/typescript-domain-driven-design/repository-dto-mapper/) - Modern critique: "If your repository just wraps your query builder with no additional logic, you're adding complexity for no benefit."

### Why This Codebase Uses Repositories

This project uses repositories because:

1. ✅ **Effect.ts Dependency Injection**: Clean layer composition with `Context.Tag`
2. ✅ **Infrastructure Coordination**: Caching, logging, telemetry, error tracking
3. ✅ **Domain Events**: Emit events alongside database operations
4. ✅ **Error Transformation**: Transform Kysely errors to domain errors
5. ✅ **Type-Safe Database Access**: Generated types (`ProductSelect`, `ProductInsert`, `ProductUpdate`)
6. ✅ **Testability**: Swap database with in-memory implementations using Effect layers

**Key Insight:** Repositories are valuable when you need to **coordinate multiple concerns** (database + cache + events + logging), not just for abstraction's sake.

**Generator Decision Rule:**

```
IF domain has multiple tables OR complex queries OR needs caching OR emits events
  → Create DATA-ACCESS library with repository
ELSE IF single table with simple CRUD AND no infrastructure coordination
  → Consider inline queries in feature layer
ELSE IF cross-cutting infrastructure concern
  → Create INFRASTRUCTURE library (not data-access)
```

**When Generator Creates Data-Access:**

- ✅ Domain entity with >1 table (products, users, orders)
- ✅ Complex query patterns (filters, joins, aggregations)
- ✅ Needs caching strategy
- ✅ Emits domain events
- ✅ Multiple feature layers need access
- ✅ Contract interface already exists

**When Generator Skips Data-Access:**

- ❌ Single table with basic CRUD (consider feature layer inline queries)
- ❌ No infrastructure coordination needed
- ❌ Feature-specific queries (keep in feature layer)
- ❌ Cross-cutting concerns (use infrastructure layer instead)

---

## Architecture Principles

### 1. Repository Pattern (Thin Repositories)

**Core Principles:**

1. **Thin Repositories**: Data access ONLY, no business logic
2. **Collection-Like Interface**: `findById`, `findAll`, `create`, `update`, `delete`
3. **Encapsulate Query Construction**: Hide Kysely details
4. **Use Generated Types**: Return `ProductSelect`, accept `ProductInsert`/`ProductUpdate`
5. **Single Responsibility**: One repository per aggregate root

**Layer Separation:**

| Layer           | Responsibility   | Location                                         | Example                               |
| --------------- | ---------------- | ------------------------------------------------ | ------------------------------------- |
| **Repository**  | Data access ONLY | `@samuelho-dev/data-access-{domain}/src/server/` | `productRepository.findById(id)`      |
| **Service**     | Business logic   | `@samuelho-dev/feature-{domain}/src/server/`     | `productService.publishProduct(id)`   |
| **Application** | Request handling | `apps/api/routes/` or `apps/web/api/`            | tRPC router handling request/response |

**Source:** [Martin Fowler - Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html) - "The Repository acts like an in-memory collection of domain objects."

### 2. Effect.ts Dependency Injection (Effect 3.0+)

**CRITICAL**: Repository interfaces are defined in `@samuelho-dev/contract-*` libraries, NOT in data-access libraries. Data-access provides **implementations only**.

**Context.Tag Pattern:**

```typescript
import { Context, Effect, Option, Layer } from 'effect';
import type {
  ProductSelect,
  ProductInsert,
  ProductUpdate,
} from '@samuelho-dev/types-database';
import type { ProductRepositoryError } from '@samuelho-dev/contract-product';

// 1. Import the repository interface from contracts (NEVER define here!)
import { ProductRepository } from '@samuelho-dev/contract-product';

// 2. Create implementation class
export class ProductRepositoryImpl implements ProductRepository {
  constructor(
    private readonly database: DatabaseService,
    private readonly cache: CacheService,
    private readonly logger: LoggingService,
  ) {}

  readonly findById = (id: string) =>
    Effect.gen(function* () {
      // Implementation
      yield* this.logger.debug('Finding product', { productId: id });
      const product = yield* this.database.query((db) =>
        db
          .selectFrom('product')
          .where('id', '=', id)
          .selectAll()
          .executeTakeFirst(),
      );
      return Option.fromNullable(product);
    });

  readonly create = (input: ProductInsert) =>
    Effect.gen(function* () {
      // Implementation
      return yield* this.database.query((db) =>
        db
          .insertInto('product')
          .values(input)
          .returningAll()
          .executeTakeFirstOrThrow(),
      );
    });

  // ... other methods
}

// 3. Create Layer - return implementation directly
export const ProductRepositoryLive = Layer.effect(
  ProductRepository,
  Effect.gen(function* () {
    const database = yield* DatabaseService;
    const cache = yield* CacheService;
    const logger = yield* LoggingService;

    return new ProductRepositoryImpl(database, cache, logger);
  }),
);
```

**Source:** [Effect Context Documentation](https://effect.website/docs/guides/context-management/services) - Dependency injection with Context.Tag.

### 3. Generated Database Types (Kysely + Prisma)

**Prisma** manages schema, **Kysely** provides type-safe queries:

```bash
# Generate Kysely types from Prisma schema
pnpm exec prisma generate
```

Generated types in `@samuelho-dev/types-database`:

```typescript
// Auto-generated from Prisma schema
export interface Product {
  id: string;
  seller_id: string; // snake_case (database column)
  name: string;
  price: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

// Kysely generated types
export type ProductSelect = Selectable<Product>; // All fields (for queries)
export type ProductInsert = Insertable<Product>; // Omit auto-generated fields (for INSERT)
export type ProductUpdate = Updateable<Product>; // All fields optional (for UPDATE)
```

**Usage in Repository:**

```typescript
import type {
  ProductSelect,
  ProductInsert,
  ProductUpdate,
} from '@samuelho-dev/types-database';

// ✅ IMPORTANT: Repository interface defined in contracts, NOT here
// Import from contracts:
import { ProductRepository } from '@samuelho-dev/contract-product';

// Repository interface in contracts uses generated types:
// export class ProductRepository extends Context.Tag("ProductRepository")<
//   ProductRepository,
//   {
//     readonly findById: (id: string) => Effect.Effect<Option.Option<ProductSelect>, Error>
//     readonly create: (input: ProductInsert) => Effect.Effect<ProductSelect, Error>
//     readonly update: (id: string, input: ProductUpdate) => Effect.Effect<ProductSelect, Error>
//   }
// >() {}

// ✅ In data-access, we only provide the IMPLEMENTATION
// See lines 256-303 above for ProductRepositoryImpl example
```

**Key Benefits:**

- ✅ Single source of truth (Prisma schema)
- ✅ Type-safe queries (Kysely inference)
- ✅ No manual entity classes
- ✅ Database types flow through unchanged (snake_case preserved)

**Source:** [Kysely Documentation](https://kysely.dev/) - Type-safe SQL query builder for TypeScript.

### 4. Infrastructure Integration

**Required Infrastructure Services:**

| Service            | Purpose                      | Contract Library                              |
| ------------------ | ---------------------------- | --------------------------------------------- |
| `DatabaseService`  | Type-safe SQL queries        | `@samuelho-dev/contract-database`             |
| `CacheService`     | Query result caching         | `@samuelho-dev/infra-cache` (no contract)     |
| `MessagePublisher` | Domain event publishing      | `@samuelho-dev/contract-messaging`            |
| `LoggingService`   | Repository operation logging | `@samuelho-dev/infra-logging` (no contract)   |
| `TelemetryService` | Performance tracing          | `@samuelho-dev/infra-telemetry` (no contract) |

**Integration Pattern with Optional Dependencies:**

```typescript
export class ProductRepositoryImpl implements ProductRepository {
  constructor(
    private readonly database: DatabaseService,
    // Optional dependencies can use Option
    private readonly cache: Option.Option<CacheService>,
    private readonly logger: Option.Option<LoggingService>,
  ) {}

  readonly findById = (id: string) =>
    Effect.gen(function* () {
      // Logging (if available)
      yield* Option.match(this.logger, {
        onNone: () => Effect.void,
        onSome: (log) => log.debug('Finding product', { productId: id }),
      });

      // Caching (if available)
      const cached = yield* Option.match(this.cache, {
        onNone: () => Effect.succeed(Option.none()),
        onSome: (c) => c.get<ProductSelect>(`product:${id}`),
      });
      if (Option.isSome(cached)) return cached;

      // Database query (always required)
      const product = yield* this.database.query((db) =>
        db
          .selectFrom('product')
          .where('id', '=', id)
          .selectAll()
          .executeTakeFirst(),
      );

      return Option.fromNullable(product);
    });
}

// Layer with optional dependencies
export const ProductRepositoryLive = Layer.effect(
  ProductRepository,
  Effect.gen(function* () {
    const database = yield* DatabaseService;
    const cache = yield* Effect.serviceOption(CacheService);
    const logger = yield* Effect.serviceOption(LoggingService);

    return new ProductRepositoryImpl(database, cache, logger);
  }),
);
```

**Source:** [Clean Architecture (Robert Martin)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) - Dependency inversion: depend on interfaces, not implementations.

---

## Repository Implementation with Kysely

### Basic Repository Structure

**File:** `libs/{domain}-data-access/src/lib/server/repository.ts`

```typescript
import { Effect, Layer, Option } from "effect";
import type { ProductSelect, ProductInsert, ProductUpdate } from "@samuelho-dev/types-database";
import { ProductRepository, type ProductRepositoryError } from "@samuelho-dev/contract-product";
import { DatabaseService } from "@samuelho-dev/infra-database";
import { CacheService } from "@samuelho-dev/infra-cache";
import { LoggingService } from "@samuelho-dev/infra-logging";

/**
 * Product Repository implementation
 * Implements interface from @samuelho-dev/contract-product
 */
export class ProductRepositoryImpl implements ProductRepository {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_PREFIX = "product:";

  constructor(
    private readonly database: DatabaseService,
    private readonly cache: CacheService,
    private readonly logger: LoggingService
  ) {}

  readonly findById = (id: string) =>
    Effect.gen(function* () {
      yield* this.logger.debug("ProductRepository.findById", { productId: id });

      // Try cache first
      const cacheKey = `${this.CACHE_PREFIX}${id}`;
      const cached = yield* this.cache.get<ProductSelect>(cacheKey);

      if (Option.isSome(cached)) {
        yield* this.logger.debug("Cache hit", { productId: id });
        return cached;
      }

      // Query database
      const product = yield* this.database.query((db) =>
          db.selectFrom("product")
            .where("id", "=", id)
            .where("deleted_at", "is", null)
            .selectAll()
            .executeTakeFirst()
        );

        // Cache result
        if (product) {
          yield* this.cache.set(cacheKey, product, this.CACHE_TTL);
        }

        return Option.fromNullable(product);
      }).pipe(
        Effect.mapError(toRepositoryError),
        Effect.withSpan("ProductRepository.findById", { attributes: { productId: id } })
      ),

    create: (input: ProductInsert) =>
      Effect.gen(function* () {
        yield* this.logger.info("ProductRepository.create", { input });

        const product = yield* this.database.query((db) =>
          db.insertInto("product")
            .values(input)
            .returningAll()
            .executeTakeFirstOrThrow()
        );

        // Invalidate cache patterns
        if (input.seller_id) {
          yield* this.cache.invalidatePattern(`${this.CACHE_PREFIX}seller:${input.seller_id}:*`);
        }

        return product;
      }).pipe(
        Effect.mapError(toRepositoryError),
        Effect.withSpan("ProductRepository.create")
      ),

    update: (id: string, input: ProductUpdate) =>
      Effect.gen(function* () {
        yield* this.logger.info("ProductRepository.update", { productId: id, input });

        const product = yield* this.database.query((db) =>
          db.updateTable("product")
            .set(input)
            .where("id", "=", id)
            .returningAll()
            .executeTakeFirstOrThrow()
        );

        // Invalidate cache
        yield* this.cache.delete(`${this.CACHE_PREFIX}${id}`);

        return product;
      }).pipe(
        Effect.mapError(toRepositoryError),
        Effect.withSpan("ProductRepository.update", { attributes: { productId: id } })
      ),

    delete: (id: string) =>
      Effect.gen(function* () {
        yield* this.logger.warn("ProductRepository.delete", { productId: id });

        yield* this.database.query((db) =>
          db.updateTable("product")
            .set({ deleted_at: new Date() })
            .where("id", "=", id)
            .execute()
        );

        yield* this.cache.delete(`${this.CACHE_PREFIX}${id}`);
      }).pipe(
        Effect.mapError(toRepositoryError),
        Effect.withSpan("ProductRepository.delete", { attributes: { productId: id } })
      ),
  });
});

// Export Layer
export const ProductRepositoryLive = Layer.effect(
  ProductRepository,
  makeProductRepository
);
```

**Generator Must Create:**

- ✅ Repository class implementing contract interface (`implements ProductRepository`)
- ✅ Constructor with infrastructure dependencies (DatabaseService, CacheService, LoggingService)
- ✅ All CRUD methods returning `Effect<T, RepositoryError>`
- ✅ Cache integration with TTL constants (`CACHE_TTL`, `CACHE_PREFIX`)
- ✅ Structured logging with method names and context
- ✅ Error transformation with `mapError(toRepositoryError)`
- ✅ Telemetry spans with `Effect.withSpan`
- ✅ Soft delete support (where clauses checking `deleted_at is null`)

**Generator Must NOT Create:**

- ❌ Business validation logic - Validation belongs in feature layer
- ❌ Direct database client imports - Use DatabaseService
- ❌ Hard-coded cache keys without prefix constants
- ❌ Raw `try/catch` - Use Effect error handling
- ❌ Methods returning `Promise` - Use `Effect` for all async operations

---

**Source:** [Kysely Query Builder](https://kysely.dev/docs/category/queries) - Type-safe SQL query building.

### Complex Queries with Filters

**Pattern:** Build dynamic queries with type-safe filters:

```typescript
import type { Kysely } from 'kysely';
import type { Database } from '@samuelho-dev/types-database';

interface ProductFilters {
  readonly status?:
    | 'DRAFT'
    | 'PUBLISHED'
    | 'ARCHIVED'
    | readonly ('DRAFT' | 'PUBLISHED' | 'ARCHIVED')[];
  readonly sellerId?: string;
  readonly createdAfter?: Date;
  readonly createdBefore?: Date;
  readonly includeDeleted?: boolean;
}

function applyProductFilters(
  query: ReturnType<Kysely<Database>['selectFrom']>,
  filters?: ProductFilters,
) {
  if (!filters) return query;

  let q = query;

  if (filters.status) {
    const statuses = Array.isArray(filters.status)
      ? filters.status
      : [filters.status];
    q = q.where('status', 'in', statuses);
  }

  if (filters.sellerId) {
    q = q.where('seller_id', '=', filters.sellerId);
  }

  if (filters.createdAfter) {
    q = q.where('created_at', '>=', filters.createdAfter);
  }

  if (filters.createdBefore) {
    q = q.where('created_at', '<=', filters.createdBefore);
  }

  if (!filters.includeDeleted) {
    q = q.where('deleted_at', 'is', null);
  }

  return q;
}

// Usage in repository:
const findAll = (filters?: ProductFilters, pagination?: PaginationParams) =>
  Effect.gen(function* () {
    const database = yield* DatabaseService;
    const limit = pagination?.limit ?? 50;
    const offset = pagination?.offset ?? 0;

    const products = yield* database.query((db) => {
      const q = applyProductFilters(db.selectFrom('product'), filters);
      return q
        .selectAll()
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();
    });

    return products;
  });
```

### ⚠️ CRITICAL: Transactions with Effect Runtime Preservation

**Critical Pattern:** When using Kysely transactions, runtime preservation is essential for accessing services inside the transaction callback. This is a critical correctness requirement.

**Key Principle**: Kysely's `db.transaction().execute()` callback runs in an async context that loses the Effect runtime. Infrastructure services (DatabaseService) handle this, but you must follow the pattern exactly.

#### Pattern: DatabaseService.transaction with Runtime Preservation

```typescript
import { Effect } from 'effect';

const createProductWithVariants = (
  product: ProductInsert,
  variants: ProductVariantInsert[],
) =>
  Effect.gen(function* () {
    const database = yield* DatabaseService;
    const cache = yield* CacheService; // ✅ All services accessible

    // ✅ CORRECT: Yield* the transaction - DatabaseService preserves runtime internally
    return yield* database.transaction((tx) =>
      Effect.gen(function* () {
        // Create product
        const createdProduct = yield* Effect.tryPromise({
          try: () =>
            tx
              .insertInto('product')
              .values(product)
              .returningAll()
              .executeTakeFirstOrThrow(),
          catch: (error) =>
            new ProductDatabaseError({
              message: 'Failed to insert product',
              cause: error,
            }),
        });

        // Create variants
        yield* Effect.tryPromise({
          try: () =>
            tx
              .insertInto('product_variant')
              .values(
                variants.map((v) => ({
                  ...v,
                  product_id: createdProduct.id,
                })),
              )
              .execute(),
          catch: (error) =>
            new ProductDatabaseError({
              message: 'Failed to insert variants',
              cause: error,
            }),
        });

        // ✅ CRITICAL: All services (cache, logging, telemetry) remain accessible inside transaction
        // This works ONLY because DatabaseService preserves runtime internally
        yield* cache.invalidate(`product:${createdProduct.id}`);

        return createdProduct;
      }),
    );
  }).pipe(Effect.withSpan('ProductRepository.createProductWithVariants'));
```

#### Why This Pattern is Critical

When you write:

```typescript
database.transaction((tx) => Effect.gen(function* () { ... }))
```

The transaction callback is an **async function** that Kysely controls. Without runtime preservation:

- ❌ `yield* cache.invalidate(...)` would fail - CacheService not available
- ❌ `yield* Effect.logInfo(...)` would fail - LoggingService not available
- ❌ Any service access would throw an error
- ❌ Errors in the transaction wouldn't be properly tracked

#### DatabaseService Implementation Detail

The `DatabaseService.transaction` method is implemented to preserve the Effect runtime:

```typescript
// Inside infra/database - how it preserves runtime
transaction: <T>(fn: (trx: Transaction<DB>) => Effect.Effect<T, E>) =>
  Effect.gen(function* () {
    const runtime = yield* Effect.runtime(); // ← Capture current runtime
    const database = yield* DatabaseService;

    return yield* database.query((db) =>
      db.transaction().execute(async (trx) => {
        // ← Inside async callback, runtime is preserved
        return await Runtime.runPromise(runtime)(fn(trx));
      }),
    );
  });
```

> **Critical Rule**: Consumers of DatabaseService.transaction should NOT manually capture runtime - the infrastructure handles this. Simply use `yield* database.transaction()` and write normal Effect.gen inside. All services remain accessible.

#### What You Must NOT Do

```typescript
// ❌ WRONG - Don't manually capture runtime in repository
return yield* database.query((db) =>
  db.transaction().execute(async (trx) => {
    const runtime = yield* Effect.runtime()  // ❌ WRONG - already handled!
    return await Runtime.runPromise(runtime)(...)
  })
)
```

#### Complete Working Example

See **EFFECT_PATTERNS.md - Pattern 3: Kysely Transactions with Effect Runtime Preservation** for comprehensive examples showing:

- Correct pattern with runtime preservation
- Common mistakes to avoid
- Nested transaction handling

**Generator Must Include Transaction Support:**

- ✅ Use `DatabaseService.transaction` for multi-step operations
- ✅ Pass transaction object (`trx`) to query builders
- ✅ Return `Effect<A, RepositoryError>` from transaction
- ✅ Include transaction span in telemetry
- ✅ Let DatabaseService handle runtime preservation (don't capture runtime manually)

**Transaction Pattern:**

```typescript
const multiStepOperation = (data: Input) =>
  database.transaction((trx) =>
    Effect.gen(function* () {
      const step1 = yield* trx.insertInto("table1").values(...).returningAll().executeTakeFirstOrThrow();
      const step2 = yield* trx.insertInto("table2").values(...).returningAll().executeTakeFirstOrThrow();
      return { step1, step2 };
    })
  );
```

---

- Error handling within transactions

**Related Documentation:**

- [EFFECT_PATTERNS.md - Runtime Preservation](./EFFECT_PATTERNS.md#️-critical-runtime-preservation-for-callbacks) - Complete guide with all patterns
- [INFRA.md - DatabaseService](./INFRA.md) - DatabaseService implementation details

**Source:** [Effect Transactions](https://effect.website/docs/guides/transactions) - Safe transactional operations with Effect.

---

## Effect.ts Layer Composition

### Layer Hierarchy

```
Application Layer
├── Feature Services (business logic)
│   └── Repositories (data access)
│       └── Infrastructure Services
│           ├── DatabaseService
│           ├── CacheService
│           ├── LoggingService
│           └── TelemetryService
```

## Repository Implementation (Contract Fulfillment)

Data-access libraries implement repository interfaces defined in contract libraries. This is the primary responsibility and purpose of the data-access layer.

### Understanding Contract → Implementation Flow

```
┌───────────────────────────────────────────┐
│       CONTRACT LIBRARY                    │
│  @samuelho-dev/contract-product       │
│                                           │
│  export class ProductRepository           │
│    extends Context.Tag("ProductRepository") │
│  {                                        │
│    readonly findById: (id) => Effect<...> │
│    readonly create: (data) => Effect<...> │
│  }                                        │
└───────────────────────────────────────────┘
                    ↓
          INTERFACE DEFINITION
                    ↓
┌───────────────────────────────────────────┐
│    DATA-ACCESS LIBRARY                    │
│  @samuelho-dev/data-access-product    │
│                                           │
│  export const ProductRepositoryLive =     │
│    Layer.effect(                          │
│      ProductRepository, ← FROM CONTRACT   │
│      Effect.gen(function* () {            │
│        return {                           │
│          findById: (id) => /* IMPL */,    │
│          create: (data) => /* IMPL */,    │
│        };                                 │
│      })                                   │
│    );                                     │
└───────────────────────────────────────────┘
```

### Key Principles

1. **Import Interface from Contract**: Always import the repository tag from the contract library
2. **Implement ALL Methods**: Must implement every method defined in the contract interface
3. **Match Signatures Exactly**: Return types must match contract signatures precisely
4. **Use Contract Entities**: Use entities from contracts, not custom types
5. **Use Contract Errors**: Throw errors defined in contracts

### Complete Implementation Example

```typescript
// libs/data-access/product/src/lib/server/repository.ts
import { Effect, Layer, Option } from 'effect';
import {
  ProductRepository, // ← Contract interface tag
  Product, // ← Contract entity
  ProductId, // ← Contract type
  ProductInsert, // ← Contract type
  ProductUpdate, // ← Contract type
  ProductError, // ← Contract error
  ProductNotFoundError, // ← Contract error
} from '@samuelho-dev/contract-product';
import { DatabaseService } from '@samuelho-dev/infra-database';
import { CacheService } from '@samuelho-dev/infra-cache';
import { LoggingService } from '@samuelho-dev/infra-logging';

/**
 * Live implementation of ProductRepository contract
 * Implements: ProductRepository from @samuelho-dev/contract-product
 */
export const ProductRepositoryLive = Layer.effect(
  ProductRepository, // ← Tag from contract (NOT a new tag)
  Effect.gen(function* () {
    // Access infrastructure services
    const database = yield* DatabaseService;
    const cache = yield* CacheService;
    const logger = yield* LoggingService;

    // Return object implementing contract interface
    return {
      // ✅ Implement findById exactly as defined in contract
      findById: (id: ProductId) =>
        Effect.gen(function* () {
          // Check cache first
          const cached = yield* cache.get<Product>(`product:${id}`);
          if (Option.isSome(cached)) {
            yield* logger.debug('Cache hit for product', { id });
            return cached;
          }

          // Query database using Kysely
          const result = yield* database.query((db) =>
            db
              .selectFrom('products')
              .where('id', '=', id)
              .selectAll()
              .executeTakeFirst(),
          );

          // Return Option.Option<Product> as per contract
          if (!result) {
            return Option.none();
          }

          // Kysely's type inference provides the correct type from database schema
          // Update cache
          yield* cache.set(`product:${id}`, result, '1 hour');

          return Option.some(result);
        }),

      // ✅ Implement create exactly as defined in contract
      create: (data: ProductInsert) =>
        Effect.gen(function* () {
          yield* logger.info('Creating product', { data });

          const result = yield* database.query((db) =>
            db
              .insertInto('products')
              .values(data)
              .returningAll()
              .executeTakeFirstOrThrow(),
          );

          // Kysely's type inference provides the correct type from database schema
          // Invalidate cache
          yield* cache.delete('products:list');

          return result;
        }),

      // ✅ Implement all other methods from contract
      update: (id: ProductId, data: ProductUpdate) =>
        Effect.gen(function* () {
          const result = yield* database.query((db) =>
            db
              .updateTable('products')
              .set(data)
              .where('id', '=', id)
              .returningAll()
              .executeTakeFirst(),
          );

          if (!result) {
            return yield* Effect.fail(
              new ProductNotFoundError({ productId: id }),
            );
          }

          // Invalidate cache
          yield* cache.delete(`product:${id}`);

          return result;
        }),

      delete: (id: ProductId) =>
        Effect.gen(function* () {
          yield* database.query((db) =>
            db.deleteFrom('products').where('id', '=', id).execute(),
          );

          yield* cache.delete(`product:${id}`);
        }),

      // Batch operations
      findByIds: (ids: readonly ProductId[]) =>
        Effect.gen(function* () {
          const results = yield* database.query((db) =>
            db
              .selectFrom('products')
              .where('id', 'in', ids)
              .selectAll()
              .execute(),
          );

          return results;
        }),

      findBySeller: (sellerId: string, options) =>
        Effect.gen(function* () {
          const query = database.query((db) =>
            db
              .selectFrom('products')
              .where('seller_id', '=', sellerId)
              .selectAll(),
          );

          if (options?.limit) {
            query.limit(options.limit);
          }
          if (options?.offset) {
            query.offset(options.offset);
          }

          const results = yield* query.execute();
          return results;
        }),
    };
  }),
);
```

**Generator Must Create Layer:**

- ✅ Export `{Repository}Live` layer implementing contract tag
- ✅ Use `Layer.effect(RepositoryTag, Effect.gen(...))` pattern
- ✅ Depend on: DatabaseService, CacheService (optional), LoggingService
- ✅ Provide all dependencies via `Layer.provide` chain in consumer

**Dependency Rules:**

```
Data-Access depends on:
├── Infrastructure (DatabaseService, CacheService, LoggingService)
├── Contracts (Repository interface from contract library)
└── Types (Database types from @samuelho-dev/types-database)

Data-Access CANNOT depend on:
├── Feature layer (consumers, not dependencies)
├── Other data-access libraries (domain isolation)
└── UI/client code (server-only)
```

**Layer Composition Example:**

```typescript
// In feature layer or application bootstrap:
export const AppLayerLive = Layer.mergeAll(
  // Infrastructure
  DatabaseServiceLive,
  CacheServiceLive,
  LoggingServiceLive,
).pipe(
  // Provide infrastructure to repositories
  Layer.provideMerge(ProductRepositoryLive),
  Layer.provideMerge(UserRepositoryLive),
);
```

---

### Contract Fulfillment Checklist

When implementing a repository, verify:

- ✅ **Import contract tag**: `import { ProductRepository } from "@samuelho-dev/contract-product"`
- ✅ **Use contract tag in Layer**: `Layer.effect(ProductRepository, ...)`
- ✅ **Implement ALL methods**: Every method from contract interface
- ✅ **Match return types**: `Effect.Effect<Option.Option<Product>, ProductError>` if contract says so
- ✅ **Use contract entities**: Import Product, ProductId from contract
- ✅ **Use contract errors**: Import and throw ProductError, ProductNotFoundError
- ✅ **No extra methods**: Only implement what's in the contract (don't add extra methods)

### Common Mistakes to Avoid

#### ❌ Creating New Repository Tag

```typescript
// ❌ WRONG: Creating a new tag instead of using contract
export class ProductRepositoryImpl extends Context.Tag("ProductRepositoryImpl")<...>() {}

export const ProductRepositoryLive = Layer.succeed(ProductRepositoryImpl, {...});
```

**Why Wrong**: This creates a different tag than the contract. Feature services won't be able to use it.

**Correct**:

```typescript
// ✅ Use tag from contract
import { ProductRepository } from "@samuelho-dev/contract-product";

export const ProductRepositoryLive = Layer.effect(ProductRepository, ...);
```

#### ❌ Implementing Subset of Methods

```typescript
// ❌ WRONG: Only implementing some methods
export const ProductRepositoryLive = Layer.effect(
  ProductRepository,
  Effect.gen(function* () {
    return {
      findById: (id) => /* implementation */,
      // Missing: create, update, delete, etc.
    };
  })
);
```

**Why Wrong**: TypeScript will error because not all contract methods are implemented.

**Correct**: Implement ALL methods from the contract interface.

#### ❌ Wrong Return Types

```typescript
// ❌ WRONG: Returning Product directly instead of Option.Option<Product>
findById: (id) =>
  Effect.gen(function* () {
    const result = yield* database.query(/* ... */);
    return result as Product; // Contract expects Option.Option<Product>
  });
```

**Why Wrong**: Contract signature is `Effect.Effect<Option.Option<Product>, ProductError>`.

**Correct**:

```typescript
// ✅ Return Option as contract specifies
findById: (id) =>
  Effect.gen(function* () {
    const result = yield* database.query(/* ... */);
    // Kysely's type inference provides correct type from database schema
    return Option.fromNullable(result);
  });
```

### Creating Layers

**Repository Layer:**

```typescript
import { Layer, Effect } from "effect";
import { ProductRepository } from "@samuelho-dev/contract-product";
import { DatabaseService } from "@samuelho-dev/infra-database";
import { CacheService } from "@samuelho-dev/infra-cache";

export const ProductRepositoryLive = Layer.effect(
  ProductRepository,
  Effect.gen(function* () {
    const database = yield* DatabaseService;
    const cache = yield* CacheService;

    return {
      findById: (id) => /* implementation */,
      // ... other methods
    };
  })
);
```

**Application Layer Composition:**

```typescript
import { Layer } from 'effect';
import { DatabaseServiceLive } from '@samuelho-dev/infra-database';
import { CacheServiceLive } from '@samuelho-dev/infra-cache';
import { LoggingServiceLive } from '@samuelho-dev/infra-logging';
import { ProductRepositoryLive } from '@samuelho-dev/data-access-product';
import { ProductServiceLive } from '@samuelho-dev/feature-product';

// Compose all layers
export const AppLayer = Layer.mergeAll(
  // Infrastructure
  DatabaseServiceLive,
  CacheServiceLive,
  LoggingServiceLive,

  // Repositories
  ProductRepositoryLive,
  SellerRepositoryLive,

  // Services
  ProductServiceLive,
);

// Use in application
const result = await ProductService.pipe(
  Effect.flatMap((service) => service.createProduct(input)),
  Effect.provide(AppLayer),
  Effect.runPromise,
);
```

**Source:** [Effect Layers Documentation](https://effect.website/docs/guides/context-management/layers) - Layer composition and dependency injection.

---

## Error Handling Patterns

### Error Transformation Hierarchy

```
DatabaseError (from Kysely/Prisma)
  ↓ Transform at repository boundary
ProductRepositoryError (data-access layer)
  ↓ Transform at service boundary
ProductDomainError (feature layer)
  ↓ Transform at API boundary
APIError (HTTP response)
```

### Error Types

**Domain Errors (Data.TaggedError):**

```typescript
import { Data } from 'effect';

// Domain error (NOT RPC-serializable)
export class ProductNotFoundError extends Data.TaggedError(
  'ProductNotFoundError',
)<{
  readonly productId: string;
  readonly message: string;
}> {}
```

**Repository Errors (Data.TaggedError):**

```typescript
import { Data } from 'effect';

// Repository errors (domain layer - NOT serialized)
export class ProductNotFoundError extends Data.TaggedError(
  'ProductNotFoundError',
)<{
  readonly productId: string;
  readonly message: string;
}> {}

export class ProductDatabaseError extends Data.TaggedError(
  'ProductDatabaseError',
)<{
  readonly message: string;
  readonly operation: string;
  readonly cause?: unknown;
}> {}

export type ProductRepositoryError =
  | ProductNotFoundError
  | ProductDatabaseError;
```

> **Important**: Repositories are domain layer and use `Data.TaggedError` (NOT serialized). Only RPC boundaries use `Schema.TaggedError` for serialization.

**Source:** [Effect Error Handling](https://effect.website/docs/guides/error-management/error-channel-operations) - Type-safe error management.

### Error Transformation Pattern

```typescript
import { Effect, Data } from 'effect';
import type { DatabaseError } from '@samuelho-dev/infra-database';
import { ProductDatabaseError } from './errors';

/**
 * Transform database errors to repository errors
 */
const toRepositoryError = (error: DatabaseError): ProductRepositoryError => {
  if (
    error._tag === 'DatabaseConstraintError' &&
    error.violationType === 'unique'
  ) {
    return new ProductDatabaseError({
      message: `Product with duplicate constraint: ${error.constraintName}`,
      operation: 'create',
      cause: error,
    });
  }

  return new ProductDatabaseError({
    message: error.message,
    operation: 'unknown',
    cause: error,
  });
};

// Usage:
const create = (input: ProductInsert) =>
  database
    .query((db) =>
      db
        .insertInto('product')
        .values(input)
        .returningAll()
        .executeTakeFirstOrThrow(),
    )
    .pipe(
      Effect.mapError(toRepositoryError), // Transform error at boundary
      Effect.withSpan('ProductRepository.create'),
    );
```

---

## Testing & Spec File Patterns

Data-access libraries test repository implementations to ensure they correctly fulfill contract interfaces. Tests use `@effect/vitest` with minimal mocking for rapid iteration.

> **📘 Comprehensive Testing Guide:** See [TESTING_PATTERNS.md](./TESTING_PATTERNS.md) for complete testing standards and patterns.

**Standard Testing Pattern:**
- ✅ ALL imports from `@effect/vitest`
- ✅ ALL tests use `it.scoped()`
- ✅ ALL layers wrapped with `Layer.fresh()`

### Test File Structure

**Single Test File**: `src/lib/repository.spec.ts`

Tests verify that repository implementations correctly fulfill contract interfaces. Use inline mocks with `it.scoped` for database dependencies.

#### ✅ DO:

- ✅ Test repository behavior (does it fulfill the contract interface?)
- ✅ Import ALL test utilities from `@effect/vitest` (describe, expect, it)
- ✅ Use `it.scoped()` for ALL tests (they need Scope)
- ✅ Wrap ALL test layers with `Layer.fresh()` for isolation
- ✅ Create inline mocks with `Layer.succeed`
- ✅ Focus on contract compliance, not implementation details
- ✅ Keep tests in one file: `src/lib/repository.spec.ts`

#### ❌ DON'T:

- ❌ Create separate `mock-factories.ts` files (inline test data instead)
- ❌ Create separate `kysely-mocks.ts` files (inline mocks instead)
- ❌ Test query builder implementation (Kysely handles this)
- ❌ Test database connection logic (provider layer handles this)
- ❌ Create 5-6 test files (one file is sufficient)
- ❌ Use manual `Effect.runPromise` (use `it.scoped()` instead)
- ❌ Mix imports from `vitest` and `@effect/vitest` (use @effect/vitest only)
- ❌ Forget `Layer.fresh()` wrapping (causes test state leakage)

### Example: Repository Implementation Tests

**File**: `src/lib/repository.spec.ts`

```typescript
// src/lib/repository.spec.ts
import { Effect, Option, Layer } from 'effect';
import { describe, expect, it } from '@effect/vitest'; // ✅ All from @effect/vitest
import { ProductRepository } from '@samuelho-dev/contract-product';
import { KyselyService } from '@samuelho-dev/provider-kysely';
import type { ProductSelect } from '@samuelho-dev/types-database';

// Mock Kysely layer inline for testing
const KyselyServiceMock = Layer.succeed(KyselyService, {
  db: {
    // Minimal mock - implement only what you need for your tests
    selectFrom: () => ({
      selectAll: () => ({
        where: () => ({
          executeTakeFirst: (): Effect.Effect<ProductSelect | null> =>
            Effect.succeed({
              id: 'prod-123',
              name: 'Test Product',
              price: 1000,
              sellerId: 'seller-456',
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
        }),
      }),
    }),
  },
});

// Test repository implementation
describe('ProductRepository', () => {
  // Use it.scoped for repository tests (they need Scope)
  it.scoped('findById returns product when it exists', () => // ✅ Always it.scoped
    Effect.gen(function* () {
      const repo = yield* ProductRepository;
      const result = yield* repo.findById('prod-123');

      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        expect(result.value.id).toBe('prod-123');
        expect(result.value.name).toBe('Test Product');
      }
    }).pipe(
      Effect.provide(
        Layer.fresh( // ✅ Always Layer.fresh
          ProductRepositoryLive.pipe(Layer.provide(KyselyServiceMock))
        ),
      ),
    ),
  );

  it.scoped('findById returns None when product does not exist', () => // ✅ Always it.scoped
    Effect.gen(function* () {
      const mockNotFound = Layer.succeed(KyselyService, {
        db: {
          selectFrom: () => ({
            selectAll: () => ({
              where: () => ({
                executeTakeFirst: () => Effect.succeed(null),
              }),
            }),
          }),
        },
      });

      const repo = yield* ProductRepository;
      const result = yield* repo.findById('nonexistent');

      expect(Option.isNone(result)).toBe(true);
    }).pipe(
      Effect.provide(
        Layer.fresh( // ✅ Always Layer.fresh
          ProductRepositoryLive.pipe(Layer.provide(mockNotFound))
        )
      ),
    ),
  );

  it.scoped('create inserts new product', () => // ✅ Always it.scoped
    Effect.gen(function* () {
      const mockCreate = Layer.succeed(KyselyService, {
        db: {
          insertInto: () => ({
            values: () => ({
              returningAll: () => ({
                executeTakeFirstOrThrow: (): Effect.Effect<ProductSelect> =>
                  Effect.succeed({
                    id: 'new-prod-789',
                    name: 'New Product',
                    price: 2000,
                    sellerId: 'seller-456',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  }),
              }),
            }),
          }),
        },
      });

      const repo = yield* ProductRepository;
      const result = yield* repo.create({
        name: 'New Product',
        price: 2000,
        sellerId: 'seller-456',
      });

      expect(result.id).toBe('new-prod-789');
      expect(result.name).toBe('New Product');
    }).pipe(
      Effect.provide(
        Layer.fresh( // ✅ Always Layer.fresh
          ProductRepositoryLive.pipe(Layer.provide(mockCreate))
        )
      ),
    ),
  );
});
```

### Vitest Configuration

**File**: `vitest.config.ts`

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['@effect/vitest/setup'],
  },
});
```

### Best Practices

1. **One Test File**: Keep all repository tests in `src/lib/repository.spec.ts`
2. **Inline Mocks**: Create mocks inline with `Layer.succeed`, no separate files
3. **Use it.scoped**: Repository tests need Scope for resource management
4. **Focus on Behavior**: Test contract compliance, not implementation details
5. **Minimal Mocking**: Mock only what you need for each specific test

**Generator Must Create:**

- ✅ Single `repository.spec.ts` file (not multiple test files)
- ✅ Use `@effect/vitest` with `it.scoped` for resource cleanup
- ✅ Mock infrastructure with `Layer.succeed` inline
- ✅ Test contract fulfillment (verify all interface methods work)
- ✅ Test error transformation (database errors → repository errors)
- ✅ Test cache integration (hits, misses, invalidation)
- ✅ Test transaction rollback behavior (if applicable)

**Generator Must NOT Create:**

- ❌ Separate mock files (`mock-factories.ts`, `test-utils.ts`)
- ❌ Multiple test files per repository
- ❌ Integration tests requiring real database (use Effect test layers)
- ❌ Tests in multiple directories (keep all in `src/lib/`)

---

## Nx Naming Conventions

### Official Nx Data-Access Naming

**Pattern:** `data-access-{domain}`

**Examples:**

- ✅ `@samuelho-dev/data-access-product`
- ✅ `@samuelho-dev/data-access-user`
- ✅ `@samuelho-dev/data-access-seller`

**Wrong:**

- ❌ `@samuelho-dev/product-data-access` (incorrect order - domain before type)
- ❌ `@samuelho-dev/product-repo` (non-standard suffix)

**Source:** [Nx Library Types](https://nx.dev/concepts/more-concepts/library-types) - Official Nx naming patterns for data-access libraries.

### Library Structure

```
libs/{domain}-data-access/
├── src/
│   ├── lib/
│   │   ├── repository.ts       # Repository implementation
│   │   ├── errors.ts           # Error transformation
│   │   └── layers.ts           # Effect Layer exports
│   ├── index.ts                    # Export
├── project.json
├── package.json
└── tsconfig.json
```

**Key Points:**

- **Server code** (if any) exported from `/server` entrypoint only if server and client separation is needed
- **Client code** (if any) exported from `/client` entrypoint only if server and client separation is needed
- **Edge code** (if any) exported from `/edge` entrypoint only if edge is needed
- **Never export server code from main index.ts**

---

## Nx Configuration

Data-access libraries follow Nx best practices for buildable libraries with TypeScript project references.

### project.json

```json
{
  "name": "data-access-product",
  "$schema": "../../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/data-access/product/src",
  "projectType": "library",
  "tags": ["type:data-access", "scope:server", "domain:product"],
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/libs/data-access/product", // Nx standard path
        "main": "libs/data-access/product/src/index.ts",
        "tsConfig": "libs/data-access/product/tsconfig.lib.json",
        "assets": ["libs/data-access/product/*.md"],
        "updateBuildableProjectDepsInPackageJson": false,
        "buildableProjectDepsInPackageJsonType": "dependencies",
        "batch": true // Enable TSC batch mode for incremental compilation
      },
      "configurations": {
        "production": {
          "declaration": true,
          "sourceMap": false
        }
      }
    },
    "test": {
      "executor": "@nx/vite:test",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "options": {
        "config": "libs/data-access/product/vitest.config.ts",
        "passWithNoTests": true
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "options": {
        "lintFilePatterns": ["libs/data-access/product/**/*.ts"]
      }
    },
    "typecheck": {
      "executor": "@nx/js:tsc",
      "options": {
        "tsConfig": "libs/data-access/product/tsconfig.lib.json",
        "noEmit": true
      }
    }
  }
}
```

### tsconfig.lib.json

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "composite": true, // Enable TypeScript project references
    "outDir": "../../../dist/libs/data-access/product/",
    "declaration": true,
    "declarationMap": true,
    "types": ["node"],
    "noUncheckedIndexedAccess": true, // Enforce safe array/object access
    "exactOptionalPropertyTypes": true // No undefined in optional properties
  },
  "exclude": ["vitest.config.ts", "src/**/*.spec.ts", "src/**/*.test.ts"],
  "include": ["src/**/*.ts"],
  "references": [
    { "path": "../../contracts/product/tsconfig.lib.json" }, // Repository interface
    { "path": "../../types/database/tsconfig.lib.json" }, // Database types
    { "path": "../../infra/database/tsconfig.lib.json" }, // Database service
    { "path": "../../infra/cache/tsconfig.lib.json" }, // Cache service
    { "path": "../../infra/logging/tsconfig.lib.json" } // Logging service
  ]
}
```

### package.json

```json
{
  "name": "@samuelho-dev/data-access-product",
  "version": "0.0.1",
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./server": {
      "types": "./src/server.ts",
      "default": "./src/server.ts"
    }
  },
  "peerDependencies": {
    "effect": "^3.0.0",
    "kysely": "^0.27.0"
  },
  "dependencies": {
    "@samuelho-dev/contract-product": "workspace:*",
    "@samuelho-dev/types-database": "workspace:*",
    "@samuelho-dev/infra-database": "workspace:*",
    "@samuelho-dev/infra-cache": "workspace:*",
    "@samuelho-dev/infra-logging": "workspace:*"
  }
}
```

### Key Build Configuration Points

1. **TSC Batch Mode**: `batch: true` enables TypeScript incremental compilation (1.16-7.73x faster)
2. **TypeScript Project References**: `composite: true` with explicit `references` for dependency tracking
3. **Standard Output Path**: `dist/libs/data-access/{domain}` follows Nx conventions
4. **Type Safety**: `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` enforce strict typing
5. **Server-Only Exports**: Data-access is server-side only, no client/edge exports needed

---

## Cross-References

- **For contract definitions:** See `contracts.md` - Repository interfaces, errors, and events
- **For architecture overview:** See `ARCHITECTURE.md` - Clean Architecture patterns with Effect.ts
- **For Nx configuration:** See `nx.json` and project-specific `project.json` files

---

## Sources Summary

1. **Martin Fowler - Repository Pattern**: https://martinfowler.com/eaaCatalog/repository.html - Original pattern definition
2. **The Repository Pattern Is Dead (2024)**: https://khalilstemmler.com/articles/typescript-domain-driven-design/repository-dto-mapper/ - Modern critique of over-abstraction
3. **Effect.ts Documentation**: https://effect.website/docs/introduction - Functional programming patterns
4. **Kysely Documentation**: https://kysely.dev/ - Type-safe SQL query builder
5. **Clean Architecture (Robert Martin)**: https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html - Dependency inversion
6. **Nx Data-Access Libraries**: https://nx.dev/concepts/decisions/project-dependency-rules - Official Nx patterns
7. **Effect Error Handling**: https://effect.website/docs/guides/error-management/error-channel-operations - Type-safe errors
8. **Effect Layers**: https://effect.website/docs/guides/context-management/layers - Layer composition
9. **Effect Testing**: https://effect.website/docs/guides/testing - Testing Effect programs

---

## Migration Notes

**This documentation represents best practices and target architecture.**

### Naming Migration

All data-access libraries follow the **`data-access-{domain}`** pattern:

```
✅ CORRECT:
@samuelho-dev/data-access-product
@samuelho-dev/data-access-user
@samuelho-dev/data-access-audit-log

❌ INCORRECT (legacy):
@samuelho-dev/product-data-access (domain-before-type)
@samuelho-dev/data-access-logging (ambiguous naming)
```

### Infrastructure vs Domain Data-Access

**Domain Data-Access** (15 libraries):

- Bounded context repositories (Product, User, Seller, etc.)
- Business entity CRUD operations
- Domain-specific queries

**Infrastructure Data-Access** (3 libraries):

- Cross-cutting data concerns
- Example: `data-access-audit-log` (webhook logs, search logs)
- Distinct from `infra-logging` service (structured application logging)

### Service vs Repository Separation

**`infra-logging`** (Service):

- Structured application logging
- Runtime log management
- Console/file/remote transport

**`data-access-audit-log`** (Repository):

- Database tables: `stripe_webhook_event_log`, `search_log`
- Historical audit trail
- Query/persistence operations

This separation maintains clear boundaries:

- Services provide capabilities
- Repositories manage data persistence

### When Creating New Data-Access Libraries

1. **Identify Domain**: Is this a bounded context or infrastructure concern?
2. **Count Tables**: Group related tables (3-10 typical)
3. **Define Repository Interface**: Use Effect-based signatures
4. **Implement with Kysely**: Type-safe SQL queries
5. **Follow Pattern**: Context.Tag → Layer → Repository implementation

**Target Pattern**: All new libraries should follow patterns documented here, not legacy implementations in the codebase.

---

## Structured Logging Integration

**Validated**: Effect Logger documentation (documentId 7333)

Data-access layer should use Effect's structured logging for all operations. This provides:

- Query traceability
- Performance monitoring
- Error context
- Audit trails

### Repository Logging Pattern

```typescript
import { Effect } from 'effect';

export const ProductRepositoryLive = Layer.effect(
  ProductRepository,
  Effect.gen(function* () {
    const database = yield* DatabaseService;
    const cache = yield* CacheService;

    return {
      findById: (id) =>
        Effect.gen(function* () {
          // Log operation start with structured metadata
          yield* Effect.logInfo('Finding product by ID').pipe(
            Effect.annotateLogs({
              productId: id,
              operation: 'findById',
              layer: 'data-access',
            }),
          );

          // Check cache
          const cached = yield* cache.get(`product:${id}`);
          if (Option.isSome(cached)) {
            yield* Effect.logDebug('Cache hit');
            return cached;
          }

          yield* Effect.logDebug('Cache miss, querying database');

          // Query database
          const product = yield* database.query((db) =>
            db
              .selectFrom('product')
              .where('id', '=', id)
              .selectAll()
              .executeTakeFirst(),
          );

          if (Option.isSome(product)) {
            yield* cache.set(`product:${id}`, product.value, '5 minutes');
            yield* Effect.logDebug('Product cached');
          }

          return product;
        }),
    };
  }),
);
```

### Query Performance Logging

```typescript
const findAll = (filters: ProductFilters) =>
  Effect.gen(function* () {
    const startTime = Date.now();

    yield* Effect.logInfo('Querying products').pipe(
      Effect.annotateLogs({
        operation: 'findAll',
        filters: JSON.stringify(filters),
      }),
    );

    const products = yield* database.query((db) => {
      let query = db.selectFrom('product').selectAll();

      if (filters.category) {
        query = query.where('category', '=', filters.category);
      }

      if (filters.minPrice) {
        query = query.where('price', '>=', filters.minPrice);
      }

      return query.execute();
    });

    const duration = Date.now() - startTime;

    yield* Effect.logInfo('Query completed').pipe(
      Effect.annotateLogs({
        resultCount: products.length,
        durationMs: duration,
      }),
    );

    return products;
  });
```

### Error Logging with Context

```typescript
const create = (input: ProductInsert) =>
  Effect.gen(function* () {
    yield* Effect.logInfo('Creating product').pipe(
      Effect.annotateLogs({
        operation: 'create',
        productData: {
          name: input.name,
          category: input.category,
          price: input.price,
        },
      }),
    );

    return yield* database.query((db) =>
      db
        .insertInto('product')
        .values(input)
        .returningAll()
        .executeTakeFirstOrThrow(),
    );
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError('Product creation failed').pipe(
          Effect.annotateLogs({
            errorType: error._tag,
            errorMessage: error.message,
            productName: input.name,
          }),
        );

        return Effect.fail(error);
      }),
    ),
  );
```

### Transaction Logging

```typescript
const createProductWithVariants = (
  product: ProductInsert,
  variants: ProductVariantInsert[],
) =>
  Effect.gen(function* () {
    yield* Effect.logInfo('Starting product creation transaction').pipe(
      Effect.annotateLogs({
        operation: 'createProductWithVariants',
        variantCount: variants.length,
      }),
    );

    const database = yield* DatabaseService;

    // ✅ CORRECT: Just yield* transaction - infra handles runtime preservation
    return yield* database
      .transaction((tx) =>
        Effect.gen(function* () {
          // ✅ Effect.log* works inside transaction - infra preserves context
          yield* Effect.logDebug('Creating product record');

          const createdProduct = yield* Effect.tryPromise({
            try: () =>
              tx
                .insertInto('product')
                .values(product)
                .returningAll()
                .executeTakeFirstOrThrow(),
            catch: (error) =>
              new ProductDatabaseError({
                message: 'Failed to insert product',
                cause: error,
              }),
          });

          yield* Effect.logDebug('Creating variant records', {
            productId: createdProduct.id,
          });

          yield* Effect.tryPromise({
            try: () =>
              tx
                .insertInto('product_variant')
                .values(
                  variants.map((v) => ({
                    ...v,
                    product_id: createdProduct.id,
                  })),
                )
                .execute(),
            catch: (error) =>
              new ProductDatabaseError({
                message: 'Failed to insert variants',
                cause: error,
              }),
          });

          yield* Effect.logInfo('Transaction completed successfully').pipe(
            Effect.annotateLogs({
              productId: createdProduct.id,
              variantCount: variants.length,
            }),
          );

          return createdProduct;
        }),
      )
      .pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Effect.logError('Transaction failed').pipe(
              Effect.annotateLogs({
                errorMessage: String(error),
                productName: product.name,
              }),
            );
            return Effect.fail(error);
          }),
        ),
      );
  });
```

### Log Levels in Data-Access

Use appropriate log levels:

- **`Effect.logTrace`**: SQL query strings (verbose debugging)
- **`Effect.logDebug`**: Cache hits/misses, internal operations
- **`Effect.logInfo`**: Repository method calls, successful operations
- **`Effect.logWarning`**: Degraded performance, fallback operations
- **`Effect.logError`**: Failed operations, exceptions
- **`Effect.logFatal`**: Critical failures requiring immediate attention

### Structured Metadata Best Practices

```typescript
// ✅ GOOD - Structured, searchable metadata
yield *
  Effect.logInfo('Product search executed').pipe(
    Effect.annotateLogs({
      operation: 'search',
      query: searchTerm,
      resultCount: results.length,
      durationMs: duration,
      userId: context.userId,
      cached: false,
    }),
  );

// ❌ BAD - String concatenation, hard to query
yield *
  Effect.logInfo(
    `Product search for "${searchTerm}" returned ${results.length} results in ${duration}ms`,
  );

// ✅ GOOD - Consistent field names across operations
yield *
  Effect.annotateLogs({
    operation: 'create', // Always use "operation"
    productId: id, // Always use "productId"
    userId: userId, // Always use "userId"
    durationMs: duration, // Always use "durationMs"
  });

// ❌ BAD - Inconsistent naming
yield *
  Effect.annotateLogs({
    action: 'create', // Inconsistent with "operation"
    id: id, // Ambiguous - what kind of ID?
    user: userId, // Inconsistent with "userId"
    time: duration, // Unclear units
  });
```

### Integration with Telemetry

Combine logging with spans for full observability:

```typescript
const findById = (id: string) =>
  Effect.withSpan('ProductRepository.findById', {
    attributes: { productId: id },
  })(
    Effect.gen(function* () {
      yield* Effect.logInfo('Finding product').pipe(
        Effect.annotateLogs({ productId: id }),
      );

      const product = yield* database.query(/* ... */);

      yield* Effect.annotateCurrentSpan({
        found: Option.isSome(product),
      });

      return product;
    }),
  );
```

This ensures:

- Logs are associated with trace spans
- Distributed tracing works correctly
- Performance metrics are captured
- Full request context is preserved

---

## Stream-Based Repository Operations

For processing large datasets or implementing pagination efficiently, repositories can expose Stream-based operations alongside standard methods.

### When to Use Stream

Use Stream for:
- **Large Result Sets:** Processing 1000+ records
- **Memory Constraints:** Constant-memory processing required
- **Pagination:** Fetching all pages from database
- **Batch Processing:** Processing records in chunks
- **Real-time Processing:** Backpressure-aware data flows

### Stream Implementation Pattern

```typescript
export interface ProductRepository {
  // Standard operations
  readonly findAll: () => Effect.Effect<Product[], ProductRepositoryError>;

  // Stream-based operations for large datasets
  readonly streamAll: (options?: {
    batchSize?: number;
    filters?: ProductFilters;
  }) => Stream.Stream<Product, ProductRepositoryError, never>;
}

// Implementation
streamAll: (options = {}) =>
  Stream.asyncScoped<Product, ProductRepositoryError>((emit) =>
    Effect.gen(function* () {
      const db = yield* KyselyService;
      const batchSize = options.batchSize ?? 100;
      let offset = 0;

      while (true) {
        // Fetch batch from database
        const batch = yield* Effect.tryPromise({
          try: () =>
            db
              .selectFrom('products')
              .selectAll()
              .limit(batchSize)
              .offset(offset)
              .execute(),
          catch: (error) =>
            new ProductRepositoryError({
              message: 'Failed to stream products',
              cause: error,
            }),
        });

        // End stream if no more results
        if (batch.length === 0) break;

        // Emit each product
        for (const product of batch) {
          yield* emit.single(product);
        }

        offset += batchSize;
      }
    }),
  ),
```

### Stream Usage in Feature Services

```typescript
// Feature service using repository stream
processAllProducts: () =>
  Effect.gen(function* () {
    const repo = yield* ProductRepository;

    // Process with constant memory
    const summary = yield* repo.streamAll({ batchSize: 100 }).pipe(
      // Transform each product
      Stream.mapEffect((product) =>
        Effect.gen(function* () {
          yield* validateProduct(product);
          yield* enrichProduct(product);
          return product;
        }),
      ),
      // Group into batches for bulk operations
      Stream.grouped(50),
      Stream.mapEffect((batch) => processBatch(batch)),
      // Collect results
      Stream.runCollect,
      Effect.map((results) => ({
        processed: Chunk.size(results),
        success: true,
      })),
    );

    return summary;
  }),
```

### Stream with Sink for Aggregation

Use Sink for constant-memory aggregations:

```typescript
// Calculate total revenue across all orders
calculateTotalRevenue: (startDate: Date, endDate: Date) =>
  Effect.gen(function* () {
    const repo = yield* OrderRepository;

    const total = yield* repo
      .streamByCriteria({
        status: 'completed',
        createdAt: { gte: startDate, lte: endDate },
      })
      .pipe(
        Stream.map((order) => order.amount),
        Stream.run(Sink.sum), // Constant memory aggregation!
      );

    return total;
  }),
```

### Benefits of Stream-Based Operations

**Memory Efficiency:**
- Process millions of records with constant memory
- No need to load entire result set into memory
- Automatic backpressure prevents overflow

**Performance:**
- Batch fetching reduces database round-trips
- Parallel processing with controlled concurrency
- Progressive processing starts immediately

**Composability:**
- Easy to add transformations, filtering, batching
- Integrate with Effect operators (mapEffect, filter, etc.)
- Combine with Sink for aggregations

### Testing Stream Operations

```typescript
it.scoped('streamAll processes all products', () =>
  Effect.gen(function* () {
    const repo = yield* ProductRepository;

    const products = yield* repo.streamAll({ batchSize: 10 }).pipe(
      Stream.take(5), // Test first 5 items
      Stream.runCollect,
      Effect.map(Chunk.toArray),
    );

    expect(products.length).toBe(5);
  }).pipe(Effect.provide(Layer.fresh(ProductRepositoryLive))),
);
```

**See Also:**
- [EFFECT_PATTERNS.md - Streaming & Queuing Patterns](./EFFECT_PATTERNS.md#streaming--queuing-patterns)
- [TESTING_PATTERNS.md - Testing with TestClock](./TESTING_PATTERNS.md#testing-with-testclock)

---

**Word Count:** ~7,000 words
