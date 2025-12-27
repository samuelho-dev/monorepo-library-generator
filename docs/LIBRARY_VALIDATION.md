# Library Architecture Validation Rules

> **Related Documentation:**
>
> - [Architecture Overview](./ARCHITECTURE_OVERVIEW.md) - Library inventory and integration patterns
> - [Contract Libraries](./CONTRACT.md) - Domain interfaces and ports
> - [Data-Access Libraries](./DATA-ACCESS.md) - Repository implementations
> - [Feature Libraries](./FEATURE.md) - Business logic and services
> - [Infrastructure Libraries](./INFRA.md) - Cross-cutting concerns
> - [Provider Libraries](./PROVIDER.md) - External service adapters
> - [Effect Patterns Guide](./EFFECT_PATTERNS.md) - Effect.ts patterns and best practices
> - [Export Patterns Guide](./EXPORT_PATTERNS.md) - Platform-aware exports and barrel patterns
> - [Nx Standards](./NX_STANDARDS.md) - Naming conventions and workspace organization

## Purpose

This document defines the validation requirements for all library types in the monorepo. It serves as:

1. **Source of Truth** - Canonical reference for library architecture compliance
2. **Validation Spec** - Foundation for the `/validate-library` command
3. **Developer Guide** - Self-check reference for developers creating/modifying libraries
4. **Audit Criteria** - Clear pass/fail criteria for architecture reviews

---

## Quick Reference Matrix

| Category | Contract | Data-Access | Feature | Infra | Provider |
|----------|----------|-------------|---------|-------|----------|
| **Required Files** | errors, ports, index | repository, queries, server | server/, shared/, server.ts | service, errors, index | service, errors, types, server |
| **Can Depend On** | types-db, util | contract, infra, provider | all except features | provider, util, infra | infra-observability only |
| **Platform Exports** | index.ts only | server.ts only | server, client?, edge? | index + optional platform | server + optional platform |
| **Error Type** | Data.TaggedError | (inherits contract) | (inherits contract) | Data.TaggedError | Data.TaggedError |
| **RPC Errors** | Schema.TaggedError | N/A | Schema.TaggedError | Schema.TaggedError | N/A |

---

## 1. File Structure Validation

### 1.1 Contract Libraries

**Path**: `libs/contract/{domain}/`

| Status | File/Directory | Purpose | Notes |
|--------|---------------|---------|-------|
| ✅ REQUIRED | `src/lib/errors.ts` | Domain errors | Data.TaggedError types |
| ✅ REQUIRED | `src/lib/ports.ts` | Repository interfaces | Context.Tag definitions |
| ✅ REQUIRED | `src/index.ts` | Public exports | Single universal export |
| ⚠️ OPTIONAL | `src/lib/events.ts` | Domain events | Schema.Class definitions |
| ⚠️ OPTIONAL | `src/lib/rpc.ts` | RPC definitions | Combined RPC file |
| ⚠️ OPTIONAL | `src/lib/rpc-definitions.ts` | RPC schemas | Separated RPC schemas |
| ⚠️ OPTIONAL | `src/lib/rpc-errors.ts` | RPC errors | Schema.TaggedError types |
| ⚠️ OPTIONAL | `src/lib/rpc-group.ts` | RPC group | RpcGroup definition |
| ⚠️ OPTIONAL | `src/lib/commands.ts` | CQRS commands | Write operation schemas |
| ⚠️ OPTIONAL | `src/lib/queries.ts` | CQRS queries | Read operation schemas |
| ⚠️ OPTIONAL | `src/lib/projections.ts` | CQRS projections | Read model schemas |
| ❌ FORBIDDEN | `src/server.ts` | Platform split | Contracts are universal |
| ❌ FORBIDDEN | `src/client.ts` | Platform split | Contracts are universal |
| ❌ FORBIDDEN | `src/edge.ts` | Platform split | Contracts are universal |
| ❌ FORBIDDEN | `src/lib/repository.ts` | Implementation | No impl in contracts |

### 1.2 Data-Access Libraries

**Path**: `libs/data-access/{domain}/`

