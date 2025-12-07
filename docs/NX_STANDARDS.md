# Nx Standards and Naming Conventions

> **📚 Related Documentation:**
>
> - [Architecture Overview](./ARCHITECTURE_OVERVIEW.md) - Library inventory and integration patterns
> - [Effect Patterns Guide](./EFFECT_PATTERNS.md) - Effect.ts patterns and best practices
> - [Contract Libraries](./CONTRACT.md) - Domain interfaces and ports
> - [Data-Access Libraries](./DATA-ACCESS.md) - Repository implementations
> - [Feature Libraries](./FEATURE.md) - Business logic and services
> - [Infrastructure Libraries](./INFRA.md) - Cross-cutting concerns
> - [Provider Libraries](./PROVIDER.md) - External service adapters

## Overview

This document defines the official naming conventions and standards for the Nx monorepo. These patterns follow **official Nx best practices** using:

- **pnpm workspaces** for project linking (NOT TypeScript path aliases)
- **TypeScript project references** for incremental compilation
- **nx sync** for automatic reference management

**Architecture:** This is a **prescriptive** document defining best practices, not a description of current implementation.

## Library Naming Conventions

### Pattern: `{type}-{domain}`

The standard pattern places the library **type** before the **domain**.

**Import Alias Pattern**:

```
@samuelho-dev/{type}-{domain}
```

**Project Name Pattern**:

```
{type}-{domain}
```

**Note on Naming**:

- **Directory**: `libs/contract/` (singular) for contracts
- **Import Path**: `@samuelho-dev/contract-{domain}`
- **Project Name**: `contract-{domain}` in project.json

### Library Types and Prefixes

| Type               | Prefix         | Purpose                     | Pattern                             | Example               |
| ------------------ | -------------- | --------------------------- | ----------------------------------- | --------------------- |
| **Contracts**      | `contract-`    | Domain interfaces and ports | Repository Pattern (interfaces)     | `contract-product`    |
| **Data Access**    | `data-access-` | Repository implementations  | Repository Pattern (implementation) | `data-access-product` |
| **Feature**        | `feature-`     | Business logic and services | Service Pattern                     | `feature-payment`     |
| **Infrastructure** | `infra-`       | Cross-cutting concerns      | Service Pattern                     | `infra-logging`       |
| **Provider**       | `provider-`    | External service adapters   | Adapter Pattern                     | `provider-stripe`     |
| **UI**             | `ui-`          | React components            | Component Pattern                   | `ui-components`       |
| **Utility**        | `util-`        | Pure utility functions      | Function Pattern                    | `util-format`         |
| **Types**          | `types-`       | Shared type definitions     | Type Definitions                    | `types-database`      |

### Architectural Patterns by Library Type

#### Contracts Libraries

- **Pattern**: Repository interfaces with domain entities, events, and ports
- **Service Definition**: Interfaces only, no implementations
- **Example**: `ProductRepository` interface with methods like `findById`, `save`, `delete`

#### Data-Access Libraries

- **Pattern**: Repository implementations with Effect.ts services
- **Service Definition**: `Context.Tag` with inline interfaces implementing contract ports
- **Example**: `ProductRepositoryLive` implementing `ProductRepository` interface

#### Feature Libraries

- **Pattern**: Service-oriented architecture with business logic
- **Service Definition**: `Context.Tag` with inline interfaces for service operations
- **Example**: `PaymentService` with methods like `processPayment`, `refund`, `validateCard`

#### Infrastructure Libraries

- **Pattern**: Cross-cutting services for technical concerns
- **Service Definition**: `Context.Tag` with inline interfaces for infrastructure operations
- **Example**: `LoggingService` with methods like `log`, `error`, `debug`, `flush`

#### Provider Libraries

- **Pattern**: Adapter pattern wrapping external SDKs
- **Service Definition**: `Context.Tag` with inline interfaces adapting external APIs
- **Example**: `StripeService` wrapping Stripe SDK with Effect.ts error handling

### Examples

✅ **CORRECT Import Paths**:

