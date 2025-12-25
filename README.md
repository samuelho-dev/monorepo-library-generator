# @samuelho-dev/monorepo-library-generator

> **Effect-based monorepo library generator with workspace-agnostic architecture**

Generate production-ready TypeScript libraries for Effect-native monorepos with a single command. Supports 5 library types following Effect 3.0+ best practices and works with **any monorepo tool** (Nx, pnpm, Yarn, Turborepo).

## ✨ Key Features

- 🚀 **5 Library Types**: Contract, Data-Access, Feature, Infrastructure, Provider
- 🎯 **Effect 3.0+**: Context.Tag, Layer.scoped, Data.TaggedError, Schema.Class
- 📦 **Workspace Agnostic**: Works with Nx, pnpm workspaces, Yarn, Turborepo
- 🌍 **Platform Aware**: Generate server/client/edge exports automatically
- 🔧 **TypeScript 5.6+**: Strict mode, project references, composite builds
- ✨ **Type-Safe**: Zero type assertions - demonstrates TypeScript's type inference capabilities
- 🧪 **Testing Ready**: Vitest + @effect/vitest integration
- 🛡️ **Resource Safe**: Layer.scoped pattern prevents resource leaks
- 📚 **Self-Documenting**: Comprehensive inline docs and CLAUDE.md files
- 🏗️ **Best Practices**: Follows Effect-TS patterns and modern monorepo conventions
- 🌳 **Bundle Optimized**: 45-99% size reduction with granular exports, type-only imports, and tree-shaking

## 📦 Installation

### As Standalone CLI

```bash
# Run directly with npx (no installation required)
npx @samuelho-dev/monorepo-library-generator contract product

# Or install globally
npm install -g @samuelho-dev/monorepo-library-generator
mlg contract product
```

### As Nx Generator (in Nx workspace)

```bash
# Install as dev dependency
npm install -D @samuelho-dev/monorepo-library-generator

# Use with nx generate
npx nx g @samuelho-dev/monorepo-library-generator:contract product
```

## 🚀 Quick Start

### Generate a Contract Library

```bash
# Generate with multiple entities (bundle-optimized)
mlg contract product --entities Product,ProductCategory,ProductReview

# Or generate with CQRS and RPC patterns
mlg contract product --includeCQRS --includeRPC
```

**Creates:**
- Domain entities with Effect Schema (separate files for tree-shaking)
- Repository interfaces (ports) with Context.Tag
- Domain errors with Data.TaggedError
- Domain events
- Type-only exports for zero-bundle-impact imports
- Optional: CQRS commands/queries
- Optional: RPC endpoint definitions

**Bundle Optimization:**
Contract libraries use separate entity files with granular package.json exports:
- `import { Product } from '@repo/contract-product/entities/product'` - Tree-shakeable
- `import type { Product } from '@repo/contract-product/types'` - Zero runtime overhead
- `import { Product } from '@repo/contract-product'` - Convenience (all entities)

**Purpose:** Define domain boundaries and interfaces (dependency inversion)

---

### Generate a Data-Access Library

```bash
mlg data-access product
```

**Creates:**
- Repository implementation (fulfills contract ports)
- Kysely query builders
- Data transformations and validation
- Layer compositions (Live, Test, Dev, Auto)
- Comprehensive tests with @effect/vitest

**Purpose:** Database operations and persistence layer

---

### Generate a Feature Library

```bash
mlg feature user-management --platform universal --includeRPC
```

**Creates:**
- Business logic service with Context.Tag
- Server-side service implementation
- Client-side React hooks (if platform includes client)
- Edge runtime middleware (if platform includes edge)
- Layer compositions with dependency injection
- Optional: RPC router definitions

**Purpose:** Application features and business logic orchestration

---

### Generate an Infrastructure Library

```bash
mlg infra cache --platform node
```

**Creates:**
- Service interface with Context.Tag
- Multiple provider implementations (Memory, Redis, etc.)
- Type-safe configuration with Effect Config
- Server/client/edge layers (platform-dependent)
- Error types and validation

