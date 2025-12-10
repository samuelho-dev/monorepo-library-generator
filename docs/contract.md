# Contract Library Architecture

> **📚 Related Documentation:**
>
> - [Architecture Overview](./ARCHITECTURE_OVERVIEW.md) - Library inventory and integration patterns
> - [Nx Standards](./NX_STANDARDS.md) - Naming conventions (`contract-{domain}` pattern)
> - [Effect Patterns Guide](./EFFECT_PATTERNS.md) - Context.Tag and Layer patterns
> - [Data-Access Libraries](./DATA-ACCESS.md) - How to implement contract repository interfaces
> - [Feature Libraries](./FEATURE.md) - How features use contracts for services and RPC
> - [Infrastructure RPC](./INFRA.md#infrastructure-rpc) - Shared RPC middleware tags
> - [Provider Libraries](./PROVIDER.md) - External service adapters (not repositories)

## Overview

Contract libraries define domain boundaries through interfaces, entities, and errors using Effect.ts patterns. They establish technology-agnostic ports that implementations in data-access and provider libraries fulfill.

## Core Principles

1. **Domain Boundary Definition**: Each contract represents a bounded context
2. **Repository Interfaces ONLY Here**: Repository ports are EXCLUSIVELY defined in contracts, NEVER in data-access
3. **Technology Agnostic**: Contracts don't know about specific databases, ORMs, or external services
4. **Effect-First**: All interfaces use Effect types for consistency and composability
5. **Type Safety**: Use generated database types from `@creativetoolkits/types-database` - NEVER duplicate entity definitions
6. **Separation of Concerns**: Interfaces (contracts) vs Implementations (data-access) vs Business Logic (features)
7. **Error Type Selection**: Use Data.TaggedError for domain/business errors (runtime errors within Effect). Use Schema.TaggedError for RPC errors (serializable errors crossing service boundaries)

## State Management Note

**Contracts never define state management.** State management is platform/implementation-specific:

- **Client-side React state**: Use `@effect-atom/atom` in feature layer (e.g., cart, filters, form inputs)
- **Server-side concurrent state**: Use Effect `Ref` or `SynchronizedRef` in infra layer (e.g., pools, caches)

Contracts define the **domain logic** and **repository interfaces** only. State management belongs in:
- **Feature layer** for client state management with Atoms and service orchestration
- **Infra layer** for server state management with Refs and resource management

See [EFFECT_PATTERNS.md - State Management section](./EFFECT_PATTERNS.md#state-management-with-effectatomatom-client-side) for detailed state management patterns.

## Directory Structure

```
libs/contract/{domain}/
├── src/
│   ├── index.ts              # Public API exports
│   └── lib/
│       ├── entities.ts       # Domain entities using Schema.Class not duplicating database generated effect types
│       ├── errors.ts         # Domain errors using Data.TaggedError
│       ├── events.ts         # Domain events using Schema.Class
│       ├── ports.ts          # Repository & service interfaces
│       ├── rpc.ts            # RPC schemas and error types
│       │
│       # OPTIONAL - Only if implementing CQRS pattern:
│       ├── commands.ts       # Write operation schemas (CQRS)
│       ├── queries.ts        # Read operation schemas (CQRS)
│       └── projections.ts    # Read model schemas (CQRS)
│
├── project.json              # Nx project configuration
├── tsconfig.json            # TypeScript configuration
├── tsconfig.lib.json        # Library build configuration
├── tsconfig.spec.json       # Test configuration
├── vitest.config.ts          # Vitest configuration
├── package.json             # Package dependencies
└── README.md                # Contract documentation
```

**Note:** For CQRS pattern implementation, see the [CQRS Contract Patterns](#cqrs-contract-patterns-commands-queries-projections) section below for complete details on optional CQRS files and their integration with feature, data-access, and infra layers.

## Repository Interface Pattern

Repository interfaces are defined in contracts to establish the domain boundary:

```typescript
// libs/contract/product/src/lib/ports.ts
import { Context, Effect, Option } from "effect";
import type {
  ProductSelect,
  ProductInsert,
  ProductUpdate,
} from "@creativetoolkits/types-database";
import type { ProductRepositoryError } from "./errors";

/**
 * Repository interface using modern Context.Tag pattern with inline interface
 * Uses generated database types directly - NO transformation in contract layer
 */
export class ProductRepository extends Context.Tag("ProductRepository")<
  ProductRepository,
  {
    readonly findById: (
      id: string,
    ) => Effect.Effect<Option.Option<ProductSelect>, ProductRepositoryError>;

    readonly findBySlug: (
      slug: string,
    ) => Effect.Effect<Option.Option<ProductSelect>, ProductRepositoryError>;

    readonly create: (
      input: ProductInsert,
    ) => Effect.Effect<ProductSelect, ProductRepositoryError>;

    readonly update: (
      id: string,
      input: ProductUpdate,
    ) => Effect.Effect<ProductSelect, ProductRepositoryError>;

    readonly delete: (
      id: string,
    ) => Effect.Effect<void, ProductRepositoryError>;

    // Domain-specific queries
    readonly findBySeller: (
      sellerId: string,
      options?: { limit?: number; offset?: number },
    ) => Effect.Effect<readonly ProductSelect[], ProductRepositoryError>;

    readonly findByCategory: (
      category: string,
    ) => Effect.Effect<readonly ProductSelect[], ProductRepositoryError>;

    // Batch operations
    readonly createMany: (
      inputs: readonly ProductInsert[],
    ) => Effect.Effect<readonly ProductSelect[], ProductRepositoryError>;

    readonly updateMany: (
      updates: readonly { id: string; input: ProductUpdate }[],
    ) => Effect.Effect<readonly ProductSelect[], ProductRepositoryError>;

    readonly deleteMany: (
      ids: readonly string[],
    ) => Effect.Effect<number, ProductRepositoryError>; // Returns count deleted

    // Pagination patterns
    readonly findPaginated: (options: {
      limit: number;
      offset: number;
      orderBy?: keyof ProductSelect;
      direction?: "asc" | "desc";
    }) => Effect.Effect<
      {
        items: readonly ProductSelect[];
        total: number;
        hasMore: boolean;
      },
      ProductRepositoryError
    >;

    // Cursor-based pagination
    readonly findByCursor: (options: {
      limit: number;
      cursor?: string;
      direction?: "forward" | "backward";
    }) => Effect.Effect<
      {
        items: readonly ProductSelect[];
        nextCursor?: string;
        prevCursor?: string;
      },
      ProductRepositoryError
    >;

    // Soft delete support
    readonly softDelete: (
      id: string,
    ) => Effect.Effect<void, ProductRepositoryError>;

    readonly restore: (
      id: string,
    ) => Effect.Effect<ProductSelect, ProductRepositoryError>;

    // Transaction support
    readonly inTransaction: <R, E, A>(
      fn: (repo: ProductRepository) => Effect.Effect<A, E, R>,
    ) => Effect.Effect<A, E | ProductRepositoryError, R>;
  }
>() {}
```

**Generator Must Create:**
- ✅ Repository tag extending `Context.Tag` with inline interface
- ✅ Use generated types from `@creativetoolkits/types-database` (never duplicate)
- ✅ All methods return `Effect<Result, DomainError>`
- ✅ Single-item methods return `Effect<Option<T>, Error>` for not-found cases
- ✅ Collection methods return `Effect<readonly T[], Error>` (empty array for no results)
- ✅ CRUD operations: `findById`, `create`, `update`, `delete` (minimum)
- ✅ Domain-specific query methods as needed
- ✅ Transaction support with `inTransaction` method pattern

**Generator Must NOT Create:**
- ❌ Implementation code (belongs in data-access layer)
- ❌ Query builders or SQL (belongs in data-access layer)
- ❌ Database-specific types (use generated types)
- ❌ Transformation logic (contracts define interface, not behavior)
- ❌ Repository instances or factories

**Return Type Rules:**
| Query Type | Return Type | Example |
|------------|-------------|---------|
| Single item (may not exist) | `Effect<Option<T>, E>` | `findById`, `findBySlug` |
| Single item (must exist or fail) | `Effect<T, E>` | `create`, `update` |
| Collection (may be empty) | `Effect<readonly T[], E>` | `findAll`, `findBySeller` |
| Count | `Effect<number, E>` | `deleteMany` returns deleted count |
| Void operation | `Effect<void, E>` | `delete`, `softDelete` |

## Entity Definition Pattern

Entities use Schema.Class for validation and serialization:

```typescript
// libs/contract/product/src/lib/entities.ts
import { Schema } from "effect";

// Domain entity with validation rules
export class Product extends Schema.Class<Product>("Product")({
  id: Schema.String,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(200)),
  description: Schema.String,
  price: Schema.Number.pipe(Schema.positive(), Schema.finite()),
  sellerId: Schema.String,
  categoryId: Schema.String,
  status: Schema.Literal("draft", "published", "archived"),
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
  // Optional fields with defaults
  featured: Schema.propertySignature(Schema.Boolean).pipe(
    Schema.withConstructorDefault(() => false),
  ),
  stock: Schema.propertySignature(Schema.Number).pipe(
    Schema.withConstructorDefault(() => 0),
  ),
}) {}

// Value objects
export class Money extends Schema.Class<Money>("Money")({
  amount: Schema.Number.pipe(Schema.finite()),
  currency: Schema.Literal("USD", "EUR", "GBP"),
}) {}

export class ProductStatus extends Schema.Literal(
  "draft",
  "published",
  "archived",
) {}
```

**Generator Must Create:**
- ✅ Domain entities using `Schema.Class` (NOT plain interfaces)
- ✅ Validation rules via Schema pipes (`minLength`, `maxLength`, `positive`, etc.)
- ✅ Value objects for domain concepts (Money, Email, etc.)
- ✅ Literal types for enums/status fields
- ✅ Optional fields with `Schema.propertySignature` and `withConstructorDefault`
- ✅ Timestamp fields using `Schema.DateTimeUtc`
- ✅ Export encoded/decoded types: `Schema.Encoded<Product>`, `Schema.Type<Product>`

**Generator Must NOT Create:**
- ❌ Database table definitions (those are in Prisma schema)
- ❌ Duplicate types from `@creativetoolkits/types-database`
- ❌ Plain TypeScript interfaces for entities (use Schema.Class)
- ❌ Transformation logic (entities are data, not behavior)
- ❌ Repository methods on entity classes

**Schema Validation Rules:**
| Field Type | Schema Pattern | Example |
|------------|----------------|---------|
| Required string | `Schema.String.pipe(Schema.minLength(1))` | Names, titles |
| Optional string | `Schema.propertySignature(Schema.String)` | Descriptions |
| Positive number | `Schema.Number.pipe(Schema.positive())` | Prices, quantities |
| Enum/Status | `Schema.Literal("draft", "published")` | Status fields |
| Date/Time | `Schema.DateTimeUtc` | Timestamps |
| Email | `Schema.String.pipe(Schema.pattern(/email-regex/))` | User emails |
| Boolean with default | `Schema.propertySignature(Schema.Boolean).pipe(Schema.withConstructorDefault(() => false))` | Flags |

## Error Definition Pattern

### Critical Distinction: Data.TaggedError vs Schema.TaggedError

**IMPORTANT**: Choose the correct error type based on usage:

- **Data.TaggedError**: Runtime errors within the same process (99% of cases)
- **Schema.TaggedError**: ONLY for errors that need serialization across service boundaries (RPC)

### Domain Errors (Data.TaggedError) - DEFAULT CHOICE

Use Data.TaggedError for all runtime errors within your application:

```typescript
// libs/contract/product/src/lib/errors.ts
import { Data } from "effect";

// ✅ CORRECT - Domain error for business logic violations
export class ProductNotFoundError extends Data.TaggedError(
  "ProductNotFoundError",
)<{
  readonly productId: string;
  readonly message: string;
}> {}

// ✅ CORRECT - State transition error
export class InvalidProductStateError extends Data.TaggedError(
  "InvalidProductStateError",
)<{
  readonly productId: string;
  readonly currentState: string;
  readonly attemptedTransition: string;
  readonly message: string;
}> {}

// ✅ CORRECT - Business rule violation
export class InsufficientStockError extends Data.TaggedError(
  "InsufficientStockError",
)<{
  readonly productId: string;
  readonly available: number;
  readonly requested: number;
}> {
  // Optional: Add computed properties
  get shortage() {
    return this.requested - this.available;
  }
}

// ✅ CORRECT - Repository-level errors
export class ProductRepositoryError extends Data.TaggedError(
  "ProductRepositoryError",
)<{
  readonly operation: "create" | "update" | "delete" | "query";
  readonly message: string;
  readonly cause?: unknown;
}> {}

// ✅ CORRECT - Union type for exhaustive error handling
export type ProductError =
  | ProductNotFoundError
  | InvalidProductStateError
  | InsufficientStockError
  | ProductRepositoryError;
```

### RPC Schemas and Types

> **🎯 Contract Library RPC Responsibilities:**
>
> Contracts define **RPC SCHEMAS ONLY** - request/response structures and error types for serialization:
> - ✅ Request schemas (e.g., `CreateProductRequest`)
> - ✅ Response schemas (e.g., `CreateProductResponse`)
> - ✅ RPC error types using `Schema.TaggedError` (for network serialization)
>
> Contracts **DO NOT** define:
> - ❌ RPC routers (defined in **feature** libraries with `Rpc.router`)
> - ❌ RPC handlers (defined inline in **feature** libraries)
> - ❌ Middleware implementations (provided by **application** layer)
>
> See [Feature RPC Pattern](./FEATURE.md#rpc-pattern-effect-effectrpc-official-pattern) for router/handler implementation.

Contracts define RPC request/response schemas using Effect Schema for type-safe communication:

```typescript
// libs/contract/product/src/lib/rpc.ts
import { Schema } from "effect";

// Request/Response Schemas
export const ListProductsRequest = Schema.Struct({
  page: Schema.optionalWith(Schema.Number, { default: () => 1 }),
  limit: Schema.optionalWith(Schema.Number, { default: () => 20 }),
  sort: Schema.optional(Schema.Literal("name", "price", "created")),
  filter: Schema.optional(
    Schema.Struct({
      category: Schema.optional(Schema.String),
      minPrice: Schema.optional(Schema.Number),
      maxPrice: Schema.optional(Schema.Number),
    }),
  ),
});

export const ListProductsResponse = Schema.Struct({
  products: Schema.Array(ProductSchema),
  total: Schema.Number,
  page: Schema.Number,
  hasMore: Schema.Boolean,
});

export const CreateProductRequest = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  description: Schema.String.pipe(Schema.maxLength(1000)),
  price: Schema.Number.pipe(Schema.positive()),
  category: Schema.String,
  stock: Schema.optional(Schema.Number.pipe(Schema.nonNegative())),
});

export const CreateProductResponse = Schema.Struct({
  product: ProductSchema,
});

export const UpdateProductRequest = Schema.Struct({
  id: Schema.String,
  name: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  price: Schema.optional(Schema.Number.pipe(Schema.positive())),
  stock: Schema.optional(Schema.Number.pipe(Schema.nonNegative())),
});

export const UpdateProductResponse = Schema.Struct({
  product: ProductSchema,
});

// RPC Error Classes - Use Schema.TaggedError for serialization
export class ProductNotFoundRpcError extends Schema.TaggedError<ProductNotFoundRpcError>()(
  "ProductNotFoundRpcError",
  {
    productId: Schema.String,
    message: Schema.String,
    timestamp: Schema.DateTimeUtc,
  },
) {}

export class ProductValidationRpcError extends Schema.TaggedError<ProductValidationRpcError>()(
  "ProductValidationRpcError",
  {
    errors: Schema.Array(
      Schema.Struct({
        field: Schema.String,
        message: Schema.String,
      }),
    ),
    timestamp: Schema.DateTimeUtc,
  },
) {}

export class ProductUnauthorizedRpcError extends Schema.TaggedError<ProductUnauthorizedRpcError>()(
  "ProductUnauthorizedRpcError",
  {
    message: Schema.String,
    timestamp: Schema.DateTimeUtc,
  },
) {}

export class ProductForbiddenRpcError extends Schema.TaggedError<ProductForbiddenRpcError>()(
  "ProductForbiddenRpcError",
  {
    resource: Schema.String,
    action: Schema.String,
    timestamp: Schema.DateTimeUtc,
  },
) {}

// Union type for RPC error handling
export type ProductRpcError =
  | ProductNotFoundRpcError
  | ProductValidationRpcError
  | ProductUnauthorizedRpcError
  | ProductForbiddenRpcError;
```

### RPC Errors (Schema.TaggedError) - ONLY FOR SERIALIZATION

Use `Schema.TaggedError` classes ONLY when errors must be serialized for network transmission:

```typescript
import { Schema } from "effect";

// ✅ CORRECT - Schema.TaggedError for RPC boundaries
export class ProductNotFoundRpcError extends Schema.TaggedError<ProductNotFoundRpcError>()(
  "ProductNotFoundRpcError",
  {
    productId: Schema.String,
    message: Schema.String,
    timestamp: Schema.DateTimeUtc,
  },
) {}

// ❌ WRONG - Don't use Schema.TaggedError for internal domain errors
export class InternalProductError extends Schema.TaggedError<InternalProductError>()(
  "InternalProductError", // ❌ This will never be serialized
  {
    message: Schema.String,
  },
) {}
```

### Error Translation Pattern

When exposing errors through RPC, translate domain errors to RPC errors:

```typescript
// In your RPC/API layer (NOT in contracts)
const translateToRpcError = (error: ProductError): Schema.TaggedError => {
  return Effect.match(error, {
    onFailure: (e) => {
      if (e instanceof ProductNotFoundError) {
        return new ProductNotFoundRpcError({
          productId: e.productId,
          message: e.message,
          timestamp: new Date(),
        });
      }
      // Handle other error types...
    },
    onSuccess: (value) => value,
  });
};
```

**Generator Error Type Decision Tree:**

```
START: Creating new error type

Q: Will this error cross a service boundary (HTTP, RPC, message queue)?
├─ YES → Use Schema.TaggedError (serializable)
│  └─ Create in rpc.ts with Schema.TaggedError<T>()
│     Examples: ProductNotFoundRpcError, ValidationRpcError
│
└─ NO → Use Data.TaggedError (99% of cases)
   └─ Q: What kind of error is this?
      ├─ Domain/Business Rule → Data.TaggedError in errors.ts
      │  Examples: InsufficientStockError, InvalidStateError
      │
      ├─ Repository/Database → Data.TaggedError in errors.ts
      │  Examples: ProductRepositoryError, ConnectionError
      │
      └─ Not Found/Validation → Data.TaggedError in errors.ts
         Examples: ProductNotFoundError, InvalidInputError
```

**Generator Must Create:**
- ✅ Domain errors using `Data.TaggedError` in `errors.ts` (default)
- ✅ RPC errors using `Schema.TaggedError` in `rpc.ts` (only when needed)
- ✅ Union types for exhaustive error handling
- ✅ Descriptive error names with context fields
- ✅ Optional computed properties for derived values

**Generator Must NOT Create:**
- ❌ Error classes without TaggedError (plain classes lose Effect integration)
- ❌ Schema.TaggedError for domain errors (unnecessary serialization overhead)
- ❌ Data.TaggedError for RPC errors (won't serialize across boundaries)
- ❌ Generic "Error" classes (be specific about domain errors)

**Error Field Guidelines:**
| Error Context | Required Fields | Optional Fields |
|---------------|-----------------|-----------------|
| Not Found | `id`, `message` | `resourceType` |
| Validation | `errors: {field, message}[]` | `attemptedValue` |
| State Transition | `currentState`, `attemptedState` | `reason` |
| Business Rule | Domain-specific context | `cause` |
| Repository | `operation`, `message` | `cause`, `query` |

## Event Definition Pattern

Domain events for async communication between bounded contexts:

```typescript
// libs/contract/product/src/lib/events.ts
import { Schema } from "effect";

// Base event class
export class ProductEvent extends Schema.Class<ProductEvent>("ProductEvent")({
  eventId: Schema.UUID,
  productId: Schema.String,
  occurredAt: Schema.DateTimeUtc,
  correlationId: Schema.optional(Schema.String),
}) {}

// Specific domain events - Use spread operator for field inheritance
export class ProductCreatedEvent extends Schema.Class<ProductCreatedEvent>(
  "ProductCreatedEvent",
)({
  ...ProductEvent.fields, // Spread base event fields
  sellerId: Schema.String,
  name: Schema.String,
  price: Schema.Number,
  categoryId: Schema.String,
}) {
  // Static method for creating from product
  static fromProduct(product: ProductSelect, correlationId?: string) {
    return new ProductCreatedEvent({
      eventId: Schema.UUID.make(),
      productId: product.id,
      occurredAt: new Date(),
      correlationId,
      sellerId: product.sellerId,
      name: product.name,
      price: product.price,
      categoryId: product.categoryId,
    });
  }
}

export class ProductUpdatedEvent extends Schema.Class<ProductUpdatedEvent>(
  "ProductUpdatedEvent",
)({
  ...ProductEvent.fields, // Spread base event fields
  updatedFields: Schema.Array(Schema.String),
  previousValues: Schema.Record(Schema.String, Schema.Unknown),
  newValues: Schema.Record(Schema.String, Schema.Unknown),
}) {
  // Helper to track what changed
  static fromChanges(
    productId: string,
    previous: Partial<ProductSelect>,
    updated: Partial<ProductSelect>,
    correlationId?: string,
  ) {
    const changedFields = Object.keys(updated).filter(
      (key) => previous[key] !== updated[key],
    );

    return new ProductUpdatedEvent({
      eventId: Schema.UUID.make(),
      productId,
      occurredAt: new Date(),
      correlationId,
      updatedFields: changedFields,
      previousValues: Object.fromEntries(
        changedFields.map((key) => [key, previous[key]]),
      ),
      newValues: Object.fromEntries(
        changedFields.map((key) => [key, updated[key]]),
      ),
    });
  }
}

export class ProductPublishedEvent extends Schema.Class<ProductPublishedEvent>(
  "ProductPublishedEvent",
)({
  ...ProductEvent.fields,
  publishedBy: Schema.String,
  publishedAt: Schema.DateTimeUtc,
}) {}

export class ProductArchivedEvent extends Schema.Class<ProductArchivedEvent>(
  "ProductArchivedEvent",
)({
  ...ProductEvent.fields,
  archivedBy: Schema.String,
  archivedReason: Schema.optional(Schema.String),
}) {}
```

**Generator Must Create:**
- ✅ Base event class with common fields (`eventId`, `occurredAt`, `correlationId`)
- ✅ Specific event classes using `Schema.Class`
- ✅ Spread base event fields (`...BaseEvent.fields`) for inheritance
- ✅ Static factory methods for creating events from domain entities
- ✅ Past-tense event names (`ProductCreated`, not `CreateProduct`)
- ✅ Timestamp fields using `Schema.DateTimeUtc`
- ✅ Event union type for type-safe handling

**Generator Must NOT Create:**
- ❌ Event handlers (belong in feature layer)
- ❌ Event publishers (belong in infrastructure layer)
- ❌ Message queue configuration (belongs in infrastructure layer)
- ❌ Event versioning logic (add when needed, not upfront)

**Event Naming Conventions:**
| Pattern | Example | When to Use |
|---------|---------|-------------|
| **{Entity}{Action}Event** | `ProductCreatedEvent` | Standard domain events |
| **{Entity}{State}ChangedEvent** | `ProductStatusChangedEvent` | State transitions |
| **{Process}{Step}CompletedEvent** | `PaymentProcessedEvent` | Multi-step workflows |
| **{Action}RequestedEvent** | `RefundRequestedEvent` | Asynchronous requests |
| **{Action}FailedEvent** | `PaymentFailedEvent` | Failure notifications |

**Required Event Fields:**
- `eventId`: Unique identifier (`Schema.UUID`)
- `occurredAt`: Timestamp (`Schema.DateTimeUtc`)
- `correlationId?`: Optional trace ID for distributed tracing

## CQRS Contract Patterns (Commands, Queries, Projections)

### Overview

CQRS contracts define the boundary between write operations (commands) and read operations (queries), along with the projections (read models) that optimize query performance. This pattern is optional but recommended for complex features.

**Core CQRS Components in Contracts:**
1. **Commands** - Write operation schemas (mutations)
2. **Queries** - Read operation schemas (lookups)
3. **Projections** - Read model schemas (denormalized views)
4. **Events** - Domain events published after commands (already covered above)
5. **Write Model** - Canonical entities (entities.ts)

### CQRS Directory Structure

When implementing CQRS, the contract library extends the base structure with three additional files:

```
libs/contract/{domain}/src/lib/
├── entities.ts       # Write model (canonical source of truth)
├── events.ts         # Domain events published after commands
├── ports.ts          # Repository interfaces (write & projection repos)
├── errors.ts         # Domain errors
├── rpc.ts            # RPC schemas
│
# CQRS Pattern Additions:
├── commands.ts       # Command schemas (write intentions)
├── queries.ts        # Query schemas (read intentions)
└── projections.ts    # Projection schemas (read model types)
```

**Integration Flow:**
- **Commands** are validated in `commands.ts`, published as **Events**
- **Queries** are validated in `queries.ts`, executed via **Projection Repositories**
- **Projections** defined in `projections.ts` are built from **Entities** via JOINs
- **Repository Interfaces** in `ports.ts` include both **Write** and **Projection** repositories

### Command Schemas

Commands represent **write intentions** with validation rules.

**File:** `src/lib/commands.ts`

```typescript
import { Schema } from "effect";

/**
 * Command to create a new product
 * Commands use Schema.Class for validation
 */
export class CreateProductCommand extends Schema.Class<CreateProductCommand>("CreateProductCommand")({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  price: Schema.Number.pipe(Schema.positive),
  sellerId: Schema.String.pipe(Schema.uuid),
  description: Schema.optional(Schema.String),
  categoryId: Schema.String,
}) {}

export class UpdateProductCommand extends Schema.Class<UpdateProductCommand>("UpdateProductCommand")({
  productId: Schema.String.pipe(Schema.uuid),
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
  price: Schema.optional(Schema.Number.pipe(Schema.positive)),
  description: Schema.optional(Schema.String),
}) {}

export class DeleteProductCommand extends Schema.Class<DeleteProductCommand>("DeleteProductCommand")({
  productId: Schema.String.pipe(Schema.uuid),
  reason: Schema.optional(Schema.String),
}) {}
```

### Query Schemas

Queries represent **read intentions** without side effects.

**File:** `src/lib/queries.ts`

```typescript
import { Schema } from "effect";

export class GetProductQuery extends Schema.Class<GetProductQuery>("GetProductQuery")({
  productId: Schema.String.pipe(Schema.uuid),
}) {}

export class ListProductsQuery extends Schema.Class<ListProductsQuery>("ListProductsQuery")({
  page: Schema.Number.pipe(Schema.int, Schema.positive),
  limit: Schema.Number.pipe(Schema.int, Schema.positive, Schema.lessThanOrEqualTo(100)),
  sellerId: Schema.optional(Schema.String.pipe(Schema.uuid)),
  categoryId: Schema.optional(Schema.String),
  sortBy: Schema.optional(Schema.Literal("price", "createdAt", "name")),
  order: Schema.optional(Schema.Literal("asc", "desc")),
}) {}

export class SearchProductsQuery extends Schema.Class<SearchProductsQuery>("SearchProductsQuery")({
  searchTerm: Schema.String.pipe(Schema.minLength(2)),
  filters: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  page: Schema.Number.pipe(Schema.int, Schema.positive),
  limit: Schema.Number.pipe(Schema.int, Schema.positive, Schema.lessThanOrEqualTo(100)),
}) {}
```

### Projection Schemas (Read Models)

Projections are **TypeScript type schemas** that describe the shape of query results from complex JOINs across existing tables. They are NOT separate database tables, but rather denormalized views optimized for specific query patterns. Projections should contain aggregated or denormalized data from the write model plus related entities, all computed via SQL JOINs on demand and cached for performance.

**Important**: Projections are created by querying existing tables (products, sellers, categories, reviews, etc.) via JOINs, not by maintaining separate projection tables. The projection repository uses a cache-aside pattern: check cache → if miss, execute JOIN query → cache result → return.

**File:** `src/lib/projections.ts`

```typescript
import { Schema } from "effect";

/**
 * Product List Projection
 * Optimized for product listing queries with seller info embedded
 */
export class ProductListProjection extends Schema.Class<ProductListProjection>("ProductListProjection")({
  productId: Schema.String,
  name: Schema.String,
  price: Schema.Number,
  thumbnailUrl: Schema.optional(Schema.String),

  // Embedded seller info (denormalized)
  sellerId: Schema.String,
  sellerName: Schema.String,
  sellerAvatarUrl: Schema.optional(Schema.String),

  // Embedded category info (denormalized)
  categoryId: Schema.String,
  categoryName: Schema.String,

  // Aggregated stats
  reviewCount: Schema.Number,
  averageRating: Schema.Number,

  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
}) {}

/**
 * Product Detail Projection
 * Optimized for single product detail view with full information
 */
export class ProductDetailProjection extends Schema.Class<ProductDetailProjection>("ProductDetailProjection")({
  productId: Schema.String,
  name: Schema.String,
  description: Schema.String,
  price: Schema.Number,
  imageUrls: Schema.Array(Schema.String),

  // Seller information (denormalized)
  seller: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    avatarUrl: Schema.optional(Schema.String),
    rating: Schema.Number,
    productsCount: Schema.Number,
  }),

  // Category hierarchy (denormalized)
  category: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    parentId: Schema.optional(Schema.String),
    parentName: Schema.optional(Schema.String),
  }),

  // Review statistics (aggregated)
  reviews: Schema.Struct({
    count: Schema.Number,
    averageRating: Schema.Number,
    ratingDistribution: Schema.Record(Schema.String, Schema.Number),
  }),

  stock: Schema.Number,

  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
}) {}
```

### Projection Repository Interfaces

Projections have their own repository interfaces optimized for reads.

**Addition to `src/lib/ports.ts`:**

```typescript
import { Context, Effect, Option } from "effect";

/**
 * Product Projection Repository
 * Read-optimized queries against denormalized projections
 */
export class ProductProjectionRepository extends Context.Tag("ProductProjectionRepository")<
  ProductProjectionRepository,
  {
    // List projection queries
    readonly findListProjection: (
      query: ListProductsQuery
    ) => Effect.Effect<
      { items: readonly ProductListProjection[]; total: number },
      ProjectionError
    >;

    // Detail projection queries
    readonly findDetailProjection: (
      productId: string
    ) => Effect.Effect<Option.Option<ProductDetailProjection>, ProjectionError>;

    // Invalidate projection cache (triggers rebuild on next query via cache-aside pattern)
    readonly invalidateProjectionCache: (
      productId: string
    ) => Effect.Effect<void, ProjectionError>;
  }
>() {}
```

### Event Metadata for Projection Tracking

Add `_metadata` to events to track projection updates:

**Update `src/lib/events.ts`:**

```typescript
export class ProductCreatedEvent extends Schema.Class<ProductCreatedEvent>(
  "ProductCreatedEvent",
)({
  ...ProductEvent.fields,
  sellerId: Schema.String,
  name: Schema.String,
  price: Schema.Number,
  categoryId: Schema.String,

  // Metadata for projection updates
  _metadata: Schema.Struct({
    eventId: Schema.String.pipe(Schema.uuid),
    version: Schema.Number,
    timestamp: Schema.DateTimeUtc,
  }),
}) {}
```

### Contract Export Pattern (index.ts) - CRITICAL

**Contracts have NO platform split** - ALL exports go in `index.ts`:

**File:** `src/index.ts`

```typescript
// Write Model (Canonical entities)
export * from "./lib/entities";

// CQRS: Commands
export * from "./lib/commands";

// CQRS: Queries
export * from "./lib/queries";

// CQRS: Projections (read models)
export * from "./lib/projections";

// CQRS: Domain Events
export * from "./lib/events";

// Repository Interfaces (write and read models)
export * from "./lib/ports";

// Error Types
export * from "./lib/errors";

// RPC Schemas (if using RPC)
export * from "./lib/rpc";
```

**Note:** Contracts are always universal - no server.ts/client.ts split.

### Generator Must Create (CQRS Contracts):
- ✅ `src/lib/commands.ts` - Command schemas
- ✅ `src/lib/queries.ts` - Query schemas
- ✅ `src/lib/projections.ts` - Projection schemas
- ✅ Updated `src/lib/ports.ts` - Projection repository interfaces
- ✅ Updated `src/lib/events.ts` - With `_metadata` for tracking
- ✅ All exports in `src/index.ts` (no platform splits in contracts)

### Generator Must NOT Create (CQRS Contracts):
- ❌ Command handlers (belong in feature layer)
- ❌ Query handlers (belong in feature layer)
- ❌ Projection builders (belong in feature layer)
- ❌ Event publishing logic (belongs in feature layer)
- ❌ Separate platform exports (contracts are universal)

### See Also: CQRS Integration Across Layers

For complete CQRS implementation, see:

- **Feature Layer**: `FEATURE.md` - Implement command/query handlers, event orchestration, and atom state management for UI reactions
- **Data-Access Layer**: `DATA-ACCESS.md` - Implement projection repositories using cache-aside pattern with Kysely JOINs on existing tables
- **Infrastructure Layer**: `INFRA.md` - MessagingService event publishing/subscription using Stream.runForEach for event-driven cache invalidation

## Service Interface Pattern

For business services (not repositories), use the same modern pattern:

```typescript
// libs/contract/product/src/lib/ports.ts
import { Context, Effect } from "effect";
import type { Product } from "./entities";
import type { ProductError } from "./errors";

/**
 * Business service interface with inline type definition
 * Separate from repository - handles business logic, not data access
 */
export class ProductService extends Context.Tag("ProductService")<
  ProductService,
  {
    // Business operations
    readonly publish: (
      productId: string,
      userId: string,
    ) => Effect.Effect<Product, ProductError>;

    readonly archive: (
      productId: string,
      reason?: string,
    ) => Effect.Effect<void, ProductError>;

    readonly calculateDiscount: (
      productId: string,
      couponCode?: string,
    ) => Effect.Effect<number, ProductError>;

    // Complex queries with business logic
    readonly searchProducts: (params: {
      query?: string;
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      sellerId?: string;
      limit?: number;
      offset?: number;
    }) => Effect.Effect<
      {
        products: readonly Product[];
        total: number;
        facets: Record<string, number>;
      },
      ProductError
    >;

    // Workflow operations
    readonly cloneProduct: (
      productId: string,
      modifications?: Partial<ProductInsert>,
    ) => Effect.Effect<Product, ProductError>;

    readonly bulkUpdatePrices: (
      updates: readonly { productId: string; priceChange: number }[],
    ) => Effect.Effect<readonly Product[], ProductError>;
  }
>() {}
```

**Generator Service vs Repository Decision Tree:**

```
START: Creating new contract interface

Q: What is the primary responsibility?
├─ Data Access (CRUD operations)
│  └─ CREATE REPOSITORY in ports.ts
│     - Operations: findById, create, update, delete
│     - Returns: Database types from @creativetoolkits/types-database
│     - Implementation: data-access layer
│     - Examples: ProductRepository, UserRepository
│
├─ Business Logic (orchestration, validation, workflows)
│  └─ CREATE SERVICE in ports.ts
│     - Operations: publish, archive, calculateDiscount
│     - Returns: Domain entities with business rules applied
│     - Implementation: feature layer
│     - Examples: ProductService, PaymentService
│
└─ RPC/API Boundary (network communication)
   └─ CREATE RPC SCHEMAS in rpc.ts
      - Request/Response schemas
      - Schema.TaggedError for serialization
      - Router/Handlers: feature layer (NOT contracts)
```

**Generator Must Create:**
| Type | File | Pattern | Implementation |
|------|------|---------|----------------|
| **Repository** | `ports.ts` | `Context.Tag` with CRUD methods | data-access layer |
| **Service** | `ports.ts` | `Context.Tag` with business operations | feature layer |
| **RPC Schemas** | `rpc.ts` | `Schema.Struct` for req/res | feature layer (routers) |

**Generator Must NOT Create:**
- ❌ Both repository AND service for same domain (pick one based on responsibility)
- ❌ Business logic in repository interfaces (pure data access only)
- ❌ Database queries in service interfaces (orchestration only)
- ❌ RPC routers/handlers (those belong in feature layer)

**Decision Examples:**
| Scenario | Choice | Rationale |
|----------|--------|-----------|
| Basic CRUD for users | Repository | Simple data access |
| User registration with validation + email | Service | Multi-step workflow |
| Product search with filters | Service | Business logic (pricing rules, availability) |
| Get product by ID | Repository | Simple data retrieval |
| Calculate shipping cost | Service | Business rules and external APIs |
| Update product stock | Repository | Direct database operation |

## Contracts for Effect Services and RPC

Contract libraries serve as the foundation for both data-access repositories and feature services that expose RPC endpoints. Understanding how contracts integrate with Effect services and RPC is crucial for maintaining type safety and consistency across layers.

### Repository Contracts (Primary Pattern)

Repository interfaces are the most common contract pattern, implemented by data-access layers and consumed by feature services:

```typescript
// libs/contract/product/src/lib/ports.ts
import { Context, Effect, Option } from "effect";
import type {
  Product,
  ProductId,
  ProductInsert,
  ProductUpdate,
} from "./entities";
import type { ProductError } from "./errors";

/**
 * Repository interface for product data access
 * Implemented by: libs/data-access/product
 * Used by: Feature services (ProductService, etc.)
 */
export class ProductRepository extends Context.Tag("ProductRepository")<
  ProductRepository,
  {
    // Query operations
    readonly findById: (
      id: ProductId,
    ) => Effect.Effect<Option.Option<Product>, ProductError>;

    readonly findByIds: (
      ids: readonly ProductId[],
    ) => Effect.Effect<readonly Product[], ProductError>;

    readonly findBySeller: (
      sellerId: string,
      options?: { limit?: number; offset?: number },
    ) => Effect.Effect<readonly Product[], ProductError>;

    // Mutation operations
    readonly create: (
      data: ProductInsert,
    ) => Effect.Effect<Product, ProductError>;

    readonly update: (
      id: ProductId,
      data: ProductUpdate,
    ) => Effect.Effect<Product, ProductError>;

    readonly delete: (id: ProductId) => Effect.Effect<void, ProductError>;

    // Batch operations
    readonly createMany: (
      data: readonly ProductInsert[],
    ) => Effect.Effect<readonly Product[], ProductError>;

    readonly updateMany: (
      updates: readonly { id: ProductId; data: ProductUpdate }[],
    ) => Effect.Effect<readonly Product[], ProductError>;
  }
>() {}
```

**Key Points**:

- ✅ Returns `Effect.Effect<Success, Error>` for all operations
- ✅ Uses `Option.Option<T>` for nullable results (findById)
- ✅ Uses contract entities (Product, ProductId) for type safety
- ✅ Uses contract errors (ProductError) for error handling
- ✅ Implemented by data-access layer
- ✅ Consumed by feature services (NOT directly by RPC handlers)

### Service Contracts (Shared Feature Services)

When a service is used by multiple features, define it as a contract:

```typescript
// libs/contract/payment/src/lib/ports.ts
import { Context, Effect } from "effect";
import type { Payment, PaymentId, ProcessPaymentRequest } from "./entities";
import type { PaymentError } from "./errors";

/**
 * Payment service interface for cross-feature usage
 * Implemented by: libs/feature/payment
 * Used by: libs/feature/order, libs/feature/subscription
 */
export class PaymentService extends Context.Tag("PaymentService")<
  PaymentService,
  {
    readonly processPayment: (
      req: ProcessPaymentRequest,
    ) => Effect.Effect<Payment, PaymentError>;

    readonly refundPayment: (
      id: PaymentId,
      reason?: string,
    ) => Effect.Effect<Payment, PaymentError>;

    readonly getPaymentStatus: (
      id: PaymentId,
    ) => Effect.Effect<Payment, PaymentError>;
  }
>() {}
```

**When to create service contracts**:

- ✅ Service used by multiple features (payment, auth, notification)
- ✅ Core domain service shared across bounded contexts
- ✅ Service exposed via RPC to external consumers
- ❌ Feature-specific orchestration (keep in feature layer only)
- ❌ Internal feature helpers (not shared)

### Contract Reuse in RPC Schemas

RPC schemas in feature libraries reference contract entities and errors, ensuring type consistency:

```typescript
// libs/feature/payment/src/lib/rpc/schemas.ts
import { Schema } from "effect";
import {
  Payment,
  PaymentId,
  ProcessPaymentRequest,
} from "@creativetoolkits/contract-payment";
import { PaymentError } from "@creativetoolkits/contract-payment";

// ✅ RPC request schema uses contract types
export const ProcessPaymentRpcRequest = ProcessPaymentRequest; // Direct reuse

// ✅ RPC response schema uses contract entity
export const ProcessPaymentRpcResponse = Payment; // Contract entity

// ✅ RPC error schema extends contract error
export const PaymentRpcError = Schema.TaggedError("PaymentRpcError")({
  message: Schema.String,
  code: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}); // Can extend with RPC-specific fields
```

**Benefits of contract reuse in RPC**:

1. **Type Safety**: RPC inherits domain types from contracts
2. **Consistency**: Same types across data-access, feature, and RPC boundary
3. **Single Source of Truth**: Entities defined once, used everywhere
4. **Refactoring Safety**: Changes to entities propagate to RPC automatically

### Complete Integration Flow

```
┌─────────────────────────────────────────────────────────┐
│                   CONTRACT LIBRARY                       │
│  - Product entity (Schema.Class)                        │
│  - ProductRepository interface (Context.Tag)            │
│  - ProductError (Data.TaggedError)                      │
└─────────────────────────────────────────────────────────┘
                           ↓
          ┌────────────────┴────────────────┐
          ↓                                 ↓
┌──────────────────────┐         ┌──────────────────────┐
│  DATA-ACCESS LAYER   │         │    FEATURE LAYER     │
│  ProductRepository   │         │  ProductService      │
│  Implementation      │←────────│  (uses repository)   │
│  (Kysely queries)    │         │                      │
└──────────────────────┘         └──────────────────────┘
                                          ↓
                          ┌───────────────┴──────────────┐
                          ↓                              ↓
                  ┌───────────────┐           ┌──────────────────┐
                  │  RPC Layer    │           │  Service Layer   │
                  │  - Procedures │           │  - Business      │
                  │  - Handlers   │─────────→│    Logic         │
                  │  - Schemas    │           │  - Orchestration │
                  └───────────────┘           └──────────────────┘
                          ↓
                  Uses Contract Entities
```

### Example: Product Feature Using Contracts

**Contract Layer**:

```typescript
// libs/contract/product/src/lib/entities.ts
export class Product extends Schema.Class<Product>("Product")({
  id: Schema.String,
  name: Schema.String,
  price: Schema.Number,
  sellerId: Schema.String,
}) {}

// libs/contract/product/src/lib/ports.ts
export class ProductRepository extends Context.Tag("ProductRepository")<
  ProductRepository,
  {
    readonly findById: (
      id: string,
    ) => Effect.Effect<Option.Option<Product>, ProductError>;
    readonly create: (
      data: ProductInsert,
    ) => Effect.Effect<Product, ProductError>;
  }
>() {}
```

**Data-Access Layer**:

```typescript
// libs/data-access/product/src/lib/server/repository.ts
import { ProductRepository } from "@creativetoolkits/contract-product";

export const ProductRepositoryLive = Layer.effect(
  ProductRepository, // ← Implements contract interface
  Effect.gen(function* () {
    const database = yield* DatabaseService;

    return {
      findById: (id) => /* Kysely query */,
      create: (data) => /* Kysely query */,
    };
  })
);
```

**Feature Layer (Service)**:

```typescript
// libs/feature/product/src/lib/server/service.ts
import { ProductRepository } from "@creativetoolkits/contract-product";

export class ProductService extends Context.Tag("ProductService")<...>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const repository = yield* ProductRepository; // ← Uses contract

      return {
        createProduct: (data) =>
          Effect.gen(function* () {
            // Business logic
            const product = yield* repository.create(data);
            return product;
          }),
      };
    })
  );
}
```

**Feature Layer (RPC)**:

```typescript
// libs/feature/product/src/lib/rpc.ts
import { Rpc } from "@effect/rpc";
import { Effect } from "effect";
import { Product } from "@creativetoolkits/contract-product"; // ← Contract entity
import { CurrentUser } from "@creativetoolkits/infra-rpc/server";
import { ProductService } from "./server/service";
import {
  CreateProductRequest,
  ProductRpcError,
} from "@creativetoolkits/contract-product/rpc";

/**
 * Product RPC Router
 * Modern @effect/rpc 0.40+ pattern with inline handlers
 */
export const ProductRpcs = Rpc.router({
  createProduct: Rpc.def({
    request: CreateProductRequest,
    response: Product, // ← Contract entity as response
    error: ProductRpcError,
    handler: (req) =>
      Effect.gen(function* () {
        // Access middleware context
        const user = yield* CurrentUser;
        const service = yield* ProductService; // ← Uses feature service

        // Handler delegates to service with user context
        return yield* service.createProduct({
          ...req,
          sellerId: user.id,
        });
      }),
  }),
});
```

### Benefits of This Architecture

1. **Type Safety**: Contract entities flow through all layers
2. **Separation of Concerns**: Each layer has clear responsibilities
3. **Testability**: Mock repositories/services at contract boundaries
4. **Consistency**: Same types in DB, service, and RPC layers
5. **Refactoring**: Changes to entities update entire stack

## Platform-Specific Exports

Contracts are platform-agnostic, so all exports go through index.ts:

```typescript
// libs/contract/product/src/index.ts
// Export all contract definitions
export * from "./lib/entities";
export * from "./lib/errors";
export * from "./lib/events";
export * from "./lib/ports";
```

## Testing & Spec File Patterns

> **📘 Comprehensive Testing Guide:** See [TESTING_PATTERNS.md](./TESTING_PATTERNS.md) for complete testing standards and patterns.

Contract libraries test domain contracts (schemas, errors, events) to ensure they're correctly defined. Tests use `@effect/vitest` for Effect-aware testing with minimal overhead.

**Standard Testing Pattern:**
- ✅ ALL imports from `@effect/vitest`
- ✅ ALL tests use `it.scoped()` for consistency
- ✅ Layer.fresh not needed for simple contract tests (no stateful services)

### Minimal Test Structure

**One test file**: `src/lib/contracts.spec.ts`

Contract tests validate **type definitions and schemas**, NOT implementations (which belong in data-access tests).

### What to Test

1. **Schema Validation**: Entity schemas accept valid data and reject invalid data
2. **Error Construction**: Domain errors can be instantiated with correct properties
3. **Event Schemas**: Domain events validate correctly

### Complete Test Example

```typescript
// src/lib/contracts.spec.ts
import { describe, it, expect } from "@effect/vitest";
import { Effect, Schema, Option } from "effect";
import type { ProductSelect } from "@creativetoolkits/types-database";
import {
  ProductEntity,
  ProductCreatedEvent,
  ProductNotFoundError,
  ProductValidationError,
} from "./entities";

describe("Product Contract", () => {
  // ========================================
  // Schema Validation Tests
  // ========================================

  it.scoped("ProductEntity validates correct data", () => // ✅ Always it.scoped
    Effect.gen(function* () {
      const validProduct: ProductSelect = {
        id: "prod-123",
        name: "Test Product",
        price: 1000,
        sellerId: "seller-456",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = yield* Schema.decode(ProductEntity)(validProduct);

      expect(result.id).toBe("prod-123");
      expect(result.price).toBe(1000);
    }),
  );

  it.scoped("ProductEntity rejects invalid price", () => // ✅ Always it.scoped
    Effect.gen(function* () {
      const invalidProduct = {
        id: "prod-123",
        name: "Test Product",
        price: -100, // Invalid: negative price
        sellerId: "seller-456",
      };

      const result = yield* Effect.either(
        Schema.decode(ProductEntity)(invalidProduct),
      );

      expect(Option.isNone(result)).toBe(true);
    }),
  );

  // ========================================
  // Event Schema Tests
  // ========================================

  it.scoped("ProductCreatedEvent validates correctly", () => // ✅ Always it.scoped
    Effect.gen(function* () {
      const event = {
        type: "ProductCreated",
        productId: "prod-123",
        sellerId: "seller-456",
        timestamp: new Date().toISOString(),
      };

      const result = yield* Schema.decode(ProductCreatedEvent)(event);

      expect(result.type).toBe("ProductCreated");
      expect(result.productId).toBe("prod-123");
    }),
  );

  // ========================================
  // Error Type Tests
  // ========================================

  it.scoped("ProductNotFoundError constructs with product ID", () => // ✅ Always it.scoped
    Effect.sync(() => {
      const error = new ProductNotFoundError({ productId: "prod-123" });

      expect(error._tag).toBe("ProductNotFoundError");
      expect(error.productId).toBe("prod-123");
    }),
  );

  it.scoped("ProductValidationError includes field details", () => // ✅ Always it.scoped
    Effect.sync(() => {
      const error = new ProductValidationError({
        field: "price",
        reason: "Price must be positive",
      });

      expect(error._tag).toBe("ProductValidationError");
      expect(error.field).toBe("price");
      expect(error.reason).toBe("Price must be positive");
    }),
  );
});
```

### Testing Best Practices

#### ✅ DO:

- Use `it.scoped()` for ALL tests (consistent with project standards)
- Import ALL test utilities from `@effect/vitest` (describe, expect, it)
- Test schema validation (happy path + error cases)
- Test error construction
- Keep all tests in ONE file (`src/lib/contracts.spec.ts`)
- Test behavior, not implementation

#### ❌ DON'T:

- ❌ Create separate `mock-factories.ts` files (unnecessary complexity)
- ❌ Create separate `test-layer.ts` files (inline mocks instead)
- ❌ Test repository implementations (belongs in data-access)
- ❌ Create 5-6 test files (one file is sufficient)
- ❌ Use manual `Effect.runPromise` (use `it.scoped()` instead)
- ❌ Use `it.effect()` (deprecated in favor of `it.scoped()`)
- ❌ Mix imports from `vitest` and `@effect/vitest` (use @effect/vitest only)
- ❌ Mock repository interfaces in contract tests (test the interface definition, not behavior)

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["@effect/vitest/setup"],
  },
});
```

### When NOT to Test

Skip testing for:

- Simple type aliases (no runtime behavior)
- Repository port definitions (interfaces with no logic)
- Re-exported types from `@creativetoolkits/types-database`

## Nx Configuration

Following Nx best practices for library build configuration:

### project.json

```json
{
  "name": "contracts-product",
  "$schema": "../../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/contract/product/src",
  "projectType": "library",
  "tags": ["type:contracts", "scope:shared", "domain:product"],
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/libs/contract/product", // Nx standard path
        "main": "libs/contract/product/src/index.ts",
        "tsConfig": "libs/contract/product/tsconfig.lib.json",
        "assets": ["libs/contract/product/*.md"],
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
        "config": "libs/contract/product/vitest.config.ts",
        "passWithNoTests": true
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "options": {
        "lintFilePatterns": ["libs/contract/product/**/*.ts"]
      }
    },
    "typecheck": {
      "executor": "@nx/js:tsc",
      "options": {
        "tsConfig": "libs/contract/product/tsconfig.lib.json",
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
    "outDir": "../../../dist/out-tsc",
    "declaration": true,
    "declarationMap": true,
    "types": ["node"]
  },
  "exclude": ["vitest.config.ts", "src/**/*.spec.ts", "src/**/*.test.ts"],
  "include": ["src/**/*.ts"],
  "references": [
    { "path": "../../types/database/tsconfig.lib.json" },
    { "path": "../common/tsconfig.lib.json" } // If using contracts-common
  ]
}
```

### package.json

```json
{
  "name": "@creativetoolkits/contract-product",
  "version": "0.0.1",
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "peerDependencies": {
    "effect": "^3.0.0"
  },
  "dependencies": {
    "@creativetoolkits/types-database": "workspace:*"
  }
}
```

## Dependencies

Contract libraries have minimal dependencies:

- `@creativetoolkits/types-*` - Shared type definitions (especially database types)
- `@creativetoolkits/util-*` - Pure utility functions
- Other `@creativetoolkits/contract-*` - Cross-contract dependencies allowed (e.g., contracts-common)

## Best Practices

1. **Repository Interfaces in Contracts**: Define repository ports here, implement in data-access
2. **Use Generated Types**: Always use types from `@creativetoolkits/types-database` for consistency
3. **Domain Focus**: Keep contracts focused on business domain, not technical implementation
4. **Error Hierarchy**: Use Data.TaggedError for domain errors, Schema.TaggedError only for RPC
5. **Event-Driven**: Define events for cross-boundary communication
6. **No Implementation**: Contracts only define interfaces, never implementation
7. **Version Carefully**: Contract changes affect multiple implementations

## When NOT to Use Contracts

Contracts are not always necessary. Skip them when:

1. **Simple CRUD without business logic**: Direct database operations in data-access
2. **Internal utilities**: Helper functions that don't define domain boundaries
3. **Pure data transformation**: Simple mapping functions without domain rules
4. **Single implementation**: When you'll never have multiple implementations

## Cross-Contract Dependencies

Contracts can depend on other contracts to compose domain boundaries:

```typescript
// libs/contract/order/src/lib/ports.ts
import { ProductRepository } from "@creativetoolkits/contract-product";
import { UserRepository } from "@creativetoolkits/contract-user";
import { PaymentRepository } from "@creativetoolkits/contract-payment";

export class OrderService extends Context.Tag("OrderService")<
  OrderService,
  {
    // Service that orchestrates multiple domain contracts
    readonly createOrder: (input: {
      userId: string;
      items: readonly { productId: string; quantity: number }[];
      paymentMethod: string;
    }) => Effect.Effect<
      Order,
      OrderError | ProductError | UserError | PaymentError
    >;
  }
>() {}
```

## Anti-Patterns to Avoid

1. ❌ **Implementation in contracts** - Only interfaces and types
2. ❌ **Database-specific types** - Use technology-agnostic interfaces
3. ❌ **Circular dependencies** - Keep contracts focused on their domain
4. ❌ **Mixing RPC and domain errors** - Use appropriate error types
5. ❌ **Repository interfaces in data-access** - They belong in contracts
6. ❌ **Duplicate entity definitions** - Use generated types from `@creativetoolkits/types-database`
7. ❌ **Business logic in contracts** - Logic belongs in features, not interfaces
8. ❌ **Query building in contracts** - Contracts define what, not how

## Contract Validation Rules

### Generator Must Validate

**File Structure:**
- ✅ `src/lib/entities.ts` exists and exports Schema.Class entities
- ✅ `src/lib/errors.ts` exists and exports Data.TaggedError types
- ✅ `src/lib/ports.ts` exists (if repository/service included)
- ✅ `src/lib/events.ts` exists (if events included)
- ✅ `src/lib/rpc.ts` exists (if RPC included)
- ✅ `src/index.ts` exports types and errors (NO implementations)

**Type Safety:**
- ✅ All repository methods use types from `@creativetoolkits/types-database`
- ✅ All methods return `Effect<Result, Error>` (no Promise, no throws)
- ✅ Single-item queries return `Effect<Option<T>, E>`
- ✅ Collections return `Effect<readonly T[], E>`
- ✅ All errors extend Data.TaggedError or Schema.TaggedError

**Naming Conventions:**
- ✅ Repository: `{Domain}Repository` (e.g., `ProductRepository`)
- ✅ Service: `{Domain}Service` (e.g., `PaymentService`)
- ✅ Errors: `{Domain}{Context}Error` (e.g., `ProductNotFoundError`)
- ✅ Events: `{Domain}{Action}Event` (e.g., `ProductCreatedEvent`)
- ✅ RPC Errors: `{Domain}{Context}RpcError` (e.g., `ProductNotFoundRpcError`)

**Dependency Rules:**
- ✅ Contract can depend on: `effect`, `@creativetoolkits/types-database`, other contracts
- ❌ Contract cannot depend on: data-access, feature, infrastructure, provider libraries

### Validation Checklist for Generated Contracts

| Check | Rule | Example |
|-------|------|---------|
| **No Implementation** | Only interfaces, types, and schemas | ✅ `Context.Tag`, ❌ `Layer.effect` |
| **Effect Types** | All operations return Effect | ✅ `Effect<T, E>`, ❌ `Promise<T>` |
| **Error Types** | Proper TaggedError usage | ✅ `Data.TaggedError`, ❌ `class extends Error` |
| **Database Types** | Use generated types | ✅ `ProductSelect`, ❌ `interface Product` |
| **Option for nullable** | Use Option for may-not-exist | ✅ `Option<T>`, ❌ `T \| null` |
| **Readonly collections** | Immutable arrays | ✅ `readonly T[]`, ❌ `T[]` |
| **No business logic** | Contracts define interface only | ✅ Signatures, ❌ Implementations |

## Generator Template Usage

### Basic Generator Command

```bash
pnpm exec nx g @workspace:contract {domain-name}
```

### Generator Flags and Decision Rules

| Flag | When to Include | Creates | Example |
|------|-----------------|---------|---------|
| `--includeRepository=true` | Need data access (CRUD) | `ports.ts` with Repository tag | User, Product, Order |
| `--includeService=true` | Need business logic orchestration | `ports.ts` with Service tag | Payment, Notification, Search |
| `--includeEvents=true` | Need async domain communication | `events.ts` with event classes | ProductCreated, OrderShipped |
| `--includeRpc=true` | Exposing operations via RPC/HTTP | `rpc.ts` with req/res schemas | Public APIs, microservices |

**Decision Matrix:**

| Use Case | Flags | Files Generated |
|----------|-------|-----------------|
| **Simple CRUD domain** | `--includeRepository` | `ports.ts`, `errors.ts`, `entities.ts` |
| **Business service** | `--includeService` | `ports.ts`, `errors.ts`, `entities.ts` |
| **Event-driven domain** | `--includeRepository --includeEvents` | `ports.ts`, `errors.ts`, `entities.ts`, `events.ts` |
| **Public API domain** | `--includeService --includeRpc` | `ports.ts`, `errors.ts`, `entities.ts`, `rpc.ts` |
| **Full-featured domain** | `--includeRepository --includeEvents --includeRpc` | All files |

### What Generator Creates

**Always Generated:**
- ✅ `src/lib/entities.ts` - Domain entities with Schema.Class
- ✅ `src/lib/errors.ts` - Error types with Data.TaggedError
- ✅ `src/index.ts` - Public API exports
- ✅ `project.json` - Nx configuration with tags
- ✅ `tsconfig.json` - TypeScript configuration
- ✅ `package.json` - Dependencies
- ✅ `README.md` - Contract documentation

**Conditional (based on flags):**
- `--includeRepository` → `src/lib/ports.ts` with Repository interface
- `--includeService` → `src/lib/ports.ts` with Service interface
- `--includeEvents` → `src/lib/events.ts` with event classes
- `--includeRpc` → `src/lib/rpc.ts` with RPC schemas

### What Generator Does NOT Create

- ❌ Implementation code (belongs in data-access or feature layers)
- ❌ RPC routers/handlers (belongs in feature layer)
- ❌ Event publishers/handlers (belongs in infrastructure/feature layers)
- ❌ Database migrations (use Prisma)
- ❌ Test files (add as needed for complex domain logic)

## Migration Guide

For existing contract libraries:

1. **Move repository interfaces** from data-access to contracts
2. **Update to Context.Tag** pattern for all services
3. **Use Option.Option<T>** instead of T | null
4. **Update errors** to Data.TaggedError
5. **Add proper domain events** using Schema.Class
6. **Remove duplicate entity types** - use generated database types

## Common Contract Examples

### User Contract

```typescript
// libs/contract/user/src/lib/ports.ts
import { Context, Effect, Option } from "effect";
import type {
  UserSelect,
  UserInsert,
  UserUpdate,
} from "@creativetoolkits/types-database";
import type { UserRepositoryError } from "./errors";

export class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    readonly findById: (
      id: string,
    ) => Effect.Effect<Option.Option<UserSelect>, UserRepositoryError>;

    readonly findByEmail: (
      email: string,
    ) => Effect.Effect<Option.Option<UserSelect>, UserRepositoryError>;

    readonly create: (
      input: UserInsert,
    ) => Effect.Effect<UserSelect, UserRepositoryError>;

    readonly update: (
      id: string,
      input: UserUpdate,
    ) => Effect.Effect<UserSelect, UserRepositoryError>;

    readonly delete: (id: string) => Effect.Effect<void, UserRepositoryError>;
  }
>() {}
```

### Payment Contract

```typescript
// libs/contract/payment/src/lib/ports.ts
import { Context, Effect, Option } from "effect";
import type {
  PaymentSelect,
  PaymentInsert,
} from "@creativetoolkits/types-database";
import type { PaymentRepositoryError, PaymentStatus } from "./errors";

export class PaymentRepository extends Context.Tag("PaymentRepository")<
  PaymentRepository,
  {
    readonly findById: (
      id: string,
    ) => Effect.Effect<Option.Option<PaymentSelect>, PaymentRepositoryError>;

    readonly findByUserId: (
      userId: string,
    ) => Effect.Effect<readonly PaymentSelect[], PaymentRepositoryError>;

    readonly create: (
      input: PaymentInsert,
    ) => Effect.Effect<PaymentSelect, PaymentRepositoryError>;

    readonly updateStatus: (
      id: string,
      status: PaymentStatus,
    ) => Effect.Effect<PaymentSelect, PaymentRepositoryError>;

    readonly findByDateRange: (
      startDate: Date,
      endDate: Date,
    ) => Effect.Effect<readonly PaymentSelect[], PaymentRepositoryError>;
  }
>() {}
```

### Messaging Contract

```typescript
// libs/contract/messaging/src/lib/ports.ts
import { Context, Effect } from "effect";
import type { Message, MessageError } from "./entities";

export class MessagingService extends Context.Tag("MessagingService")<
  MessagingService,
  {
    readonly send: (
      to: string,
      subject: string,
      body: string,
    ) => Effect.Effect<Message, MessageError>;

    readonly sendBatch: (
      messages: readonly { to: string; subject: string; body: string }[],
    ) => Effect.Effect<readonly Message[], MessageError>;

    readonly scheduleMessage: (
      message: Message,
      sendAt: Date,
    ) => Effect.Effect<string, MessageError>; // Returns schedule ID
  }
>() {}
```

## Implementation Reference

The implementation of these contracts happens in data-access libraries. See `DATA-ACCESS.md` for detailed implementation patterns showing how to fulfill these contracts with actual database operations.