```typescript
@samuelho-dev/contract-product
@samuelho-dev/data-access-user
@samuelho-dev/feature-auth
@samuelho-dev/infra-cache
@samuelho-dev/provider-stripe
@samuelho-dev/ui-buttons
@samuelho-dev/util-date
@samuelho-dev/types-database
```

✅ **CORRECT Project Names**:

```
contract-product
data-access-user
feature-auth
infra-cache
provider-stripe
ui-buttons
util-date
types-database
```

❌ **INCORRECT**:

```
@samuelho-dev/product-contract      # Wrong order (should be contract-product)
@samuelho-dev/user/data-access      # Missing hyphen in type
@samuelho-dev/auth                  # Missing type prefix
@libs/feature-auth                      # Wrong alias (should be @samuelho-dev)
@samuelho-dev/stripe-provider       # Wrong order (should be provider-stripe)
@samuelho-dev/database/types        # Wrong separator (should be types-database)
```

## Directory Structure

### Root Structure

```
samuelho-dev/
├── apps/
│   ├── web/              # Next.js application
│   └── api/              # Fastify API
├── libs/
│   ├── contract/         # Domain contracts (singular)
│   ├── data-access/      # Repository layer
│   ├── feature/          # Business logic
│   ├── infra/            # Infrastructure
│   ├── provider/         # External services
│   ├── types/            # Shared types
│   ├── ui/               # UI components
│   └── util/             # Utilities
└── tools/
    └── workspace-plugin/ # Nx generators
```

### Library Internal Structure

```
libs/{type}/{domain}/
├── src/
│   ├── index.ts         # Main exports
│   ├── client.ts        # Client exports (if needed)
│   ├── server.ts        # Server exports (if needed)
│   ├── edge.ts          # Edge exports (if needed)
│   └── lib/
│       ├── {feature}/   # Feature modules
│       └── {shared}/    # Shared code
├── package.json         # **REQUIRED** - Workspace package definition
├── project.json         # Nx configuration
├── tsconfig.json        # TypeScript config with references
├── tsconfig.lib.json    # Build config
├── tsconfig.spec.json   # Test config
├── vitest.config.ts     # Vitest config
└── README.md            # Documentation
```

**Required Files:**

- `package.json` - Defines workspace package name, exports, and dependencies
- `project.json` - Defines Nx targets and configuration
- `tsconfig.json` - Project root TypeScript config with references
- `tsconfig.lib.json` - Build configuration with output paths
- `tsconfig.spec.json` - Test configuration

## Package.json Configuration

Every library **MUST** have a `package.json` file that defines it as a workspace package. This enables pnpm workspace resolution and proper dependency management.

### Basic Structure

```json
{
  "name": "@samuelho-dev/{type}-{domain}",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.js",
  "types": "./src/index.d.ts",
  "exports": {
    ".": "./src/index.ts",
    "./package.json": "./package.json"
  },
  "dependencies": {
    "effect": "^3.17.13",
    "@samuelho-dev/types-database": "workspace:*",
    "@samuelho-dev/infra-cache": "workspace:*"
  }
}
```

### Exports Field

The `exports` field defines entry points for your library. This enables platform-specific imports:

```json
{
  "exports": {
    ".": "./src/index.ts", // Main entry
    "./client": "./src/client.ts", // Client platform (browser)
    "./server": "./src/server.ts", // Server platform (Node.js)
    "./edge": "./src/edge.ts", // Edge runtime (Cloudflare, Vercel)
    "./package.json": "./package.json" // Allow package.json imports
  }
}
```

**Usage:**

```typescript
// Import from main entry (universal)
import { ProductService } from '@samuelho-dev/feature-product';

// Import from client entry (browser-specific)
import { useProduct } from '@samuelho-dev/feature-product/client';

// Import from server entry (Node.js-specific)
import { ProductRepository } from '@samuelho-dev/feature-product/server';

// Import from edge entry (Edge runtime-specific)
import { createEdgeAuth } from '@samuelho-dev/feature-auth/edge';
```

### TypesVersions Field (Optional)

For TypeScript tooling support with subpath exports:

```json
{
  "typesVersions": {
    "*": {
      "client": ["./src/client.ts"],
      "server": ["./src/server.ts"],
      "edge": ["./src/edge.ts"]
    }
  }
}
```

### Workspace Dependencies

Use the `workspace:*` protocol for internal dependencies. This ensures proper dependency resolution within the workspace:

```json
{
  "dependencies": {
    "effect": "^3.17.13", // External npm package
    "@samuelho-dev/types-database": "workspace:*", // Workspace package
    "@samuelho-dev/infra-logging": "workspace:*" // Workspace package
  }
}
```

**Benefits:**

- Type-safe version resolution
- Ensures latest local version is always used
- pnpm validates workspace dependencies exist
- IDE auto-completion for workspace packages

## Module Boundaries

### Dependency Rules

Nx enforces strict module boundaries using tags:

```json
{
  "tags": ["type:feature", "scope:server", "domain:product"]
}
```

### Allowed Dependencies

| From            | Can Import From                                         |
| --------------- | ------------------------------------------------------- |
| **Apps**        | feature, ui, data-access, util, types, infra, provider  |
| **Feature**     | data-access, ui, util, types, infra, provider, contract |
| **Data-Access** | util, types, infra, provider, contract                  |
| **UI**          | util, types                                             |
| **Infra**       | util, types, provider, infra (cross-infra allowed)      |
| **Provider**    | util, types, infra                                      |
| **Contract**    | types, util, contract (cross-contract allowed)          |
| **Types**       | (no dependencies)                                       |
| **Util**        | types                                                   |

### Platform Tags

| Tag                  | Platform       | Usage                           |
| -------------------- | -------------- | ------------------------------- |
| `platform:node`      | Node.js server | Server-side only code           |
| `platform:browser`   | Web browser    | Client-side only code           |
| `platform:edge`      | Edge runtime   | Cloudflare Workers, Vercel Edge |
| `platform:universal` | All platforms  | Shared code                     |

## Import Paths

### Package Import Pattern

All libraries are workspace packages resolved via pnpm workspaces. Imports use the package name defined in each library's `package.json`:

```typescript
// ✅ CORRECT - Import workspace packages by name
import { ProductRepository } from '@samuelho-dev/contract-product';
import { DatabaseService } from '@samuelho-dev/infra-database';
import { Button } from '@samuelho-dev/ui-components';

// ❌ INCORRECT - No relative imports between libraries
import { ProductRepository } from '../../../contract/product';
import { DatabaseService } from '../../infra/database';
import { Button } from 'ui/components';
```

**How it works:**

- Each library has a `package.json` with a `name` field matching `@samuelho-dev/{type}-{domain}`
- pnpm workspaces resolve these packages using the workspace protocol
- No TypeScript path aliases are required
- Native Node.js module resolution is used

### Platform-Specific Imports

Libraries can provide platform-specific exports through separate entry points:

```typescript
// Client code (React hooks, browser-only)
import { useAuth } from '@samuelho-dev/feature-auth/client';

// Server code (Node.js, backend services)
import { AuthService } from '@samuelho-dev/feature-auth/server';

// Edge code (Cloudflare Workers, Vercel Edge)
import { verifyToken } from '@samuelho-dev/feature-auth/edge';
```

### Entry Point Structure

```
libs/feature/auth/
├── src/
│   ├── index.ts      # Universal exports (shared across platforms)
│   ├── client.ts     # Browser-specific exports
│   ├── server.ts     # Node.js-specific exports
│   ├── edge.ts       # Edge runtime exports
│   └── lib/
│       ├── client/   # Client-specific implementation
│       ├── server/   # Server-specific implementation
│       ├── edge/     # Edge-specific implementation
│       └── shared/   # Shared utilities
```

## Nx Project Configuration

### project.json Structure