**Purpose:** Cross-cutting technical services (caching, logging, storage)

---

### Generate a Provider Library

```bash
mlg provider stripe --externalService stripe --platform node
```

**Creates:**
- Effect-based service wrapper with Context.Tag
- Safe error mapping from SDK errors
- Layer implementations (Live, Test, Dev, Auto) with proper cleanup
- Type-safe request/response types
- Platform-specific exports (server/client/edge)

**Purpose:** External service integration with consistent Effect interfaces

---

## 📚 Library Types & Patterns

### 1. Contract Libraries (`contract-*`)

**Purpose:** Domain boundaries through interfaces and types

**Key Patterns:**
- ✅ Interface-before-implementation (dependency inversion)
- ✅ Effect Schema for entities
- ✅ Data.TaggedError for domain errors
- ✅ Context.Tag for repository interfaces
- ✅ Platform-agnostic (universal exports only)

**Generated Structure:**
```
libs/contract/{domain}/
├── src/
│   ├── index.ts              # Universal exports
│   └── lib/
│       ├── entities.ts       # Schema.Class entities
│       ├── errors.ts         # Data.TaggedError types
│       ├── events.ts         # Domain events
│       ├── ports.ts          # Repository interfaces (Context.Tag)
│       ├── commands.ts       # CQRS commands (optional)
│       ├── queries.ts        # CQRS queries (optional)
│       └── rpc.ts            # RPC definitions (optional)
├── package.json
├── tsconfig.json
├── tsconfig.lib.json
├── tsconfig.spec.json
├── README.md
└── CLAUDE.md                 # AI agent reference
```

**Dependencies:** None (pure domain)

**Used By:** data-access, feature

**Learn More:** [docs/CONTRACT.md](./docs/CONTRACT.md)

---

### 2. Data-Access Libraries (`data-access-*`)

**Purpose:** Repository pattern implementation with database operations

**Key Patterns:**
- ✅ Implements contract repository interfaces
- ✅ Kysely query builders for type-safe SQL
- ✅ Layer.scoped for connection management
- ✅ Effect.acquireRelease for transaction handling
- ✅ Repository errors with Data.TaggedError

**Generated Structure:**
```
libs/data-access/{domain}/
├── src/
│   ├── index.ts              # Universal exports
│   └── lib/
│       ├── shared/
│       │   ├── errors.ts     # Repository errors
│       │   ├── types.ts      # Filter types, pagination
│       │   └── validation.ts # Input validation
│       ├── repository.ts     # Repository implementation
│       ├── queries.ts        # Kysely query builders
│       └── server/
│           └── layers.ts     # Layer compositions
├── package.json
└── ...
```

**Dependencies:**
- `contract-{domain}` (implements interfaces)
- `infra-database` (database service)
- `provider-kysely` (query builder)

**Used By:** feature

**Learn More:** [docs/DATA-ACCESS.md](./docs/DATA-ACCESS.md)

---

### 3. Feature Libraries (`feature-*`)

**Purpose:** Business logic and application feature orchestration

**Key Patterns:**
- ✅ Service pattern with Context.Tag
- ✅ Layer composition for dependency injection
- ✅ Platform-aware exports (server/client/edge)
- ✅ React hooks for client-side integration
- ✅ Edge middleware for CDN edge runtime

**Generated Structure:**
```
libs/feature/{name}/
├── src/
│   ├── index.ts              # Universal exports
│   ├── server.ts             # Server-side exports (Node.js)
│   ├── client.ts             # Client-side exports (browser)
│   ├── edge.ts               # Edge runtime exports (Vercel/Cloudflare)
│   └── lib/
│       ├── shared/
│       │   ├── errors.ts     # Feature errors
│       │   ├── types.ts      # Shared types
│       │   └── schemas.ts    # Validation schemas
│       ├── server/
│       │   ├── service.ts    # Business logic (Context.Tag)
│       │   ├── layers.ts     # Layer compositions
│       │   └── service.spec.ts
│       ├── client/           # React integration (if platform includes browser)
│       │   ├── hooks/
│       │   ├── atoms/        # Jotai state
│       │   └── components/
│       ├── rpc/              # RPC endpoints (optional)
│       │   ├── rpc.ts
│       │   └── handlers.ts
│       └── edge/             # Edge middleware (if platform includes edge)
│           └── middleware.ts
├── package.json
└── ...
```