| Status | File/Directory | Purpose | Notes |
|--------|---------------|---------|-------|
| ✅ REQUIRED | `src/lib/repository.ts` | Repository impl | Implements contract port |
| ✅ REQUIRED | `src/lib/queries.ts` | Kysely queries | Query builder functions |
| ✅ REQUIRED | `src/server.ts` | Server export | Platform-specific |
| ⚠️ OPTIONAL | `src/lib/cache.ts` | Caching layer | Read-through cache |
| ⚠️ OPTIONAL | `src/lib/validation.ts` | Input validation | Schema validation |
| ⚠️ OPTIONAL | `src/lib/errors.ts` | Data-access errors | If not using contract errors |
| ⚠️ OPTIONAL | `src/types.ts` | Type exports | Type-only re-exports |
| ❌ FORBIDDEN | `src/client.ts` | Client export | Server-only library |
| ❌ FORBIDDEN | `src/edge.ts` | Edge export | Server-only library |
| ❌ FORBIDDEN | `src/lib/ports.ts` | Interface defs | Interfaces belong in contract |

### 1.3 Feature Libraries

**Path**: `libs/feature/{name}/`

| Status | File/Directory | Purpose | Notes |
|--------|---------------|---------|-------|
| ✅ REQUIRED | `src/lib/server/` | Server code | Services, CQRS handlers |
| ✅ REQUIRED | `src/lib/shared/` | Shared code | Universal types/utils |
| ✅ REQUIRED | `src/server.ts` | Server export | Always required |
| ⚠️ OPTIONAL | `src/lib/client/` | Client code | Hooks, atoms |
| ⚠️ OPTIONAL | `src/lib/rpc/` | RPC handlers | Router implementations |
| ⚠️ OPTIONAL | `src/client.ts` | Client export | If lib/client/ exists |
| ⚠️ OPTIONAL | `src/edge.ts` | Edge export | If edge runtime needed |
| ⚠️ OPTIONAL | `src/types.ts` | Type exports | Type-only re-exports |
| ❌ FORBIDDEN | Direct Kysely imports | DB access | Use data-access layer |

### 1.4 Infrastructure Libraries

**Path**: `libs/infra/{concern}/`

| Status | File/Directory | Purpose | Notes |
|--------|---------------|---------|-------|
| ✅ REQUIRED | `src/lib/service.ts` | Main service | Context.Tag with layers |
| ✅ REQUIRED | `src/lib/errors.ts` | Infra errors | Data.TaggedError types |
| ✅ REQUIRED | `src/index.ts` | Public exports | Main barrel |
| ⚠️ OPTIONAL | `src/lib/config.ts` | Configuration | Config schema/types |
| ⚠️ OPTIONAL | `src/lib/layers.ts` | Additional layers | Redis, etc. |
| ⚠️ OPTIONAL | `src/server.ts` | Server export | If platform-specific |
| ⚠️ OPTIONAL | `src/client.ts` | Client export | If platform-specific |
| ⚠️ OPTIONAL | `src/edge.ts` | Edge export | If platform-specific |
| ⚠️ OPTIONAL | `src/types.ts` | Type exports | Type-only re-exports |
| ❌ FORBIDDEN | `src/lib/repository.ts` | Repository | Business logic belongs elsewhere |

### 1.5 Provider Libraries

**Path**: `libs/provider/{service}/`

| Status | File/Directory | Purpose | Notes |
|--------|---------------|---------|-------|
| ✅ REQUIRED | `src/lib/service.ts` | SDK wrapper | Effect integration |
| ✅ REQUIRED | `src/lib/errors.ts` | Provider errors | Data.TaggedError types |
| ✅ REQUIRED | `src/lib/types.ts` | Type definitions | Provider-specific types |
| ✅ REQUIRED | `src/server.ts` | Server export | Default platform |
| ⚠️ OPTIONAL | `src/client.ts` | Client export | If SDK supports browser |
| ⚠️ OPTIONAL | `src/edge.ts` | Edge export | If SDK supports edge |
| ⚠️ OPTIONAL | `src/types.ts` | Type exports | Type-only re-exports |
| ❌ FORBIDDEN | `src/lib/repository.ts` | Repository | Not a data layer |
| ❌ FORBIDDEN | Business logic | Feature code | Only SDK wrapping |

---

## 2. Dependency Boundary Validation