```json
{
  "name": "feature-payment",
  "$schema": "../../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/feature/payment/src",
  "projectType": "library",
  "tags": [
    "type:feature",
    "scope:shared",
    "domain:payment",
    "platform:universal"
  ],
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/libs/feature/payment",
        "main": "libs/feature/payment/src/index.ts",
        "tsConfig": "libs/feature/payment/tsconfig.lib.json",
        "assets": ["libs/feature/payment/*.md"],
        "batch": true, // REQUIRED: Enables TypeScript project references and incremental compilation
        "additionalEntryPoints": [
          "libs/feature/payment/src/server.ts",
          "libs/feature/payment/src/client.ts"
        ]
      }
    },
    "test": {
      "executor": "@nx/vite:test",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "options": {
        "config": "libs/feature/payment/vitest.config.ts"
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint"
    }
  }
}
```

**Critical Configuration:**

- `batch: true` - Uses TypeScript project references for incremental compilation
- `additionalEntryPoints` - Defines platform-specific exports for client/server/edge
- Global default in `nx.json` ensures all projects use batch mode automatically

## Generator Usage

### Creating New Libraries

```bash
# Contract library
pnpm exec nx g @workspace:contract product \
  --domain=product \
  --includeRepository=true \
  --includeEvents=true

# Data-access library
pnpm exec nx g @workspace:data-access product \
  --domain=product \
  --includeTransactions=true

# Feature library
pnpm exec nx g @workspace:feature payment \
  --domain=payment \
  --platforms=server,client

# Infrastructure library
pnpm exec nx g @workspace:infra telemetry \
  --service=telemetry \
  --platforms=server,client,edge

# Provider library
pnpm exec nx g @workspace:provider openai \
  --service=openai \
  --includeRetry=true
```

## TypeScript Configuration

### Base Configuration

The root `tsconfig.base.json` should contain **ONLY** `compilerOptions` and **NO other properties**. The `paths` property **must NOT** be set when using pnpm workspaces.

```json
// tsconfig.base.json
{
  "compilerOptions": {
    // Required for TypeScript Project References
    "composite": true,
    "declaration": true,
    "declarationMap": true,

    // Standard compiler options
    "target": "es2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "module": "preserve",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true

    // DO NOT SET: paths (workspace packages handle imports)
    // DO NOT SET: rootDir (conflicts with project references)
  }
}
```

**Critical Requirements:**

- `composite: true` - Enables TypeScript project references (automatically enables `incremental: true`)
- `declaration: true` - Required when composite is true
- `declarationMap: true` - Enables IDE go-to-definition in IDEs
- **NO `paths` property** - Workspace packages handle module resolution
- **NO `rootDir` property** - Conflicts with project references

**Note:** `incremental: true` is optional when `composite: true` is set, as TypeScript automatically enables incremental compilation for composite projects. Explicitly setting it is not required but doesn't cause issues.

### Root TypeScript Configuration

The root `tsconfig.json` extends `tsconfig.base.json` and defines references to ALL projects in the repository. This enables IDE tooling to work correctly.

```json
// tsconfig.json (root)
{
  "extends": "./tsconfig.base.json",
  "files": [], // intentionally empty
  "references": [
    // AUTOMATICALLY UPDATED BY NX SYNC
    // All projects in the repository should be referenced
    { "path": "./apps/web" },
    { "path": "./apps/api" },
    { "path": "./libs/contract/product" },
    { "path": "./libs/data-access/product" },
    { "path": "./libs/feature/auth" },
    { "path": "./libs/infra/cache" },
    { "path": "./libs/provider/stripe" },
    { "path": "./libs/types/database" },
    { "path": "./libs/ui/components" },
    { "path": "./libs/util/functions" }
    // ... all other projects
  ]
}
```

**Note:** The `references` array is automatically maintained by:

1. Nx generators when creating new projects
2. `nx sync` command based on the project graph

### Library TypeScript Configuration

Each library has **THREE** TypeScript configuration files:

#### 1. Project Root (tsconfig.json)

Extends `tsconfig.base.json` and lists references to dependencies and build configs:

```json
// libs/{type}/{domain}/tsconfig.json
{
  "extends": "../../../tsconfig.base.json",
  "files": [], // intentionally empty
  "references": [
    // AUTOMATICALLY UPDATED BY NX SYNC
    // All project dependencies (projects this library imports from)
    { "path": "../../types/database" },
    { "path": "../../infra/cache" },

    // This project's build configurations
    { "path": "./tsconfig.lib.json" },
    { "path": "./tsconfig.spec.json" }
  ]
}
```