**Dependencies:**
- `data-access-{domain}` (repositories)
- `contract-{domain}` (domain types)
- `infra-*` (logging, caching, etc.)
- `provider-*` (external services)

**Used By:** apps (web, api, edge functions)

**Learn More:** [docs/FEATURE.md](./docs/FEATURE.md)

---

### 4. Infrastructure Libraries (`infra-*`)

**Purpose:** Cross-cutting technical services and resource management

**Key Patterns:**
- ✅ Service interface with Context.Tag
- ✅ Multiple provider implementations
- ✅ Layer.scoped for resource cleanup
- ✅ Effect Config for type-safe configuration
- ✅ Platform-specific layers (server/client/edge)

**Generated Structure:**
```
libs/infra/{concern}/
├── src/
│   ├── index.ts              # Universal exports
│   ├── server.ts             # Server-side exports
│   ├── client.ts             # Client-side exports (if applicable)
│   ├── edge.ts               # Edge exports (if applicable)
│   └── lib/
│       ├── service/
│       │   ├── interface.ts  # Service interface (Context.Tag)
│       │   ├── errors.ts     # Service errors
│       │   └── config.ts     # Effect Config
│       ├── providers/
│       │   ├── memory.ts     # In-memory implementation
│       │   ├── redis.ts      # Redis implementation (example)
│       │   └── ...
│       └── layers/
│           ├── server-layers.ts
│           ├── client-layers.ts
│           └── edge-layers.ts
├── package.json
└── ...
```

**Common Examples:**
- `infra-database` - Database connection management
- `infra-cache` - Caching (Redis, Memory)
- `infra-storage` - File storage (S3, Supabase)
- `infra-observability` - Structured logging
- `infra-queue` - Job queues

**Dependencies:** `provider-*` (external service adapters)

**Used By:** data-access, feature, apps

**Learn More:** [docs/INFRA.md](./docs/INFRA.md)

---

### 5. Provider Libraries (`provider-*`)

**Purpose:** Wrap external SDKs with consistent Effect interfaces

**Key Patterns:**
- ✅ Effect-based service wrapper (Context.Tag)
- ✅ Safe error mapping from SDK errors to Effect errors
- ✅ Layer.scoped with Effect.addFinalizer for cleanup
- ✅ Mock factories for testing
- ✅ Platform-specific exports

**Generated Structure:**
```
libs/provider/{service}/
├── src/
│   ├── index.ts              # Universal exports
│   ├── server.ts             # Server-side exports
│   ├── client.ts             # Client-side exports (if applicable)
│   ├── edge.ts               # Edge exports (if applicable)
│   └── lib/
│       ├── service.ts        # Service implementation (Context.Tag)
│       ├── errors.ts         # Mapped SDK errors
│       ├── types.ts          # Request/response types
│       ├── validation.ts     # Input validation
│       ├── layers.ts         # Layer.scoped implementations
│       └── service.spec.ts
├── package.json
└── ...
```

**Common Examples:**
- `provider-stripe` - Stripe payments API
- `provider-supabase` - Supabase client
- `provider-kysely` - Kysely query builder
- `provider-redis` - Redis client
- `provider-sentry` - Sentry error tracking

**Dependencies:** External SDKs (stripe, @supabase/supabase-js, etc.)

**Used By:** infra, feature

**Learn More:** [docs/PROVIDER.md](./docs/PROVIDER.md)

---

## 🎯 Key Patterns & Best Practices

### Effect 3.0+ Patterns

#### Context.Tag for Dependency Injection
```typescript
// Service definition
export class UserService extends Context.Tag("UserService")<
  UserService,
  {
    readonly findById: (id: string) => Effect.Effect<User, UserNotFoundError>
    readonly create: (data: CreateUserData) => Effect.Effect<User, ValidationError>
  }
>() {}

// Usage
const program = Effect.gen(function*() {
  const userService = yield* UserService
  const user = yield* userService.findById("123")
  return user
})
```