### 2.1 Dependency Matrix

| From ↓ / To → | contract | data-access | feature | infra | provider | util | types-db |
|---------------|----------|-------------|---------|-------|----------|------|----------|
| **contract** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **data-access** | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **feature** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **infra** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **provider** | ❌ | ❌ | ❌ | ⚠️¹ | ❌ | ✅ | ❌ |

¹ Provider can only import `infra-observability` for logging, no other infra.

### 2.2 Detailed Boundary Rules

**Contract Libraries** - Strictest boundaries
```typescript
// ✅ ALLOWED
import type { UserSelect } from "@samuelho-dev/types-database"
import { formatDate } from "@samuelho-dev/util-date"
import { OtherDomainError } from "@samuelho-dev/contract-other"

// ❌ FORBIDDEN - Will fail validation
import { UserRepository } from "@samuelho-dev/data-access-user"  // data-access
import { UserService } from "@samuelho-dev/feature-user"          // feature
import { Database } from "@samuelho-dev/infra-database"           // infra
import { Stripe } from "@samuelho-dev/provider-stripe"            // provider
```

**Data-Access Libraries** - Can implement contracts
```typescript
// ✅ ALLOWED
import { UserRepository, UserError } from "@samuelho-dev/contract-user"
import { Database } from "@samuelho-dev/infra-database"
import { Cache } from "@samuelho-dev/infra-cache"
import { Kysely } from "@samuelho-dev/provider-kysely"

// ❌ FORBIDDEN
import { UserService } from "@samuelho-dev/feature-user"           // feature
import { ProductRepository } from "@samuelho-dev/data-access-product" // other data-access
```

**Feature Libraries** - Orchestration layer
```typescript
// ✅ ALLOWED - Full access except other features
import { UserRepository, UserError } from "@samuelho-dev/contract-user"
import { UserRepositoryLive } from "@samuelho-dev/data-access-user"
import { Cache, Telemetry } from "@samuelho-dev/infra-cache"
import { Email } from "@samuelho-dev/provider-resend"

// ❌ FORBIDDEN
import { PaymentService } from "@samuelho-dev/feature-payment"  // other feature
// Use infra for shared cross-feature concerns instead
```

**Infrastructure Libraries** - Cross-cutting concerns
```typescript
// ✅ ALLOWED
import { Redis } from "@samuelho-dev/provider-redis"
import { Logger } from "@samuelho-dev/infra-observability"
import { retry } from "@samuelho-dev/util-effect"

// ❌ FORBIDDEN - No business logic dependencies
import { User } from "@samuelho-dev/contract-user"
import { UserRepository } from "@samuelho-dev/data-access-user"
import { UserService } from "@samuelho-dev/feature-user"
```

**Provider Libraries** - External SDK isolation
```typescript
// ✅ ALLOWED
import { Telemetry } from "@samuelho-dev/infra-observability"  // logging only
import { parseDate } from "@samuelho-dev/util-date"

// ❌ FORBIDDEN - Complete isolation from business logic
import { Database } from "@samuelho-dev/infra-database"       // other infra
import { User } from "@samuelho-dev/contract-user"            // contract
import { UserRepository } from "@samuelho-dev/data-access-user" // data-access
```

### 2.3 Circular Dependency Prevention

Circular dependencies are **always forbidden**. The dependency hierarchy is:

```
provider → infra → data-access → feature
    ↓         ↓          ↓
    └────── contract ←────┘
              ↓
          types-database, util-*
```

Validation should detect:
- Direct cycles: A → B → A
- Indirect cycles: A → B → C → A
- Self-references: A → A

---

## 3. Effect-TS Pattern Validation

### 3.1 Effect.gen Yield Pattern

**Rule**: Use `yield*` (not `yield`) in Effect.gen blocks

```typescript
// ✅ CORRECT
Effect.gen(function*() {
  const user = yield* UserRepository
  const result = yield* user.findById(id)
  return result
})

// ❌ INCORRECT - Missing asterisk
Effect.gen(function*() {
  const user = yield UserRepository  // VIOLATION
  const result = yield user.findById(id)  // VIOLATION
  return result
})
```

### 3.2 Tagged Error Pattern

