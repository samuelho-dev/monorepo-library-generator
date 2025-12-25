# Contract Library Generator

Generate domain contract libraries following Contract-First Architecture principles with Effect.ts patterns.

## Purpose

Contract libraries define **domain boundaries** by specifying:
- Domain entities (using Effect Schema)
- Domain-specific errors (using Data.TaggedError)
- Service interfaces (using Context.Tag)
- Domain events for event sourcing
- Optional CQRS patterns (commands, queries, projections)
- Optional RPC schemas for network boundaries

## Design Rationale

### Why Contract-First?

**Problem**: In traditional architectures, implementations and interfaces are tightly coupled, making it difficult to:
- Develop features in parallel
- Test with mock implementations
- Swap implementations without breaking consumers
- Refactor without cascading changes

**Solution**: Contract libraries define the "what" (interface) before the "how" (implementation):

```typescript
// Contract defines WHAT the repository does
export class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    readonly findById: (id: string) => Effect.Effect<User, UserNotFoundError>
    readonly create: (data: CreateUserData) => Effect.Effect<User, DatabaseError>
  }
>() {}

// Implementation defines HOW (in data-access library)
export const UserRepositoryPostgres = Layer.succeed(
  UserRepository,
  UserRepository.of({ /* implementation */ })
)
```

**Benefits**:
1. **Dependency Inversion**: High-level code depends on abstractions (contracts), not concrete implementations
2. **Parallel Development**: Frontend and backend teams work against the same contract simultaneously
3. **Testing**: Mock implementations satisfy the same type contract as production code
4. **Refactoring**: Change implementations without modifying consumers

### Why Platform-Agnostic?

Contract libraries are **pure TypeScript** with no platform-specific code:
- No Node.js imports (`fs`, `path`, `http`)
- No browser APIs (`localStorage`, `fetch`, `DOM`)
- Only `effect` and `@effect/platform` dependencies

**Rationale**: Contracts represent domain concepts that transcend platforms. A `User` entity is the same whether accessed from server, client, or edge runtime.

### Why Effect Schema?

Traditional approach (separate types and validators):
```typescript
// Type definition
interface User {
  id: string
  email: string
  age: number
}

// Separate validator (potential drift!)
const validateUser = (data: unknown): User => {
  if (typeof data !== 'object' || !data) throw new Error()
  // Manual validation logic...
}
```

Effect Schema approach (single source of truth):
```typescript
export const User = Schema.Struct({
  id: Schema.String.pipe(Schema.uuid()),
  email: Schema.String.pipe(Schema.pattern(/^[^@]+@[^@]+\.[^@]+$/)),
  age: Schema.Number.pipe(Schema.int(), Schema.between(18, 120))
})

// Type inference (no manual duplication!)
export type User = Schema.Schema.Type<typeof User>

// Runtime validation (automatic from schema!)
const decodeUser = Schema.decodeUnknown(User)
```

**Benefits**:
- **No Duplication**: Single schema defines both types and validators
- **Guaranteed Sync**: Types and runtime validation can never drift
- **Transformations**: Built-in support for encoding/decoding (JSON, database rows)
- **Composition**: Schemas compose and refine with `.pipe()`

## Generated Files

### Core Files (Always Generated)

#### `lib/entities.ts`
Domain entity definitions using Effect Schema.

**Purpose**: Define the shape of domain objects with runtime validation.

**Example**:
```typescript
import { Schema } from "effect"

/**
 * User entity
 */
export const User = Schema.Struct({
  id: Schema.String.pipe(Schema.uuid()),
  email: Schema.String.pipe(Schema.pattern(/^[^@]+@[^@]+\.[^@]+$/)),
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  role: Schema.Literal("admin", "user", "guest"),
  createdAt: Schema.Date,
  updatedAt: Schema.Date
})

export type User = Schema.Schema.Type<typeof User>

/**
 * Input for creating a user (subset of User)
 */
export const CreateUserData = Schema.Struct({
  email: Schema.String.pipe(Schema.pattern(/^[^@]+@[^@]+\.[^@]+$/)),
  name: Schema.String.pipe(Schema.minLength(1)),
  role: Schema.Literal("admin", "user", "guest")
})

export type CreateUserData = Schema.Schema.Type<typeof CreateUserData>
```

**Best Practices**:
- Use `.pipe()` for schema refinement (validation, transformation)
- Document domain invariants in JSDoc comments
- Create separate schemas for create/update operations
- Use `Schema.Literal()` for enums (compile-time and runtime safety)