#### 2. Build Configuration (tsconfig.lib.json)

Handles compilation of production code with unique output directories:

```json
// libs/{type}/{domain}/tsconfig.lib.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,

    // Output MUST be local to the project and unique
    "outDir": "../../../dist/libs/{type}/{domain}",
    "tsBuildInfoFile": "../../../dist/libs/{type}/{domain}/tsconfig.lib.tsbuildinfo",

    "noEmit": false,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["vitest.config.ts", "src/**/*.spec.ts", "src/**/*.test.ts"],
  "references": [
    // AUTOMATICALLY UPDATED BY NX SYNC
    // References to tsconfig.lib.json files of dependencies
    { "path": "../../types/database/tsconfig.lib.json" }
  ]
}
```

**Critical Points:**

- `outDir` must be unique per tsconfig file (prevents cache conflicts)
- `tsBuildInfoFile` stores incremental compilation state
- References point to dependency's `tsconfig.lib.json` (not root tsconfig)

#### 3. Test Configuration (tsconfig.spec.json)

Handles test file compilation:

```json
// libs/{type}/{domain}/tsconfig.spec.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    // Output MUST be different from tsconfig.lib.json
    "outDir": "../../../dist/libs/{type}/{domain}/spec",
    "types": ["vitest", "node"]
  },
  "include": ["vitest.config.ts", "src/**/*.test.ts", "src/**/*.spec.ts"],
  "references": [
    // Reference to this project's lib config
    { "path": "./tsconfig.lib.json" }
  ]
}
```

**Note:** Test configs do NOT need to reference project dependencies directly.

## Nx Sync Workflow

Nx automatically maintains TypeScript project references using the `@nx/js:typescript-sync` generator. This ensures your TypeScript configuration stays in sync with the project graph.

### How It Works

1. **Nx Knows Your Dependencies** - Nx maintains a complete project graph from all imports
2. **Automatic Sync** - When running `build` or `typecheck`, Nx checks if references are up-to-date
3. **Prompt or Auto-Apply** - Based on `nx.json` configuration, either prompts or auto-updates references

### Configuration

Enable TypeScript sync in `nx.json`:

```json
// nx.json
{
  "sync": {
    "applyChanges": true // Auto-apply changes without prompting
  },
  "plugins": [
    {
      "plugin": "@nx/js/typescript",
      "options": {
        "sync": {
          "enabled": true // Enable TypeScript sync
        }
      }
    }
  ]
}
```

### Developer Workflow

#### When Adding a New Dependency

```bash
# 1. Add import to your code
import { UserService } from '@samuelho-dev/feature-user';

# 2. Add to package.json dependencies
{
  "dependencies": {
    "@samuelho-dev/feature-user": "workspace:*"
  }
}

# 3. Run build (nx sync runs automatically)
pnpm exec nx build my-library

# Output:
# NX The workspace is out of sync
# [@nx/js:typescript-sync]: Updating TypeScript project references...
# ✓ Updated libs/my-library/tsconfig.json
# ✓ Updated libs/my-library/tsconfig.lib.json
```

#### Manual Sync

You can manually sync TypeScript references at any time:

```bash
# Check what would be updated (dry-run)
pnpm exec nx sync --check

# Apply updates
pnpm exec nx sync
```

### CI/CD Integration

In CI, `nx sync` runs automatically and **FAILS the build** if references are out of sync:

```yaml
# .github/workflows/ci.yml
- name: Build affected projects
  run: pnpm exec nx affected --target=build
  # nx sync runs automatically and fails if workspace is out of sync
```

To disable sync in CI (not recommended):

```bash
pnpm exec nx build --skip-sync
```

### What Gets Updated

Nx sync automatically updates these files based on the project graph:

1. **Root tsconfig.json** - Adds/removes project references
2. **Project tsconfig.json** - Updates dependency references
3. **Project tsconfig.lib.json** - Updates build dependency references

**Important:** You should **NEVER manually edit the `references` arrays** - let Nx manage them automatically.

## Testing Standards