**Rule**: All Data.TaggedError fields must be `readonly`

```typescript
// ✅ CORRECT
export class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly userId: string
  readonly message: string
}> {}

// ❌ INCORRECT - Missing readonly
export class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  userId: string  // VIOLATION
  message: string  // VIOLATION
}> {}
```

### 3.3 Context.Tag Pattern

**Rule**: Use `Context.Tag` (not `Context.GenericTag`)

```typescript
// ✅ CORRECT
export class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  { readonly findById: (id: string) => Effect.Effect<User, UserError> }
>() {}

// ❌ INCORRECT
export const UserRepository = Context.GenericTag<UserRepositoryInterface>("UserRepository")
```

### 3.4 Static Layer Order

**Rule**: Services with static layers must follow order: Live, Test, Dev, Auto

```typescript
// ✅ CORRECT ORDER
export class QueueService extends Context.Tag("QueueService")<
  QueueService,
  QueueServiceInterface
>() {
  static readonly Live = Layer.effect(/* ... */)   // 1. Production
  static readonly Test = Layer.succeed(/* ... */)  // 2. Testing
  static readonly Dev = Layer.effect(/* ... */)    // 3. Development
  static readonly Auto = Layer.effect(/* ... */)   // 4. Environment-aware
}

// ❌ INCORRECT ORDER
export class QueueService extends Context.Tag("QueueService")</* ... */>() {
  static readonly Test = Layer.succeed(/* ... */)  // Wrong position
  static readonly Live = Layer.effect(/* ... */)   // Wrong position
  static readonly Auto = Layer.effect(/* ... */)
  static readonly Dev = Layer.effect(/* ... */)    // Wrong position
}
```

### 3.5 Error Type Selection

**Rule**: Use appropriate error type based on context

| Context | Error Type | Why |
|---------|-----------|-----|
| Domain/business errors | `Data.TaggedError` | Runtime errors within Effect |
| RPC errors (serializable) | `Schema.TaggedError` | Cross service boundary |
| Validation errors | `Schema.TaggedError` | User-facing, serializable |

```typescript
// Contract: Domain errors
export class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly userId: string
}> {}

// RPC: Serializable errors
export class UserNotFoundRpcError extends Schema.TaggedError<UserNotFoundRpcError>()(
  "UserNotFoundRpcError",
  { userId: Schema.String }
) {}
```

---

## 4. Export Pattern Validation

### 4.1 Platform Export Requirements

| Library Type | index.ts | server.ts | client.ts | edge.ts | types.ts |
|--------------|----------|-----------|-----------|---------|----------|
| contract | ✅ Required | ❌ Forbidden | ❌ Forbidden | ❌ Forbidden | ⚠️ Optional |
| data-access | ❌ Not used | ✅ Required | ❌ Forbidden | ❌ Forbidden | ⚠️ Optional |
| feature | ❌ Not used | ✅ Required | ⚠️ Optional | ⚠️ Optional | ⚠️ Optional |
| infra | ✅ Required | ⚠️ Optional | ⚠️ Optional | ⚠️ Optional | ⚠️ Optional |
| provider | ❌ Not used | ✅ Required | ⚠️ Optional | ⚠️ Optional | ⚠️ Optional |

### 4.2 Type Export Pattern

**Rule**: Type-only exports should use `src/types.ts`

```typescript
// src/types.ts - Type-only re-export
export type * from "./lib/types"
export type { User, UserCreateInput } from "./lib/entities"

// NOT:
export { User, UserCreateInput } from "./lib/entities"  // Runtime export
```

### 4.3 Platform Export Structure

**Feature library example:**

```typescript
// src/server.ts
export * from "./lib/server"
export * from "./lib/shared"

// src/client.ts
export * from "./lib/client"
export * from "./lib/shared"

// src/edge.ts (if applicable)
export * from "./lib/server"  // or edge-specific
export * from "./lib/shared"
```

### 4.4 Package.json Exports