#### `lib/errors.ts`
Domain-specific errors using `Data.TaggedError`.

**Purpose**: Define typed errors that can be handled with Effect's type-safe error handling.

**Example**:
```typescript
import { Data } from "effect"

/**
 * Error thrown when a user is not found
 */
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

/**
 * Error thrown when user email is already taken
 */
export class UserEmailTakenError extends Data.TaggedError("UserEmailTakenError")<{
  readonly message: string
  readonly email: string
}> {
  static create(email: string) {
    return new UserEmailTakenError({
      message: `Email already registered: ${email}`,
      email
    })
  }
}

/**
 * Error thrown when user validation fails
 */
export class UserValidationError extends Data.TaggedError("UserValidationError")<{
  readonly message: string
  readonly field: string
}> {}
```

**Best Practices**:
- Use descriptive error names following pattern `EntityActionError`
- Include static `.create()` factory methods for common use cases
- Make error fields `readonly` (immutability)
- Include both machine-readable data (ids, fields) and human-readable messages

**Type-Safe Error Handling**:
```typescript
const result = yield* userRepo.findById("user-123")

// Handle specific errors
if (result._tag === "UserNotFoundError") {
  console.log(`Missing user: ${result.userId}`)
}

// Or use Effect.catchTag
yield* userRepo.findById("user-123").pipe(
  Effect.catchTag("UserNotFoundError", (error) =>
    Effect.succeed(defaultUser)
  )
)
```

#### `lib/ports.ts`
Service interfaces using `Context.Tag`.

**Purpose**: Define service contracts that implementations must satisfy.

**Example**:
```typescript
import { Context, Effect } from "effect"
import type { User, CreateUserData } from "./entities.js"
import type { UserNotFoundError, UserEmailTakenError } from "./errors.js"

/**
 * User repository service
 *
 * Provides persistence operations for User entities
 */
export class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    /**
     * Find user by ID
     */
    readonly findById: (id: string) => Effect.Effect<User, UserNotFoundError>

    /**
     * Find user by email
     */
    readonly findByEmail: (email: string) => Effect.Effect<User, UserNotFoundError>

    /**
     * Create new user
     */
    readonly create: (data: CreateUserData) => Effect.Effect<
      User,
      UserEmailTakenError | UserValidationError
    >

    /**
     * Update existing user
     */
    readonly update: (id: string, data: Partial<User>) => Effect.Effect<
      User,
      UserNotFoundError | UserValidationError
    >

    /**
     * Delete user by ID
     */
    readonly delete: (id: string) => Effect.Effect<void, UserNotFoundError>
  }
>() {}
```

**Best Practices**:
- Document each method with JSDoc
- Use precise error unions in return types (not generic `Error`)
- Keep methods focused (single responsibility)
- Use domain types from `entities.ts` (not primitive obsession)

**Dependency Injection Pattern**:
```typescript
// Consumer code (in feature or data-access library)
const program = Effect.gen(function*() {
  const userRepo = yield* UserRepository  // Dependency injection via yield*
  const user = yield* userRepo.findById("user-123")
  return user
})

// Provide implementation
program.pipe(Effect.provide(UserRepositoryPostgres))
```

#### `lib/events.ts`
Domain events for event sourcing and pub/sub.

**Purpose**: Define events that represent state changes in the domain.

**Example**:
```typescript
import { Schema } from "effect"

/**
 * User created event
 */
export const UserCreatedEvent = Schema.Struct({
  type: Schema.Literal("UserCreated"),
  userId: Schema.String.pipe(Schema.uuid()),
  email: Schema.String,
  timestamp: Schema.Date
})

export type UserCreatedEvent = Schema.Schema.Type<typeof UserCreatedEvent>

/**
 * User updated event
 */
export const UserUpdatedEvent = Schema.Struct({
  type: Schema.Literal("UserUpdated"),
  userId: Schema.String.pipe(Schema.uuid()),
  changes: Schema.Record(Schema.String, Schema.Unknown),
  timestamp: Schema.Date
})

export type UserUpdatedEvent = Schema.Schema.Type<typeof UserUpdatedEvent>

/**
 * User deleted event
 */
export const UserDeletedEvent = Schema.Struct({
  type: Schema.Literal("UserDeleted"),
  userId: Schema.String.pipe(Schema.uuid()),
  timestamp: Schema.Date
})

export type UserDeletedEvent = Schema.Schema.Type<typeof UserDeletedEvent>

/**
 * Union of all user events
 */
export const UserEvent = Schema.Union(
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent
)

export type UserEvent = Schema.Schema.Type<typeof UserEvent>
```

