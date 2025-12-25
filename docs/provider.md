# Provider Library Architecture

> **📚 Related Documentation:**
> - [Architecture Overview](./ARCHITECTURE_OVERVIEW.md) - Library inventory and integration patterns
> - [Nx Standards](./NX_STANDARDS.md) - Naming conventions (`provider-{service}` pattern)
> - [Effect Patterns Guide](./EFFECT_PATTERNS.md) - Adapter pattern and error transformation
> - [Infrastructure Libraries](./INFRA.md) - Consumers that orchestrate providers
> - [Feature Libraries](./FEATURE.md) - Business logic that uses providers
> - [Contract Libraries](./CONTRACT.md) - Domain boundaries (NOT implemented by providers)

## Overview

Provider libraries implement **adapters** for external services (Stripe, AWS, OpenAI, etc.) using Effect.ts patterns. They wrap third-party SDKs with consistent interfaces and error handling. Provider libraries do NOT implement repository patterns - those belong only in contracts and data-access libraries.

## Core Principles

1. **Adapter Pattern**: Wrap external APIs with Effect-based interfaces
2. **Service Encapsulation**: Hide third-party SDK complexity
3. **Error Transformation**: Convert external errors to domain errors
4. **Retry Logic**: Built-in retry mechanisms for transient failures
5. **Resource Management**: Proper cleanup of connections and resources
6. **Platform Agnostic**: Core logic separated from platform-specific implementations
7. **No RPC Code**: Provider libraries do NOT handle application RPC - they wrap external service SDKs. Application RPC is handled by **feature** libraries

---

## Provider Types

Provider libraries support four integration patterns, each optimized for different external service types. The generator creates appropriate interfaces, error types, and layer implementations based on the provider type.

### 1. SDK Wrapper (Default)

**Use for**: Third-party JavaScript/TypeScript SDKs with native client libraries

**Examples**: Stripe, OpenAI, AWS SDK, SendGrid, Twilio

**Characteristics**:
- Wraps existing SDK methods with `Effect.tryPromise`
- Granular operations split into separate files for tree-shaking
- Operation files: `create.ts`, `query.ts`, `update.ts`, `delete.ts`
- Best for: Traditional API services with official SDKs

**Generator Command**:
```bash
pnpm exec nx g @workspace:provider stripe \
  --externalService="Stripe" \
  --providerType=sdk
```

**Structure**:
```
lib/
├── service/
│   ├── interface.ts         # Context.Tag with interface
│   ├── operations/
│   │   ├── create.ts        # Create operations (~3-4 KB)
│   │   ├── query.ts         # Query operations (~4-5 KB)
│   │   ├── update.ts        # Update operations (~3 KB)
│   │   ├── delete.ts        # Delete operations (~2-3 KB)
│   │   └── index.ts         # Operations barrel
│   └── index.ts             # Service barrel
├── errors.ts                # ApiError, ConnectionError, RateLimitError, etc.
└── types.ts                 # Resource, Config, PaginationOptions
```

**Import Patterns**:
```typescript
// Granular import (smallest bundle)
import { createOperations } from '@workspace/provider-stripe/service/operations/create'

// Full service
import { StripeService } from '@workspace/provider-stripe/service'
```

### 2. CLI Wrapper

**Use for**: Command-line tools that need Effect integration

**Examples**: Git, Docker, kubectl, terraform, AWS CLI

**Characteristics**:
- Uses Effect's `Command` API (NOT CommandExecutor)
- Methods: `execute(args: string[])`, `version`
- No separate operations files (all methods in interface.ts)
- Best for: System commands, build tools, infrastructure CLIs

**Generator Command**:
```bash
pnpm exec nx g @workspace:provider docker \
  --externalService="Docker" \
  --providerType=cli \
  --cliCommand="docker"
```

**Structure**:
```
lib/
├── service/
│   ├── interface.ts         # CLI wrapper with Command API
│   └── index.ts             # Service barrel
├── errors.ts                # CommandError, NotFoundError
└── types.ts                 # CommandResult, Config (commandPath, timeout)
```

**Usage Example**:
```typescript
import { DockerService } from '@workspace/provider-docker'

Effect.gen(function*() {
  const docker = yield* DockerService
  const result = yield* docker.execute(["ps", "-a"])
  const version = yield* docker.version
})
```

### 3. HTTP/REST API

**Use for**: RESTful APIs without official SDKs

**Examples**: Custom internal APIs, third-party REST services, microservices

**Characteristics**:
- Uses Effect's `HttpClient` API
- Methods: `get()`, `post()`, `put()`, `delete()`, `list()`
- Schema validation with `Effect.Schema`
- Authentication: Bearer token, API key, OAuth, Basic
- Best for: HTTP APIs, REST services, JSON APIs

**Generator Command**:
```bash
pnpm exec nx g @workspace:provider acme-api \
  --externalService="Acme API" \
  --providerType=http \
  --baseUrl="https://api.acme.com" \
  --authType=bearer
```

**Structure**:
```
lib/
├── service/
│   ├── interface.ts         # HTTP service with CRUD methods
│   └── index.ts             # Service barrel
├── errors.ts                # HttpError, NetworkError, RateLimitError
└── types.ts                 # ResourceSchema (Effect.Schema), Config (baseUrl, apiKey)
```

**Usage Example**:
```typescript
import { AcmeApiService } from '@workspace/provider-acme-api'

Effect.gen(function*() {
  const api = yield* AcmeApiService
  const resources = yield* api.list({ page: 1, limit: 10 })
  const resource = yield* api.get("resource-id")
  const created = yield* api.post({ name: "New Resource" })
})
```

### 4. GraphQL API

**Use for**: GraphQL endpoints without official SDKs

**Examples**: Hasura, Apollo Server, custom GraphQL APIs

**Characteristics**:
- Uses Effect's `HttpClient` for GraphQL operations
- Methods: `query<T>()`, `mutation<T>()`
- Schema validation with `Effect.Schema`
- Authentication: Bearer token, API key
- Best for: GraphQL APIs, schema-driven APIs

**Generator Command**:
```bash
pnpm exec nx g @workspace:provider hasura \
  --externalService="Hasura" \
  --providerType=graphql \
  --baseUrl="https://api.hasura.io/v1/graphql" \
  --authType=bearer
```

**Structure**:
```
lib/
├── service/
│   ├── interface.ts         # GraphQL service with query/mutation
│   └── index.ts             # Service barrel
├── errors.ts                # GraphQLError, HttpError, ValidationError
└── types.ts                 # ResourceSchema (Effect.Schema), Config (baseUrl, apiKey)
```

**Usage Example**:
```typescript
import { HasuraService } from '@workspace/provider-hasura'

Effect.gen(function*() {
  const hasura = yield* HasuraService

  const data = yield* hasura.query<QueryResult>(`
    query GetResources {
      resources { id name }
    }
  `)

  const result = yield* hasura.mutation<MutationResult>(`
    mutation CreateResource($input: ResourceInput!) {
      createResource(input: $input) { id name }
    }
  `, { input: { name: "New Resource" } })
})
```

### Provider Type Decision Matrix

| Integration Type | Provider Type | Key Dependencies | Generated Files |
|------------------|---------------|------------------|-----------------|
| Third-party SDK | `sdk` | SDK package | `operations/*.ts` + `interface.ts` |
| CLI tool | `cli` | `@effect/platform` (Command) | `interface.ts` only |
| REST API | `http` | `@effect/platform` (HttpClient) | `interface.ts` only |
| GraphQL API | `graphql` | `@effect/platform` (HttpClient) | `interface.ts` only |

### Common Patterns by Type

**SDK Wrapper Pattern**:
- Initialize SDK client in `Layer.effect`
- Wrap each SDK method with `Effect.tryPromise`
- Transform SDK errors to domain errors
- Add retry logic with `Schedule.exponential`
- Export granular operations for tree-shaking

**CLI Wrapper Pattern**:
- Use `Command.make(cliCommand, ...args)`
- Pipe to `Command.string` for output
- Map to `CommandResult` with output and exitCode
- Handle `CommandError` for failures
- No separate operation files

**HTTP Provider Pattern**:
- Use `HttpClient.mapRequest` to set base URL
- Add authentication with `HttpClientRequest.bearerToken`
- Validate responses with `Schema.Struct`
- Handle HTTP status codes (4xx, 5xx)
- Implement retry with backoff

**GraphQL Provider Pattern**:
- POST GraphQL queries to endpoint
- Include `query` and `variables` in body
- Parse response for `errors` array
- Validate data with Effect Schema
- Type-safe query/mutation methods

