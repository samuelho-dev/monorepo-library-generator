# Infrastructure Libraries Documentation

> **📚 Related Documentation:**
>
> - [Architecture Overview](./ARCHITECTURE_OVERVIEW.md) - Library inventory and integration patterns
> - [Nx Standards](./NX_STANDARDS.md) - Naming conventions (`infra-{concern}` pattern)
> - [Effect Patterns Guide](./EFFECT_PATTERNS.md) - Layer composition and resource management
> - [Feature Libraries](./FEATURE.md) - Consumers of infrastructure services
> - [Provider Libraries](./PROVIDER.md) - External services that infra orchestrates
> - [Data-Access Libraries](./DATA-ACCESS.md) - Database layer that uses infra services

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Core Architecture Principles](#core-architecture-principles)
3. [Infrastructure vs Other Layers](#infrastructure-vs-other-layers)
4. [Workspace-Plugin Generator](#workspace-plugin-generator)
5. [Standard Infrastructure Structure](#standard-infrastructure-structure)
6. [Critical Effect.ts Patterns](#critical-effectts-patterns)
7. [Current Infrastructure Libraries](#current-infrastructure-libraries)
8. [Integration Patterns](#integration-patterns)
9. [Module Boundaries & Build](#module-boundaries--build)
10. [Implementation Guidelines](#implementation-guidelines)
11. [Best Practices & Anti-Patterns](#best-practices--anti-patterns)
12. [Generator Templates & Migration](#generator-templates--migration)
13. [Cross-References & Sources](#cross-references--sources)

---

## Executive Summary

### What are Infrastructure Libraries?

Infrastructure libraries (`@creativetoolkits/infra-*`) provide **cross-cutting concerns** and **platform abstractions** that orchestrate multiple providers and handle application-wide technical requirements. Unlike providers (which wrap external SDKs) or data-access (which handle domain repositories), infrastructure libraries solve technical concerns that span the entire application.

**Key Characteristics:**

- **Cross-Cutting Concerns**: Logging, caching, error tracking, telemetry
- **Provider Orchestration**: Combine multiple external services (e.g., database + cache)
- **Platform Abstraction**: Hide runtime differences (Node.js, Edge, Browser)
- **Resource Lifecycle**: Automatic cleanup with Effect finalizers
- **Configuration Management**: Environment-based setup with Effect Config
- **Health Checks**: Standardized monitoring interfaces

### Design Philosophy

Infrastructure follows **Service-Oriented Architecture (SOA)** principles with Effect.ts patterns:

1. **Service as Context.Tag**: Every infrastructure service is an Effect Context service
2. **Layer Composition**: Build complex services from simple layers
3. **Dependency Injection**: Effect layers provide dependencies automatically
4. **Resource Safety**: Automatic cleanup with scoped layers and finalizers
5. **Error Translation**: Convert external errors to domain errors at boundaries
6. **Zero Runtime Overhead**: Services are zero-cost abstractions at runtime
7. **Server-Side State Management**: Infrastructure services use Effect Ref or SynchronizedRef for concurrent state management

### State Management in Infrastructure Layer

**CRITICAL DISTINCTION**: Infrastructure is always server-side and uses Effect Ref/SynchronizedRef, NEVER Atom.

| Aspect | Use Case | Pattern | Example |
|--------|----------|---------|---------|
| **Connection Pools** | Multiple concurrent connections | Ref.make + Ref.get | Database connection pool tracking |
| **Cache Entries** | Pre-fetched shared data | Ref.make + Ref.update | In-memory cache with atomic updates |
| **Subscription Lists** | Connected clients | Ref.make + Ref.update | WebSocket subscribers, streaming clients |
| **Rate Limiters** | Request throttling | Ref.make + Ref.update | Per-user/per-IP request counters |
| **Effectful Updates** | Updates requiring effects | SynchronizedRef.updateEffect | Database refreshes, API calls during update |

### When to Use Each Pattern

**Use Ref** (pure updates):
```typescript
// ✅ Cache counter with pure increment
const counter = yield* Ref.make(0)
yield* Ref.update(counter, n => n + 1)
```

**Use SynchronizedRef** (effectful updates):
```typescript
// ✅ Cache with database refresh capability
const cache = yield* SynchronizedRef.make<CacheEntry[]>([])
yield* SynchronizedRef.updateEffect(cache, (entries) =>
  Effect.gen(function*() {
    const fresh = yield* fetchFromDatabase()
    return [...entries, fresh]
  })
)
```

### What NOT to Manage in Infrastructure

- ❌ **React component state** → Use `@effect-atom/atom` in feature layer
- ❌ **User preferences** → Store in database, query from database
- ❌ **Form state** → Managed by feature layer with Atoms
- ❌ **Business state** → Should be persisted and queried, not cached indefinitely

### Quick Reference

| Library                | Purpose                                          | Platform  | Key Dependencies                   |
| ---------------------- | ------------------------------------------------ | --------- | ---------------------------------- |
| `infra-cache`          | Redis/Memory caching with cache-aside pattern    | Server    | provider-redis                     |
| `infra-database`       | Kysely orchestration with transaction management | Server    | provider-kysely, types-database    |
| `infra-storage`        | Supabase storage with React hooks                | Universal | provider-supabase                  |
| `infra-observability`        | Multi-platform structured logging                | Universal | provider-sentry (optional)         |
| `infra-telemetry`      | OpenTelemetry spans and traces                   | Server    | provider-sentry                    |
| `infra-webhooks`       | Event processing and validation                  | Server    | infra-observability                      |
| `infra-messaging`      | Redis/CloudAMQP pub/sub                          | Server    | provider-redis, provider-cloudamqp |
| `infra-rpc`            | Effect RPC layer factories                       | Universal | None                               |
| `infra-error-tracking` | Sentry integration with Effect errors            | Universal | provider-sentry                    |

### When to Create Infrastructure

✅ **Create Infrastructure When:**

- You need to orchestrate multiple providers (e.g., database + cache + logging)
- You need platform abstraction (client/server/edge variants)
- You need resource lifecycle management (connections, pools, cleanup)
- You need application-wide technical concerns (logging, monitoring)
- You need configuration management with environment variables

❌ **Don't Create Infrastructure When:**

- You're just wrapping a single external SDK → Use `provider-*` instead
- You're implementing domain logic → Use `feature-*` instead
- You're accessing data → Use `data-access-*` instead
- You're defining contracts → Use `contracts-*` instead

---

## Core Architecture Principles

### 1. Service-Oriented Architecture (SOA)

Infrastructure libraries implement **services** that encapsulate cross-cutting technical concerns. Each service:

- **Has a single responsibility** (logging, caching, storage)
- **Exposes a well-defined interface** using Effect Context.Tag
- **Hides implementation details** behind the service interface
- **Composes with other services** through Effect layers

**Example Service Definition:**

```typescript
// libs/infra/cache/src/lib/service/interface.ts
import { Context, Effect, Option, Data } from "effect";

// Service definition with inline interface (Context.Tag pattern)
export class CacheService extends Context.Tag("CacheService")<
  CacheService,
  {
    readonly get: <A>(
      key: string,
      decode: (data: unknown) => Effect.Effect<A, ParseError>,
    ) => Effect.Effect<Option.Option<A>, CacheError>;
    readonly set: <A>(
      key: string,
      value: A,
      ttl?: number,
    ) => Effect.Effect<void, CacheError>;
    readonly delete: (key: string) => Effect.Effect<void, CacheError>;
    readonly invalidatePattern: (
      pattern: string,
    ) => Effect.Effect<number, CacheError>;
  }
>() {}
```

### 2. Hexagonal Architecture (Ports & Adapters)

Infrastructure implements **adapters** that connect your application to external systems while maintaining clean boundaries.

**Port (Interface)** → Defined in infrastructure service interface using Context.Tag
**Adapter (Implementation)** → Defined in infrastructure service implementation as Layer

```typescript
// Service definition with inline interface and static Live layer (Effect 3.0+ pattern)
export class StorageService extends Context.Tag("StorageService")<
  StorageService,
  {
    readonly upload: (file: File) => Effect.Effect<StorageObject, StorageError>;
    readonly download: (path: string) => Effect.Effect<Blob, StorageError>;
    readonly delete: (path: string) => Effect.Effect<void, StorageError>;
    readonly list: (
      prefix?: string,
    ) => Effect.Effect<readonly StorageObject[], StorageError>;
  }
>() {
  // ✅ Static Live layer directly in the service class
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function*() {
      const client = yield* SupabaseClient;

      // ✅ Direct object return (Effect 3.0+), no .of() needed
      return {
        upload: (file) =>
          Effect.tryPromise({
            try: () => client.storage.from("bucket").upload(file.name, file),
            catch: (error) => new StorageUploadError({ cause: error }),
          }),
        download: (path) =>
          Effect.tryPromise({
            try: () => client.storage.from("bucket").download(path),
            catch: (error) => new StorageDownloadError({ cause: error }),
          }),
        delete: (path) =>
          Effect.tryPromise({
            try: () => client.storage.from("bucket").remove([path]),
            catch: (error) => new StorageDeleteError({ cause: error }),
          }),
        list: (prefix) =>
          Effect.tryPromise({
            try: () => client.storage.from("bucket").list(prefix),
            catch: (error) => new StorageListError({ cause: error }),
          }),
      });
    }),
  );
}
```

### 3. Dependency Inversion Principle

Infrastructure services depend on **abstractions** (provider interfaces), not **concretions** (specific implementations).

```typescript
// ✅ CORRECT: Use static Live layer pattern with dependency injection (Effect 3.0+)
export class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService,
  {
    readonly query: <A>(
      fn: (db: Database) => Promise<A>,
    ) => Effect.Effect<A, DatabaseError>;
    readonly transaction: <A>(
      fn: (tx: Transaction) => Effect.Effect<A>,
    ) => Effect.Effect<A, DatabaseError>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function*() {
      const kysely = yield* KyselyService; // Interface from provider-kysely
      const logger = yield* LoggingService; // Interface from infra-observability

      // ✅ Direct object return (Effect 3.0+), no .of() needed
      return {
        query: <A>(fn: (db: Database) => Promise<A>) =>
          Effect.gen(function*() {
            yield* logger.debug("Executing query");
            return yield* Effect.tryPromise(() => fn(kysely.instance));
          }),
        transaction: <A>(fn: (tx: Transaction) => Effect.Effect<A>) =>
          Effect.gen(function*() {
            yield* logger.debug("Starting transaction");
            return yield* kysely.transaction(fn);
          }),
      };
    }),
  );
}

// ❌ WRONG: Import external library directly
import { Kysely } from "kysely";
const service = { kysely: new Kysely() }; // Tight coupling!
```

### 4. Layer Composition

Infrastructure services compose through **Effect Layers**, enabling:

- **Automatic dependency resolution**: Effect runtime wires dependencies
- **Lazy initialization**: Services created only when needed
- **Resource scoping**: Automatic cleanup when scope ends
- **Memoization**: Singleton pattern for shared services

```typescript
// Simple service with no dependencies
export const CacheServiceLive = Layer.scoped(
  CacheService,
  Effect.gen(function*() {
    const redis = yield* RedisService;
    const cache = yield* makeCache(redis);

    // Automatic cleanup on scope exit
    yield* Effect.addFinalizer(() => Effect.sync(() => cache.disconnect()));

    return cache;
  }),
);

// Composed service with multiple dependencies
export const AppInfrastructureLive = Layer.mergeAll(
  CacheServiceLive,
  DatabaseServiceLive,
  LoggingServiceLive,
  StorageServiceLive,
);
```

### 5. Resource Lifecycle Management

Infrastructure services manage **resource lifecycles** automatically using Effect's scoped resources:

- **Acquisition**: Open connections, create pools
- **Usage**: Provide service operations
- **Release**: Close connections, cleanup resources

```typescript
export const DatabaseServiceLive = Layer.scoped(
  DatabaseService,
  Effect.gen(function*() {
    const kysely = yield* KyselyService;
    const logger = yield* LoggingService;

    // Acquire resource
    yield* logger.info("Database service initializing");

    // Register cleanup (runs automatically on scope exit)
    yield* Effect.addFinalizer(() =>
      Effect.gen(function*() {
        yield* logger.info("Database service shutting down");
        yield* Effect.promise(() => kysely.destroy());
      }),
    );

    // Return service
    return makeDatabaseService(kysely, logger);
  }),
);
```

### 6. Error Translation Boundaries

Infrastructure converts **external errors** (library exceptions) into **domain errors** (Effect errors) at the boundary:

```typescript
// Define domain errors
export class CacheConnectionError extends Data.TaggedError(
  "CacheConnectionError",
)<{
  readonly cause: unknown;
}> {}

export class CacheKeyNotFoundError extends Data.TaggedError(
  "CacheKeyNotFoundError",
)<{
  readonly key: string;
}> {}

// Translate at boundary
export const get = <A>(key: string, decode: Schema.Schema<A>) =>
  Effect.tryPromise({
    try: () => redis.get(key),
    catch: (error) => {
      // Translate external error to domain error
      if (isConnectionError(error)) {
        return new CacheConnectionError({ cause: error });
      }
      return new CacheKeyNotFoundError({ key });
    },
  }).pipe(
    Effect.flatMap(decode),
    Effect.catchTag("ParseError", (e) => new CacheParseError({ cause: e })),
  );
```

### 7. Configuration as Effect Context

Infrastructure uses **Effect Config** for environment-based configuration:

```typescript
export class CacheConfig extends Context.Tag("CacheConfig")<
  CacheConfig,
  {
    readonly redisUrl: string;
    readonly ttl: number;
    readonly maxRetries: number;
  }
>() {}

// Load configuration from environment
export const CacheConfigLive = Layer.effect(
  CacheConfig,
  Effect.gen(function*() {
    const redisUrl = yield* Config.secret("REDIS_URL");
    const ttl = yield* Config.number("CACHE_TTL").pipe(
      Config.withDefault(3600),
    );
    const maxRetries = yield* Config.number("CACHE_MAX_RETRIES").pipe(
      Config.withDefault(3),
    );

    return {
      redisUrl: Secret.value(redisUrl),
      ttl,
      maxRetries,
    };
  }),
);

// Use configuration in service
const makeCacheService = Effect.gen(function*() {
  const config = yield* CacheConfig;
  const redis = yield* RedisService;

  return {
    set: (key, value) => redis.set(key, value, config.ttl), // Use config.ttl
  };
});
```

---

## Directory Structure

```
libs/infra/{concern}/
├── src/
│   ├── index.ts              # Universal exports (types, interfaces, errors)
│   ├── client.ts             # Browser-safe exports (client-specific services)
│   ├── server.ts             # Server-only exports (server services and layers)
│   ├── edge.ts               # Edge runtime exports (middleware, edge functions)
│   └── lib/
│       ├── service/
│       │   ├── interface.ts  # Service interface definition (Context.Tag)
│       │   ├── service.ts    # Service implementation (makeService)
│       │   ├── service.spec.ts   # Service tests (all tests in one file)
│       │   ├── config.ts     # Configuration with Effect Config
│       │   └── errors.ts     # Service-specific error types
│       ├── layers/
│       │   ├── server-layers.ts  # Server Effect layers (Live, Test)
│       │   ├── client-layers.ts  # Client Effect layers (if applicable)
│       │   └── edge-layers.ts    # Edge Effect layers (if applicable)
│       └── providers/
│           └── test.ts       # Test provider implementations
│
├── project.json              # Nx project configuration
├── tsconfig.json            # TypeScript configuration
├── tsconfig.lib.json        # Library build configuration
├── tsconfig.spec.json       # Test configuration
├── vitest.config.ts         # Vitest configuration
├── package.json             # Package dependencies
└── README.md                # Infrastructure service documentation
```

---

## Infrastructure vs Other Layers

### Clear Layer Boundaries

| Layer              | Purpose                    | Examples                            | Dependencies Allowed                    |
| ------------------ | -------------------------- | ----------------------------------- | --------------------------------------- |
| **Contracts**      | Domain interfaces          | Repository ports, domain events     | types, util, contracts                  |
| **Provider**       | SDK wrappers               | Stripe, Supabase, Redis clients     | types, util, infra                      |
| **Infrastructure** | Cross-cutting concerns     | Cache, database, logging            | types, util, provider, infra            |
| **Data-Access**    | Repository implementations | ProductRepository, UserRepository   | types, util, infra, provider, contracts |
| **Feature**        | Business logic             | Payment processing, email campaigns | All layers                              |

### Infrastructure vs Provider

| Aspect                | Provider (`provider-*`)            | Infrastructure (`infra-*`)                             |
| --------------------- | ---------------------------------- | ------------------------------------------------------ |
| **Purpose**           | Wrap external SDK                  | Orchestrate providers                                  |
| **Scope**             | Single service                     | Multiple services                                      |
| **Business Logic**    | None                               | Application-specific                                   |
| **Configuration**     | Minimal                            | Complex                                                |
| **Platform Variants** | Sometimes                          | Often                                                  |
| **Example**           | `provider-stripe` wraps Stripe SDK | `infra-database` orchestrates Kysely + cache + logging |

**Example: Provider (Stripe)**

```typescript
// libs/provider/stripe/src/lib/service.ts
export class StripeService extends Context.Tag("StripeService")<
  StripeService,
  StripeServiceInterface
>() {
  static make(client: Stripe): StripeServiceInterface {
    // Pure SDK wrapper, no orchestration
    return {
      createCustomer: (params) =>
        Effect.tryPromise(() => client.customers.create(params)),
      createPaymentIntent: (params) =>
        Effect.tryPromise(() => client.paymentIntents.create(params)),
    };
  }
}
```

**Example: Infrastructure (Database)**

```typescript
// libs/infra/database/src/lib/service/service.ts
const makeDatabaseService = Effect.gen(function*() {
  const kysely = yield* KyselyService; // Provider
  const cache = yield* CacheService; // Infrastructure
  const logger = yield* LoggingService; // Infrastructure
  const telemetry = yield* TelemetryService; // Infrastructure

  // Orchestrates multiple services with application logic
  return {
    query: <A>(fn: (db) => Promise<A>) =>
      Effect.gen(function*() {
        yield* telemetry.startSpan("database.query");
        yield* logger.debug("Executing query");

        const result = yield* Effect.tryPromise(() => fn(kysely.instance));

        yield* logger.debug("Query completed");
        yield* telemetry.endSpan();

        return result;
      }),
  };
});
```

### Infrastructure vs Data-Access

| Aspect          | Infrastructure     | Data-Access         |
| --------------- | ------------------ | ------------------- |
| **Purpose**     | Technical concerns | Domain repositories |
| **Scope**       | Application-wide   | Domain-specific     |
| **Reusability** | High (any domain)  | Low (single domain) |
| **Example**     | Cache service      | ProductRepository   |

**Example: Infrastructure provides technical capability**

```typescript
// libs/infra/cache/src/lib/service/service.ts
export const CacheServiceLive = Layer.succeed(CacheService, {
  get: <A>(key: string) => Effect.succeed(Option.none()), // Technical operation
  set: (key, value) => Effect.void,
});
```

**Example: Data-Access uses infrastructure for domain logic**

```typescript
// libs/data-access/product/src/lib/server/product-repository.ts
const makeProductRepository = Effect.gen(function*() {
  const database = yield* DatabaseService; // Infrastructure
  const cache = yield* CacheService; // Infrastructure

  return {
    findById: (id: string) =>
      Effect.gen(function*() {
        // Try cache first
        const cached = yield* cache.get(`product:${id}`, ProductSchema);
        if (Option.isSome(cached)) return cached.value;

        // Query database
        const product = yield* database.query((db) =>
          db
            .selectFrom("products")
            .where("id", "=", id)
            .selectAll()
            .executeTakeFirst(),
        );

        // Cache result
        if (product) {
          yield* cache.set(`product:${id}`, product, 3600);
        }

        return Option.fromNullable(product);
      }),
  });
});
```

### Infrastructure vs Feature

| Aspect             | Infrastructure        | Feature             |
| ------------------ | --------------------- | ------------------- |
| **Purpose**        | Provide capabilities  | Implement use cases |
| **Business Logic** | None                  | Core business rules |
| **Example**        | Email sending service | Order processing    |

**Example: Infrastructure provides capability (no business logic)**

```typescript
// libs/infra/messaging/src/lib/service/service.ts
export interface MessagingServiceInterface {
  readonly publish: <A>(
    topic: string,
    message: A,
  ) => Effect.Effect<void, MessagingError>;

  readonly subscribe: <A>(
    topic: string,
    handler: (message: A) => Effect.Effect<void, never>,
  ) => Effect.Effect<void, MessagingError>;
}
```

**Example: Feature uses infrastructure for business logic**

```typescript
// libs/feature/payment/src/lib/services/payment-service.ts
const processPayment = Effect.gen(function*() {
  const stripe = yield* StripeService; // Provider
  const messaging = yield* MessagingService; // Infrastructure
  const logger = yield* LoggingService; // Infrastructure

  // Business logic: process payment
  const paymentIntent = yield* stripe.createPaymentIntent({
    amount: 1000,
    currency: "usd",
  });

  // Publish business event
  yield* messaging.publish("payment.processed", {
    paymentId: paymentIntent.id,
    amount: paymentIntent.amount,
  });

  yield* logger.info(`Payment processed: ${paymentIntent.id}`);

  return paymentIntent;
});
```

---

## Workspace-Plugin Generator

### Overview

The infrastructure generator (`@workspace/infra`) is a **fully implemented, production-ready** Nx generator that creates properly structured infrastructure libraries following all architectural patterns.

**Generator Location:** `/tools/workspace-plugin/src/generators/infra/`

**What It Creates:**

- Complete file structure with service/layers/providers
- Platform-specific exports (client/server/edge)
- Vitest configuration with Effect testing utilities
- CLAUDE.md documentation template
- project.json with proper tags and dependencies

### Generator Usage

```bash
# Basic infrastructure (server-side exports only)
pnpm exec nx g @workspace:infra my-service

# Infrastructure with client/browser support
pnpm exec nx g @workspace:infra my-service --includeClientServer=true

# Skip tests
pnpm exec nx g @workspace:infra my-service --skipTests=true

# With description
pnpm exec nx g @workspace:infra my-service --description="My service description"
```

### Generator Options

| Option                | Type    | Default     | Description                              |
| --------------------- | ------- | ----------- | ---------------------------------------- |
| `name`                | string  | _required_  | Service name (e.g., "cache", "storage")  |
| `includeClientServer` | boolean | `false`     | Generate client/server platform variants |
| `description`         | string  | `undefined` | Human-readable service description       |
| `skipTests`           | boolean | `false`     | Skip vitest test file generation         |

### Platform Selection Decision Guide

**When to use `--includeClientServer=false` (Default: Server-Side Exports Only):**

- Pure server infrastructure (database, cache, webhooks)
- No browser/client code needed
- Backend-only operations
- Examples: `infra-cache`, `infra-database`, `infra-webhooks`, `infra-messaging`

**When to use `--includeClientServer=true` (Add Client/Browser Exports):**

- Needs browser hooks or client components
- Platform-specific behavior (Node.js vs Browser)
- Examples: `infra-storage` (has `useStorageUpload` hook), `infra-observability`

**Decision Tree:**

```
Does it need React hooks or browser APIs?
├─ YES → --includeClientServer=true (generates client.ts and client/ exports)
│   Examples: storage with useStorageUpload, logging with browser console
└─ NO → --includeClientServer=false (default - only server exports)
    Examples: cache, database, webhooks, messaging
```

### Generated File Structure

#### Default: Server-Side Exports Only (`--includeClientServer=false`)

```
libs/infra/{name}/
├── src/
│   ├── index.ts              # Universal exports
│   ├── server.ts             # Server-specific exports
│   ├── lib/
│   │   ├── service/
│   │   │   ├── interface.ts  # Service interface and Context.Tag
│   │   │   ├── service.ts    # Service implementation
│   │   │   ├── errors.ts     # Domain error types
│   │   │   ├── config.ts     # Configuration Context.Tag
│   │   │   └── utils.ts      # Utility functions
│   │   ├── providers/
│   │   │   ├── types.ts      # Provider-specific types
│   │   │   ├── memory.ts     # Memory provider (for testing)
│   │   │   └── test.ts       # Test provider
│   │   └── layers/
│   │       └── server-layers.ts  # Server-specific layers
├── CLAUDE.md                 # Generated documentation
├── README.md
├── vitest.config.ts
├── project.json
├── tsconfig.json
├── tsconfig.lib.json
└── tsconfig.spec.json
```

#### Universal (`--includeClientServer=true`)

```
libs/infra/{name}/
├── src/
│   ├── index.ts              # Universal exports
│   ├── client.ts             # Client-specific exports (NEW)
│   ├── server.ts             # Server-specific exports
│   ├── lib/
│   │   ├── client/           # Client-specific code (NEW)
│   │   │   └── hooks/
│   │   │       └── use-{name}.ts
│   │   ├── service/
│   │   │   ├── interface.ts
│   │   │   ├── service.ts
│   │   │   ├── errors.ts
│   │   │   ├── config.ts
│   │   │   └── utils.ts
│   │   ├── providers/
│   │   │   ├── types.ts
│   │   │   ├── memory.ts
│   │   │   └── test.ts
│   │   └── layers/
│   │       ├── client-layers.ts  # Client-specific layers (NEW)
│   │       └── server-layers.ts
└── ... (same config files as default mode)
```

### Generator Templates

The generator uses EJS templates with the following variables:

```ejs
<%= name %>           # Service name (e.g., "cache")
<%= className %>      # PascalCase class name (e.g., "CacheService")
<%= propertyName %>   # camelCase property name (e.g., "cacheService")
<%= projectRoot %>    # Project root path (e.g., "libs/infra/cache")
<%= includeClientServer %>  # Boolean flag for platform variants
```

**Example Template Usage:**

```typescript
// Template: libs/infra/__name__/src/lib/service/interface.ts__tmpl__
import { Context, Effect } from 'effect';
import type { <%= className %>Error } from './errors';

export class <%= className %> extends Context.Tag("<%= className %>")<
  <%= className %>,
  {
    readonly doSomething: () => Effect.Effect<void, <%= className %>Error>;
    readonly cleanup: () => Effect.Effect<void>;
    readonly healthCheck: () => Effect.Effect<boolean, <%= className %>Error>;
  }
>() {}
```

**Generated Output (name="cache"):**

```typescript
// Generated: libs/infra/cache/src/lib/service/interface.ts
import { Context, Effect } from "effect";
import type { CacheServiceError } from "./errors";

export interface CacheServiceInterface {
  readonly doSomething: () => Effect.Effect<void, CacheServiceError>;
}

export class CacheService extends Context.Tag("CacheService")<
  CacheService,
  CacheServiceInterface
>() {}
```

### Post-Generation Workflow

1. **Implement Service Interface:**
   - Edit `src/lib/service/interface.ts` with your service methods
   - Define error types in `src/lib/service/errors.ts`

2. **Implement Service Logic:**
   - Edit `src/lib/service/service.ts` with implementation
   - Add provider dependencies if needed

3. **Create Layers:**
   - Edit `src/lib/layers/server-layers.ts` (always)
   - Edit `src/lib/layers/client-layers.ts` (if `--includeClientServer`)

4. **Add Configuration:**
   - Define config in `src/lib/service/config.ts` using Effect Config
   - Load from environment variables

5. **Write Tests:**
   - Create test layer in `src/lib/providers/test.ts`
   - Write unit tests using Effect test utilities

6. **Update Documentation:**
   - Fill in CLAUDE.md with service-specific details
   - Add examples and usage patterns

### Generator Implementation Details

**File:** `/tools/workspace-plugin/src/generators/infra/schema.json`

```json
{
  "$schema": "http://json-schema.org/schema",
  "cli": "nx",
  "$id": "Infra",
  "title": "Create Infrastructure Library",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Library name",
      "$default": { "$source": "argv", "index": 0 },
      "x-prompt": "What name would you like to use for the library?",
      "pattern": "^[a-z][a-z0-9-]*$"
    },
    "includeClientServer": {
      "type": "boolean",
      "description": "Generate client and server platform variants",
      "default": false
    },
    "description": {
      "type": "string",
      "description": "Library description"
    },
    "skipTests": {
      "type": "boolean",
      "description": "Skip generating test files",
      "default": false
    }
  },
  "required": ["name"]
}
```

**Key Generator Logic (from `/tools/workspace-plugin/src/generators/infra/generator.ts`):**

```typescript
export async function infraGenerator(
  tree: Tree,
  options: InfraGeneratorSchema,
) {
  const projectRoot = `libs/infra/${options.name}`;

  // Add library project
  await libraryGenerator(tree, {
    name: options.name,
    directory: projectRoot,
    tags: `type:infra,platform:${options.includeClientServer ? "universal" : "server"}`,
    skipFormat: false,
  });

  // Generate files from templates
  generateFiles(tree, path.join(__dirname, "files"), projectRoot, {
    ...options,
    className: names(options.name).className,
    propertyName: names(options.name).propertyName,
    projectRoot,
    tmpl: "",
  });

  // Conditionally remove client files if not needed
  if (!options.includeClientServer) {
    tree.delete(`${projectRoot}/src/client.ts`);
    tree.delete(`${projectRoot}/src/lib/client`);
    tree.delete(`${projectRoot}/src/lib/layers/client-layers.ts`);
  }

  return () => {
    installPackagesTask(tree);
  };
}
```

---

## Standard Infrastructure Structure

### Required Files

Every infrastructure library MUST have:

1. **Service Interface** (`src/lib/service/interface.ts`)
   - Context.Tag definition
   - Service interface with method signatures
   - Return types using Effect<Success, Error, Requirements>

2. **Service Implementation** (`src/lib/service/service.ts`)
   - Service factory function using Effect.gen
   - Implementation of all interface methods
   - Dependency injection via yield\*

3. **Error Types** (`src/lib/service/errors.ts`)
   - Domain error classes using Data.TaggedError
   - Error types for all failure modes

4. **Layer Implementation** (`src/lib/layers/server-layers.ts`)
   - Live layer using Layer.scoped or Layer.effect
   - Test layer for testing
   - Configuration layer if needed

5. **Public Exports** (`src/index.ts`, `src/server.ts`)
   - Export service interface and tag
   - Export layers
   - Export error types

### File Structure Template

```typescript
// ============================================================
// src/lib/service/interface.ts
// ============================================================
import { Context, Effect, Option } from "effect";
import type { ServiceError } from "./errors";

export interface ServiceInterface {
  readonly operation: (
    input: string,
  ) => Effect.Effect<Option.Option<Result>, ServiceError>;
}

export class Service extends Context.Tag("Service")<
  Service,
  ServiceInterface
>() {}

// ============================================================
// src/lib/service/errors.ts
// ============================================================
import { Data } from "effect";

export class ServiceConnectionError extends Data.TaggedError(
  "ServiceConnectionError",
)<{
  readonly cause: unknown;
}> {}

export class ServiceOperationError extends Data.TaggedError(
  "ServiceOperationError",
)<{
  readonly operation: string;
  readonly cause: unknown;
}> {}

export type ServiceError = ServiceConnectionError | ServiceOperationError;

// ============================================================
// src/lib/service/config.ts
// ============================================================
import { Config, Context, Effect, Layer, Secret } from "effect";

export class ServiceConfig extends Context.Tag("ServiceConfig")<
  ServiceConfig,
  {
    readonly url: string;
    readonly timeout: number;
  }
>() {}

export const ServiceConfigLive = Layer.effect(
  ServiceConfig,
  Effect.gen(function*() {
    const url = yield* Config.string("SERVICE_URL");
    const timeout = yield* Config.number("SERVICE_TIMEOUT").pipe(
      Config.withDefault(5000),
    );

    return { url, timeout };
  }),
);

// ============================================================
// src/lib/service/service.ts
// ============================================================
import { Effect } from "effect";
import type { ServiceInterface } from "./interface";
import { Service } from "./interface";
import type { ServiceError } from "./errors";
import { ServiceOperationError } from "./errors";
import { ProviderService } from "@creativetoolkits/provider-example";
import { LoggingService } from "@creativetoolkits/infra-observability";

const makeService = Effect.gen(function*() {
  const provider = yield* ProviderService;
  const logger = yield* LoggingService;

  const operation = (input: string) =>
    Effect.gen(function*() {
      yield* logger.debug(`Operation called with: ${input}`);

      const result = yield* Effect.tryPromise({
        try: () => provider.doSomething(input),
        catch: (error) =>
          new ServiceOperationError({
            operation: "doSomething",
            cause: error,
          }),
      });

      yield* logger.info(`Operation completed successfully`);

      return Option.fromNullable(result);
    });

  return { operation };
});

export { makeService };

// ============================================================
// src/lib/layers/server-layers.ts
// ============================================================
import { Layer, Effect } from "effect";
import { Service } from "../service/interface";
import { makeService } from "../service/service";
import { ServiceConfigLive } from "../service/config";
import { ProviderServiceLive } from "@creativetoolkits/provider-example/server";
import { LoggingServiceLive } from "@creativetoolkits/infra-observability/server";

export const ServiceLive = Layer.scoped(
  Service,
  Effect.gen(function*() {
    const service = yield* makeService;

    // Register cleanup
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        console.log("Service shutting down");
      }),
    );

    return service;
  }),
).pipe(
  Layer.provide(ServiceConfigLive),
  Layer.provide(ProviderServiceLive),
  Layer.provide(LoggingServiceLive),
);

// Test layer with mock implementation
export const ServiceTest = Layer.succeed(Service, {
  operation: () => Effect.succeed(Option.none()),
});

// ============================================================
// src/lib/providers/test.ts
// ============================================================
import { Effect, Layer, Option } from "effect";
import { Service, type ServiceInterface } from "../service/interface";

export const makeTestService = (): ServiceInterface => ({
  operation: (input: string) =>
    Effect.succeed(Option.some({ result: `test-${input}` })),
});

export const ServiceTestLayer = Layer.succeed(Service, makeTestService());

// ============================================================
// src/index.ts (Universal exports)
// ============================================================
export { Service, type ServiceInterface } from "./lib/service/interface";
export type { ServiceError } from "./lib/service/errors";
export {
  ServiceConnectionError,
  ServiceOperationError,
} from "./lib/service/errors";

// ============================================================
// src/server.ts (Server-specific exports)
// ============================================================
export { ServiceLive, ServiceTest } from "./lib/layers/server-layers";
export { ServiceConfigLive, ServiceConfig } from "./lib/service/config";
export { makeService } from "./lib/service/service";

// Re-export universal exports
export * from "./index";
```

### Naming Conventions

| Element           | Pattern                          | Example                         |
| ----------------- | -------------------------------- | ------------------------------- |
| Library name      | `infra-{name}`                   | `infra-cache`                   |
| Package name      | `@creativetoolkits/infra-{name}` | `@creativetoolkits/infra-cache` |
| Service interface | `{Name}ServiceInterface`         | `CacheServiceInterface`         |
| Context.Tag       | `{Name}Service`                  | `CacheService`                  |
| Config tag        | `{Name}Config`                   | `CacheConfig`                   |
| Live layer        | `{Name}ServiceLive`              | `CacheServiceLive`              |
| Test layer        | `{Name}ServiceTest`              | `CacheServiceTest`              |
| Error types       | `{Name}Service{Type}Error`       | `CacheServiceConnectionError`   |

---

## Critical Effect.ts Patterns

### 🔑 Effect 3.0+ Service Pattern (STANDARD)

**This is the canonical pattern for all infrastructure services. Use this pattern consistently.**

#### The Standard Pattern

```typescript
// ✅ STANDARD: Service definition with inline interface and static Live layer
export class CacheService extends Context.Tag("CacheService")<
  CacheService,
  {
    readonly get: <A>(
      key: string,
    ) => Effect.Effect<Option.Option<A>, CacheError>;
    readonly set: <A>(
      key: string,
      value: A,
      ttl?: number,
    ) => Effect.Effect<void, CacheError>;
    readonly delete: (key: string) => Effect.Effect<void, CacheError>;
  }
>() {
  // ✅ Static Live layer directly in the service class
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function*() {
      const redis = yield* RedisService;
      const logger = yield* LoggingService;

      // ✅ Direct object return (Effect 3.0+), no .of() needed
      return {
        get: <A>(key: string) =>
          Effect.gen(function*() {
            yield* logger.debug("Cache get", { key });
            return yield* redis.get(key);
          }),
        set: <A>(key: string, value: A, ttl?: number) =>
          Effect.gen(function*() {
            yield* logger.debug("Cache set", { key, ttl });
            return yield* redis.set(key, JSON.stringify(value), ttl);
          }),
        delete: (key: string) =>
          Effect.gen(function*() {
            yield* logger.debug("Cache delete", { key });
            return yield* redis.delete(key);
          }),
      };
    }),
  );
}
```

**Key traits**:

1. Single class with Context.Tag + inline interface
2. Static `Live` layer using `Layer.effect` or `Layer.scoped`
3. Direct object return from Layer
4. Use `this` in `Layer.effect(this, ...)`

#### ❌ Common Anti-Patterns

**1. Using `addFinalizer` for resource cleanup**:

```typescript
// ❌ WRONG: Manual cleanup with addFinalizer
const connection = yield * createConnection();
yield * Effect.addFinalizer(() => connection.close());

// ✅ CORRECT: acquireRelease guarantees cleanup
const connection = yield * Effect.acquireRelease(
  createConnection(),
  (conn) => Effect.sync(() => conn.close())
);
```

**When to use each**:
- `acquireRelease`: Resource acquisition (connections, files, locks)
- `addFinalizer`: Non-resource cleanup (logging, metrics, notifications)

**2. Not using `this` in Layer**:

```typescript
// ❌ WRONG: Referencing service by name
static readonly Live = Layer.effect(CacheService, Effect.gen(/* ... */));

// ✅ CORRECT: Use `this`
static readonly Live = Layer.effect(this, Effect.gen(/* ... */));
```

---

### 1. Context.Tag for Service Definition

**Pattern:** Define services using `Context.Tag` with interface

```typescript
export interface CacheServiceInterface {
  readonly get: <A>(key: string) => Effect.Effect<Option.Option<A>, CacheError>;
  readonly set: <A>(key: string, value: A) => Effect.Effect<void, CacheError>;
}

export class CacheService extends Context.Tag("CacheService")<
  CacheService,
  CacheServiceInterface
>() {}
```

**Why:** Context.Tag provides type-safe dependency injection with zero runtime overhead.

**Key Points:**

- Service interface defines operations as Effect-returning methods
- Context.Tag creates both type and runtime value for DI
- Interface enables testing with mock implementations

### 2. Layer.scoped for Resource Lifecycle

**Pattern:** Use `Layer.scoped` for services that need cleanup

```typescript
export const CacheServiceLive = Layer.scoped(
  CacheService,
  Effect.gen(function*() {
    const redis = yield* RedisService;
    const logger = yield* LoggingService;

    // ✅ BEST PRACTICE: Use acquireRelease for resource management
    const connection = yield* Effect.acquireRelease(
      Effect.gen(function*() {
        yield* logger.info("Cache service initializing");
        return redis;
      }),
      (redis) =>
        Effect.gen(function*() {
          yield* logger.info("Cache service shutting down");
          yield* Effect.tryPromise(() => redis.disconnect());
        }),
    );

    // Return service (Effect 3.0+ pattern)
    return {
      get: <A>(key: string) => connection.get(key),
      set: (key, value) => connection.set(key, value),
    };
  }),
);
```

**Why:** `Layer.scoped` ensures automatic cleanup when the layer is no longer needed.

**Key Points:**

- ✅ **Prefer `Effect.acquireRelease`** for resource management (acquire + cleanup in one)
- `acquireRelease` guarantees cleanup runs even if errors occur
- Cleanup happens automatically when scope ends
- Alternative: `Effect.addFinalizer` for non-resource cleanup (logging, metrics)

### 3. Layer.effect for Simple Services

**Pattern:** Use `Layer.effect` for services without cleanup needs

```typescript
export const ConfigServiceLive = Layer.effect(
  ConfigService,
  Effect.gen(function*() {
    const apiKey = yield* Config.secret("API_KEY");
    const timeout = yield* Config.number("TIMEOUT").pipe(
      Config.withDefault(5000),
    );

    return {
      apiKey: Secret.value(apiKey),
      timeout,
    };
  }),
);
```

**Why:** Simpler than `Layer.scoped` when no cleanup is needed.

**Key Points:**

- Use for stateless services or configuration
- No finalizer registration needed
- Memoized by default (singleton behavior)

### 4. Layer.succeed for Test Implementations

**Pattern:** Use `Layer.succeed` for synchronous test layers

```typescript
export const CacheServiceTest = Layer.succeed(CacheService, {
  get: <A>(_key: string) => Effect.succeed(Option.none<A>()),
  set: (_key: string, _value: unknown) => Effect.void,
});
```

**Why:** Test layers need no async operations or resource management.

**Key Points:**

- Synchronous construction
- No dependencies required
- Perfect for unit tests

### 5. Runtime Preservation for Callbacks

**CRITICAL PATTERN:** When integrating callback-based libraries (transactions, WebSocket, event handlers), you must preserve the Effect runtime context.

**Problem:** Callbacks lose Effect context (dependencies, error handling, interruption)

**Solution:** Capture runtime and use `Runtime.runPromise`

```typescript
// ❌ WRONG: Context lost in callback
const transaction = <A, E>(fn: (tx) => Effect.Effect<A, E>) =>
  Effect.tryPromise(() =>
    db.transaction(async (tx) => {
      // ⚠️ Effect context is lost here!
      // Cannot access DatabaseService, LoggingService, etc.
      const result = await Effect.runPromise(fn(tx));
      return result;
    }),
  );

// ✅ CORRECT: Runtime preserved
const transaction = <A, E>(fn: (tx) => Effect.Effect<A, E>) =>
  Effect.gen(function*() {
    // Capture current runtime (includes all context)
    const runtime = yield* Effect.runtime();

    return yield* Effect.tryPromise(() =>
      db.transaction(async (tx) => {
        // Use captured runtime to preserve context
        const result = await Runtime.runPromise(runtime)(fn(tx));
        return result;
      }),
    );
  });
```

**Why:** Callbacks execute outside Effect context, losing access to services and proper error handling.

**Use Cases:**

- Database transactions (Kysely, Prisma)
- WebSocket message handlers
- Event emitter callbacks
- setTimeout/setInterval
- Third-party library callbacks

**Full Example (Database Transactions):**

```typescript
// libs/infra/database/src/lib/service/service.ts
import { Effect, Runtime } from "effect";
import type { Kysely } from "kysely";
import type { Database } from "@creativetoolkits/types-database";

const makeDatabaseService = Effect.gen(function*() {
  const kysely = yield* KyselyService;
  const logger = yield* LoggingService;

  const transaction = <A, E>(fn: (tx) => Effect.Effect<A, E>) =>
    Effect.gen(function*() {
      // 1. Capture runtime with all context
      const runtime = yield* Effect.runtime<
        LoggingService | TelemetryService
      >();

      yield* logger.debug("Starting transaction");

      // 2. Use runtime inside callback
      const result = yield* Effect.tryPromise({
        try: () =>
          kysely.transaction(async (tx) => {
            // 3. Run Effect with preserved runtime
            const result = await Runtime.runPromise(runtime)(
              Effect.gen(function*() {
                // Now we can use all services inside transaction!
                yield* logger.debug("Inside transaction");
                return yield* fn(tx);
              }),
            );
            return result;
          }),
        catch: (error) => new DatabaseTransactionError({ cause: error }),
      });

      yield* logger.info("Transaction completed");

      return result;
    });

  return { transaction };
});
```

**Usage Example:**

```typescript
// Repository can use all services inside transaction
const createProduct = (data: ProductInsert) =>
  Effect.gen(function*() {
    const database = yield* DatabaseService;
    const cache = yield* CacheService;
    const logger = yield* LoggingService; // Available in transaction!

    const result = yield* database.transaction((tx) =>
      Effect.gen(function*() {
        // All context preserved!
        yield* logger.info("Creating product in transaction");

        const product = yield* Effect.tryPromise(() =>
          tx
            .insertInto("products")
            .values(data)
            .returningAll()
            .executeTakeFirstOrThrow(),
        );

        // Can use cache service inside transaction
        yield* cache.invalidatePattern("products:*");

        return product;
      }),
    );

    return result;
  });
```

### 6. Configuration as Effect Context

**Pattern:** Define configuration as Effect Context.Tag loaded from environment

```typescript
import { Config, Context, Effect, Layer, Secret } from "effect";

// 1. Define configuration tag
export class CacheConfig extends Context.Tag("CacheConfig")<
  CacheConfig,
  {
    readonly redisUrl: string;
    readonly ttl: number;
    readonly maxRetries: number;
  }
>() {}

// 2. Load configuration from environment
export const CacheConfigLive = Layer.effect(
  CacheConfig,
  Effect.gen(function*() {
    const redisUrl = yield* Config.secret("REDIS_URL");
    const ttl = yield* Config.number("CACHE_TTL").pipe(
      Config.withDefault(3600), // Default value if not set
    );
    const maxRetries = yield* Config.number("CACHE_MAX_RETRIES").pipe(
      Config.withDefault(3),
    );

    return {
      redisUrl: Secret.value(redisUrl), // Extract secret value
      ttl,
      maxRetries,
    };
  }),
);

// 3. Use configuration in service
const makeCacheService = Effect.gen(function*() {
  const config = yield* CacheConfig;
  const redis = yield* RedisService;

  return {
    set: (key, value) => redis.set(key, value, config.ttl), // Use config.ttl
  };
});

// 4. Compose layers
export const CacheServiceLive = Layer.effect(
  CacheService,
  makeCacheService,
).pipe(
  Layer.provide(CacheConfigLive), // Provide config
);
```

**Why:** Effect Config provides type-safe environment variable loading with validation.

**Key Points:**

- `Config.secret()` for sensitive values (API keys, passwords)
- `Config.string()`, `Config.number()`, `Config.boolean()` for typed values
- `Config.withDefault()` for optional values
- `Secret.value()` to extract secret (only in secure contexts)

**Config Validation:**

```typescript
import { Config, Effect, Schema } from "effect";

// Complex configuration with validation
export const DatabaseConfigLive = Layer.effect(
  DatabaseConfig,
  Effect.gen(function*() {
    const host = yield* Config.string("DB_HOST");
    const port = yield* Config.number("DB_PORT").pipe(
      Config.validate((n) =>
        n > 0 && n < 65536
          ? Effect.succeed(n)
          : Effect.fail(ConfigError.InvalidData([], "Port must be 1-65535")),
      ),
    );
    const poolSize = yield* Config.number("DB_POOL_SIZE").pipe(
      Config.withDefault(10),
      Config.validate((n) =>
        n > 0 && n <= 100
          ? Effect.succeed(n)
          : Effect.fail(ConfigError.InvalidData([], "Pool size must be 1-100")),
      ),
    );

    return { host, port, poolSize };
  }),
);
```

### 7. Health Check Interface Standard

**Pattern:** Standardized health check interface for monitoring

```typescript
// libs/infra/shared/src/lib/health.ts (if shared patterns exist)
export interface HealthCheckResult {
  readonly status: "healthy" | "unhealthy" | "degraded";
  readonly timestamp: number;
  readonly details?: Record<string, unknown>;
}

export interface HealthCheckable {
  readonly healthCheck: () => Effect.Effect<HealthCheckResult, never>;
}

// Implementation in infrastructure service
const makeCacheService = Effect.gen(function*() {
  const redis = yield* RedisService;

  const healthCheck = (): Effect.Effect<{ status: "healthy" | "unhealthy"; timestamp: number }, never> =>
    Effect.gen(function*() {
      const pingResult: "healthy" | "unhealthy" = yield* Effect.tryPromise(() => redis.ping()).pipe(
        Effect.map((): "healthy" | "unhealthy" => "healthy"),
        Effect.catchAll(() => Effect.succeed<"healthy" | "unhealthy">("unhealthy")),
      );

      return {
        status: pingResult,
        timestamp: Date.now(),
        details: {
          service: "cache",
          backend: "redis",
        },
      };
    });

  return {
    healthCheck,
    // ... other methods
  };
});
```

**Why:** Consistent health checks enable monitoring and alerting.

**Key Points:**

- Never fails (returns `Effect<HealthCheckResult, never>`)
- Standard status values: `healthy`, `unhealthy`, `degraded`
- Include timestamp for staleness detection
- Optional details for debugging

**Usage in Health Endpoint:**

```typescript
// apps/api/src/app/routes/health.ts
import { CacheService } from "@creativetoolkits/infra-cache/server";
import { DatabaseService } from "@creativetoolkits/infra-database/server";

const healthCheck = Effect.gen(function*() {
  const cache = yield* CacheService;
  const database = yield* DatabaseService;

  const [cacheHealth, dbHealth] = yield* Effect.all([
    cache.healthCheck(),
    database.healthCheck(),
  ]);

  const overallStatus =
    cacheHealth.status === "unhealthy" || dbHealth.status === "unhealthy"
      ? "unhealthy"
      : cacheHealth.status === "degraded" || dbHealth.status === "degraded"
        ? "degraded"
        : "healthy";

  return {
    status: overallStatus,
    services: {
      cache: cacheHealth,
      database: dbHealth,
    },
  };
});
```

### 8. Error Translation at Boundaries

**Pattern:** Convert external errors to domain errors using Data.TaggedError

```typescript
import { Data, Effect } from "effect";

// Define domain errors
export class CacheConnectionError extends Data.TaggedError(
  "CacheConnectionError",
)<{
  readonly cause: unknown;
}> {}

export class CacheKeyNotFoundError extends Data.TaggedError(
  "CacheKeyNotFoundError",
)<{
  readonly key: string;
}> {}

export class CacheTimeoutError extends Data.TaggedError("CacheTimeoutError")<{
  readonly operation: string;
  readonly timeoutMs: number;
}> {}

// Union type
export type CacheError =
  | CacheConnectionError
  | CacheKeyNotFoundError
  | CacheTimeoutError;

// Translate at boundary
const get = <A>(key: string) =>
  Effect.gen(function*() {
    const redis = yield* RedisService;

    const result = yield* Effect.tryPromise({
      try: () => redis.get(key),
      catch: (error) => {
        // Translate external error to domain error
        if (isConnectionError(error)) {
          return new CacheConnectionError({ cause: error });
        }
        if (isTimeoutError(error)) {
          return new CacheTimeoutError({
            operation: "get",
            timeoutMs: 5000,
          });
        }
        return new CacheConnectionError({ cause: error });
      },
    });

    // Handle not found case
    if (result === null) {
      return yield* Effect.fail(new CacheKeyNotFoundError({ key }));
    }

    return result;
  });
```

**Why:** Domain errors are type-safe and provide context for error handling.

**Key Points:**

- Use `Data.TaggedError` for error types
- Include relevant context in error data
- Translate external errors at service boundary
- Use union types for multiple error cases

### 9. Layer Memoization (Singleton Pattern)

**Pattern:** Layers are automatically memoized for singleton behavior

```typescript
// Layer is memoized - only created once
export const CacheServiceLive = Layer.scoped(
  CacheService,
  Effect.gen(function*() {
    yield* Effect.log("CacheService initializing"); // Runs once
    const redis = yield* RedisService;
    return makeCacheService(redis);
  }),
);

// Usage: Multiple dependencies share the same instance
export const AppLayerLive = Layer.mergeAll(
  CacheServiceLive, // Created once
  DatabaseServiceLive, // Depends on CacheServiceLive
  StorageServiceLive, // Also depends on CacheServiceLive
);

// CacheServiceLive is only instantiated once, shared by both
```

**Why:** Effect automatically memoizes layers to ensure singleton behavior.

**Key Points:**

- Layers are created once per runtime
- Shared across all services that depend on them
- No manual singleton management needed
- Cleanup happens once when all dependencies are released

### 10. Service Composition

**Pattern:** Data-access layer composes multiple infrastructure services

**Typical Composition:**
- Database (query execution)
- Cache (performance optimization)
- Logger (observability)
- Telemetry (distributed tracing)

**Generator Rule:** Data-access repositories orchestrate infrastructure, infrastructure provides capabilities

### 11. Resource Lifecycle Management (Scoped)

**Pattern:** Infrastructure libraries managing connections, pools, or subscriptions

**When to Use `Layer.scoped`:**
- Database connection pools
- Redis connections
- Message queue subscriptions
- WebSocket connections
- File handles or streams
- Any resource requiring cleanup on shutdown

**Generator Template:**

```typescript
export class ResourceService extends Context.Tag("ResourceService")<
  ResourceService,
  ServiceInterface
>() {
  static readonly Live = Layer.scoped(  // ← Use scoped, not effect
    this,
    Effect.gen(function*() {
      const config = yield* ConfigService
      const logger = yield* LoggingService

      // Acquire resource with automatic cleanup
      const resource = yield* Effect.acquireRelease(
        Effect.sync(() => {
          logger.info("Creating resource pool")
          return createResource(config)
        }),
        (r) => Effect.sync(() => {
          logger.info("Closing resource pool")
          r.close()
        })
      )

      return {
        query: (cmd) => Effect.tryPromise({
          try: () => resource.send(cmd),
          catch: (error) => new ResourceError(error)
        })
      }
    })
  )
}
```

**Why `Layer.scoped` vs `Layer.effect`:**
- `Layer.scoped`: Guarantees cleanup when app shuts down (use for resources)
- `Layer.effect`: No cleanup, for stateless services (use for pure logic)

**Critical for Generators:** Always use `Layer.scoped` for infrastructure managing external connections

---

## Platform Export Strategy for Generators

**File Structure for Infrastructure Libraries:**

```
libs/infra/[name]/
├── src/
│   ├── index.ts           # Shared types and errors only
│   ├── lib/
│   │   ├── service.ts     # Service tag + interface
│   │   ├── errors.ts      # Error types (Data.TaggedError)
│   │   └── layers.ts      # Layer implementations
│   ├── server.ts          # Server-specific exports
│   ├── client.ts          # Client-specific exports (optional)
│   └── edge.ts            # Edge runtime exports (optional)
```

**Export Rules:**

### Server Exports (`/server`)
**Always include:**
- All Effect-based services
- Layer implementations
- Infrastructure orchestrating providers

**Examples:**
- `DatabaseService`, `CacheService`, `MessagingService`
- All 9 infrastructure libraries have server exports

### Client Exports (`/client`)
**Only when needed:**
- React hooks using promises (not Effect)
- Browser-specific utilities
- **Critical:** Client hooks intentionally don't use Effect

**Examples:**
- `infra-storage`: `useStorageUpload()` hook
- `infra-observability`: Browser console implementation
- Most infra libraries DON'T have client exports

### Edge Exports (`/edge`)
**Rarely needed:**
- Lightweight services for edge runtime
- No database, no heavy dependencies
- Minimal logging, auth validation

**Examples:**
- `infra-observability`: Minimal edge logger
- `infra-error-tracking`: Edge Sentry client
- Most infra libraries DON'T have edge exports

**Generator Decision Rule:**
```
DEFAULT: Server-only
IF has React hooks → Add /client
IF needed in middleware → Add /edge (rare)
```

---

## Current Infrastructure Libraries

### 1. infra-cache

**Purpose:** Redis/Memory caching with cache-aside pattern
**Location:** `libs/infra/cache/`
**Platform:** Server-only
**Dependencies:** `provider-redis`

**Key Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `get` | `<A>(key, decode) => Effect<Option<A>, CacheError>` | Retrieve cached value with parsing |
| `set` | `<A>(key, value, ttl?) => Effect<void, CacheError>` | Store value with optional TTL |
| `delete` | `(key) => Effect<void, CacheError>` | Remove cached value |
| `invalidatePattern` | `(pattern) => Effect<number, CacheError>` | Remove all keys matching pattern |

**Usage:** Cache-aside pattern for repository queries (see data-access libraries)

**Generator Must Create:**
- ✅ `CacheService` tag extending `Context.Tag`
- ✅ Static `Live` layer with Redis provider dependency
- ✅ Error types: `CacheError`, `CacheSerializationError`
- ✅ Server-only exports (no client/edge needed)
- ✅ Methods return `Effect<Option<A>>` for cache misses

**Generator Must NOT Create:**
- ❌ Direct Redis client imports (use `@creativetoolkits/provider-redis`)
- ❌ Business logic or domain-specific caching strategies
- ❌ Repository implementations (belongs in data-access layer)

### 2. infra-database

**Purpose:** Kysely orchestration with transaction management

**Location:** `libs/infra/database/`

**Platform:** Server-only

**Dependencies:**

- `@creativetoolkits/provider-kysely`
- `@creativetoolkits/types-database`

**Service Interface:**

```typescript
export interface DatabaseServiceInterface {
  readonly query: <A>(
    fn: (db) => Promise<A>,
  ) => Effect.Effect<A, DatabaseError>;

  readonly transaction: <A, E>(
    fn: (tx) => Effect.Effect<A, E>,
  ) => Effect.Effect<A, DatabaseError | E>;
}
```

**Critical Feature:** Runtime preservation for transactions (see Pattern #5)

**Usage Example:**

```typescript
import { DatabaseService } from "@creativetoolkits/infra-database/server";

const createProduct = (data: ProductInsert) =>
  Effect.gen(function*() {
    const database = yield* DatabaseService;
    const cache = yield* CacheService;

    // Transaction with preserved Effect context
    const product = yield* database.transaction((tx) =>
      Effect.gen(function*() {
        // Insert product
        const product = yield* Effect.tryPromise(() =>
          tx
            .insertInto("products")
            .values(data)
            .returningAll()
            .executeTakeFirstOrThrow(),
        );

        // Insert audit log
        yield* Effect.tryPromise(() =>
          tx
            .insertInto("audit_logs")
            .values({
              entity: "product",
              action: "create",
              entityId: product.id,
            })
            .execute(),
        );

        // Can use other services inside transaction!
        yield* cache.invalidatePattern("products:*");

        return product;
      }),
    );

    return product;
  });
```

**Generator Must Create:**
- ✅ `DatabaseService` tag with `query` and `transaction` methods
- ✅ Static `Live` layer with Kysely provider dependency
- ✅ Runtime preservation for transaction callbacks (see example above)
- ✅ Error types: `DatabaseError`, `TransactionError`
- ✅ Server-only exports

**Generator Must NOT Create:**
- ❌ Direct Kysely imports (use `@creativetoolkits/provider-kysely`)
- ❌ Query builders or repositories (belongs in data-access layer)
- ❌ Schema migrations (use Prisma)

**Critical Pattern:** Transaction method must preserve Effect context for nested service calls

### 3. infra-storage

**Purpose:** Supabase storage with React hooks
**Location:** `libs/infra/storage/`
**Platform:** Universal (client + server)
**Dependencies:** `provider-supabase`

**Key Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `upload` | `(bucket, path, file) => Effect<StorageObject, StorageError>` | Upload file to bucket |
| `download` | `(bucket, path) => Effect<Blob, StorageError>` | Download file from bucket |
| `list` | `(bucket, path?) => Effect<StorageObject[], StorageError>` | List files in bucket/path |
| `delete` | `(bucket, paths) => Effect<void, StorageError>` | Delete files from bucket |
| `getPublicUrl` | `(bucket, path) => string` | Get public URL for file |

**Client Export:** `useStorageUpload()` hook for React components

**Generator Must Create:**
- ✅ `StorageService` tag with upload/download/list/delete methods
- ✅ Static `Live` layer with Supabase provider dependency
- ✅ Both `/server` (Effect-based) and `/client` (React hooks) exports
- ✅ Error types: `StorageError`, `StorageUploadError`
- ✅ Client hooks using promises (not Effect) for React state management

**Generator Must NOT Create:**
- ❌ Direct Supabase client imports (use `@creativetoolkits/provider-supabase`)
- ❌ File validation logic (belongs in feature layer)
- ❌ Business rules for storage (e.g., "users can only upload 5 files")

**Critical Pattern:** Client hooks intentionally use promises for React state, not Effect

### 4. infra-observability

**Purpose:** Multi-platform structured logging
**Location:** `libs/infra/logging/`
**Platform:** Universal (client + server + edge)
**Dependencies:** `provider-sentry` (optional)

**Key Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `debug` | `(message, context?) => Effect<void, never>` | Debug-level logging |
| `info` | `(message, context?) => Effect<void, never>` | Info-level logging |
| `warn` | `(message, context?) => Effect<void, never>` | Warning-level logging |
| `error` | `(message, error?, context?) => Effect<void, never>` | Error-level logging |

**Platform Variants:** Server (console + Sentry), Client (browser console), Edge (minimal)

**Generator Must Create:**
- ✅ `LoggingService` tag with debug/info/warn/error methods
- ✅ Static `Live` layers for each platform (server/client/edge)
- ✅ Platform-specific implementations (console, Sentry integration)
- ✅ All methods return `Effect<void, never>` (logging never fails)
- ✅ Support for structured context objects

**Generator Must NOT Create:**
- ❌ Log storage or aggregation (use external services)
- ❌ Log level filtering logic (use environment config)
- ❌ Business logic in log messages

**Critical Pattern:** Logging is cross-cutting - available on all platforms with appropriate implementations

### 5. infra-telemetry

**Purpose:** OpenTelemetry distributed tracing with Effect built-in support
**Location:** `libs/infra/telemetry/`
**Platform:** Server-only
**Dependencies:** `@effect/opentelemetry`, `@opentelemetry/sdk-node`

**Setup:** Use `NodeSdk.layer()` from `@effect/opentelemetry` and provide to app layer

**Core Pattern - Effect.withSpan:**

```typescript
const fetchProduct = (id: string) =>
  Effect.withSpan("product.fetch", { attributes: { productId: id } })(
    Effect.gen(function*() {
      // Span automatically tracks this operation
      const product = yield* database.query(/* ... */);

      // Annotate span with metadata
      yield* Effect.annotateCurrentSpan({ found: !!product });

      return product;
    })
  );
```

**Key Methods:**
- `Effect.withSpan(name, options)` - Wrap operation in span
- `Effect.annotateCurrentSpan(attrs)` - Add metadata to current span
- Spans automatically nest and propagate across services

**Best Practices:**
- Use dot notation for span names (`service.operation`)
- Include searchable attributes (IDs, status, counts)
- Never include sensitive data (passwords, tokens)
- Nest spans for complex multi-step operations

**Generator Must Create:**
- ✅ Use `@effect/opentelemetry` package (Effect's official integration)
- ✅ `NodeSdk.layer()` for OpenTelemetry setup
- ✅ Server-only implementation (no client telemetry)
- ✅ Documentation on `Effect.withSpan` and `Effect.annotateCurrentSpan`
- ✅ Best practices for span naming and attributes

**Generator Must NOT Create:**
- ❌ Custom telemetry service (use Effect's built-in support)
- ❌ Manual span creation (use `Effect.withSpan`)
- ❌ Telemetry storage (use external OTLP collectors)

**Critical Pattern:** Use Effect's built-in OpenTelemetry support, not custom abstractions

### 6. infra-webhooks

**Purpose:** Event processing and validation
**Location:** `libs/infra/webhooks/`
**Platform:** Server-only
**Dependencies:** `infra-observability`

**Key Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `verify` | `(payload, signature, secret) => Effect<boolean, WebhookError>` | Verify webhook signature |
| `process` | `<E>(event, handler) => Effect<void, WebhookError \| E>` | Process webhook event |

**Generator Must Create:**
- ✅ `WebhookService` tag with verify and process methods
- ✅ Static `Live` layer with logging dependency
- ✅ Error types: `WebhookError`, `WebhookVerificationError`
- ✅ Server-only exports
- ✅ Generic `process` method supporting custom error types

**Generator Must NOT Create:**
- ❌ Webhook routing logic (belongs in API routes)
- ❌ Event-specific handlers (belongs in feature layer)
- ❌ Signature algorithms (use crypto libraries)

### 7. infra-messaging (PubSub)

**Purpose:** Redis/CloudAMQP pub/sub messaging with Effect Stream integration

**Effect 4.0 Status:** ✅ Stable API | **Location:** `libs/infra/messaging/` | **Platform:** Server-only

**Dependencies:** `@creativetoolkits/provider-redis`, `@creativetoolkits/provider-cloudamqp`

**Key Services:**

| Service | Methods | Pattern |
|---------|---------|---------|
| `RedisPubSubService` | `publish(channel, msg)`, `subscribe(channel) => Stream` | PubSub with runtime preservation |
| `MessageQueueService` | `sendToQueue(queue, msg)`, `consumeQueue(queue) => Stream` | CloudAMQP work queues |
| `EventBus` | `publish(event)`, `subscribe() => Stream` | Type-safe domain events |

**Critical Pattern - Runtime Preservation in Streams:**

```typescript
// ✅ CORRECT: Preserve runtime for callback handlers
subscribe: (channel) =>
  Stream.unwrapScoped(
    Effect.gen(function*() {
      const queue = yield* Queue.unbounded<string>();
      const runtime = yield* Effect.runtime(); // Capture runtime

      const subscriber = yield* Effect.acquireRelease(
        Effect.sync(() => redis.duplicate()),
        (client) => Effect.sync(() => client.quit())
      );

      // Use Runtime.runFork for callbacks
      subscriber.on("message", (ch, msg) => {
        if (ch === channel) {
          Runtime.runFork(runtime)(Queue.offer(queue, msg));
        }
      });

      yield* Effect.sync(() => subscriber.subscribe(channel));
      return Stream.fromQueue(queue);
    })
  )
```

**Event-Driven Patterns:**

| Pattern | Usage | Concurrency |
|---------|-------|-------------|
| **Fan-Out** | Multiple handlers consume same event | `Effect.all([h1, h2, h3], { concurrency: "unbounded" })` |
| **Work Queue** | Multiple workers share queue | `Stream.mapEffect(processJob, { concurrency: 5 })` |
| **Backpressure** | Handle slow consumers | `Stream.buffer({ capacity: 100, strategy: "dropping" })` |

**Key Takeaways:**
- Use `Stream.unwrapScoped` for automatic cleanup
- Preserve runtime with `Effect.runtime()` for callback handlers
- Bounded concurrency prevents resource exhaustion
- Catch errors per-message to avoid stream termination

**Generator Must Create:**
- ✅ `RedisPubSubService` and/or `MessageQueueService` tags
- ✅ Static `Live` layers with `Layer.scoped` for cleanup
- ✅ Runtime preservation in Stream subscriptions (see example above)
- ✅ Error types: `PubSubError`, `QueueError`
- ✅ Methods returning `Stream` for subscriptions

### MessagingService Integration with CQRS

The `MessagingService` enables event-driven cache invalidation for CQRS projections.

**CQRS Event Flow:**

```
Command → Write DB → Publish Event → Event Stream → Cache Invalidation → Next Query Rebuilds
```

**Example: Event Publishing from Command**

```typescript
// libs/feature/product/src/lib/server/commands/create-product.ts
import { Schema } from "effect";

export class ProductCreatedEvent extends Schema.Class<ProductCreatedEvent>("ProductCreatedEvent")({
  productId: Schema.UUID,
  name: Schema.String,
  price: Schema.Number,
  _metadata: Schema.Struct({
    eventId: Schema.UUID,
    version: Schema.Literal(1),
    timestamp: Schema.DateFromSelf,
  }),
}) {}

export const createProduct = (command: CreateProductCommand) =>
  Effect.gen(function*() {
    const repo = yield* ProductRepository;
    const messaging = yield* MessagingService;

    // 1. Execute command (write to DB)
    const product = yield* repo.create({ ... });

    // 2. Publish domain event for cache invalidation
    yield* messaging.publish("product.created", new ProductCreatedEvent({
      productId: product.id,
      name: product.name,
      price: product.price,
      _metadata: {
        eventId: crypto.randomUUID(),
        version: 1,
        timestamp: new Date(),
      },
    }));

    return product.id;
  });
```

**Example: Event Handler for Cache Invalidation**

**CRITICAL**: Use `Stream.runForEach` for event subscriptions (Effect best practice):

```typescript
// libs/feature/product/src/lib/server/events/handlers.ts
import { Stream } from "effect";

export const setupProductEventHandlers = Effect.gen(function*() {
  const messaging = yield* MessagingService;
  const projectionRepo = yield* ProductProjectionRepository;

  // Subscribe returns Effect<Stream<Message<T>, Error>, Error>
  const eventStream = yield* messaging.subscribe<ProductCreatedEvent>("product.created");

  // Process stream with runForEach
  yield* Stream.runForEach(eventStream, (message) =>
    Effect.gen(function*() {
      yield* projectionRepo.invalidateProjectionCache(message.data.productId);
      // Next query will rebuild projection from current DB state
    })
  );
});
```

**For Parallel Event Processing:**

```typescript
export const setupProductEventHandlers = Effect.gen(function*() {
  const messaging = yield* MessagingService;
  const projectionRepo = yield* ProductProjectionRepository;

  const eventStream = yield* messaging.subscribe<ProductCreatedEvent>("product.created");

  // Process multiple events in parallel
  yield* eventStream.pipe(
    Stream.mapEffectPar(
      (message) => projectionRepo.invalidateProjectionCache(message.data.productId),
      { concurrency: 10 }
    ),
    Stream.runDrain
  );
});
```

**See Also:**
- [Feature CQRS Pattern](./FEATURE.md#cqrs-architecture-pattern) - Command/query handlers
- [Contract CQRS Patterns](./CONTRACT.md#cqrs-contract-patterns-commands-queries-projections) - Event schemas
- [Data-Access Projections](./DATA-ACCESS.md#projection-repository-pattern-cqrs-read-models) - Cache invalidation integration

**Generator Must NOT Create:**
- ❌ Direct Redis/AMQP client imports (use provider libraries)
- ❌ Event handlers or business logic (belongs in feature layer)
- ❌ Message routing logic (use domain event buses in feature layer)

**Critical Pattern:** Always preserve runtime with `Effect.runtime()` before callback-based subscriptions

### 8. RPC Middleware Tags (Infrastructure)

**Purpose:** Define middleware **tags** for authentication, context, and cross-cutting concerns in RPC procedures

**Location:** `libs/infra/rpc/` | **Platform:** Universal | **Dependencies:** None (pure Effect)

**Core Principle:** Infrastructure defines middleware **tags** (interface), applications provide **implementations** (Layer.succeed)

**Related Documentation:** [Feature RPC Pattern](./FEATURE.md#rpc-pattern-effect-effectrpc-official-pattern), [Contract Libraries](./CONTRACT.md#contracts-for-effect-services-and-rpc)

**Three-Layer Architecture:**

```
INFRASTRUCTURE → Define tags (CurrentUser, AuthMiddleware)
FEATURE → Use tags in handlers (yield* CurrentUser)
APPLICATION → Provide implementations (Layer.succeed(AuthMiddleware, { authenticate: ... }))
```

**Why Separation?** Testability, composability, type safety, follows Effect @effect/rpc pattern

**Common Middleware Tags:**

| Tag | Purpose | Usage in Handler |
|-----|---------|------------------|
| `CurrentUser` | Access authenticated user | `const user = yield* CurrentUser` |
| `AuthMiddleware` | Authentication service | Provided by app layer |
| `RequestContext` | Request metadata (ID, IP, User-Agent) | `const ctx = yield* RequestContext` |
| `AuthorizationService` | Permission/role checks | `yield* authz.requirePermission("product:write")` |

**Common Error Types:** `UnauthorizedError`, `ForbiddenError`, `TokenExpiredError`, `InsufficientPermissionsError`, `RateLimitExceededError`

**Infrastructure RPC Responsibilities:**

✅ **DO:** Define middleware tags, context types, error types
❌ **DON'T:** Provide implementations, define RPC routers/handlers/schemas

**Generator Must Create:**
- ✅ Context tags (CurrentUser, RequestContext, etc.) extending `Context.Tag`
- ✅ Middleware service tags (AuthMiddleware, AuthorizationService)
- ✅ Error types using `Data.TaggedError`
- ✅ Universal exports (shared types available everywhere)
- ✅ Documentation linking to feature RPC pattern

**Generator Must NOT Create:**
- ❌ Middleware implementations (provided by application layer)
- ❌ RPC routers or handlers (belongs in feature layer)
- ❌ RPC schemas (belongs in contract layer)
- ❌ Authentication logic (JWT verification, etc.)

**Critical Pattern:** Infrastructure defines ONLY tags - application provides implementations via `Layer.succeed`

### 9. infra-error-tracking

**Purpose:** Sentry integration with Effect errors

**Location:** `libs/infra/error-tracking/` | **Platform:** Universal | **Dependencies:** `@creativetoolkits/provider-sentry`

**Key Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `captureException` | `(error, context?) => Effect<void, never>` | Capture and report exceptions |
| `captureMessage` | `(message, level, context?) => Effect<void, never>` | Log messages to Sentry |
| `setUser` | `(user: {id, email?, username?}) => Effect<void, never>` | Associate user with session |
| `addBreadcrumb` | `(breadcrumb) => Effect<void, never>` | Add debug breadcrumb trail |

**Generator Must Create:**
- ✅ `ErrorTrackingService` tag with capture/message/setUser/addBreadcrumb methods
- ✅ Static `Live` layers for each platform (server/client/edge)
- ✅ Sentry provider integration
- ✅ All methods return `Effect<void, never>` (error tracking never fails)
- ✅ Platform-specific exports

**Generator Must NOT Create:**
- ❌ Direct Sentry SDK imports (use `@creativetoolkits/provider-sentry`)
- ❌ Error grouping/filtering logic (configured in Sentry dashboard)
- ❌ Custom error reporting UI

---

## Infrastructure vs Provider: Generator Decision Tree

**When to Create Infrastructure Library:**
- ✅ Orchestrates multiple providers (e.g., CacheService uses Redis + adds serialization)
- ✅ Adds cross-cutting concerns (logging, caching, telemetry)
- ✅ Provides domain-specific abstractions (e.g., DatabaseService adds transaction management)
- ✅ Composes other infrastructure services
- ✅ Example: `infra-cache`, `infra-database`, `infra-observability`

**When to Create Provider Library:**
- ✅ Wraps external SDK directly with minimal abstraction
- ✅ Primarily Effect wrapping (Effect.tryPromise, Effect.sync)
- ✅ No domain logic, just API surface area
- ✅ One-to-one mapping with SDK methods
- ✅ Example: `provider-redis`, `provider-stripe`, `provider-supabase`

**Generator Decision Rule:**
```
IF adds domain logic OR orchestrates multiple services
  → Create INFRASTRUCTURE library
ELSE IF wraps single SDK
  → Create PROVIDER library
```

**Examples:**
- `CacheService` (Infrastructure) wraps `RedisService` (Provider) + adds TTL logic
- `DatabaseService` (Infrastructure) wraps `KyselyService` (Provider) + adds transaction management
- `RedisService` (Provider) wraps `ioredis` SDK directly
- `StripeService` (Provider) wraps `stripe` SDK directly

---

## Integration Patterns

### Dependency Composition Rules

**Layer Hierarchy (Bottom → Top):**
```
Provider → Infrastructure → Data-Access → Feature
```

**Generator Must Follow:**
- Infrastructure depends on: Providers, other Infrastructure
- Data-Access depends on: Infrastructure (never Providers directly)
- Feature depends on: Data-Access, Infrastructure (orchestration only)

**Integration Examples:**

| From → To | Pattern | Example |
|-----------|---------|---------|
| **Infrastructure → Provider** | `yield* ProviderService` | `CacheService` uses `RedisService` |
| **Infrastructure → Infrastructure** | `yield* InfraService` | `DatabaseService` uses `CacheService`, `LoggingService` |
| **Data-Access → Infrastructure** | `yield* InfraService` | `ProductRepository` uses `DatabaseService`, `CacheService` |
| **Feature → Infrastructure** | `yield* InfraService` (orchestration only) | `PaymentService` uses `MessagingService`, `ErrorTrackingService` |

**Anti-Pattern:**
```typescript
// ❌ WRONG: Data-Access importing Provider directly
import { Redis } from "ioredis";
const redis = new Redis(); // Skip infrastructure layer!

// ✅ CORRECT: Use Infrastructure layer
const cache = yield* CacheService; // Infrastructure wraps Redis
```

### Layer Composition Pattern

Infrastructure layers compose dependencies with `Layer.provide`:

```typescript
export const DatabaseServiceLive = Layer.effect(
  DatabaseService,
  makeService
).pipe(
  Layer.provide(KyselyServiceLive),      // Provider dependency
  Layer.provide(CacheServiceLive),       // Infrastructure dependency
  Layer.provide(LoggingServiceLive),     // Infrastructure dependency
);
```

**Generator Must Create:**
- Service tag definition
- Live layer implementation with dependencies
- Proper `Layer.provide` chain for all dependencies

### Platform-Specific Exports

Infrastructure services export platform-specific implementations:

```typescript
// server.ts - Node.js runtime
export const LoggingServiceLive = Layer.succeed(LoggingService, {
  debug: (msg) => Effect.sync(() => console.debug(msg))
});

// client.ts - Browser runtime (optional)
export const LoggingServiceLive = Layer.succeed(LoggingService, {
  debug: (msg) => Effect.sync(() =>
    process.env.NODE_ENV === "development" && console.debug(msg)
  )
});
```

**Generator Decision:**
- DEFAULT: Server-only (`server.ts`)
- IF has React hooks → Add `client.ts`
- IF needed in middleware → Add `edge.ts` (rare)

### Configuration Integration

Infrastructure uses Effect Config for environment variables:

```typescript
// Configuration layer
export const ConfigLive = Layer.effect(ServiceConfig,
  Effect.gen(function*() {
    const host = yield* Config.string("SERVICE_HOST");
    const port = yield* Config.number("SERVICE_PORT").pipe(Config.withDefault(5432));
    return { host, port };
  })
);

// Service layer depends on config
export const ServiceLive = Layer.effect(Service,
  Effect.gen(function*() {
    const config = yield* ServiceConfig;
    // Use config.host, config.port
).pipe(
  Layer.provide(DatabaseConfigLive), // Provide config layer
);
```

---

## Module Boundaries & Build

### Nx Dependency Constraints

Infrastructure libraries have specific dependency rules enforced by Nx.

**Allowed Dependencies:**

```
infra/* can depend on:
├── types/*           # Shared types
├── util/*            # Utility functions
├── provider/*        # External service adapters
└── infra/*           # Other infrastructure (with caution)
```

**Forbidden Dependencies:**

```
infra/* CANNOT depend on:
├── feature/*         # Business logic
├── data-access/*     # Domain repositories
└── contracts/*       # Domain interfaces
```

**Configuration (`.eslintrc.json`):**

```json
{
  "overrides": [
    {
      "files": ["libs/infra/**/*"],
      "rules": {
        "@nx/enforce-module-boundaries": [
          "error",
          {
            "allow": [],
            "depConstraints": [
              {
                "sourceTag": "type:infra",
                "onlyDependOnLibsWithTags": [
                  "type:types",
                  "type:util",
                  "type:provider",
                  "type:infra"
                ]
              }
            ]
          }
        ]
      }
    }
  ]
}
```

### Library Tags

Every infrastructure library must be tagged in `project.json`:

```json
{
  "name": "infra-cache",
  "tags": ["type:infra", "platform:server"]
}
```

**Tag Options:**

- **type:infra** (required) - Identifies as infrastructure
- **platform:server** - Server-only (Node.js)
- **platform:client** - Client-only (Browser)
- **platform:edge** - Edge runtime (Vercel/Cloudflare)
- **platform:universal** - All platforms

### TypeScript Project References

Infrastructure libraries use TypeScript project references for incremental builds.

**Enable Incremental Compilation:**

```bash
# Build with incremental compilation
pnpm exec nx build infra-cache --batch

# Build all with batch mode (faster)
pnpm exec nx run-many --target=build --all --batch
```

**tsconfig.json Configuration:**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true, // Enable project references
    "incremental": true, // Enable incremental compilation
    "tsBuildInfoFile": ".tsbuildinfo"
  },
  "references": [
    { "path": "../provider/redis" },
    { "path": "../provider/kysely" }
  ]
}
```

### Build Optimization

**Nx Caching:**

Infrastructure builds are cached by Nx for speed.

```bash
# Uses cache if inputs haven't changed
pnpm exec nx build infra-cache

# Skip cache (forces rebuild)
NX_SKIP_NX_CACHE=true pnpm exec nx build infra-cache
```

**Affected Builds:**

Only rebuild infrastructure libraries that changed.

```bash
# Build only affected libraries
pnpm exec nx affected --target=build

# Build affected with batch mode
pnpm exec nx affected --target=build --batch
```

---

## Implementation Guidelines

### Step 1: Use Generator

```bash
# Server-only infrastructure
pnpm exec nx g @workspace:infra my-service

# Universal infrastructure with client/server
pnpm exec nx g @workspace:infra my-service --includeClientServer=true
```

### Step 2: Define Service Interface

Edit `src/lib/service/interface.ts`:

```typescript
import { Context, Effect, Option } from "effect";
import type { MyServiceError } from "./errors";

// Service definition with inline interface (Context.Tag pattern)
export class MyService extends Context.Tag("MyService")<
  MyService,
  {
    readonly doSomething: (
      input: string,
    ) => Effect.Effect<Option.Option<Result>, MyServiceError>;
    readonly cleanup: () => Effect.Effect<void>;
    readonly healthCheck: () => Effect.Effect<boolean, MyServiceError>;
  }
>() {}
```

### Step 3: Define Error Types

Edit `src/lib/service/errors.ts`:

```typescript
import { Data } from "effect";

export class MyServiceConnectionError extends Data.TaggedError(
  "MyServiceConnectionError",
)<{
  readonly cause: unknown;
}> {}

export class MyServiceOperationError extends Data.TaggedError(
  "MyServiceOperationError",
)<{
  readonly operation: string;
  readonly cause: unknown;
}> {}

export type MyServiceError = MyServiceConnectionError | MyServiceOperationError;
```

### Step 4: Define Configuration

Edit `src/lib/service/config.ts`:

```typescript
import { Config, Context, Effect, Layer, Secret } from "effect";

export class MyServiceConfig extends Context.Tag("MyServiceConfig")<
  MyServiceConfig,
  {
    readonly apiKey: string;
    readonly timeout: number;
  }
>() {}

export const MyServiceConfigLive = Layer.effect(
  MyServiceConfig,
  Effect.gen(function*() {
    const apiKey = yield* Config.secret("MY_SERVICE_API_KEY");
    const timeout = yield* Config.number("MY_SERVICE_TIMEOUT").pipe(
      Config.withDefault(5000),
    );

    return {
      apiKey: Secret.value(apiKey),
      timeout,
    };
  }),
);
```

### Step 5: Implement Service

Edit `src/lib/service/service.ts`:

```typescript
import { Effect, Layer, Option, Scope } from "effect";
import { MyService } from "./interface";
import { MyServiceOperationError } from "./errors";
import { ProviderService } from "@creativetoolkits/provider-example";
import { LoggingService } from "@creativetoolkits/infra-observability";

export class MyServiceImpl extends MyService {
  static readonly Live = Layer.scoped(
    MyService,
    Effect.gen(function*() {
      const provider = yield* ProviderService;
      const logger = yield* LoggingService;
      const scope = yield* Scope.Scope;

      // Set up any resources
      yield* logger.info("MyService initializing");

      // Add cleanup finalizer
      yield* Scope.addFinalizer(
        scope,
        Effect.gen(function*() {
          yield* logger.info("MyService shutting down");
        }),
      );

      return {
        doSomething: (input: string) =>
          Effect.gen(function*() {
            yield* logger.debug(`Operation: ${input}`);

            const result = yield* Effect.tryPromise({
              try: () => provider.call(input),
              catch: (error) =>
                new MyServiceOperationError({
                  operation: "doSomething",
                  cause: error,
                }),
            });

            yield* logger.info("Operation completed");
            return Option.fromNullable(result);
          }),
        cleanup: () =>
          Effect.gen(function*() {
            yield* logger.info("Cleaning up resources");
          }),
        healthCheck: () =>
          Effect.gen(function*() {
            yield* logger.debug("Health check");
            return true;
          }),
      });
    }),
  );
}
```

### Step 6: Create Layers

Edit `src/lib/layers/server-layers.ts`:

```typescript
import { Layer, Effect, Option } from "effect";
import { MyService } from "../service/interface";
import { MyServiceImpl } from "../service/service";
import { MyServiceConfigLive } from "../service/config";
import { ProviderServiceLive } from "@creativetoolkits/provider-example/server";
import { LoggingServiceLive } from "@creativetoolkits/infra-observability/server";

// Production layer with all dependencies
export const MyServiceLive = MyServiceImpl.Live.pipe(
  Layer.provide(MyServiceConfigLive),
  Layer.provide(ProviderServiceLive),
  Layer.provide(LoggingServiceLive),
);

// Test layer with mock implementation
export const MyServiceTest = Layer.succeed(MyService, {
  doSomething: () => Effect.succeed(Option.none()),
  cleanup: () => Effect.unit,
  healthCheck: () => Effect.succeed(true),
});

// Development layer with mock provider
export const MyServiceDev = MyServiceImpl.Live.pipe(
  Layer.provide(MyServiceConfigLive),
  Layer.provide(ProviderServiceTest), // Mock provider
  Layer.provide(LoggingServiceLive),
);
```

### Step 7: Write Tests

Edit `src/lib/service/service.spec.ts`:

```typescript
import { Effect, Layer } from "@effect/io/Effect";
import { MyService } from "./interface";
import { makeMyService } from "./service";
import { MyServiceTest } from "../layers/server-layers";

describe("MyService", () => {
  it("should do something", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function*() {
        const service = yield* MyService;
        return yield* service.doSomething("test");
      }).pipe(Effect.provide(MyServiceTest)),
    );

    expect(result).toEqual(Option.none());
  });
});
```

### Step 8: Export Public API

Edit `src/index.ts`:

```typescript
export { MyService, type MyServiceInterface } from "./lib/service/interface";
export type { MyServiceError } from "./lib/service/errors";
export {
  MyServiceConnectionError,
  MyServiceOperationError,
} from "./lib/service/errors";
```

Edit `src/server.ts`:

```typescript
export { MyServiceLive, MyServiceTest } from "./lib/layers/server-layers";
export { MyServiceConfigLive, MyServiceConfig } from "./lib/service/config";
export { makeMyService } from "./lib/service/service";

export * from "./index";
```

### Step 9: Document Usage

Edit `CLAUDE.md` with service-specific details:

```markdown
# MyService Infrastructure Library

## Purpose

Provides [brief description of what this infrastructure does]

## Usage

### Server

\`\`\`typescript
import { MyService, MyServiceLive } from '@creativetoolkits/infra-my-service/server';

const program = Effect.gen(function*() {
const myService = yield* MyService;
const result = yield\* myService.doSomething('input');
return result;
}).pipe(Effect.provide(MyServiceLive));
\`\`\`

## Configuration

| Variable           | Required | Default | Description             |
| ------------------ | -------- | ------- | ----------------------- |
| MY_SERVICE_API_KEY | Yes      | -       | API key for service     |
| MY_SERVICE_TIMEOUT | No       | 5000    | Timeout in milliseconds |

## Architecture

[Describe service architecture and design decisions]
```

---

## Testing Pattern

Infrastructure libraries test service operations and resource lifecycle. Use **ONE test file** with inline mocks.

### File: `src/lib/service.spec.ts`

Infrastructure services often manage resources (databases, connections, caches), so use `it.scoped` for proper resource cleanup:

```typescript
// src/lib/service.spec.ts
import { Effect, Layer } from "effect";
import { describe, it, expect } from "vitest";
import { CacheService, CacheServiceLive } from "./service/service";
import { RedisService } from "@creativetoolkits/provider-redis";

// Mock Redis provider inline
const RedisServiceMock = Layer.succeed(RedisService, {
  get: (key: string) => Effect.succeed(null),
  set: (key: string, value: unknown, ttl?: number) => Effect.succeed(void 0),
  delete: (key: string) => Effect.succeed(void 0),
  exists: (key: string) => Effect.succeed(false),
});

const TestLayer = CacheServiceLive.pipe(Layer.provide(RedisServiceMock));

describe("CacheService", () => {
  // Use it.scoped for resource management
  it.scoped("get returns null when key doesn't exist", () =>
    Effect.gen(function*() {
      const cache = yield* CacheService;
      const result = yield* cache.get("non-existent-key");

      expect(result).toBe(null);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.scoped("set stores value successfully", () =>
    Effect.gen(function*() {
      const cache = yield* CacheService;

      yield* cache.set("test-key", { data: "test-value" }, 3600);

      // Verify no errors thrown
      expect(true).toBe(true);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.scoped("delete removes key from cache", () =>
    Effect.gen(function*() {
      const cache = yield* CacheService;

      yield* cache.delete("test-key");

      // Verify deletion succeeded
      const result = yield* cache.get("test-key");
      expect(result).toBe(null);
    }).pipe(Effect.provide(TestLayer)),
  );
});
```

### Resource Lifecycle Tests

For services that manage resources with finalizers:

```typescript
// Test resource cleanup
it.scoped("releases resource on scope exit", () =>
  Effect.gen(function*() {
    let cleanupCalled = false;

    const TestLayer = Layer.scoped(
      DatabaseService,
      Effect.gen(function*() {
        // Register cleanup
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            cleanupCalled = true;
          }),
        );

        return {
          query: (sql: string) => Effect.succeed([]),
        };
      }),
    );

    yield* Effect.scoped(
      Effect.gen(function*() {
        const db = yield* DatabaseService;
        yield* db.query("SELECT 1");
      }).pipe(Effect.provide(TestLayer)),
    );

    // Cleanup should be called after scope exits
    expect(cleanupCalled).toBe(true);
  }),
);
```

### Error Transformation Tests

Test that provider errors are transformed to domain errors:

```typescript
// Test error transformation
it.scoped("transforms provider errors to domain errors", () =>
  Effect.gen(function*() {
    const RedisServiceMock = Layer.succeed(RedisService, {
      get: () => Effect.fail(new Error("Redis connection failed")),
      set: () => Effect.succeed(void 0),
      delete: () => Effect.succeed(void 0),
      exists: () => Effect.succeed(false),
    });

    const result = yield* Effect.either(
      Effect.gen(function*() {
        const cache = yield* CacheService;
        yield* cache.get("test-key");
      }).pipe(
        Effect.provide(CacheServiceLive.pipe(Layer.provide(RedisServiceMock))),
      ),
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left._tag).toBe("CacheConnectionError");
    }
  }),
);
```

### Vitest Configuration

Add `@effect/vitest` to your vitest config:

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

### Best Practices

1. **One Test File**: Keep all infrastructure tests in `src/lib/service.spec.ts`
2. **Use it.scoped**: Infrastructure services manage resources, use `it.scoped` for cleanup
3. **Inline Mocks**: Create provider mocks inline with `Layer.succeed`, no separate files
4. **Test Resource Cleanup**: Verify finalizers are called on scope exit
5. **Test Error Transformation**: Ensure provider errors become domain errors
6. **Focus on Behavior**: Test service operations, not implementation details

### DON'Ts

- ❌ Create separate `mock-factories.ts`, `test-layer.ts`, `config.spec.ts`, `layers.spec.ts`, `errors.spec.ts`, `resource.spec.ts` files
- ❌ Use manual `Effect.runPromise` (use `it.scoped` or `it.effect` instead)
- ❌ Test configuration separately (inline test config in service tests)
- ❌ Test layer composition separately (test through service usage)
- ❌ Create 6-8 test files (one file is sufficient)

---

## Best Practices & Anti-Patterns

### ✅ Generator Must Ensure

| Practice | Implementation |
|----------|----------------|
| **Context.Tag with inline interface** | `class Service extends Context.Tag("Service")<Service, Interface>() {}` |
| **Layer.scoped for resources** | `Layer.scoped(Service, Effect.gen(function*() { ... }))` |
| **Error translation** | `Effect.tryPromise({ try: ..., catch: (e) => new ServiceError() })` |
| **Effect Config** | `Config.secret("KEY")`, `Config.number("PORT").pipe(Config.withDefault(3000))` |
| **Runtime preservation** | `const runtime = yield* Effect.runtime(); Runtime.runPromise(runtime)(...)` |
| **Platform separation** | `server.ts`, `client.ts` (optional), `edge.ts` (rare) |
| **Health checks** | `healthCheck: () => Effect.succeed({ status: "healthy" })` |
| **Layer composition** | `Layer.mergeAll(Service1, Service2, Service3)` |

### ❌ Generator Must NOT Create

| Anti-Pattern | Why | Correct Approach |
|--------------|-----|------------------|
| Services without Context.Tag | No dependency injection | Use `Context.Tag` with inline interface |
| Manual resource cleanup | Resource leaks, error-prone | Use `Layer.scoped` with `Effect.addFinalizer` |
| Direct SDK imports | Tight coupling, no testing | Depend on Provider via `yield* ProviderService` |
| Throwing exceptions | Untyped errors, lost context | Return `Effect` with typed errors |
| Lost context in callbacks | Missing services/scope | Preserve runtime: `yield* Effect.runtime()` |
| Business logic in infrastructure | Wrong layer responsibility | Infrastructure = capability, Feature = policy |
| Multiple layer instances | Memory leaks, inconsistency | Single `Live` layer (Effect auto-memoizes) |

---

## Generator Templates & Migration

### Generator Template Structure

Templates use EJS syntax with Nx generators:

**Variable Naming:**

- `<%= name %>` - Service name (e.g., "cache")
- `<%= className %>` - PascalCase (e.g., "CacheService")
- `<%= propertyName %>` - camelCase (e.g., "cacheService")
- `<%= projectRoot %>` - Project path (e.g., "libs/infra/cache")

**Example Template:**

```typescript
// libs/infra/__name__/src/lib/service/interface.ts__tmpl__
import { Context, Effect } from 'effect';
import type { <%= className %>Error } from './errors';

export class <%= className %> extends Context.Tag("<%= className %>")<
  <%= className %>,
  {
    readonly doSomething: () => Effect.Effect<void, <%= className %>Error>;
    readonly cleanup: () => Effect.Effect<void>;
    readonly healthCheck: () => Effect.Effect<boolean, <%= className %>Error>;
  }
>() {}
```

### Template Extension Handling

Generator uses double underscore (`__tmpl__`) for template extensions:

```
interface.ts__tmpl__  → interface.ts (after generation)
service.ts__tmpl__    → service.ts (after generation)
```

**Why:** Prevents TypeScript from trying to compile template files.

### Migrating Existing Infrastructure

**Step 1: Audit Current Implementation**

```bash
# Check current structure
ls -la libs/infra/my-service/src/

# Identify missing patterns:
# - Context.Tag usage
# - Layer.scoped for resources
# - Error translation
# - Configuration with Effect Config
```

**Step 2: Generate New Structure**

```bash
# Generate new structure in temporary location
pnpm exec nx g @workspace:infra my-service-new

# Compare structures
diff -r libs/infra/my-service libs/infra/my-service-new
```

**Step 3: Migrate Code**

1. Copy service logic to new structure
2. Update to use Context.Tag
3. Add Layer.scoped with finalizers
4. Translate errors at boundaries
5. Add Effect Config for environment variables

**Step 4: Update Tests**

```typescript
// Old: Manual mocking
const mockService = { doSomething: vi.fn() };

// New: Effect test layer
const ServiceTest = Layer.succeed(Service, {
  doSomething: () => Effect.succeed(result),
});
```

**Step 5: Update Imports**

```typescript
// Update all imports to new structure
import { MyService } from "@creativetoolkits/infra-my-service/server";

// Update layer composition
export const AppLayerLive = Layer.mergeAll(
  MyServiceLive, // New layer
  // ... other layers
);
```

### Common Migration Patterns

**Pattern 1: Class-Based Service → Context.Tag**

```typescript
// Before (class-based)
export class CacheService {
  constructor(private redis: Redis) {}

  async get(key: string) {
    return this.redis.get(key);
  }
}

// After (Context.Tag)
export class CacheService extends Context.Tag("CacheService")<
  CacheService,
  CacheServiceInterface
>() {}

const makeCacheService = Effect.gen(function*() {
  const redis = yield* RedisService;

  const get = (key: string) => Effect.tryPromise(() => redis.get(key));

  return { get };
});
```

**Pattern 2: Manual Cleanup → Layer.scoped**

```typescript
// Before (manual cleanup)
export async function createService() {
  const connection = await connect();
  return {
    doSomething: () => connection.query(),
    cleanup: () => connection.close(),
  };
}

// After (Layer.scoped)
export const ServiceLive = Layer.scoped(
  Service,
  Effect.gen(function*() {
    const connection = yield* Effect.tryPromise(() => connect());

    yield* Effect.addFinalizer(() => Effect.promise(() => connection.close()));

    return {
      doSomething: () => Effect.promise(() => connection.query()),
    };
  }),
);
```

**Pattern 3: Environment Variables → Effect Config**

```typescript
// Before (process.env)
const apiKey = process.env.API_KEY!;
const timeout = parseInt(process.env.TIMEOUT || "5000");

// After (Effect Config)
const ConfigLive = Layer.effect(
  Config,
  Effect.gen(function*() {
    const apiKey = yield* Config.secret("API_KEY");
    const timeout = yield* Config.number("TIMEOUT").pipe(
      Config.withDefault(5000),
    );

    return {
      apiKey: Secret.value(apiKey),
      timeout,
    };
  }),
);
```

---

## Cross-References & Sources

### Related Documentation

- **Providers:** `/prisma/schema/providers.md` - External service adapters
- **Contracts:** `/prisma/schema/contracts.md` - Domain interfaces and ports
- **Data-Access:** `/prisma/schema/DATA-ACCESS.md` - Repository implementations
- **Architecture:** `/libs/ARCHITECTURE.md` - Overall architecture patterns
- **CLAUDE.md:** `/CLAUDE.md` - Development workflow and commands

### Nx Documentation

- **Nx Workspace:** https://nx.dev/concepts/more-concepts/applications-and-libraries
- **Module Boundaries:** https://nx.dev/core-features/enforce-project-boundaries
- **Nx Generators:** https://nx.dev/extending-nx/recipes/local-generators

### Effect.ts Documentation

- **Effect Docs:** https://effect.website/docs/introduction
- **Context:** https://effect.website/docs/context-management/context
- **Layers:** https://effect.website/docs/context-management/layers
- **Resource Management:** https://effect.website/docs/resource-management/scope
- **Config:** https://effect.website/docs/configuration/config
- **Runtime:** https://effect.website/docs/runtime

### Architecture Patterns

- **Clean Architecture (Robert Martin):** https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
- **Hexagonal Architecture (Alistair Cockburn):** https://alistair.cockburn.us/hexagonal-architecture/
- **Service-Oriented Architecture:** https://martinfowler.com/articles/microservices.html
- **Effect Best Practices:** https://effect.website/docs/guides/best-practices

### Generator Implementation

- **Workspace Plugin:** `/tools/workspace-plugin/src/generators/infra/`
- **Schema:** `/tools/workspace-plugin/src/generators/infra/schema.json`
- **Templates:** `/tools/workspace-plugin/src/generators/infra/files/`

### Example Implementations

- **Cache:** `/libs/infra/cache/` - Redis caching with cache-aside pattern
- **Database:** `/libs/infra/database/` - Kysely orchestration with transactions
- **Storage:** `/libs/infra/storage/` - Supabase storage with React hooks
- **Logging:** `/libs/infra/logging/` - Multi-platform structured logging
- **Telemetry:** `/libs/infra/telemetry/` - OpenTelemetry spans and traces

### Key Insights from Research

1. **Context.Tag is the Modern Pattern** (Effect 2.3+)
   - Replaces older `Tag()` function
   - Provides both type and runtime value
   - Zero runtime overhead

2. **Layer Memoization Ensures Singletons**
   - Effect automatically memoizes layers
   - No manual singleton management needed
   - Shared across all dependent services

3. **Runtime Preservation is Critical**
   - Callbacks lose Effect context
   - Must capture runtime before callback
   - Essential for transactions, WebSocket, events

4. **Configuration via Effect Config**
   - Type-safe environment variable loading
   - Built-in validation and defaults
   - Secret handling for sensitive values

5. **Health Checks are Standard**
   - Consistent interface across all infrastructure
   - Never fails (returns status, not error)
   - Enables monitoring and alerting

---

**Document Version:** 1.0
**Last Updated:** 2025-01-16
**Generated By:** Claude Code (Docs Architect Agent)
**Reviewed By:** Effect Architecture Specialist, Nx Architecture Pro