**Best Practices**:
- Include `type` field for discriminated unions
- Include `timestamp` for event ordering
- Use past tense for event names (`UserCreated`, not `CreateUser`)
- Keep events immutable (no methods, only data)

### Optional Files

#### `lib/commands.ts` (with `--includeCQRS`)
Command definitions for Command Query Responsibility Segregation.

**Purpose**: Represent write operations as explicit command objects.

**Example**:
```typescript
import { Schema } from "effect"

export const CreateUserCommand = Schema.Struct({
  type: Schema.Literal("CreateUser"),
  email: Schema.String,
  name: Schema.String,
  role: Schema.Literal("admin", "user", "guest")
})

export type CreateUserCommand = Schema.Schema.Type<typeof CreateUserCommand>

export const UpdateUserCommand = Schema.Struct({
  type: Schema.Literal("UpdateUser"),
  userId: Schema.String.pipe(Schema.uuid()),
  changes: Schema.Record(Schema.String, Schema.Unknown)
})

export type UpdateUserCommand = Schema.Schema.Type<typeof UpdateUserCommand>
```

#### `lib/queries.ts` (with `--includeCQRS`)
Query definitions for read operations.

**Purpose**: Represent read operations as explicit query objects.

**Example**:
```typescript
import { Schema } from "effect"

export const GetUserQuery = Schema.Struct({
  type: Schema.Literal("GetUser"),
  userId: Schema.String.pipe(Schema.uuid())
})

export type GetUserQuery = Schema.Schema.Type<typeof GetUserQuery>

export const ListUsersQuery = Schema.Struct({
  type: Schema.Literal("ListUsers"),
  limit: Schema.Number.pipe(Schema.int(), Schema.positive()),
  offset: Schema.Number.pipe(Schema.int(), Schema.nonNegative())
})

export type ListUsersQuery = Schema.Schema.Type<typeof ListUsersQuery>
```

#### `lib/projections.ts` (with `--includeCQRS`)
Read model projections for query optimization.

**Purpose**: Define denormalized views for efficient queries.

**Example**:
```typescript
import { Schema } from "effect"

/**
 * Lightweight user projection for lists
 */
export const UserListProjection = Schema.Struct({
  id: Schema.String.pipe(Schema.uuid()),
  email: Schema.String,
  name: Schema.String,
  role: Schema.Literal("admin", "user", "guest")
})

export type UserListProjection = Schema.Schema.Type<typeof UserListProjection>
```

#### `lib/rpc.ts` (with `--includeRPC`)
RPC request/response schemas for network boundaries.

**Purpose**: Define type-safe schemas for HTTP/RPC endpoints using `@effect/rpc`.

**Example**:
```typescript
import { Schema } from "effect"
import { CreateUserData, User } from "./entities.js"
import { UserNotFoundError } from "./errors.js"

/**
 * RPC request schema for creating a user
 */
export const CreateUserRequest = Schema.Struct({
  email: Schema.String,
  name: Schema.String,
  role: Schema.Literal("admin", "user", "guest")
})

export type CreateUserRequest = Schema.Schema.Type<typeof CreateUserRequest>

/**
 * RPC response schema for creating a user
 */
export const CreateUserResponse = User

export type CreateUserResponse = User
```

## Usage

### Basic Usage

Generate a contract library:

```bash
pnpm exec nx g @tools/workspace-plugin:contract user
```

Customize the generated files:

1. **Define entities** in `lib/entities.ts`:
   ```typescript
   export const User = Schema.Struct({
     id: Schema.String.pipe(Schema.uuid()),
     email: Schema.String,
     // Add your domain fields here
   })
   ```

2. **Define errors** in `lib/errors.ts`:
   ```typescript
   export class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
     readonly userId: string
   }> {}
   ```

3. **Define ports** in `lib/ports.ts`:
   ```typescript
   export class UserRepository extends Context.Tag("UserRepository")<
     UserRepository,
     {
       readonly findById: (id: string) => Effect.Effect<User, UserNotFoundError>
     }
   >() {}
   ```

4. **Generate implementation**:
   ```bash
   pnpm exec nx g @tools/workspace-plugin:data-access user
   ```

### With CQRS Pattern

Generate a contract with CQRS support:

```bash
pnpm exec nx g @tools/workspace-plugin:contract product --includeCQRS
```