### When to Use Each Type

Use **SDK Wrapper** when:
- Official JavaScript/TypeScript SDK exists
- SDK is well-maintained and stable
- Tree-shaking is important (large SDK)
- You want to leverage SDK's built-in features

Use **CLI Wrapper** when:
- No JavaScript SDK exists, only CLI
- You need to automate CLI workflows
- Building infrastructure automation tools
- CLI is more stable than APIs

Use **HTTP Provider** when:
- No official SDK exists
- REST API is well-documented
- You want full control over requests
- API is simple and doesn't need SDK overhead

Use **GraphQL Provider** when:
- GraphQL endpoint is available
- Schema-driven development preferred
- Need type-safe queries without codegen
- Want efficient data fetching with fragments

---

## State Management in Provider Layer

**Provider libraries are server-side adapters that use Effect Ref or SynchronizedRef ONLY for SDK-level state, NEVER for application state.**

### When Providers Use State

Providers should ONLY manage state related to the external SDK:

| Use Case | Pattern | Example |
|----------|---------|---------|
| **SDK client instances** | Layer.sync + Ref.make | Cached Stripe/Resend SDK clients |
| **Connection lifecycle** | Layer.scoped + Effect.acquireRelease | WebSocket connections, SDK authentication |
| **Request deduplication** | FiberMap | Prevent duplicate concurrent API calls |
| **Retry state** | Ref.make + Ref.update | Retry counters, backoff tracking |
| **Effectful refreshes** | SynchronizedRef.updateEffect | Token refresh, re-authentication |

### Example: Stripe Client with State

```typescript
// ✅ Provider manages SDK client, not application state
import { Stripe } from "stripe"
import { Context, Layer, Effect, Ref } from "effect"

export class StripeService extends Context.Tag("StripeService")<
  StripeService,
  {
    readonly createPaymentIntent: (amount: number) => Effect.Effect<PaymentIntent, StripeError>
    readonly retrievePaymentIntent: (id: string) => Effect.Effect<PaymentIntent, StripeError>
  }
>() {
  static readonly Live = Layer.sync(
    this,
    () => {
      // Provider wraps SDK client - NOT application state
      const stripe = new Stripe(process.env.STRIPE_KEY!)

      return {
        createPaymentIntent: (amount) =>
          Effect.tryPromise({
            try: () => stripe.paymentIntents.create({ amount, currency: 'usd' }),
            catch: (error) => new StripeError({ cause: error })
          }),
        retrievePaymentIntent: (id) =>
          Effect.tryPromise({
            try: () => stripe.paymentIntents.retrieve(id),
            catch: (error) => new StripeError({ cause: error })
          })
      }
    }
  )
}
```

### What NOT to Manage in Providers

- ❌ **Application business state** → Use repositories in data-access layer
- ❌ **React component state** → Use `@effect-atom/atom` in feature layer
- ❌ **User preferences** → Query from database, don't cache in provider
- ❌ **Request results** → Cache in infra-cache, not in provider

### State Management Decision

| State Type | Where? | Pattern | Example |
|-----------|--------|---------|---------|
| SDK client | Provider (Layer.sync) | Layer.sync instance | Stripe SDK instance |
| Connection | Provider (Layer.scoped) | Layer.scoped + acquireRelease | Twilio WebSocket |
| Cache data | Infra layer | Cache service | Redis cache with TTL |
| Application data | Data-access layer | Database queries | User preferences from DB |
| UI state | Feature layer | Atom | Search filters |