#### Layer.scoped for Resource Management
```typescript
// ✅ CORRECT: Layer.scoped with cleanup
export const RedisServiceLive = Layer.scoped(
  RedisService,
  Effect.gen(function*() {
    const client = yield* Effect.sync(() => createRedisClient(config))

    // Register cleanup function
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        client.disconnect()
        console.log("[Redis] Connection closed")
      })
    )

    return RedisService.make(client)
  })
)

// ❌ WRONG: Layer.sync without cleanup (causes resource leaks)
export const RedisServiceWrong = Layer.sync(RedisService, () => {
  const client = createRedisClient(config)
  return RedisService.make(client)
  // Client never disconnected! Memory leak!
})
```

#### Data.TaggedError for Type-Safe Errors
```typescript
export class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly message: string
  readonly userId: string
}> {
  static create(userId: string) {
    return new UserNotFoundError({
      message: `User not found: ${userId}`,
      userId
    })
  }
}
```

### Platform-Aware Exports

The generator creates platform-specific export files based on your platform setting:

```typescript
// Universal libraries (contract, util)
import { User } from '@myorg/contract-user'

// Node.js/Server-side (feature, infra, provider with platform: node)
import { UserService } from '@myorg/feature-user/server'
import { DatabaseService } from '@myorg/infra-database/server'
import { StripeService } from '@myorg/provider-stripe/server'

// Browser/Client-side (feature with platform: universal)
import { useUser } from '@myorg/feature-user/client'
import { userAtoms } from '@myorg/feature-user/client'

// Edge Runtime (feature with platform: edge)
import { authMiddleware } from '@myorg/feature-auth/edge'
```

### Workspace-Agnostic Architecture

The generator works with any monorepo tool:

- **Nx Workspaces**: Full integration with project graph and references
- **pnpm Workspaces**: Uses workspace protocol and package.json exports
- **Yarn Workspaces**: Compatible with Yarn workspace patterns
- **Turborepo**: Works with Turborepo's task orchestration

The generator **automatically detects** your workspace type and adapts:
- Extracts package scope from root `package.json`
- Computes TypeScript project references (with graceful fallback for non-Nx)
- Uses pnpm workspace protocol for dependencies

---

## 🔧 CLI Options

### Contract Generator
```bash
mlg contract <name> [options]

Options:
  --description <desc>    Library description
  --includeCQRS          Include CQRS patterns (commands, queries, projections)
  --includeRPC           Include RPC endpoint definitions
  --directory <dir>      Custom parent directory
  --tags <tags>          Comma-separated tags
```

### Data-Access Generator
```bash
mlg data-access <name> [options]

Options:
  --description <desc>    Library description
  --directory <dir>      Custom parent directory
  --tags <tags>          Comma-separated tags
```

### Feature Generator
```bash
mlg feature <name> [options]

Options:
  --description <desc>    Library description
  --platform <platform>   Platform target: node | browser | universal | edge
  --includeClientServer  Generate both client and server exports
  --includeRPC           Include RPC router
  --includeCQRS          Include CQRS structure
  --includeEdge          Include edge runtime support
  --directory <dir>      Custom parent directory
  --tags <tags>          Comma-separated tags
```

### Infrastructure Generator
```bash
mlg infra <name> [options]

Options:
  --description <desc>    Library description
  --platform <platform>   Platform target: node | browser | universal | edge
  --includeClientServer  Generate both client and server exports
  --includeEdge          Include edge runtime support
  --directory <dir>      Custom parent directory
  --tags <tags>          Comma-separated tags
```

### Provider Generator
```bash
mlg provider <name> --externalService <service> [options]

Options:
  --externalService <service>  External service name (required)
  --description <desc>         Library description
  --platform <platform>        Platform target: node | browser | universal | edge
  --includeClientServer       Generate both client and server exports
  --directory <dir>           Custom parent directory
  --tags <tags>               Comma-separated tags
```

