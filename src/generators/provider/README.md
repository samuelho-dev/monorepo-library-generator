# Provider Library Generator

Generate provider libraries that wrap external service SDKs (Stripe, Redis, Postgres) with Effect-based APIs.

## Purpose

Provider libraries implement the **Adapter Pattern** for external services:
- Convert callback/promise-based SDKs to Effect APIs
- Manage resource lifecycle (connection pooling, cleanup)
- Add resilience patterns (retry logic, circuit breakers, health checks)
- Provide type-safe configuration with Effect Schema
- Enable testing with mocked SDK clients

## Design Rationale

### Why Adapter Pattern?

**Problem**: External SDKs use different patterns (callbacks, promises, events):
- Inconsistent error handling across SDKs
- Manual resource management (connections, cleanup)
- No type-safe composition with other services
- Difficult to add retry/circuit breaker logic

**Solution**: Wrap SDKs in Effect-based adapters:

```typescript
// External SDK (promise-based)
import Stripe from "stripe"

// Effect-based adapter
export class StripeService extends Context.Tag("StripeService")<
  StripeService,
  {
    readonly createCharge: (req: ChargeRequest) => Effect.Effect<Charge, StripeError>
  }
>() {}

// Layer with resource management
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
          Effect.retry(Schedule.exponential("100 millis"))
        )
    })
  })
)
```

**Benefits**:
- **Consistent API**: All providers use Effect patterns
- **Resource Safety**: Scoped layers ensure cleanup
- **Resilience**: Built-in retry/circuit breaker support
- **Type Safety**: Effect error channels track failure modes
- **Testability**: Mock SDK in tests

### Why Scoped Layers?

Providers manage stateful resources (connections, clients):

```typescript
// ❌ BAD: No cleanup, resource leak
export const RedisServiceLive = Layer.succeed(
  RedisService,
  RedisService.of({
    get: (key) => Effect.promise(() => client.get(key))
  })
)
// Redis connection never closed!

// ✅ GOOD: Scoped layer with cleanup
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

**Rationale**:
- Acquire resource on scope entry
- Release resource on scope exit (even if error occurs)
- Connection pooling managed automatically
- No resource leaks

## Generated Files

### Always Generated

- `lib/service.ts` - Effect-based service wrapping external SDK
- `lib/types.ts` - TypeScript interfaces and type definitions
- `lib/errors.ts` - Provider-specific errors (connection, API failures)
- `lib/validation.ts` - Configuration and request validation schemas
- `lib/layers.ts` - Layer definitions with resource management
- `lib/service.spec.ts` - Unit tests with mocked SDK

## Common Provider Examples

### Database Providers

#### PostgreSQL (via Kysely)

```typescript
export class KyselyService extends Context.Tag("KyselyService")<
  KyselyService,
  Kysely<Database>
>() {}

export const KyselyServiceLive = Layer.scoped(
  KyselyService,
  Effect.gen(function*() {
    const config = yield* KyselyConfig

    const db = yield* Effect.acquireRelease(
      Effect.sync(() => new Kysely<Database>({
        dialect: new PostgresDialect({
          pool: new Pool({
            host: config.host,
            database: config.database,
            max: config.poolSize
          })
        })
      })),
      (db) => Effect.promise(() => db.destroy())
    )

    return db
  })
)
```

#### Redis

```typescript
export class RedisService extends Context.Tag("RedisService")<
  RedisService,
  {
    readonly get: (key: string) => Effect.Effect<Option.Option<string>>
    readonly set: (key: string, value: string) => Effect.Effect<void>
  }
>() {}

export const RedisServiceLive = Layer.scoped(/* ... */)
```

### Payment Providers

#### Stripe

```typescript
export class StripeService extends Context.Tag("StripeService")<
  StripeService,
  {
    readonly createCharge: (req: ChargeRequest) => Effect.Effect<Charge, StripeError>
    readonly createCustomer: (req: CustomerRequest) => Effect.Effect<Customer, StripeError>
  }
>() {}
```

### Cloud Providers

#### AWS S3

```typescript
export class S3Service extends Context.Tag("S3Service")<
  S3Service,
  {
    readonly putObject: (key: string, data: Buffer) => Effect.Effect<void, S3Error>
    readonly getObject: (key: string) => Effect.Effect<Buffer, S3Error>
  }
>() {}
```

## Usage

### Generate Provider

```bash
pnpm exec nx g @tools/workspace-plugin:provider stripe --externalService="Stripe API" --platform=node
```

### Implement Service

```typescript
// lib/service.ts
import Stripe from "stripe"

export const StripeServiceLive = Layer.scoped(
  StripeService,
  Effect.gen(function*() {
    const config = yield* StripeConfig
    const stripe = new Stripe(config.apiKey)

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

### Use in Feature

```typescript
const program = Effect.gen(function*() {
  const stripe = yield* StripeService
  return yield* stripe.createCharge({ amount: 1000, currency: "usd" })
}).pipe(Effect.provide(StripeServiceLive))
```

## Best Practices

1. **Use Scoped Layers**: Always use Layer.scoped for resource cleanup
2. **Wrap SDK Errors**: Convert to domain errors (don't expose SDK internals)
3. **Add Retry Logic**: Use Effect.retry for transient failures
4. **Health Checks**: Implement health check methods
5. **Mock in Tests**: Create mock SDK clients for unit tests
6. **Document Platform**: Specify Node.js/browser/edge requirements

## Testing

```typescript
// Mock Stripe SDK
const mockStripe = {
  charges: {
    create: vi.fn().mockResolvedValue({ id: "ch_123", amount: 1000 })
  },
  destroy: vi.fn()
}

const MockStripeService = Layer.succeed(
  StripeService,
  StripeService.of({
    createCharge: (req) => Effect.succeed({ id: "ch_123", amount: req.amount })
  })
)

const program = Effect.gen(function*() {
  const stripe = yield* StripeService
  return yield* stripe.createCharge({ amount: 1000, currency: "usd" })
}).pipe(Effect.provide(MockStripeService))
```

## References

- **Adapter Pattern**: https://refactoring.guru/design-patterns/adapter
- **Effect Resource Management**: https://effect.website/docs/resource-management/scope
- **Effect Retry**: https://effect.website/docs/scheduling/schedules