See [EFFECT_PATTERNS.md - State Management section](./EFFECT_PATTERNS.md#state-management-with-effect-ref) for detailed Ref patterns.

## Directory Structure

```
libs/provider/{name}/
├── src/
│   ├── index.ts              # Main exports (types, interfaces)
│   ├── client.ts             # Browser-safe exports
│   ├── server.ts             # Server-only exports
│   ├── edge.ts               # Edge runtime exports (if applicable)
│   └── lib/
│       ├── interface.ts      # Service interface definition
│       ├── service.ts        # Service implementation
│       ├── layers.ts         # Layer implementations (Live, Test, etc.)
│       ├── errors.ts         # Provider-specific errors
│       ├── types.ts          # Type definitions
│       ├── validation.ts     # Input validation helpers
│       └── service.spec.ts   # Service tests (all tests in one file)
├── project.json              # Nx project configuration
├── tsconfig.json            # TypeScript configuration
├── tsconfig.lib.json        # Library build configuration
├── tsconfig.spec.json       # Test configuration
├── vitest.config.ts         # Vitest configuration
├── package.json             # Package dependencies
└── README.md                # Provider documentation
```

**Generator Must Create:**
- ✅ Service interface file (`lib/interface.ts` or inline in `lib/service.ts`)
- ✅ Service implementation (`lib/service.ts`) with static `Live` layer
- ✅ Error types (`lib/errors.ts`) extending `Data.TaggedError`
- ✅ Layer implementations (`lib/layers.ts`) with Live/Test variants
- ✅ Server exports (`server.ts`) with service + layers
- ✅ Main exports (`index.ts`) with types/errors only (no implementations)
- ✅ Single test file (`lib/service.spec.ts`)
- ✅ Nx project tags: `type:provider`, platform tags (`platform:server`, etc.)

**Generator Must NOT Create:**
- ❌ Repository interfaces (belongs in `contracts/` libraries)
- ❌ Domain entities (belongs in `contracts/` libraries)
- ❌ Business logic (belongs in `feature/` libraries)
- ❌ Multiple test files (only `service.spec.ts`)
- ❌ Direct SDK exports (wrap with Effect interface)

---

## Provider vs Infrastructure: Generator Decision Tree

**When to Create Provider Library:**
- ✅ Wraps external SDK directly (Stripe, OpenAI, Redis, AWS SDK)
- ✅ Minimal abstraction - primarily Effect wrapping
- ✅ One-to-one mapping with SDK methods
- ✅ No orchestration of multiple services
- ✅ Example: `provider-stripe`, `provider-openai`, `provider-supabase`

**When to Create Infrastructure Library:**
- ✅ Orchestrates multiple providers
- ✅ Adds cross-cutting concerns (caching, logging, retry logic)
- ✅ Provides domain-specific abstractions
- ✅ Composes other infrastructure services
- ✅ Example: `infra-cache` (uses `provider-redis`), `infra-database` (uses `provider-kysely`)

**Generator Decision Rule:**
```
IF wraps single external SDK
  → Create PROVIDER library (provider-{name})
ELSE IF orchestrates providers OR adds domain logic
  → Create INFRASTRUCTURE library (infra-{name})
```

**Examples:**
- `StripeService` (Provider) → Wraps Stripe SDK directly
- `PaymentService` (Feature) → Uses `StripeService` + business logic
- `RedisService` (Provider) → Wraps `ioredis` SDK
- `CacheService` (Infrastructure) → Uses `RedisService` + adds TTL/serialization logic

---

## Service Definition Pattern (NOT Repository)

Provider libraries implement **adapters** that wrap external services, NOT repositories.

### Service with Inline Interface

```typescript
// libs/provider/stripe/src/lib/service.ts
import { Context, Effect, Layer, Config } from "effect";
import Stripe from "stripe";

// Adapter service with inline interface using Context.Tag
export class StripeService extends Context.Tag("StripeService")<
  StripeService,
  {
    readonly paymentIntents: {
      readonly create: (params: {
        amount: number;
        currency: string;
        metadata?: Record<string, string>;
      }) => Effect.Effect<Stripe.PaymentIntent, StripeError>;

      readonly retrieve: (
        id: string,
      ) => Effect.Effect<Stripe.PaymentIntent, StripeError>;

      readonly confirm: (
        id: string,
      ) => Effect.Effect<Stripe.PaymentIntent, StripeError>;
    };

    readonly customers: {
      readonly create: (params: {
        email: string;
        name?: string;
        metadata?: Record<string, string>;
      }) => Effect.Effect<Stripe.Customer, StripeError>;

      readonly retrieve: (
        id: string,
      ) => Effect.Effect<Stripe.Customer, StripeError>;
    };

    readonly refunds: {
      readonly create: (params: {
        payment_intent: string;
        amount?: number;
        reason?: string;
      }) => Effect.Effect<Stripe.Refund, StripeError>;
    };

    readonly webhooks: {
      readonly constructEvent: (
        payload: string,
        signature: string,
      ) => Effect.Effect<Stripe.Event, WebhookError>;
    };
  }
>() {}
```

**Generator Must Create:**
- ✅ Service class extending `Context.Tag("ServiceName")<ServiceName, Interface>`
- ✅ Inline interface (second type parameter) with all methods
- ✅ Group methods by resource/domain (e.g., `paymentIntents`, `customers`, `webhooks`)
- ✅ All methods return `Effect<SuccessType, ErrorType>` (never Promise or void)
- ✅ Use SDK types for success (e.g., `Stripe.PaymentIntent`) NOT custom types
- ✅ Use provider-specific errors (e.g., `StripeError`, `WebhookError`)

**Generator Must NOT Create:**
- ❌ Repository interface pattern (no `findById`, `save`, `update` methods)
- ❌ Domain entity types (use SDK types or import from contracts)
- ❌ `Context.GenericTag` (only use regular `Context.Tag`)
- ❌ Methods that throw exceptions (all must return Effect)
- ❌ Async functions returning Promise (use Effect.tryPromise instead)

### Service Implementation with Static Live Layer

```typescript
// libs/provider/stripe/src/lib/service.ts (continued)
import { Schedule, pipe } from "effect";

// Configuration schema
const StripeConfig = Config.all({
  secretKey: Config.secret("STRIPE_SECRET_KEY"),
  webhookSecret: Config.secret("STRIPE_WEBHOOK_SECRET").pipe(Config.optional),
  apiVersion: Config.string("STRIPE_API_VERSION").pipe(
    Config.withDefault("2023-10-16"),
  ),
  maxRetries: Config.integer("STRIPE_MAX_RETRIES").pipe(Config.withDefault(3)),
});

// Service implementation as static Live layer
export class StripeService extends Context.Tag("StripeService")<
  StripeService,
  {
    readonly paymentIntents: {
      readonly create: (params: {
        amount: number;
        currency: string;
        metadata?: Record<string, string>;
      }) => Effect.Effect<Stripe.PaymentIntent, StripeError>;

      readonly retrieve: (
        id: string,
      ) => Effect.Effect<Stripe.PaymentIntent, StripeError>;

      readonly confirm: (
        id: string,
      ) => Effect.Effect<Stripe.PaymentIntent, StripeError>;
    };

    readonly customers: {
      readonly create: (params: {
        email: string;
        name?: string;
        metadata?: Record<string, string>;
      }) => Effect.Effect<Stripe.Customer, StripeError>;

      readonly retrieve: (
        id: string,
      ) => Effect.Effect<Stripe.Customer, StripeError>;
    };

    readonly refunds: {
      readonly create: (params: {
        payment_intent: string;
        amount?: number;
        reason?: string;
      }) => Effect.Effect<Stripe.Refund, StripeError>;
    };

    readonly webhooks: {
      readonly constructEvent: (
        payload: string,
        signature: string,
      ) => Effect.Effect<Stripe.Event, WebhookError>;
    };
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function*() {
      const config = yield* StripeConfig;

      // Initialize Stripe client
      const stripe = new Stripe(Config.unwrap(config.secretKey), {
        apiVersion: config.apiVersion,
        maxNetworkRetries: 0, // We handle retries with Effect
      });

      // Define retry policy
      const retrySchedule = Schedule.exponential("100 millis").pipe(
        Schedule.jittered,
        Schedule.compose(Schedule.recurs(config.maxRetries)),
      );

      return {
        paymentIntents: {
          create: (params) =>
            Effect.tryPromise({
              try: () =>
                stripe.paymentIntents.create({
                  amount: params.amount,
                  currency: params.currency,
                  metadata: params.metadata,
                }),
              catch: (error) =>
                new StripeError({
                  message:
                    error instanceof Error ? error.message : String(error),
                  code:
                    error instanceof Stripe.errors.StripeError
                      ? error.code
                      : "unknown",
                }),
            }).pipe(
              Effect.retry(retrySchedule),
              Effect.withSpan("stripe.paymentIntents.create"),
            ),

          retrieve: (id) =>
            Effect.tryPromise({
              try: () => stripe.paymentIntents.retrieve(id),
              catch: (error) =>
                new StripeError({
                  message:
                    error instanceof Error ? error.message : String(error),
                  code:
                    error instanceof Stripe.errors.StripeError
                      ? error.code
                      : "unknown",
                }),
            }).pipe(
              Effect.retry(retrySchedule),
              Effect.withSpan("stripe.paymentIntents.retrieve"),
            ),

          confirm: (id) =>
            Effect.tryPromise({
              try: () => stripe.paymentIntents.confirm(id),
              catch: (error) =>
                new StripeError({
                  message:
                    error instanceof Error ? error.message : String(error),
                  code:
                    error instanceof Stripe.errors.StripeError
                      ? error.code
                      : "unknown",
                }),
            }).pipe(
              Effect.retry(retrySchedule),
              Effect.withSpan("stripe.paymentIntents.confirm"),
            ),
        },

        customers: {
          create: (params) =>
            Effect.tryPromise({
              try: () =>
                stripe.customers.create({
                  email: params.email,
                  name: params.name,
                  metadata: params.metadata,
                }),
              catch: (error) =>
                new StripeError({
                  message:
                    error instanceof Error ? error.message : String(error),
                  code:
                    error instanceof Stripe.errors.StripeError
                      ? error.code
                      : "unknown",
                }),
            }).pipe(
              Effect.retry(retrySchedule),
              Effect.withSpan("stripe.customers.create"),
            ),

          retrieve: (id) =>
            Effect.tryPromise({
              try: () => stripe.customers.retrieve(id),
              catch: (error) =>
                new StripeError({
                  message:
                    error instanceof Error ? error.message : String(error),
                  code:
                    error instanceof Stripe.errors.StripeError
                      ? error.code
                      : "unknown",
                }),
            }).pipe(
              Effect.retry(retrySchedule),
              Effect.withSpan("stripe.customers.retrieve"),
            ),
        },

        refunds: {
          create: (params) =>
            Effect.tryPromise({
              try: () => stripe.refunds.create(params),
              catch: (error) =>
                new StripeError({
                  message:
                    error instanceof Error ? error.message : String(error),
                  code:
                    error instanceof Stripe.errors.StripeError
                      ? error.code
                      : "unknown",
                }),
            }).pipe(
              Effect.retry(retrySchedule),
              Effect.withSpan("stripe.refunds.create"),
            ),
        },

        webhooks: {
          constructEvent: (payload, signature) =>
            Effect.gen(function*() {
              const secret = config.webhookSecret;
              if (!secret) {
                return yield* Effect.fail(
                  new WebhookError({
                    message: "Webhook secret not configured",
                  }),
                );
              }

              return yield* Effect.try({
                try: () =>
                  stripe.webhooks.constructEvent(
                    payload,
                    signature,
                    Config.unwrap(secret),
                  ),
                catch: (error) =>
                  new WebhookError({
                    message:
                      error instanceof Error ? error.message : String(error),
                  }),
              });
            }).pipe(Effect.withSpan("stripe.webhooks.constructEvent")),
        },
      };
    }),
  );
}
```

## Layer Composition

```typescript
// libs/provider/stripe/src/lib/layers.ts
import { Layer } from "effect";
import { StripeService } from "./service";
import { LoggingService } from "@creativetoolkits/infra-observability/server";

// Production layer with all dependencies
export const StripeServiceLive = StripeService.Live.pipe(
  Layer.provide(LoggingService.Live),
);

// Test layer with mocked responses
// ✅ CRITICAL: Type-safe factories with NO type assertions
// Compiler enforces ALL required fields are present

/**
 * Creates a complete mock PaymentIntent with all required Stripe fields.
 * No type assertions - TypeScript validates completeness at compile time.
 *
 * @param overrides - Partial override for specific test scenarios
 * @returns Fully typed Stripe.PaymentIntent without type coercion
 */
const createMockPaymentIntent = (
  overrides?: Partial<Stripe.PaymentIntent>
): Stripe.PaymentIntent => {
  const base: Stripe.PaymentIntent = {
    id: "pi_test_mock",
    object: "payment_intent",
    amount: 1000,
    amount_capturable: 0,
    amount_details: undefined,
    amount_received: 1000,
    application: null,
    application_fee_amount: null,
    automatic_payment_methods: null,
    canceled_at: null,
    cancellation_reason: null,
    capture_method: "automatic",
    client_secret: "pi_test_secret_mock",
    confirmation_method: "automatic",
    created: Math.floor(Date.now() / 1000),
    currency: "usd",
    customer: null,
    description: null,
    invoice: null,
    last_payment_error: null,
    latest_charge: null,
    livemode: false,
    metadata: {},
    next_action: null,
    on_behalf_of: null,
    payment_method: null,
    payment_method_configuration_details: null,
    payment_method_options: null,
    payment_method_types: ["card"],
    processing: null,
    receipt_email: null,
    review: null,
    setup_future_usage: null,
    shipping: null,
    source: null,
    statement_descriptor: null,
    statement_descriptor_suffix: null,
    status: "succeeded",
    transfer_data: null,
    transfer_group: null,
  };

  return { ...base, ...overrides };
  // ✅ No type assertion - compiler validates all required fields
};

/**
 * Creates a complete mock Customer with all required Stripe fields.
 */
const createMockCustomer = (
  overrides?: Partial<Stripe.Customer>
): Stripe.Customer => {
  const base: Stripe.Customer = {
    id: "cus_test_mock",
    object: "customer",
    address: null,
    balance: 0,
    created: Math.floor(Date.now() / 1000),
    currency: null,
    default_source: null,
    delinquent: false,
    description: null,
    discount: null,
    email: "test@example.com",
    invoice_prefix: null,
    invoice_settings: {
      custom_fields: null,
      default_payment_method: null,
      footer: null,
      rendering_options: null,
    },
    livemode: false,
    metadata: {},
    name: null,
    phone: null,
    preferred_locales: [],
    shipping: null,
    tax_exempt: "none",
    test_clock: null,
  };

  return { ...base, ...overrides };
};

/**
 * Creates a complete mock Refund with all required Stripe fields.
 */
const createMockRefund = (
  overrides?: Partial<Stripe.Refund>
): Stripe.Refund => {
  const base: Stripe.Refund = {
    id: "re_test_mock",
    object: "refund",
    amount: 1000,
    balance_transaction: null,
    charge: "ch_test_mock",
    created: Math.floor(Date.now() / 1000),
    currency: "usd",
    destination_details: undefined,
    metadata: {},
    payment_intent: "pi_test_mock",
    reason: null,
    receipt_number: null,
    source_transfer_reversal: null,
    status: "succeeded",
    transfer_reversal: null,
  };

  return { ...base, ...overrides };
};

/**
 * Creates a complete mock Event with all required Stripe fields.
 */
const createMockEvent = (
  overrides?: Partial<Stripe.Event>
): Stripe.Event => {
  const base: Stripe.Event = {
    id: "evt_test_mock",
    object: "event",
    account: undefined,
    api_version: "2023-10-16",
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {}, // Event data varies by type
      previous_attributes: undefined,
    },
    livemode: false,
    pending_webhooks: 0,
    request: null,
    type: "payment_intent.succeeded",
  };

  return { ...base, ...overrides };
};

export const StripeServiceTest = Layer.succeed(StripeService, {
  paymentIntents: {
    create: () => Effect.succeed(createMockPaymentIntent()),
    retrieve: () => Effect.succeed(createMockPaymentIntent()),
    confirm: () => Effect.succeed(createMockPaymentIntent()),
  },
  customers: {
    create: () => Effect.succeed(createMockCustomer()),
    retrieve: () => Effect.succeed(createMockCustomer()),
  },
  refunds: {
    create: () => Effect.succeed(createMockRefund()),
  },
  webhooks: {
    constructEvent: () => Effect.succeed(createMockEvent()),
  },
});

// Development layer with sandbox credentials
export const StripeServiceDev = Layer.effect(
  StripeService,
  Effect.gen(function*() {
    // Use sandbox/test credentials
    const testConfig = {
      secretKey: Config.succeed("sk_test_..."),
      webhookSecret: Config.succeed("whsec_test_..."),
      apiVersion: Config.succeed("2023-10-16"),
      maxRetries: Config.succeed(1),
    };

    return yield* StripeService.Live.pipe(
      Layer.provide(Layer.setConfigProvider(testConfig)),
    );
  }),
);
```

**Generator Must Create (Layer Composition):**
- ✅ **Live layer**: Production implementation (`ServiceNameLive = ServiceName.Live.pipe(Layer.provide(...))`)
- ✅ **Test layer**: Mock implementation using `Layer.succeed` with typed factory functions
- ✅ **Dev layer** (optional): Sandbox credentials for development
- ✅ Type-safe mock factories (NO `as any` or type assertions)
- ✅ All mock factory functions have explicit return types
- ✅ Mock factories accept `Partial<SDKType>` for test customization

**Generator Must NOT Create:**
- ❌ Multiple Live layers (only one production layer)
- ❌ Mock implementations with `as any` or type assertions
- ❌ Inline mocks without factory functions
- ❌ Test layers that depend on real external services
- ❌ Hardcoded secrets in Dev layer (use Config with defaults)

**Layer Type Decision:**
| SDK Characteristic | Use Layer Type | Example |
|--------------------|----------------|---------|
| Has connections/resources | `Layer.scoped` + `acquireRelease` | WebSocket, Database pools |
| Depends on other services | `Layer.effect` | Service needs logging, config |
| Pure synchronous SDK | `Layer.sync` | Simple SDK instantiation |
| Test/Mock | `Layer.succeed` | Always for test layers |

---

## Error Handling

```typescript
// libs/provider/stripe/src/lib/errors.ts
import { Data } from "effect";

// Provider-specific errors using Data.TaggedError
export class StripeError extends Data.TaggedError("StripeError")<{
  readonly message: string;
  readonly code?: string;
  readonly statusCode?: number;
}> {}

export class WebhookError extends Data.TaggedError("WebhookError")<{
  readonly message: string;
}> {}

export class RateLimitError extends Data.TaggedError("RateLimitError")<{
  readonly retryAfter: number;
}> {}

export class InvalidApiKeyError extends Data.TaggedError("InvalidApiKeyError")<{
  readonly message: string;
}> {}

// Union type for all Stripe errors
export type StripeServiceError =
  | StripeError
  | WebhookError
  | RateLimitError
  | InvalidApiKeyError;

// Error transformation utilities
export const transformStripeError = (error: unknown): StripeServiceError => {
  if (error instanceof Stripe.errors.StripeError) {
    switch (error.type) {
      case "StripeRateLimitError":
        return new RateLimitError({
          retryAfter: error.headers?.["retry-after"]
            ? parseInt(error.headers["retry-after"])
            : 60,
        });
      case "StripeAuthenticationError":
        return new InvalidApiKeyError({ message: error.message });
      default:
        return new StripeError({
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
        });
    }
  }

  return new StripeError({
    message: error instanceof Error ? error.message : String(error),
  });
};
```

**Generator Must Create (Error Handling):**
- ✅ All errors extend `Data.TaggedError("ErrorName")<{ fields }>`
- ✅ Provider-specific error types (e.g., `StripeError`, `RateLimitError`, `WebhookError`)
- ✅ Union type for all provider errors (e.g., `type StripeServiceError = Error1 | Error2 | ...`)
- ✅ Include `cause: unknown` field for capturing original SDK errors
- ✅ Error transformation utility functions (e.g., `transformStripeError`)
- ✅ Meaningful error properties (e.g., `statusCode`, `retryAfter`, `code`)

**Generator Must NOT Create:**
- ❌ Generic `Error` class extensions (use `Data.TaggedError`)
- ❌ Throwing exceptions (all errors via Effect.fail)
- ❌ String error messages (use typed errors)
- ❌ Error classes without the `Data.TaggedError` pattern
- ❌ Missing error transformation for SDK-specific errors

---

## Platform-Specific Exports

```typescript
// libs/provider/stripe/src/index.ts
// Shared types only - safe for all platforms
export type {
  StripeError,
  WebhookError,
  RateLimitError,
  InvalidApiKeyError,
  StripeServiceError,
} from "./lib/errors";

// libs/provider/stripe/src/server.ts
// Server-side exports
export { StripeService } from "./lib/service";
export {
  StripeServiceLive,
  StripeServiceTest,
  StripeServiceDev,
} from "./lib/layers";
export * from "./lib/errors";

// libs/provider/stripe/src/client.ts
// Client-side exports (if applicable - most providers are server-only)
// Note: Stripe should NOT be used directly in the browser
export type { StripeError } from "./lib/errors";

// libs/provider/stripe/src/edge.ts
// Edge runtime exports (limited Stripe functionality)
export { validateWebhookSignature } from "./lib/edge/webhook";
```

**Generator Must Create (Platform Exports):**
- ✅ `index.ts`: Type-only exports (errors, types) - safe for all platforms
- ✅ `server.ts`: Service tag + Live/Test/Dev layers + all implementations
- ✅ `client.ts` (optional): Browser-safe exports only (NO SDK clients, NO secrets)
- ✅ `edge.ts` (optional): Edge runtime compatible exports (limited functionality)
- ✅ Re-export all errors as both types and values from `server.ts`
- ✅ Default to server-only (most providers don't need client/edge)

**Generator Must NOT Create:**
- ❌ SDK client exports in `index.ts` (implementation in `server.ts` only)
- ❌ API keys or secrets in `client.ts` or `index.ts`
- ❌ Server-only code in `client.ts` (e.g., Node.js APIs, SDK clients)
- ❌ Heavy dependencies in `edge.ts` (edge has size limits)
- ❌ Client exports for server-only providers (e.g., Stripe, AWS SDK)

**Export Structure Decision:**
- DEFAULT: Server-only (`server.ts` + `index.ts`)
- IF has browser SDK → Add `client.ts`
- IF has edge-compatible operations → Add `edge.ts` (rare)

---

## Testing & Spec File Patterns

Provider libraries test external SDK integration. Tests use `@effect/vitest` with minimal mocking for rapid iteration.

### Test File Structure

**Single Test File**: `src/lib/service.spec.ts`

Tests verify that provider services correctly wrap external SDKs with Effect patterns. Use inline mocks with `it.scoped`.

> **📘 Comprehensive Testing Guide:** See [TESTING_PATTERNS.md](./TESTING_PATTERNS.md) for complete testing standards and patterns.

**Standard Testing Pattern:**
- ✅ ALL imports from `@effect/vitest`
- ✅ ALL tests use `it.scoped()`
- ✅ ALL layers wrapped with `Layer.fresh()`

#### ✅ DO:

- ✅ Test SDK wrapping (does the provider correctly wrap SDK methods?)
- ✅ Import ALL test utilities from `@effect/vitest` (describe, expect, it)
- ✅ Use `it.scoped()` for ALL tests (consistent with project standards)
- ✅ Wrap ALL test layers with `Layer.fresh()` for isolation
- ✅ Create inline mocks with minimal test data
- ✅ Focus on error transformation and Effect integration
- ✅ Keep tests in one file: `src/lib/service.spec.ts`

#### ❌ DON'T:

- ❌ Create separate `mock-factories.ts` with full SDK objects (inline minimal data instead)
- ❌ Create separate `test-layer.ts` files (inline mocks instead)
- ❌ Test the external SDK itself (that's the SDK's responsibility)
- ❌ Create complex mock objects matching full SDK types (minimal data only)
- ❌ Create 5-6 test files (one file is sufficient)
- ❌ Use manual `Effect.runPromise` (use `it.scoped()` instead)
- ❌ Use `it.effect()` (deprecated in favor of `it.scoped()`)
- ❌ Mix imports from `vitest` and `@effect/vitest` (use @effect/vitest only)
- ❌ Forget `Layer.fresh()` wrapping (causes test state leakage)

### Example: Provider Tests

**File**: `src/lib/service.spec.ts`

```typescript
// src/lib/service.spec.ts
import { Effect, Layer } from "effect";
import { describe, expect, it } from "@effect/vitest"; // ✅ All from @effect/vitest
import { StripeService } from "./service";

describe("StripeService", () => {
  // Inline minimal mock - just the fields you need
  const mockStripeSDK = {
    paymentIntents: {
      create: (params) =>
        Promise.resolve({
          id: "pi_test_123",
          client_secret: "secret_test",
          amount: params.amount,
          currency: params.currency,
          status: "requires_payment_method",
        }),
    },
  };

  const mockLayer = Layer.succeed(StripeService, mockStripeSDK);

  it.scoped("wraps SDK method correctly", () => // ✅ Always it.scoped
    Effect.gen(function*() {
      const stripe = yield* StripeService;

      const result = yield* stripe.paymentIntents.create({
        amount: 1000,
        currency: "usd",
      });

      expect(result.id).toBe("pi_test_123");
      expect(result.amount).toBe(1000);
    }).pipe(Effect.provide(Layer.fresh(mockLayer))) // ✅ Always Layer.fresh
  );

  it.scoped("transforms SDK errors to domain errors", () => // ✅ Always it.scoped
    Effect.gen(function*() {
      const failingMock = Layer.succeed(StripeService, {
        paymentIntents: {
          create: () =>
            Effect.fail(
              new StripeError({
                message: "Card declined",
                code: "card_declined",
              })
            ),
        },
      });

      const stripe = yield* StripeService;

      const result = yield* Effect.either(
        stripe.paymentIntents.create({
          amount: 1000,
          currency: "usd",
        })
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left._tag).toBe("StripeError");
      }
    }).pipe(Effect.provide(Layer.fresh(failingMock))) // ✅ Always Layer.fresh
  );
});
```

### Vitest Configuration

**File**: `vitest.config.ts`

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

1. **One Test File**: Keep all provider tests in `src/lib/service.spec.ts`
2. **Inline Mocks**: Create minimal SDK mocks inline, no separate files
3. **Use it.scoped()**: ALL tests use `it.scoped()` for consistency (not `it.effect()`)
4. **Always Layer.fresh**: Wrap ALL test layers with `Layer.fresh()` for isolation
5. **Focus on Integration**: Test SDK wrapping and error transformation
6. **Minimal Mocking**: Mock only what you need for each test

---

## Common Provider Patterns

### OpenAI Provider Example

```typescript
// libs/provider/openai/src/lib/service.ts
import { Context, Effect, Layer, Config } from "effect";
import OpenAI from "openai";

export class OpenAIService extends Context.Tag("OpenAIService")<
  OpenAIService,
  {
    readonly completions: {
      readonly create: (params: {
        model: string;
        messages: readonly { role: string; content: string }[];
        temperature?: number;
      }) => Effect.Effect<OpenAI.ChatCompletion, OpenAIError>;
    };

    readonly embeddings: {
      readonly create: (params: {
        model: string;
        input: string | readonly string[];
      }) => Effect.Effect<OpenAI.Embedding[], OpenAIError>;
    };
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function*() {
      const apiKey = yield* Config.secret("OPENAI_API_KEY");
      const openai = new OpenAI({ apiKey: Config.unwrap(apiKey) });

      return {
        completions: {
          create: (params) =>
            Effect.tryPromise({
              try: () =>
                openai.chat.completions.create({
                  model: params.model,
                  messages: params.messages,
                  temperature: params.temperature,
                }),
              catch: transformOpenAIError,
            }),
        },

        embeddings: {
          create: (params) =>
            Effect.tryPromise({
              try: async () => {
                const response = await openai.embeddings.create({
                  model: params.model,
                  input: params.input,
                });
                return response.data;
              },
              catch: transformOpenAIError,
            }),
        },
      };
    }),
  );
}
```

### Redis Provider Example

```typescript
// libs/provider/redis/src/lib/service.ts
import { Context, Effect, Layer, Config } from "effect";
import Redis from "ioredis";

export class RedisService extends Context.Tag("RedisService")<
  RedisService,
  {
    readonly get: (key: string) => Effect.Effect<string | null, RedisError>;
    readonly set: (
      key: string,
      value: string,
      ttl?: number,
    ) => Effect.Effect<void, RedisError>;
    readonly del: (key: string) => Effect.Effect<void, RedisError>;
    readonly exists: (key: string) => Effect.Effect<boolean, RedisError>;
    readonly expire: (
      key: string,
      seconds: number,
    ) => Effect.Effect<void, RedisError>;
    readonly hget: (
      key: string,
      field: string,
    ) => Effect.Effect<string | null, RedisError>;
    readonly hset: (
      key: string,
      field: string,
      value: string,
    ) => Effect.Effect<void, RedisError>;
  }
>() {
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function*() {
      const host = yield* Config.string("REDIS_HOST").pipe(
        Config.withDefault("localhost"),
      );
      const port = yield* Config.integer("REDIS_PORT").pipe(
        Config.withDefault(6379),
      );

      const redis = yield* Effect.acquireRelease(
        Effect.sync(() => new Redis({ host, port })),
        (client) => Effect.promise(() => client.quit()),
      );

      return {
        get: (key) =>
          Effect.tryPromise({
            try: () => redis.get(key),
            catch: (error) => new RedisError({ message: String(error) }),
          }),

        set: (key, value, ttl) =>
          Effect.tryPromise({
            try: () =>
              ttl ? redis.set(key, value, "EX", ttl) : redis.set(key, value),
            catch: (error) => new RedisError({ message: String(error) }),
          }).pipe(Effect.asVoid),

        del: (key) =>
          Effect.tryPromise({
            try: () => redis.del(key),
            catch: (error) => new RedisError({ message: String(error) }),
          }).pipe(Effect.asVoid),

        exists: (key) =>
          Effect.tryPromise({
            try: async () => (await redis.exists(key)) === 1,
            catch: (error) => new RedisError({ message: String(error) }),
          }),

        expire: (key, seconds) =>
          Effect.tryPromise({
            try: () => redis.expire(key, seconds),
            catch: (error) => new RedisError({ message: String(error) }),
          }).pipe(Effect.asVoid),

        hget: (key, field) =>
          Effect.tryPromise({
            try: () => redis.hget(key, field),
            catch: (error) => new RedisError({ message: String(error) }),
          }),

        hset: (key, field, value) =>
          Effect.tryPromise({
            try: () => redis.hset(key, field, value),
            catch: (error) => new RedisError({ message: String(error) }),
          }).pipe(Effect.asVoid),
      };
    }),
  );
}
```

## ⚠️ CRITICAL: Runtime Preservation for SDK Callbacks

**This pattern is essential for correctness when integrating Effect with callback-based external SDKs.** Without runtime preservation, services (logging, database, etc.) become inaccessible in SDK callbacks, causing failures in production.

External SDKs use callback patterns that require preserving the Effect runtime. This is common with streaming APIs, webhook handlers, and event-driven SDKs. **This is not optional** - it's a critical correctness requirement for any SDK integration.

### Pattern: Streaming API with Callbacks

```typescript
// libs/provider/openai/src/lib/service.ts
import { Effect, Runtime, Stream } from "effect";
import OpenAI from "openai";
import { LoggingService } from "@creativetoolkits/infra-observability";

export class OpenAIService extends Context.Tag("OpenAIService")<
  OpenAIService,
  {
    readonly streamChat: (
      messages: Array<{ role: string; content: string }>
    ) => Stream.Stream<string, OpenAIError>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function*() {
      const config = yield* OpenAIConfig;
      const logger = yield* LoggingService;
      const runtime = yield* Effect.runtime<LoggingService>();

      const client = new OpenAI({ apiKey: config.apiKey });

      return {
        streamChat: (messages) =>
          Stream.async<string, OpenAIError>((emit) => {
            const runFork = Runtime.runFork(runtime);

            // SDK uses callbacks for streaming
            client.chat.completions
              .create({
                model: "gpt-4",
                messages,
                stream: true,
              })
              .then(async (stream) => {
                for await (const chunk of stream) {
                  const content = chunk.choices[0]?.delta?.content;
                  if (content) {
                    // Emit to Effect Stream
                    emit.single(content);

                    // Log with Effect runtime
                    runFork(
                      Effect.gen(function*() {
                        const log = yield* LoggingService;
                        yield* log.debug("Stream chunk", { content });
                      })
                    );
                  }
                }
                emit.end();
              })
              .catch((error) => {
                emit.fail(new OpenAIError({ cause: error }));
              });
          }),
      };
    })
  );
}
```

### Pattern: Webhook Handler with Runtime

```typescript
// libs/provider/stripe/src/lib/webhook-handler.ts
import { Effect, Runtime } from "effect";
import Stripe from "stripe";
import { LoggingService } from "@creativetoolkits/infra-observability";
import { DatabaseService } from "@creativetoolkits/infra-database";

export const createStripeWebhookHandler = Effect.gen(function*() {
  const runtime = yield* Effect.runtime<
    LoggingService | DatabaseService
  >();
  const runFork = Runtime.runFork(runtime);
  const logger = yield* LoggingService;

  return (req: Request) => {
    const sig = req.headers.get("stripe-signature");
    const event = stripe.webhooks.constructEvent(
      await req.text(),
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    // Handle webhook event with Effect runtime
    const program = Effect.gen(function*() {
      const db = yield* DatabaseService;
      const log = yield* LoggingService;

      yield* log.info("Stripe webhook event", { type: event.type });

      switch (event.type) {
        case "payment_intent.succeeded":
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          yield* db.query((db) =>
            db
              .update("payments")
              .set({ status: "succeeded" })
              .where("stripe_id", "=", paymentIntent.id)
              .execute()
          );
          break;

        case "payment_intent.payment_failed":
          const failedIntent = event.data.object as Stripe.PaymentIntent;
          yield* db.query((db) =>
            db
              .update("payments")
              .set({ status: "failed" })
              .where("stripe_id", "=", failedIntent.id)
              .execute()
          );
          break;
      }
    });

    // Fire and forget webhook processing
    runFork(program);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
    });
  };
});
```

### Pattern: SDK Event Emitter

```typescript
// libs/provider/supabase/src/lib/realtime.ts
import { Effect, Runtime, Queue } from "effect";
import { createClient, RealtimeChannel } from "@supabase/supabase-js";
import { LoggingService } from "@creativetoolkits/infra-observability";

export class SupabaseRealtimeService extends Context.Tag("SupabaseRealtimeService")<
  SupabaseRealtimeService,
  {
    readonly subscribe: (
      table: string
    ) => Effect.Effect<Queue.Queue<DatabaseChange>, SupabaseError>;
  }
>() {
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function*() {
      const config = yield* SupabaseConfig;
      const runtime = yield* Effect.runtime<LoggingService>();
      const runFork = Runtime.runFork(runtime);

      const client = createClient(config.url, config.anonKey);

      // Cleanup on scope close
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => client.removeAllChannels())
      );

      return {
        subscribe: (table) =>
          Effect.gen(function*() {
            const queue = yield* Queue.unbounded<DatabaseChange>();

            const channel = client
              .channel(`public:${table}`)
              .on(
                "postgres_changes",
                { event: "*", schema: "public", table },
                (payload: DatabaseChange) => {
                  // Use runtime to enqueue with logging
                  // Payload type is inferred from Supabase's postgres_changes callback
                  runFork(
                    Effect.gen(function*() {
                      const logger = yield* LoggingService;
                      yield* logger.debug("Database change", { payload });
                      yield* Queue.offer(queue, payload);
                    })
                  );
                }
              )
              .subscribe();

            return queue;
          }),
      };
    })
  );
}
```

### ⚠️ CRITICAL: When to Use Runtime Preservation in Providers

#### ✅ **CRITICAL - Must preserve runtime:**

- ✅ SDK streaming APIs (OpenAI, Anthropic streaming)
- ✅ Webhook handlers (Stripe, GitHub webhooks)
- ✅ Event emitters (Supabase Realtime, Socket.io)
- ✅ SDK callback patterns that need Effect context
- ✅ Long-running SDK connections with events
- ✅ **Any SDK that calls your code via callbacks**

Without runtime preservation in these cases:
- ❌ Services like DatabaseService, LoggingService become inaccessible
- ❌ Context tags (CurrentUser, etc.) are not available
- ❌ Errors aren't properly tracked or caught
- ❌ Your application will fail at runtime in production

#### ❌ **Don't need runtime preservation (alternative approaches):**

- Simple SDK calls that return Promises → use `Effect.tryPromise` instead
- Synchronous SDK methods → call directly, no runtime needed
- One-off API requests → Effect.tryPromise is sufficient

### ⚠️ CRITICAL Best Practices

1. **Always capture runtime** in `Layer.effect`/`Layer.scoped` during service initialization
   ```typescript
   const runtime = yield* Effect.runtime()
   const runFork = Runtime.runFork(runtime)
   ```

2. **Use `Runtime.runFork`** for event handlers and callbacks (fire-and-forget)
   ```typescript
   sdk.on('event', (data) => runFork(handleEvent(data)))
   ```

3. **Use `Runtime.runPromise`** when you need to await the callback result
   ```typescript
   const result = await Runtime.runPromise(runtime)(handleEvent(data))
   ```

4. **MUST clean up SDK connections** in `Effect.addFinalizer` (especially for `Layer.scoped`)
   ```typescript
   yield* Effect.addFinalizer(() => Effect.sync(() => sdk.close()))
   ```

5. **MUST log SDK events** through the captured runtime for consistent observability
   ```typescript
   runFork(
     Effect.gen(function*() {
       const logger = yield* LoggingService
       yield* logger.info("SDK event received", { eventType })
     })
   )
   ```

### Critical Decision Checklist

Before integrating any external SDK, answer:

- [ ] Does the SDK use callbacks? → **YES: Preserve runtime**
- [ ] Does your callback code need Effect context (services, logging)? → **YES: Preserve runtime**
- [ ] Will this code run in production handling real events? → **YES: Preserve runtime**
- [ ] Could this code fail at runtime without access to services? → **YES: Preserve runtime**

If ANY answer is YES, you MUST preserve the runtime. No exceptions.

### Reference

**See EFFECT_PATTERNS.md - ⚠️ CRITICAL: Runtime Preservation for Callbacks** for comprehensive patterns, common mistakes, and complete working examples across all SDK types.

## Nx Configuration

### project.json

```json
{
  "name": "provider-stripe",
  "$schema": "../../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/provider/stripe/src",
  "projectType": "library",
  "tags": ["type:provider", "scope:server", "service:stripe", "platform:node"],
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/libs/provider/stripe",
        "main": "libs/provider/stripe/src/index.ts",
        "tsConfig": "libs/provider/stripe/tsconfig.lib.json",
        "assets": ["libs/provider/stripe/*.md"],
        "declaration": true,
        "declarationMap": true,
        "batch": true,
        "clean": false,
        "additionalEntryPoints": [
          "libs/provider/stripe/src/server.ts",
          "libs/provider/stripe/src/edge.ts"
        ]
      }
    },
    "test": {
      "executor": "@nx/vite:test",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "options": {
        "config": "libs/provider/stripe/vitest.config.ts",
        "passWithNoTests": true
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "options": {
        "lintFilePatterns": ["libs/provider/stripe/**/*.ts"]
      }
    },
    "typecheck": {
      "executor": "@nx/js:tsc",
      "options": {
        "tsConfig": "libs/provider/stripe/tsconfig.lib.json",
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
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "incremental": true,
    "tsBuildInfoFile": "../../../.tsbuildinfo/provider-stripe.tsbuildinfo",
    "outDir": "../../../dist/libs/provider/stripe"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["vitest.config.ts", "src/**/*.spec.ts", "src/**/*.test.ts"]
}
```

### package.json

```json
{
  "name": "@creativetoolkits/provider-stripe",
  "version": "0.0.1",
  "type": "module",
  "main": "./src/index.js",
  "types": "./src/index.d.ts",
  "exports": {
    ".": {
      "import": "./src/index.js",
      "types": "./src/index.d.ts"
    },
    "./server": {
      "import": "./src/server.js",
      "types": "./src/server.d.ts"
    },
    "./edge": {
      "import": "./src/edge.js",
      "types": "./src/edge.d.ts"
    }
  },
  "peerDependencies": {
    "effect": "^3.0.0"
  },
  "dependencies": {
    "@creativetoolkits/infra-observability": "*",
    "stripe": "^14.0.0"
  }
}
```

## Dependencies

Provider libraries can depend on:

- `@creativetoolkits/infra-*` - Infrastructure services (logging, metrics)
- `@creativetoolkits/types-*` - Shared types
- `@creativetoolkits/util-*` - Utilities
- External NPM packages (stripe, openai, aws-sdk, etc.)

## Best Practices

1. **Adapter Pattern**: Wrap external APIs, don't expose them directly
2. **Error Transformation**: Convert all external errors to domain errors
3. **Retry Logic**: Implement intelligent retry with backoff
4. **Resource Cleanup**: Always clean up connections and resources
5. **Configuration**: Use Effect Config for all settings
6. **Observability**: Add spans and metrics to all operations
7. **Testing**: Provide mock implementations for testing
8. **Platform Separation**: Keep server-only code out of client exports

## Anti-Patterns & Generator Guardrails

| Anti-Pattern | Why | Generator Must Prevent | Correct Approach |
|--------------|-----|------------------------|------------------|
| **Raw SDK exports** | Type unsafe, no Effect integration | ❌ Direct SDK client exports | Wrap all SDK methods with `Effect` |
| **Repository pattern** | Wrong abstraction layer | ❌ `findById`, `save`, `update` methods | Adapter methods only (e.g., `create`, `retrieve`) |
| **Throwing exceptions** | Untyped errors, lost context | ❌ `throw new Error()` | Return `Effect.fail(new TypedError())` |
| **Hardcoded config** | Inflexible, no env separation | ❌ `const apiKey = "sk_live_..."` | Use `Effect.Config.secret("API_KEY")` |
| **Missing retry logic** | Poor resilience | ❌ Direct `Effect.tryPromise` without retry | Add `Effect.retry(Schedule.exponential(...))` |
| **Type assertions (`as any`)** | Bypass type safety in tests | ❌ `{ id: "pi_test" }` | Use typed factory functions with `Partial<T>` |
| **Resource leaks** | Memory/connection leaks | ❌ Manual cleanup, missing finalizers | Use `Layer.scoped` + `Effect.acquireRelease` |
| **Client-side secrets** | Security risk | ❌ API keys in `client.ts` | Keep secrets in `server.ts` only |

**Generator Must Ensure:**
- All SDK methods wrapped with `Effect.tryPromise` + error transformation
- Retry logic with exponential backoff for transient failures
- Test layers use typed factories (NO `as any` or type assertions)
- Resource cleanup via `Layer.scoped` for connections
- Configuration via `@creativetoolkits/infra-env` (standardized env library)
- Platform separation (secrets only in `server.ts`)

## Layer Selection Guide

### Decision Matrix

Choose the correct Layer constructor based on your needs:

| Layer Type | Use When | Has Dependencies? | Needs Cleanup? | Example |
|-----------|----------|-------------------|----------------|---------|
| **Layer.succeed** | Test/mock only, static value | ❌ | ❌ | Mock implementations |
| **Layer.sync** | Pure computation, no deps | ❌ | ❌ | Simple utilities |
| **Layer.effect** | Has dependencies, no cleanup | ✅ | ❌ | Stripe, OpenAI (with Config) |
| **Layer.scoped** | Resource with cleanup | ✅ | ✅ | Redis (connection.quit) |

### Decision Tree

```
Is this a test/mock implementation?
├─ YES → Layer.succeed
│   └─ Provide static service value
│      Example: Layer.succeed(StripeService, { ... })
│
└─ NO → Do you need resource cleanup?
    ├─ YES → Layer.scoped
    │   └─ Use Effect.acquireRelease for cleanup
    │      Example: Redis connection (needs .quit())
    │      Example: WebSocket (needs .close())
    │      Example: File handles (need .close())
    │
    └─ NO → Do you need to access dependencies?
        ├─ YES → Layer.effect
        │   └─ Use Effect.gen to access dependencies
        │      Example: Stripe (needs Config for API key)
        │      Example: OpenAI (needs Config for API key)
        │      Example: Most SDK wrappers with config
        │
        └─ NO → Layer.sync
            └─ Pure synchronous computation
               Example: Simple factories
               Example: Stateless utilities
```

### Examples by Type

#### ✅ Layer.succeed - Test/Mock Layer

```typescript
// ✅ Type-safe mock factory - NO type assertions
const createMockPaymentIntent = (
  overrides?: Partial<Stripe.PaymentIntent>
): Stripe.PaymentIntent => {
  const base: Stripe.PaymentIntent = {
    id: "pi_test_mock",
    object: "payment_intent",
    amount: 1000,
    amount_capturable: 0,
    amount_details: undefined,
    amount_received: 1000,
    application: null,
    application_fee_amount: null,
    automatic_payment_methods: null,
    canceled_at: null,
    cancellation_reason: null,
    capture_method: "automatic",
    client_secret: "pi_test_secret_mock",
    confirmation_method: "automatic",
    created: Math.floor(Date.now() / 1000),
    currency: "usd",
    customer: null,
    description: null,
    invoice: null,
    last_payment_error: null,
    latest_charge: null,
    livemode: false,
    metadata: {},
    next_action: null,
    on_behalf_of: null,
    payment_method: null,
    payment_method_configuration_details: null,
    payment_method_options: null,
    payment_method_types: ["card"],
    processing: null,
    receipt_email: null,
    review: null,
    setup_future_usage: null,
    shipping: null,
    source: null,
    statement_descriptor: null,
    statement_descriptor_suffix: null,
    status: "succeeded",
    transfer_data: null,
    transfer_group: null,
  };

  return { ...base, ...overrides };
  // ✅ Compiler validates ALL required fields - no type coercion
};

// Static mock for testing
export const StripeServiceMock = Layer.succeed(StripeService, {
  paymentIntents: {
    create: () => Effect.succeed(createMockPaymentIntent()),
    retrieve: () => Effect.succeed(createMockPaymentIntent({
      status: "requires_payment_method",
      amount_received: 0
    })),
  },
  // ... other methods
});
```

**When to use**: Test layers, mocks, static configurations
**Key trait**: No runtime dependencies, no cleanup needed
**Best practice**: ✅ **CRITICAL** - Use complete object literals with explicit `base` constant
  - Assign to typed constant first: `const base: Stripe.PaymentIntent = { ...fields }`
  - Compiler enforces ALL required fields present
  - NO type assertions (`as any`, `as Type`) - they hide missing fields
  - Spread `overrides` last for test customization

#### ✅ Layer.sync - Pure Synchronous

```typescript
// Simple utility service with no dependencies
export class UtilsService extends Context.Tag("UtilsService")<
  UtilsService,
  { readonly hash: (input: string) => Effect.Effect<string> }
>() {
  static readonly Live = Layer.sync(this, () => ({
    hash: (input) => Effect.sync(() => crypto.createHash("sha256").update(input).digest("hex"))
  }));
}
```

**When to use**: Pure computations, no external dependencies, no config needed
**Key trait**: Synchronous, stateless, no dependencies

#### ✅ Layer.effect - With Dependencies, No Cleanup

```typescript
// Stripe: Needs Config, no cleanup
export class StripeService extends Context.Tag("StripeService")<
  StripeService,
  { /* ... */ }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function*() {
      // ✅ Access dependencies via Effect.gen
      const config = yield* StripeConfig;

      // ✅ Initialize SDK (synchronous, no cleanup needed)
      const stripe = new Stripe(Config.unwrap(config.secretKey), {
        apiVersion: config.apiVersion,
      });

      return {
        paymentIntents: {
          create: (params) => Effect.tryPromise({ /* ... */ }),
          // ... other methods
        },
      };
    })
  );
}
```

**When to use**: Need to access Config or other services, SDK doesn't need cleanup
**Key trait**: Has dependencies, no resource cleanup
**Common pattern**: Most third-party SDK wrappers (Stripe, OpenAI, SendGrid, etc.)

#### ✅ Layer.scoped - With Cleanup (acquireRelease)

```typescript
// Redis: Needs Config + connection cleanup
export class RedisService extends Context.Tag("RedisService")<
  RedisService,
  { /* ... */ }
>() {
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function*() {
      // ✅ Access dependencies
      const host = yield* Config.string("REDIS_HOST");
      const port = yield* Config.integer("REDIS_PORT");

      // ✅ Use Effect.acquireRelease for resource cleanup
      const redis = yield* Effect.acquireRelease(
        Effect.sync(() => new Redis({ host, port })),
        (client) => Effect.promise(() => client.quit()) // 🔑 Cleanup on scope end
      );

      return {
        get: (key) => Effect.tryPromise({ /* ... */ }),
        // ... other methods
      };
    })
  );
}
```

**When to use**: Resource needs cleanup when scope ends (connections, file handles, subscriptions)
**Key trait**: Uses Effect.acquireRelease, cleanup runs on scope end
**Common pattern**: Database connections, WebSocket connections, file handles, subscriptions

### Common Mistakes

❌ **Using Layer.scoped without acquireRelease**:
```typescript
// ❌ WRONG: Layer.scoped with no cleanup
static readonly Live = Layer.scoped(
  this,
  Effect.gen(function*() {
    const config = yield* Config;
    const stripe = new Stripe(config.apiKey); // No cleanup needed!
    return { /* ... */ };
  })
);

// ✅ CORRECT: Use Layer.effect instead
static readonly Live = Layer.effect(
  this,
  Effect.gen(function*() {
    const config = yield* Config;
    const stripe = new Stripe(config.apiKey);
    return { /* ... */ };
  })
);
```

❌ **Using Layer.sync with dependencies**:
```typescript
// ❌ WRONG: Layer.sync can't access dependencies
static readonly Live = Layer.sync(this, () => {
  const config = ???; // Can't access Config here!
  return { /* ... */ };
});

// ✅ CORRECT: Use Layer.effect to access dependencies
static readonly Live = Layer.effect(
  this,
  Effect.gen(function*() {
    const config = yield* Config;
    return { /* ... */ };
  })
);
```

❌ **Manual cleanup without acquireRelease**:
```typescript
// ❌ WRONG: Manual cleanup won't run on interruption
static readonly Live = Layer.effect(
  this,
  Effect.gen(function*() {
    const redis = new Redis();
    // ❌ This won't run if scope is interrupted!
    return {
      close: () => Effect.promise(() => redis.quit()),
      // ... methods
    };
  })
);

// ✅ CORRECT: Use acquireRelease with Layer.scoped
static readonly Live = Layer.scoped(
  this,
  Effect.gen(function*() {
    const redis = yield* Effect.acquireRelease(
      Effect.sync(() => new Redis()),
      (client) => Effect.promise(() => client.quit())
    );
    return { /* ... */ };
  })
);
```

### Effect 4.0 Compatibility Notes

**Stable in Effect 3.0+**: All Layer constructor patterns above are stable
**Effect 4.0 Status**: No breaking changes expected for Layer composition patterns
**Recommendation**: Follow the decision tree above - patterns are future-proof

## Generator Template Usage

### Basic Usage

```bash
# Server-only provider (most common)
pnpm exec nx g @workspace:provider stripe --sdk=stripe

# Provider with client support (rare - only if SDK has browser version)
pnpm exec nx g @workspace:provider openai --sdk=openai --includeClient=true

# Provider with edge support (very rare - only for edge-compatible SDKs)
pnpm exec nx g @workspace:provider analytics --sdk=analytics --includeEdge=true
```

### Generator Flags

| Flag | Required | Default | Description | Example |
|------|----------|---------|-------------|---------|
| `name` | ✅ | - | Provider library name (without `provider-` prefix) | `stripe`, `openai`, `redis` |
| `--sdk` | ✅ | - | NPM package name of the SDK to wrap | `stripe`, `openai`, `ioredis` |
| `--includeServer` | ❌ | `true` | Generate `server.ts` exports | Always true (providers are server-side) |
| `--includeClient` | ❌ | `false` | Generate `client.ts` exports | Only if SDK has browser version |
| `--includeEdge` | ❌ | `false` | Generate `edge.ts` exports | Very rare (edge-compatible SDKs only) |

### Validation Rules

Generator enforces these rules:
- ✅ At least one platform must be enabled (server/client/edge)
- ✅ Name must not start with `provider-` (added automatically)
- ✅ SDK package must be a valid NPM package name
- ✅ If `includeClient=true`, validates SDK is browser-safe
- ✅ If `includeEdge=true`, validates SDK is edge-compatible

### Common Scenarios

**API Service (Server-Only):**
```bash
pnpm exec nx g @workspace:provider stripe --sdk=stripe
# Creates: libs/provider/stripe with server.ts only
```

**Universal SDK (Server + Client):**
```bash
pnpm exec nx g @workspace:provider analytics --sdk=@segment/analytics-next --includeClient=true
# Creates: libs/provider/analytics with server.ts + client.ts
```

**Edge-Compatible Service:**
```bash
pnpm exec nx g @workspace:provider kv --sdk=@vercel/kv --includeEdge=true
# Creates: libs/provider/kv with server.ts + edge.ts
```

### What the Generator Creates

1. **Directory Structure**: See "Directory Structure" section above
2. **Service Interface**: `Context.Tag` with inline interface (NOT `Context.GenericTag`)
3. **Error Types**: All errors extend `Data.TaggedError`
4. **Layer Implementations**: Live + Test layers with typed factories
5. **Platform Exports**: Based on flags (`server.ts`, `client.ts`, `edge.ts`)
6. **Nx Tags**: `type:provider`, platform tags, SDK tag
7. **Configuration**: Effect.Config integration for all env vars
8. **Tests**: Single spec file with `@effect/vitest` setup

## Migration Guide

For existing provider libraries:

1. **Keep interfaces in provider** - Don't move to contracts
2. **Update to Context.Tag** pattern (NOT Context.GenericTag unless truly generic)
3. **Use Effect.tryPromise** with proper error mapping
4. **Add factory methods** for service creation
5. **Provide multiple layer variants** (Live, Test, Mock)
6. **Remove any business logic** - pure SDK wrapping only