---

## 📋 Requirements

- **Node.js** 18+ (20+ recommended)
- **TypeScript** 5.6+
- **Effect** 3.0+
- **Monorepo Tool**: Nx, pnpm workspaces, Yarn workspaces, or Turborepo

---

## 🏗️ Architecture Highlights

### Recent Improvements (v1.2.3+)

- ✅ **~700+ lines of duplication eliminated** through shared utilities
- ✅ **Layer.scoped pattern** prevents resource leaks in providers
- ✅ **Platform exports** (server/client/edge) for all library types
- ✅ **Workspace-agnostic** architecture supports any monorepo tool
- ✅ **Dynamic scope detection** from workspace root package.json
- ✅ **Unified wrapper pattern** across all 5 generators
- ✅ **Shared infrastructure generator** consolidates file generation
- ✅ **TypeScript project references** with graceful non-Nx fallback

### Generated Files

All libraries include:
- `package.json` with proper exports configuration
- `tsconfig.json` extending workspace base
- `tsconfig.lib.json` for library compilation (composite mode)
- `tsconfig.spec.json` for test compilation
- `README.md` with library-specific documentation
- `CLAUDE.md` for AI agent reference
- Comprehensive inline documentation

---

## 📖 Documentation

### Core Documentation
- **[Architecture Overview](./docs/ARCHITECTURE_OVERVIEW.md)** - System architecture and design
- **[Effect Patterns](./docs/EFFECT_PATTERNS.md)** - Effect-TS patterns and standardized layers
- **[Export Patterns](./docs/EXPORT_PATTERNS.md)** - Platform export conventions
- **[Contract Libraries](./docs/CONTRACT.md)** - Contract generator guide
- **[Examples](./docs/EXAMPLES.md)** - End-to-end examples

### Advanced Patterns
- **[Testing Patterns](./docs/TESTING_PATTERNS.md)** - @effect/vitest testing guide with TestClock
- **Effect Patterns - Stream & Caching** (in EFFECT_PATTERNS.md):
  - [Streaming & Queuing Patterns](./docs/EFFECT_PATTERNS.md#streaming--queuing-patterns) - Constant-memory processing for large datasets
  - [Built-in Caching Operators](./docs/EFFECT_PATTERNS.md#built-in-effect-caching-operators) - Effect.cached, cachedWithTTL, layered caching

### Bundle Optimization
- **[Implementation Summary](./IMPLEMENTATION_SUMMARY.md)** - Bundle optimization overview and usage
- **[Validation](./VALIDATION.md)** - Compliance validation and testing

### Implementation & Migration
- **[Implementation Complete](./IMPLEMENTATION_COMPLETE.md)** - Effect layer standardization summary
- **[Migration Guide](./MIGRATION_GUIDE.md)** - Upgrade guide for naming changes
- **[Layer Naming Standards](./docs/LAYER_NAMING_STANDARDS.md)** - Official naming conventions
- **[Data-Access Libraries](./docs/DATA-ACCESS.md)** - Data-access generator guide
- **[Feature Libraries](./docs/FEATURE.md)** - Feature generator guide
- **[Infrastructure Libraries](./docs/INFRA.md)** - Infrastructure generator guide
- **[Provider Libraries](./docs/PROVIDER.md)** - Provider generator guide
- **[Nx Standards](./docs/NX_STANDARDS.md)** - Workspace conventions

---

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
git clone https://github.com/samuelho-dev/monorepo-library-generator
cd monorepo-library-generator
pnpm install
pnpm test
```

---

## 📝 License

MIT © Samuel Ho

---

## 🔗 Links

- [Repository](https://github.com/samuelho-dev/monorepo-library-generator)
- [Issues](https://github.com/samuelho-dev/monorepo-library-generator/issues)
- [Changelog](./CHANGELOG.md)
- [Effect Documentation](https://effect.website)
- [Nx Documentation](https://nx.dev)

---

**Made with Effect** ⚡️ | **Workspace Agnostic** 🌍 | **Type Safe** 🛡️