This generates additional files:
- `lib/commands.ts` - Write operations (CreateProduct, UpdateProduct)
- `lib/queries.ts` - Read operations (GetProduct, ListProducts)
- `lib/projections.ts` - Denormalized views (ProductListProjection)

### With RPC Support

Generate a contract with RPC schemas:

```bash
pnpm exec nx g @tools/workspace-plugin:contract payment --includeRPC
```

This generates `lib/rpc.ts` with request/response schemas for HTTP endpoints.

## Architecture Decisions

### Why Context.Tag?

**Alternative 1**: Plain interfaces
```typescript
// Plain interface (no Effect integration)
interface UserRepository {
  findById(id: string): Promise<User | null>
}

// Manual dependency injection (error-prone)
function createService(repo: UserRepository) {
  return {
    getUser: async (id: string) => {
      const user = await repo.findById(id)
      if (!user) throw new Error("Not found")
      return user
    }
  }
}
```

**Problems**:
- No compile-time validation of dependencies
- Manual error handling (throw/catch)
- No automatic resource management
- Difficult to test (need to create mocks manually)

**Context.Tag Solution**:
```typescript
// Context.Tag (Effect integration)
export class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    readonly findById: (id: string) => Effect.Effect<User, UserNotFoundError>
  }
>() {}

// Automatic dependency injection
const program = Effect.gen(function*() {
  const repo = yield* UserRepository  // Inject automatically
  return yield* repo.findById("user-123")
})

// Type-safe error handling
program.pipe(
  Effect.catchTag("UserNotFoundError", () => Effect.succeed(defaultUser)),
  Effect.provide(UserRepositoryLive)  // Provide implementation
)
```

**Benefits**:
- **Compile-Time Safety**: Missing dependencies cause TypeScript errors
- **Type-Safe Errors**: Error handling is type-checked
- **Automatic Resource Management**: Scoped layers clean up resources
- **Easy Testing**: Swap layers for mocks with `Effect.provide()`

### Why Data.TaggedError?

**Alternative**: Plain Error class
```typescript
class UserNotFoundError extends Error {
  constructor(readonly userId: string) {
    super(`User not found: ${userId}`)
  }
}

// Type-unsafe error handling
try {
  const user = await repo.findById("user-123")
} catch (error) {
  if (error instanceof UserNotFoundError) {
    // Handle specific error
  }
}
```

**Problems**:
- Runtime `instanceof` checks (not type-safe)
- Errors not tracked in function signatures
- Can't exhaustively handle errors at compile time

**Data.TaggedError Solution**:
```typescript
export class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly userId: string
}> {}

// Type-safe error handling with exhaustiveness checking
const result: Effect.Effect<User, UserNotFoundError | UserEmailTakenError> =
  repo.findOrCreate("user-123", { email: "user@example.com" })

result.pipe(
  Effect.catchTags({
    UserNotFoundError: (error) => Effect.succeed(createDefaultUser()),
    UserEmailTakenError: (error) => Effect.fail(new ConflictError())
    // TypeScript error if we forget to handle an error type!
  })
)
```

**Benefits**:
- **Compile-Time Exhaustiveness**: TypeScript ensures all errors are handled
- **Discriminated Unions**: Errors have `_tag` field for pattern matching
- **Type-Safe Access**: Error fields are typed (no unsafe casts)

## Testing

Contract libraries are **type-only**, so testing focuses on schema validation:

```typescript
import { describe, it, expect } from "vitest"
import { Schema } from "effect"
import { User, CreateUserData } from "./entities.js"

describe("User Entity", () => {
  it("validates correct user data", () => {
    const validUser = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      email: "user@example.com",
      name: "John Doe",
      role: "user" as const,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = Schema.decodeUnknownSync(User)(validUser)
    expect(result).toEqual(validUser)
  })

  it("rejects invalid email", () => {
    const invalidUser = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      email: "not-an-email",  // Invalid email format
      name: "John Doe",
      role: "user" as const,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    expect(() => Schema.decodeUnknownSync(User)(invalidUser)).toThrow()
  })
})
```

## References

- **Effect.ts Context Management**: https://effect.website/docs/context-management/services
- **Effect Schema**: https://effect.website/docs/schema/introduction
- **Data.TaggedError**: https://effect.website/docs/data-types/data#taggederror
- **Contract-First Development**: https://martinfowler.com/bliki/ContractTest.html
- **Domain-Driven Design**: https://martinfowler.com/bliki/BoundedContext.html
- **CQRS Pattern**: https://martinfowler.com/bliki/CQRS.html