Validate that `package.json` exports match file structure:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./server": "./src/server.ts",
    "./client": "./src/client.ts",
    "./edge": "./src/edge.ts",
    "./types": "./src/types.ts"
  }
}
```

---

## 5. Nx Configuration Validation

### 5.1 Required Tags

| Library Type | Required Tags | Optional Tags |
|--------------|--------------|---------------|
| contract | `type:contract`, `scope:{domain}` | - |
| data-access | `type:data-access`, `scope:{domain}` | `platform:server` |
| feature | `type:feature`, `scope:{name}` | `platform:server`, `platform:client`, `platform:edge` |
| infra | `type:infra`, `scope:{concern}` | `platform:*` |
| provider | `type:provider`, `scope:{service}` | `platform:server`, `platform:client`, `platform:edge` |

### 5.2 Project.json Structure

```json
{
  "name": "{type}-{name}",
  "projectType": "library",
  "sourceRoot": "libs/{type}/{name}/src",
  "tags": ["type:{type}", "scope:{name}"],
  "targets": {
    "build": { /* required */ },
    "lint": { /* required */ },
    "test": { /* required */ }
  }
}
```

### 5.3 TypeScript Configuration

**tsconfig.lib.json requirements:**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "tsBuildInfoFile": "./dist/tsconfig.lib.tsbuildinfo"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.spec.ts", "src/**/*.test.ts"]
}
```

---

## 6. Naming Convention Validation

### 6.1 Package Naming

| Component | Pattern | Example |
|-----------|---------|---------|
| Package name | `@samuelho-dev/{type}-{name}` | `@samuelho-dev/contract-user` |
| Project name | `{type}-{fileName}` | `contract-user` |
| Directory | `libs/{type}/{name}` | `libs/contract/user` |

### 6.2 File Naming

| Type | Pattern | Example |
|------|---------|---------|
| TypeScript files | kebab-case | `user-repository.ts` |
| Test files | `*.spec.ts` | `user-repository.spec.ts` |
| Index files | `index.ts` | `index.ts` |
| Platform exports | `{platform}.ts` | `server.ts`, `client.ts` |

### 6.3 Code Naming

| Type | Pattern | Example |
|------|---------|---------|
| Classes | PascalCase | `UserRepository` |
| Interfaces | PascalCase | `UserRepositoryInterface` |
| Context.Tag | PascalCase (matches class) | `Context.Tag("UserRepository")` |
| Functions | camelCase | `findUserById` |
| Constants | UPPER_SNAKE or camelCase | `DEFAULT_TIMEOUT`, `defaultConfig` |
| Errors | PascalCase + `Error` suffix | `UserNotFoundError` |

---

## 7. Compliance Scoring

### 7.1 Scoring Formula

```
Total Score = Σ(Category Weight × Category Score) × 100

Where Category Score = (Passed Checks / Total Checks)
```

### 7.2 Category Weights

| Category | Weight | Rationale |
|----------|--------|-----------|
| Dependency Boundaries | 25% | Critical for architecture |
| Effect-TS Patterns | 25% | Core correctness |
| File Structure | 20% | Organization |
| Export Patterns | 10% | API surface |
| Nx Configuration | 10% | Build/tooling |
| Naming Conventions | 10% | Consistency |

### 7.3 Severity Levels

| Severity | Impact | Examples |
|----------|--------|----------|
| ❌ Error | Blocks compliance | Dependency violation, missing required file |
| ⚠️ Warning | Should fix | Missing optional file, suboptimal pattern |
| ℹ️ Info | Suggestion | Best practice recommendation |

### 7.4 Score Thresholds

| Score | Status | Action |
|-------|--------|--------|
| 90-100% | ✅ Passing | Ready for production |
| 70-89% | ⚠️ Warning | Address before next release |
| 0-69% | ❌ Failing | Must fix before merge |

---

## 8. Validation Examples

### 8.1 Valid Contract Library

```typescript
// libs/contract/user/src/lib/errors.ts
import { Data } from "effect"

export class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly userId: string
}> {}

export class UserValidationError extends Data.TaggedError("UserValidationError")<{
  readonly field: string
  readonly message: string
}> {}
```

```typescript
// libs/contract/user/src/lib/ports.ts
import { Context, Effect, Option } from "effect"
import type { UserSelect, UserInsert } from "@samuelho-dev/types-database"
import type { UserNotFoundError } from "./errors"

export class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    readonly findById: (id: string) => Effect.Effect<Option.Option<UserSelect>, UserNotFoundError>
    readonly create: (input: UserInsert) => Effect.Effect<UserSelect, UserNotFoundError>
  }
>() {}
```