### Test File Naming

```
*.spec.ts   # Unit tests
*.test.ts   # Integration tests
*.e2e.ts    # End-to-end tests
```

### Test Structure

```typescript
import { describe, test, expect } from '@effect/vitest';
import { Effect, Layer } from 'effect';

describe('ServiceName', () => {
  // Test layer setup
  const TestLayer = Layer.mergeAll(
    TestDatabaseService,
    TestCacheService,
    ServiceLive,
  );

  test('should perform operation', () =>
    Effect.gen(function* () {
      const service = yield* Service;
      const result = yield* service.operation();

      expect(result).toEqual(expectedValue);
    }).pipe(Effect.provide(TestLayer), Effect.runPromise));
});
```

## Effect.ts Service Patterns

### Service Definition with Context.Tag

All services use `Context.Tag` with inline interfaces for dependency injection:

```typescript
// ✅ CORRECT: Context.Tag with inline interface
export class PaymentService extends Context.Tag('PaymentService')<
  PaymentService,
  {
    readonly processPayment: (
      amount: number,
    ) => Effect.Effect<PaymentResult, PaymentError>;
    readonly refund: (paymentId: string) => Effect.Effect<void, RefundError>;
    readonly validateCard: (
      card: CardDetails,
    ) => Effect.Effect<boolean, ValidationError>;
  }
>() {}

// ❌ INCORRECT: Separate interface
export interface PaymentServiceInterface {
  /* ... */
}
export class PaymentService extends Context.Tag('PaymentService')<
  PaymentService,
  PaymentServiceInterface
>() {}
```

### Layer Implementation Pattern

Services are implemented using static `Live` layers:

```typescript
export class PaymentServiceImpl extends PaymentService {
  static readonly Live = Layer.effect(
    PaymentService,
    Effect.gen(function* () {
      const stripe = yield* StripeService;
      const logger = yield* LoggingService;

      return {
        processPayment: (amount) =>
          Effect.gen(function* () {
            yield* logger.info(`Processing payment: ${amount}`);
            return yield* stripe.paymentIntents.create({ amount });
          }),
        // ... other methods
      };
    }),
  );
}
```

### Error Handling

Use `Data.TaggedError` for runtime errors:

```typescript
export class PaymentError extends Data.TaggedError('PaymentError')<{
  readonly reason: 'InvalidAmount' | 'CardDeclined' | 'NetworkError';
  readonly message: string;
  readonly cause?: unknown;
}> {}
```

### Test Patterns

Create test layers with factory functions for complete objects:

```typescript
// ✅ CORRECT: Factory function with complete object
const createMockPayment = (): PaymentResult => ({
  id: 'test_payment_123',
  amount: 1000,
  currency: 'usd',
  status: 'succeeded',
  created: Date.now(),
  // ... all required fields
});

// ❌ INCORRECT: Type assertions
const mockPayment = { id: 'test' } as PaymentResult; // NEVER do this
```

## Build and CI/CD

### Build Commands

```bash
# Build single library (batch mode automatic via nx.json)
pnpm exec nx build feature-payment

# Build with dependencies
pnpm exec nx build feature-payment --with-deps

# Build affected projects
pnpm exec nx affected:build

# Build all projects
pnpm exec nx run-many --target=build --all

# Verify incremental builds work correctly
pnpm exec nx build feature-payment
```

### TypeScript Performance Benefits

Using TypeScript project references with `batch: true` provides significant performance improvements:

**Compilation Performance:**

- **First Build (Clean):** Individual project compilation with reduced memory usage

  - Generates `.tsbuildinfo` files for each project
  - Memory usage: ~429 MB (vs 6.14 GB without batch mode)

- **Incremental Builds:** Only recompiles changed projects

  - Reuses `.tsbuildinfo` files from unchanged dependencies
  - **7x faster:** ~25 seconds (vs 175 seconds without incremental)

- **Affected Builds (Typical PR):**
  - 1 project updated: ~36 seconds
  - 25 projects updated: ~65 seconds
  - 100 projects updated: ~80 seconds

**Why It's Fast:**