### 8.2 Invalid Contract Library (Violations)

```typescript
// ❌ VIOLATION: Importing from data-access
import { UserRepositoryLive } from "@samuelho-dev/data-access-user"

// ❌ VIOLATION: Missing readonly on error fields
export class UserError extends Data.TaggedError("UserError")<{
  message: string  // Should be: readonly message: string
}> {}

// ❌ VIOLATION: Using Context.GenericTag
export const UserRepo = Context.GenericTag<UserRepoInterface>("UserRepo")

// ❌ VIOLATION: yield without asterisk
Effect.gen(function*() {
  const repo = yield UserRepository  // Should be: yield* UserRepository
})
```

### 8.3 Valid Data-Access Library

```typescript
// libs/data-access/user/src/lib/repository.ts
import { Effect, Layer, Option } from "effect"
import { UserRepository, UserNotFoundError } from "@samuelho-dev/contract-user"
import { Database } from "@samuelho-dev/infra-database"
import { buildFindByIdQuery } from "./queries"

export const UserRepositoryLive = Layer.effect(
  UserRepository,
  Effect.gen(function*() {
    const db = yield* Database

    return {
      findById: (id) =>
        Effect.gen(function*() {
          const query = buildFindByIdQuery(id)
          const result = yield* db.execute(query)
          return Option.fromNullable(result[0])
        }),

      create: (input) =>
        Effect.gen(function*() {
          const result = yield* db.insert("users", input)
          return result
        })
    }
  })
)
```

### 8.4 Valid Infrastructure Library

```typescript
// libs/infra/queue/src/lib/service.ts
import { Context, Effect, Layer, Queue } from "effect"
import { Schema } from "@effect/schema"
import type { QueueError } from "./errors"

export interface QueueServiceInterface {
  readonly bounded: <T>(capacity: number, schema: Schema.Schema<T>) => Effect.Effect<Queue.Queue<T>, QueueError>
  readonly unbounded: <T>(schema: Schema.Schema<T>) => Effect.Effect<Queue.Queue<T>, QueueError>
}

export class QueueService extends Context.Tag("QueueService")<
  QueueService,
  QueueServiceInterface
>() {
  // Correct order: Live, Test, Dev, Auto
  static readonly Live = Layer.effect(QueueService, /* production impl */)
  static readonly Test = Layer.succeed(QueueService, /* mock impl */)
  static readonly Dev = Layer.effect(QueueService, /* debug impl */)
  static readonly Auto = Layer.effect(QueueService, /* env-aware */)
}
```

---

## 9. Integration with /validate-library

### 9.1 Command Usage

```bash
# Validate a single library
/validate-library libs/contract/user

# Validate all libraries for a domain
/validate-library user

# Validate with specific focus
/validate-library libs/feature/auth dependencies

# Validate entire library type
/validate-library libs/contract/ all
```

### 9.2 Output Format

The command generates an XML-structured report:

```xml
<validation_report>
  <library path="libs/contract/user" type="contract" score="95/100"/>
  <violations count="1">
    <violation severity="warning" file="lib/errors.ts:15" rule="effect/tagged-error-readonly">
      <message>Field 'message' should be readonly</message>
      <fix>Add 'readonly' modifier to field declaration</fix>
      <doc>@docs/LIBRARY_VALIDATION.md#32-tagged-error-pattern</doc>
    </violation>
  </violations>
</validation_report>
```

### 9.3 CI Integration

This validation can be integrated into CI pipelines:

```yaml
# .github/workflows/validate.yml
- name: Validate Library Architecture
  run: |
    for lib in libs/*/*; do
      claude /validate-library "$lib" || exit 1
    done
```

---

## 10. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-26 | Initial validation rules document |

---

## Related Files

- **Validation utilities**: `src/infrastructure/code-validation.ts`
- **Naming utilities**: `src/utils/naming.ts`
- **Library metadata**: `src/utils/library-metadata.ts`
- **Example libraries**: `libs/contract/user/`, `libs/data-access/user/`, `libs/infra/queue/`