1. TypeScript only recompiles projects that actually changed
2. Dependencies use cached `.tsbuildinfo` files
3. Project references eliminate re-parsing unchanged code
4. Batch mode handles multiple projects efficiently

**Benchmark source:** [jaysoo/typecheck-timings](https://github.com/jaysoo/typecheck-timings)

### CI/CD Pipeline

```yaml
- name: Build affected
  run: pnpm exec nx affected:build --base=origin/main

- name: Test affected
  run: pnpm exec nx affected:test --base=origin/main

- name: Lint affected
  run: pnpm exec nx affected:lint --base=origin/main
```

## Module Boundary Visualization

### Dependency Flow Diagram

```
┌──────────┐
│   Apps   │ ─────┐
└──────────┘      │
                  ▼
┌──────────┐  ┌────────────┐  ┌──────────┐
│ Feature  │──►│Data-Access │  │    UI    │
└──────────┘  └────────────┘  └──────────┘
      │              │               │
      ▼              ▼               ▼
┌──────────┐  ┌────────────┐  ┌──────────┐
│   Infra  │  │ Contracts  │  │   Util   │
└──────────┘  └────────────┘  └──────────┘
      │              │               │
      ▼              ▼               ▼
┌──────────┐  ┌────────────┐  ┌──────────┐
│ Provider │  │   Types    │  │  (none)  │
└──────────┘  └────────────┘  └──────────┘
```

### Module Boundary Enforcement

Nx enforces these boundaries through `nx.json` configuration:

```json
{
  "targetDefaults": {
    "@nx/enforce-module-boundaries": {
      "sourceTag": "type:feature",
      "onlyDependOnProjectsWithTags": [
        "type:data-access",
        "type:ui",
        "type:util",
        "type:types",
        "type:infra",
        "type:provider",
        "type:contract"
      ]
    }
  }
}
```

### Common Module Boundary Violations

❌ **Feature → Feature** (Direct)

```typescript
// In libs/feature/payment
import { UserService } from '@samuelho-dev/feature-user'; // ❌ WRONG
```

✅ **Feature → Feature** (Through shared contract)

```typescript
// In libs/feature/payment
import { UserRepository } from '@samuelho-dev/contract-user'; // ✅ CORRECT
```

❌ **Data-Access → Feature**

```typescript
// In libs/data-access/product
import { PaymentService } from '@samuelho-dev/feature-payment'; // ❌ WRONG
```

✅ **Feature → Data-Access**

```typescript
// In libs/feature/payment
import { ProductRepository } from '@samuelho-dev/data-access-product'; // ✅ CORRECT
```

## Migration from Path Aliases to Workspaces

If you have an existing Nx workspace using TypeScript path aliases, follow these steps to migrate to pnpm workspaces with TypeScript project references. This provides better performance, IDE support, and follows official Nx best practices.

### Step 1: Update tsconfig.base.json

Remove all `paths` property entries and enable project references:

```bash
# Before
{
  "compilerOptions": {
    "composite": false,
    "declaration": false,
    "paths": {
      "@samuelho-dev/contract-product": ["libs/contract/product/src/index.ts"]
    }
  }
}

# After
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true
    // NO paths property
  }
}
```

### Step 2: Update Root tsconfig.json

Create or update root `tsconfig.json` with project references:

```json
{
  "extends": "./tsconfig.base.json",
  "files": [],
  "references": [
    // Add all projects - run 'nx sync' to auto-populate
  ]
}
```

### Step 3: Add package.json to Each Library

For each library in `libs/`, create a `package.json`:

```bash
# For each library in libs/{type}/{domain}/
cat > package.json << 'EOF'
{
  "name": "@samuelho-dev/{type}-{domain}",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.js",
  "types": "./src/index.d.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
EOF
```

### Step 4: Update Project tsconfig.json Files

For each library, update to use project references:

```json
// libs/{type}/{domain}/tsconfig.json
{
  "extends": "../../../tsconfig.base.json",
  "files": [],
  "references": [
    { "path": "./tsconfig.lib.json" },
    { "path": "./tsconfig.spec.json" }
  ]
}
```

### Step 5: Update tsconfig.lib.json Files

Update all `tsconfig.lib.json` files to include `outDir` and proper configuration:

```json
// libs/{type}/{domain}/tsconfig.lib.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "../../../dist/libs/{type}/{domain}",
    "tsBuildInfoFile": "../../../dist/libs/{type}/{domain}/tsconfig.lib.tsbuildinfo"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.spec.ts", "src/**/*.test.ts"],
  "references": []
}
```

### Step 6: Run Nx Sync

Nx will automatically populate all TypeScript references based on the project graph:

```bash
# Auto-populate all TypeScript references
pnpm exec nx sync

# Verify references are correct (dry-run)
pnpm exec nx sync --check
```

### Step 7: Update Workspace Dependencies

For each library, add workspace dependencies to `package.json`:

```bash
# Install dependencies using workspace protocol
pnpm add @samuelho-dev/types-database@workspace:* --filter @samuelho-dev/feature-auth
```

### Step 8: Verify Build

Clean and rebuild to verify everything works:

```bash
# Clean previous builds
rm -rf dist

# Build all projects
pnpm exec nx run-many --target=build --all

# Verify incremental builds work
pnpm exec nx build feature-auth
```

### Common Migration Issues

| Issue                                    | Fix                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------ |
| "Cannot find module '@samuelho-dev/...'" | Add package.json with correct name to library                                        |
| "Project references are out of sync"     | Run `pnpm exec nx sync`                                                              |
| "Incremental builds not working"         | Verify `composite: true` in tsconfig.base.json and `batch: true` in executor         |
| "IDE not finding types"                  | Ensure root tsconfig.json has all project references and TypeScript server restarted |
| "Cannot find type definitions"           | Add `declaration: true` to tsconfig.base.json and `types` to tsconfig.lib.json       |

## Migration Guidelines

### From Legacy Naming

```bash
# Old pattern: domain-type
@samuelho-dev/product-contract

# New pattern: type-domain
@samuelho-dev/contract-product
```

### Migration Steps

1. **Update library name** in project.json
2. **Update import paths** in tsconfig.base.json
3. **Update all imports** in consuming code
4. **Update directory structure** if needed
5. **Run tests** to verify migration

## Best Practices

### DO's

✅ **DO** follow the `type-domain` naming pattern consistently
✅ **DO** use workspace aliases for all imports
✅ **DO** tag libraries with appropriate type, scope, and platform tags
✅ **DO** separate platform-specific code into different entry points
✅ **DO** document each library with a README.md
✅ **DO** use Effect.ts patterns for all async operations
✅ **DO** provide test layers for all services

### DON'Ts

❌ **DON'T** use relative imports between libraries
❌ **DON'T** mix platform code in the same file
❌ **DON'T** create circular dependencies
❌ **DON'T** export server code from client entry points
❌ **DON'T** skip type prefixes in library names
❌ **DON'T** violate module boundary rules

## References

### Nx Documentation

- [Nx Library Types](https://nx.dev/concepts/more-concepts/library-types) - Categorizing and structuring libraries
- [Nx Module Boundaries](https://nx.dev/features/enforce-module-boundaries) - Enforcing project dependencies
- [Nx Naming Conventions](https://nx.dev/concepts/decisions/project-dependency-rules) - Best practices for naming projects
- [TypeScript Project Linking in Nx](https://nx.dev/concepts/typescript-project-linking) - Using project references with Nx
- [Switch to Workspaces and Project References](https://nx.dev/technologies/typescript/guides/switch-to-workspaces-project-references) - Migration guide from path aliases
- [TypeScript Project References Performance Benefits](https://nx.dev/concepts/typescript-project-linking#typescript-project-references-performance-benefits) - Performance improvements
- [Nx Sync Generators](https://nx.dev/concepts/sync-generators) - Automatic TypeScript reference management

### TypeScript Documentation

- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html) - Official TypeScript docs

### Additional Resources

- [Effect.ts Documentation](https://effect.website) - Effect functional programming library
- [TypeScript Compilation Performance](https://github.com/jaysoo/typecheck-timings) - Performance benchmarks
