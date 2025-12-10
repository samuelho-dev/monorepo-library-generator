# Feature Library Architecture

> **📚 Related Documentation:**
>
> - [Architecture Overview](./ARCHITECTURE_OVERVIEW.md) - Library inventory and integration patterns
> - [Nx Standards](./NX_STANDARDS.md) - Naming conventions (`feature-{name}` pattern)
> - [Effect Patterns Guide](./EFFECT_PATTERNS.md) - Service orchestration and error handling
> - [Contract Libraries](./CONTRACT.md) - Domain interfaces for type-safe dependencies
> - [Data-Access Libraries](./DATA-ACCESS.md) - Repository services you orchestrate
> - [Infrastructure Libraries](./INFRA.md) - Cross-cutting concerns (logging, caching, etc.)
> - [Provider Libraries](./PROVIDER.md) - External services (Stripe, OpenAI, etc.)

## Overview

Feature libraries implement business logic and application features using Effect.ts patterns. They orchestrate between data-access layers, external providers, and infrastructure services to deliver complete business capabilities.

## Core Principles

1. **Business Logic Encapsulation**: Features contain application-specific business rules
2. **Service Orchestration**: Coordinate multiple data-access and infrastructure services
3. **Effect-First**: All operations return Effect types for composability
4. **Layer-Based DI**: Services are provided through Effect layers
5. **Platform Agnostic**: Core logic separated from platform-specific implementations
6. **Client State Management**: Feature client code uses Effect Atom for React component state (search filters, form UI, cart state)
7. **RPC Error Transformation**: Transform domain errors (Data.TaggedError) to RPC errors (Schema.TaggedError) at RPC handler boundaries
8. **RPC Router Responsibility**: Feature libraries define RPC routers with inline handlers that orchestrate services and transform errors for cross-service communication

## State Management in Feature Layer

**Feature libraries handle BOTH client-side state (Atoms) and server-side state (Refs/Services) - split by platform.**

### Client-Side State with Atom (@effect-atom/atom)

Feature client code uses `@effect-atom/atom` for React state management:

| Use Case | Example | Pattern |
|----------|---------|---------|
| **Search state** | Query, filters, page, sort | Atom.make + useAtomValue hook |
| **Form state** | Form values, validation errors | Atom.make + useAtomSet hook |
| **Cart state** | Items, quantities, selection | Atom.make + Atom.update |
| **UI toggles** | Modal open/close, tab selection | Atom.make + Atom.set |
| **Derived state** | Total price from cart | Atom.map for computed values |

**Generator Must Create (Client State):**
- ✅ Atom definitions in `src/lib/client/state.ts`
- ✅ React hooks using `@effect-atom/atom-react`
- ✅ Initial state with TypeScript types
- ✅ Atom.make for state creation
- ✅ Atom.map for derived state
- ✅ Export from `client.ts` only

**Generator Must NOT Create (Client State):**
- ❌ Zustand stores (use Atom instead)
- ❌ Redux/RTK setup (use Atom instead)
- ❌ useState wrappers (use Atom hooks directly)
- ❌ Server-side Atom usage (client-only)

### Server-Side Orchestration with Services

Feature server code orchestrates repositories and providers:

```typescript
// ✅ Feature service orchestrates domain logic (server-side)
export class CartService extends Context.Tag("CartService")<
  CartService,
  {
    readonly addItem: (item: CartItem) => Effect.Effect<void>
    readonly getTotal: () => Effect.Effect<number>
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const productRepo = yield* ProductRepository    // Injected
      const userRepo = yield* UserRepository          // Injected
      const cartAtom = yield* Atom.make<CartState>({}) // Client state

      return {
        addItem: (item) =>
          Effect.gen(function* () {
            // Validate product exists
            const product = yield* productRepo.findById(item.productId)
            if (Option.isNone(product)) {
              return yield* Effect.fail(new ProductNotFoundError())
            }

            // Update cart atom (client state)
            yield* Atom.update(cartAtom, (state) => ({
              ...state,
              items: [...state.items, item]
            }))
          }),

        getTotal: () =>
          Effect.gen(function* () {
            const state = yield* Atom.get(cartAtom)
            return state.items.reduce((sum, item) => sum + item.price * item.qty, 0)
          })
      }
    })
  )
}
```

**Generator Must Create (Server Orchestration):**
- ✅ Service tag extending `Context.Tag` with inline interface
- ✅ Static `Live` layer with `Layer.effect` or `Layer.scoped`
- ✅ Dependency injection via `yield* Repository` or `yield* Service`
- ✅ Business logic methods returning `Effect<A, E>`
- ✅ Error types using `Data.TaggedError`
- ✅ Export from `server.ts` only

**Generator Must NOT Create (Server Orchestration):**
- ❌ Direct repository implementations (use data-access layer)
- ❌ Direct SDK imports (use provider layer)
- ❌ React hooks in server code
- ❌ Atom state management in server services
- ❌ Class-based services without Context.Tag
- ❌ Manual dependency passing (use Effect DI)

### Decision Matrix: Where Does State Go?

| State Type | Layer | Pattern | Tools |
|-----------|-------|---------|-------|
| **React Component State** | Feature (client) | @effect-atom/atom | Atom.make, useAtomValue, useAtomSet |
| **Search/Filter State** | Feature (client) | @effect-atom/atom | Atom.make, Atom.update |
| **Form Values & Validation** | Feature (client) | @effect-atom/atom | Atom.make, Atom.get |
| **Business Logic State** | Feature (server) | Service composition | Effect.gen + dependencies |
| **Database Persistence** | Data-Access layer | Repositories | Kysely queries |
| **Infrastructure State** | Infra layer | Effect Ref | Ref.make, Ref.update |
| **Cache Data** | Infra (cache) | Redis/Memory | Cache service |

### Client vs Server: Clear Separation

```typescript
// ✅ CORRECT - Client code uses Atom for UI state
// apps/web/src/lib/features/search-client.tsx
import { useAtomValue, useAtomSet } from "@effect-atom/atom-react"

export function SearchClient() {
  const filters = useAtomValue(searchFiltersAtom)  // React state
  const setFilters = useAtomSet(searchFiltersAtom)

  return (
    <button onClick={() => setFilters(newFilters)}>
      Apply Filters
    </button>
  )
}

// ✅ CORRECT - Server code orchestrates business logic
// libs/feature/search/src/lib/server/search-service.ts
export class SearchService extends Context.Tag("SearchService")<
  SearchService,
  {
    readonly search: (query: string) => Effect.Effect<SearchResult[], SearchError>
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const productRepo = yield* ProductRepository
      const analyticsService = yield* AnalyticsService

      return {
        search: (query) =>
          Effect.gen(function* () {
            // Business logic - no UI state here
            const results = yield* productRepo.search(query)
            yield* analyticsService.trackSearch(query, results.length)
            return results
          })
      }
    })
  )
}
```

### RPC Handler: Bridging Client and Server

```typescript
// ✅ RPC handler connects client requests to server services
import { Rpc } from "@effect/rpc"

export const SearchRequest = Schema.Struct({
  query: Schema.String,
  filters: Schema.optional(Schema.Record(Schema.String, Schema.Unknown))
})

export const searchRouter = Rpc.make([
  SearchRequest.pipe(
    Rpc.toHandler((req) =>
      Effect.gen(function* () {
        const searchService = yield* SearchService

        // Server logic
        const results = yield* searchService.search(req.query)

        // Transform domain errors to RPC errors if needed
        return results
      })
    )
  )
])
```

### Common Anti-Patterns to Avoid

```typescript
// ❌ WRONG - Using Atom on server-side
export const ServerService = () => {
  const atom = yield* Atom.make(...)  // ❌ Atom is client-only!
}

// ❌ WRONG - Using Ref in React component
function MyComponent() {
  const ref = useRef()  // ❌ Use Atom instead!
}

// ❌ WRONG - Mixing business logic in atom updates
Atom.update(cartAtom, (state) => {
  const price = yield* calculatePrice()  // ❌ Can't yield in pure function!
})

// ✅ CORRECT - Separate concerns
Atom.update(cartAtom, (state) => ({ ...state, items: newItems }))
```

See [EFFECT_PATTERNS.md - State Management sections](./EFFECT_PATTERNS.md#state-management-with-effectatomatom-client-side) for detailed patterns.

## Directory Structure

**Generator File Creation Rules:**

| Path | Always Create | Condition | Purpose |
|------|---------------|-----------|---------|
| `src/index.ts` | ✅ Yes | Always | Shared types/errors only |
| `src/server.ts` | ✅ Yes | Always | Services, layers, RPC, operations |
| `src/client.ts` | ⚠️ Conditional | Has React hooks/components/Atom | Client exports |
| `src/edge.ts` | ⚠️ Conditional | Has middleware (rare) | Edge runtime exports |
| `src/lib/server/service.ts` | ✅ Yes | Always | Service tag + Live layer |
| `src/lib/server/errors.ts` | ✅ Yes | Always | Data.TaggedError types |
| `src/lib/server/service.spec.ts` | ✅ Yes | Always | Service tests |
| `src/lib/rpc.ts` | ⚠️ Conditional | Feature has RPC | RPC group + handlers |
| `src/lib/client/stores/` | ⚠️ Conditional | Has client.ts | Atom state |
| `src/lib/client/hooks/` | ⚠️ Conditional | Has client.ts | React hooks |
| `src/lib/server/operations/` | ⚠️ Conditional | Complex multi-step logic | Business operations |
| `src/lib/edge/` | ⚠️ Conditional | Has edge.ts | Edge middleware |
| `src/lib/shared/types.ts` | ✅ Yes | Always | Shared TypeScript types |
| `project.json` | ✅ Yes | Always | Nx configuration |
| `tsconfig.json` | ✅ Yes | Always | TypeScript config |
| `tsconfig.lib.json` | ✅ Yes | Always | Library build config |
| `tsconfig.spec.json` | ✅ Yes | Always | Test config |
| `vitest.config.ts` | ✅ Yes | Always | Vitest config |
| `package.json` | ✅ Yes | Always | Dependencies |
| `README.md` | ✅ Yes | Always | Documentation |

**Generator Must Create (Standard Service Pattern):**
```
libs/feature/{name}/
├── src/
│   ├── index.ts              # ✅ ALWAYS: Shared types/errors ONLY
│   ├── server.ts             # ✅ ALWAYS: ALL server exports (services, layers, operations)
│   ├── client.ts             # ⚠️  IF --includeClient: React hooks, Atom state
│   ├── edge.ts               # ⚠️  IF --includeEdge: Middleware (rare)
│   └── lib/
│       ├── rpc.ts            # ⚠️  IF has RPC: Group + handlers
│       ├── client/           # ⚠️  IF --includeClient:
│       │   ├── hooks/        # React hooks
│       │   ├── atoms/        # @effect-atom/atom state (ONLY client-side)
│       │   └── components/   # React components (optional)
│       ├── server/           # ✅ ALWAYS:
│       │   ├── service.ts    # Context.Tag + Live layer
│       │   ├── errors.ts     # Data.TaggedError types
│       │   ├── service.spec.ts # Tests
│       │   ├── operations/   # ⚠️  IF complex: Multi-step operations
│       │   └── workflows/    # ⚠️  IF complex: Long-running workflows
│       ├── edge/             # ⚠️  IF --includeEdge:
│       │   └── middleware.ts # Edge middleware
│       └── shared/           # ✅ ALWAYS:
│           └── types.ts      # Shared types
├── project.json              # ✅ ALWAYS
├── tsconfig.json            # ✅ ALWAYS
├── tsconfig.lib.json        # ✅ ALWAYS
├── tsconfig.spec.json       # ✅ ALWAYS
├── vitest.config.ts         # ✅ ALWAYS
└── README.md                # ✅ ALWAYS
```

**Generator Must Create (CQRS Pattern - `--includeCQRS=true`):**
```
libs/feature/{name}/
├── src/
│   ├── index.ts              # ✅ ALWAYS: Shared types/errors ONLY
│   ├── server.ts             # ✅ ALWAYS: ALL server exports (commands, queries, events, service)
│   ├── client.ts             # ⚠️  IF --includeClient: React hooks, Atom state
│   └── lib/
│       ├── client/           # ⚠️  IF --includeClient:
│       │   ├── hooks/        # React hooks
│       │   ├── atoms/        # @effect-atom/atom state (ONLY client-side)
│       │   └── components/   # React components (optional)
│       ├── server/           # ✅ ALWAYS:
│       │   ├── commands/           # Command handlers
│       │   │   ├── create-{name}.ts
│       │   │   ├── update-{name}.ts
│       │   │   └── delete-{name}.ts
│       │   ├── queries/            # Query handlers
│       │   │   ├── get-{name}.ts
│       │   │   ├── list-{name}.ts
│       │   │   └── search-{name}.ts
│       │   ├── projections/        # Projection builders
│       │   │   ├── list-projection.ts
│       │   │   ├── detail-projection.ts
│       │   │   └── projection-service.ts
│       │   ├── events/             # Event handlers
│       │   │   ├── handlers.ts     # Event subscriptions
│       │   │   └── publisher.ts    # Event publishing logic
│       │   ├── service.ts          # CQRS orchestration
│       │   ├── errors.ts           # Domain errors
│       │   └── service.spec.ts     # Tests
│       └── shared/
│           └── types.ts
├── project.json
├── tsconfig.json
├── tsconfig.lib.json
├── tsconfig.spec.json
├── vitest.config.ts
└── README.md
```

**Export File Strategy:**

```typescript
// src/index.ts - ONLY shared types/errors (no runtime code)
export type { SharedMetrics } from "./lib/shared/types";
export * from "./lib/server/errors";

// src/server.ts - ALL server-side exports (ALWAYS create)
export { ProductService } from "./lib/server/service";
export * from "./lib/server/commands";    // If CQRS
export * from "./lib/server/queries";     // If CQRS
export * from "./lib/server/events";      // If CQRS
export { setupEventHandlers } from "./lib/server/events/handlers";
```

**Key Rules:**
- ✅ `index.ts` - Shared types/errors ONLY
- ✅ `server.ts` - ALL server exports when no client/edge split
- ✅ `client.ts` - React hooks/components/Atom state ONLY
- ❌ Server code should NEVER be in `index.ts`
- ❌ Client code should NEVER be in `server.ts`

**Generator Must NOT Create:**
- ❌ Separate handler files per RPC operation (inline in rpc.ts)
- ❌ `mock-factories.ts` or `test-layer.ts` (inline mocks)
- ❌ Repository implementations (belongs in data-access)
- ❌ Provider adapters (belongs in provider layer)
- ❌ Multiple service files (one service.ts per feature)
- ❌ Separate interface files (inline with Context.Tag)

### See Also: CQRS Integration Across Layers

For complete CQRS implementation, see:

- **Contracts Layer**: `CONTRACT.md` - Define command/query/projection/event schemas with runtime validation
- **Data-Access Layer**: `DATA-ACCESS.md` - Implement projection repositories with cache-aside pattern and Kysely JOINs
- **Infrastructure Layer**: `INFRA.md` - Use MessagingService for event publishing/subscription with Stream.runForEach handlers

## RPC Pattern (@effect/rpc 0.69.5 Current API)

> **📚 Related Documentation:**
>
> - [Infrastructure RPC](./INFRA.md#rpc-middleware-tags-infrastructure) - Middleware tags and context (CurrentUser)
> - [Contract Libraries](./CONTRACT.md#contracts-for-effect-services-and-rpc) - RPC schema definitions and entity reuse
> - [@effect/rpc Documentation](https://effect.website/docs/effect-rpc) - Official Effect RPC documentation

> **🎯 Feature Library RPC Responsibilities (Effect 3.17.13 + @effect/rpc 0.69.5):**
>
> Feature libraries define **RPC GROUPS, HANDLERS, AND ROUTERS** using @effect/rpc 0.69.5:
> - ✅ RPC group definition using `RpcGroup.make()`
> - ✅ Handlers with `HandlersFrom<typeof RpcGroup>` type
> - ✅ Handler logic that delegates to services (Handler → Service → Repository)
> - ✅ Access middleware context (`yield* CurrentUser`)
> - ✅ Transform domain errors to RPC errors
> - ✅ Convert group to layer with `RpcGroup.toLayer()`
>
> Feature libraries **DO NOT** define:
> - ❌ RPC schemas (defined in **contract** libraries)
> - ❌ Middleware implementations (provided by **application** layer)
> - ❌ Context tags like `CurrentUser` (defined in **infrastructure** layer)
>
> See [Contract RPC Schemas](./CONTRACT.md#rpc-schemas-and-types) for schema definitions.

Feature libraries define RPC groups using `RpcGroup.make()` with separate handler definitions. Middleware context (like `CurrentUser`) is provided via Effect Layers at the application level.

### Modern RPC Architecture (3 Layers)

1. **Infrastructure Layer** (`infra/rpc`): Defines context **tags** (CurrentUser, AuthContext)
2. **Feature Layer** (`feature/*/rpc.ts`): Defines RPC router with inline handlers
3. **Application Layer** (`apps`): Provides context **implementations** via Layer

### Step 1: Define Context Tags (Infrastructure)

Context tags are defined once in the infrastructure layer and accessed by all RPC handlers.

> **Note**: This step is typically done once in `@creativetoolkits/infra-rpc`. Features reference these tags.

```typescript
// libs/infra/rpc/src/lib/context/current-user.ts
import { Context } from "effect";

// User context provided by authentication infrastructure
export interface User {
  readonly id: string;
  readonly email: string;
  readonly role: string;
}

// Tag for accessing current authenticated user in RPC handlers
export class CurrentUser extends Context.Tag("CurrentUser")<
  CurrentUser,
  User
>() {}
```

See [Infrastructure RPC Documentation](./INFRA.md#rpc-middleware-tags-infrastructure) for complete patterns.

### Step 2: Define RPC Group and Handlers

Modern @effect/rpc 0.69.5 uses `RpcGroup.make()` with separate handler implementations.

**Generator Must Create (RPC Groups):**
- ✅ RPC group definition using `RpcGroup.make()` in `src/lib/rpc/group.ts`
- ✅ Handlers with `HandlersFrom<typeof Group>` type
- ✅ Handler logic delegates to services (never inline business logic)
- ✅ Access middleware context via `yield* CurrentUser`
- ✅ Transform domain errors (`Data.TaggedError`) to RPC errors (`Schema.TaggedError`)
- ✅ Convert group to layer with `RpcGroup.toLayer()`
- ✅ Export RPC group and handlers from `server.ts`

**Generator Must NOT Create (RPC Groups):**
- ❌ RPC schemas (defined in contract libraries)
- ❌ Middleware implementations (provided by application layer)
- ❌ Context tags like `CurrentUser` (defined in infrastructure layer)
- ❌ Direct repository calls in handlers (use services)
- ❌ Business logic in handlers (delegate to services)
- ❌ Separate handler files per operation (inline in group file)

```typescript
// libs/feature/payment/src/lib/rpc.ts
import { RpcGroup } from "@effect/rpc/RpcGroup";
import { RpcRequest } from "@effect/rpc/RpcRequest";
import type { HandlersFrom } from "@effect/rpc/RpcHandlers";
import { Effect } from "effect";
import { CurrentUser } from "@creativetoolkits/infra-rpc/server";
import { PaymentService } from "./server/service";

// Import RPC schemas from contract library
import {
  GetPaymentStatusRequest,
  GetPaymentStatusResponse,
  ProcessPaymentRequest,
  ProcessPaymentResponse,
  PaymentRpcError,
} from "@creativetoolkits/contract-payment/rpc";

/**
 * Payment RPC Group Definition
 *
 * Defines RPC procedures using @effect/rpc 0.69.5 API.
 * Handlers are separate from the group definition.
 */
export const PaymentRpcs = RpcGroup.make("PaymentRpcs", {
  // ========================================
  // PUBLIC ENDPOINTS (No authentication)
  // ========================================

  getPaymentStatus: RpcRequest.make({
    request: GetPaymentStatusRequest,
    response: GetPaymentStatusResponse,
    error: PaymentRpcError,
  }),

  verifyPaymentIntent: RpcRequest.make({
    request: Schema.Struct({
      paymentId: Schema.String,
      clientSecret: Schema.String,
    }),
    response: Schema.Struct({
      verified: Schema.Boolean,
      status: Schema.String,
    }),
    error: PaymentRpcError,
  }),

  // ========================================
  // PROTECTED ENDPOINTS (Require CurrentUser)
  // ========================================

  processPayment: RpcRequest.make({
    request: ProcessPaymentRequest,
    response: ProcessPaymentResponse,
    error: PaymentRpcError,
  }),

  refundPayment: RpcRequest.make({
    request: Schema.Struct({
      paymentId: Schema.String,
      reason: Schema.optional(Schema.String),
    }),
    response: Schema.Struct({
      refundId: Schema.String,
      status: Schema.Literal("refunded"),
      amount: Schema.Number,
    }),
    error: PaymentRpcError,
  }),

  listUserPayments: RpcRequest.make({
    request: Schema.Struct({
      page: Schema.Number,
      limit: Schema.Number,
    }),
    response: Schema.Array(Schema.Unknown), // Should reference contract Payment schema
    error: PaymentRpcError,
  }),
});

// ============================================
// STEP 2B: Handler Implementation
// ============================================

// ✅ CORRECT: HandlersFrom type ensures type safety
export const PaymentHandlers: HandlersFrom<typeof PaymentRpcs> = {
  getPaymentStatus: (req) =>
    Effect.gen(function* () {
      const service = yield* PaymentService;
      const payment = yield* service.getPayment(req.paymentId);

      return {
        status: payment.status,
        amount: payment.amount,
        createdAt: payment.createdAt,
      };
    }),

  verifyPaymentIntent: (req) =>
    Effect.gen(function* () {
      const service = yield* PaymentService;
      const verified = yield* service.verifyPaymentIntent(
        req.paymentId,
        req.clientSecret,
      );

      return {
        verified,
        status: verified ? "verified" : "invalid",
      };
    }),

  // Protected endpoints with CurrentUser
  processPayment: (req) =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;
      const service = yield* PaymentService;

      return yield* service.processPayment({
        ...req,
        userId: user.id,
        userEmail: user.email,
      });
    }),

  refundPayment: (req) =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;
      const service = yield* PaymentService;

      return yield* service.refundPayment({
        paymentId: req.paymentId,
        userId: user.id,
        reason: req.reason,
      });
    }),

  listUserPayments: (req) =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;
      const service = yield* PaymentService;

      return yield* service.listPayments({
        userId: user.id,
        page: req.page,
        limit: req.limit,
      });
    }),
};

export type PaymentRpcRouter = typeof PaymentRpcs;
```

**Modern RPC Pattern (0.69.5)** ✅:

- ✅ Uses `RpcGroup.make()` for group definition
- ✅ Handlers with `HandlersFrom<typeof RpcGroup>` type
- ✅ CurrentUser accessed in handlers via `yield* CurrentUser`
- ✅ Handlers delegate to services (thin orchestration layer)
- ✅ Convert group to layer with `RpcGroup.toLayer()`

**Anti-Patterns** ❌:

- ❌ `Rpc.router` (API from 0.40, replaced in 0.69.5)
- ❌ `Rpc.def` with inline handlers (replaced with separate definitions)
- ❌ Handlers accessing repositories directly (breaks architecture)
- ❌ `.middleware()` method (use Layer.provide instead)

### Step 3: Feature Service Implementation

> **⚠️ CRITICAL ARCHITECTURE RULE:**
>
> **Handlers MUST call services, NOT repositories directly.**
>
> - ✅ Handler → Service → Repository
> - ❌ Handler → Repository (violates separation of concerns)
>
> Services contain business logic, authorization, and multi-repository orchestration.
> Handlers are thin RPC adapters that only validate, authorize, and delegate.

Services implement business logic and orchestrate repositories. This is where authorization, validation, and complex operations belong.

```typescript
// libs/feature/payment/src/lib/server/service.ts
import { Context, Effect, Layer, Option } from "effect";
import { PaymentRepository } from "@creativetoolkits/contract-payment";
import { StripeService } from "@creativetoolkits/provider-stripe/server";
import type { Payment, PaymentError } from "@creativetoolkits/contract-payment";

export class PaymentService extends Context.Tag("PaymentService")<
  PaymentService,
  {
    readonly processPayment: (params: {
      userId: string;
      productId: string;
      amount: number;
      userEmail: string;
    }) => Effect.Effect<
      {
        paymentId: string;
        clientSecret: string;
        status: "pending";
      },
      PaymentError
    >;

    readonly refundPayment: (params: {
      paymentId: string;
      userId: string;
      reason?: string;
    }) => Effect.Effect<
      {
        refundId: string;
        status: "refunded";
        amount: number;
      },
      PaymentError
    >;

    readonly listPayments: (params: {
      userId: string;
      page: number;
      limit: number;
    }) => Effect.Effect<readonly Payment[], PaymentError>;

    readonly getPayment: (
      paymentId: string,
    ) => Effect.Effect<Payment, PaymentError>;

    readonly verifyPaymentIntent: (
      paymentId: string,
      clientSecret: string,
    ) => Effect.Effect<boolean, PaymentError>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const stripe = yield* StripeService;
      const paymentRepo = yield* PaymentRepository;

      return {
        processPayment: (params) =>
          Effect.gen(function* () {
            // Business logic: Create Stripe payment intent
            const paymentIntent = yield* stripe.paymentIntents.create({
              amount: params.amount,
              currency: "usd",
              metadata: {
                userId: params.userId,
                productId: params.productId,
              },
            });

            // Persistence: Store payment via repository
            const payment = yield* paymentRepo.create({
              id: paymentIntent.id,
              userId: params.userId,
              productId: params.productId,
              amount: params.amount,
              status: "pending",
              stripePaymentIntentId: paymentIntent.id,
            });

            // Extract client secret with proper error handling
            const clientSecret = paymentIntent.client_secret;
            if (!clientSecret) {
              return yield* Effect.fail(
                new PaymentProcessingError({
                  message: "Stripe payment intent missing client_secret",
                })
              );
            }

            return {
              paymentId: payment.id,
              clientSecret,
              status: "pending",
            };
          }),

        refundPayment: (params) =>
          Effect.gen(function* () {
            // Authorization: Verify user owns this payment
            const paymentOpt = yield* paymentRepo.findById(params.paymentId);
            const payment = yield* Option.match(paymentOpt, {
              onNone: () =>
                Effect.fail(
                  new PaymentNotFoundError({
                    paymentId: params.paymentId,
                  }),
                ),
              onSome: Effect.succeed,
            });

            if (payment.userId !== params.userId) {
              return yield* Effect.fail(
                new ForbiddenError({
                  message: "You can only refund your own payments",
                }),
              );
            }

            // Business logic: Process refund via Stripe
            const refund = yield* stripe.refunds.create({
              payment_intent: payment.stripePaymentIntentId,
              reason: params.reason || "requested_by_customer",
            });

            // Persistence: Update payment status
            yield* paymentRepo.updateStatus(params.paymentId, "refunded");

            return {
              refundId: refund.id,
              status: "refunded",
              amount: refund.amount,
            };
          }),

        listPayments: (params) =>
          Effect.gen(function* () {
            // Scoped query: Only user's own payments
            return yield* paymentRepo.findByUser(params.userId, {
              page: params.page,
              limit: params.limit,
            });
          }),

        getPayment: (paymentId) =>
          Effect.gen(function* () {
            const paymentOpt = yield* paymentRepo.findById(paymentId);
            return yield* Option.match(paymentOpt, {
              onNone: () =>
                Effect.fail(new PaymentNotFoundError({ paymentId })),
              onSome: Effect.succeed,
            });
          }),

        verifyPaymentIntent: (paymentId, clientSecret) =>
          Effect.gen(function* () {
            // Verification logic via Stripe
            const intent = yield* stripe.paymentIntents.retrieve(paymentId);
            return intent.client_secret === clientSecret;
          }),
      };
    }),
  );

  static readonly Test = Layer.succeed(this, {
    // Placeholder implementations - provide your own test mocks
    processPayment: () =>
      Effect.dieMessage(
        "Test layer not implemented. Provide your own test mock via Layer.succeed(PaymentService, {...})"
      ),
    refundPayment: () =>
      Effect.dieMessage(
        "Test layer not implemented. Provide your own test mock"
      ),
    listPayments: () =>
      Effect.dieMessage(
        "Test layer not implemented. Provide your own test mock"
      ),
    getPayment: () =>
      Effect.dieMessage(
        "Test layer not implemented. Provide your own test mock"
      ),
    verifyPaymentIntent: () =>
      Effect.dieMessage(
        "Test layer not implemented. Provide your own test mock"
      ),
  });
}
```

**Service Architecture** ✅:

- ✅ Business logic encapsulated (Stripe calls, validation)
- ✅ Authorization logic (user ownership checks)
- ✅ Multi-repository orchestration
- ✅ Domain error types returned
- ✅ Static Live and Test layers for dependency injection

### Step 4: Layer Composition (Application Level)

The application layer provides CurrentUser context and composes all dependencies.

```typescript
// apps/api/src/app/layers/payment-rpc.ts
import { Layer } from "effect";
import { RpcRouter } from "@effect/rpc";
import { HttpRpcRouter } from "@effect/rpc-http";
import { PaymentRpcs } from "@creativetoolkits/feature-payment/server";
import { PaymentService } from "@creativetoolkits/feature-payment/server";
import { CurrentUser } from "@creativetoolkits/infra-rpc/server";
import { PaymentRepositoryLive } from "@creativetoolkits/data-access-payment/server";
import { StripeServiceLive } from "@creativetoolkits/provider-stripe/server";
import { authenticateRequest } from "../auth/middleware";

/**
 * Payment RPC Layer
 *
 * Provides CurrentUser context by authenticating each request.
 * Composes all service dependencies.
 */
export const PaymentRpcLive = RpcRouter.toHandler(PaymentRpcs).pipe(
  // Provide CurrentUser context from authentication
  Layer.provide(
    Layer.effect(
      CurrentUser,
      Effect.gen(function* () {
        // App-specific authentication logic
        const user = yield* authenticateRequest();
        return user;
      }),
    ),
  ),
  // Provide service dependencies
  Layer.provide(PaymentService.Live),
  Layer.provide(PaymentRepositoryLive),
  Layer.provide(StripeServiceLive),
);

// HTTP adapter for Fastify/Express
export const PaymentRpcHttpHandler = HttpRpcRouter.toHttpApp(PaymentRpcs).pipe(
  Layer.provide(PaymentRpcLive),
);
```

**Layer Composition** ✅:

- ✅ CurrentUser provided via `Layer.effect` (authenticated per request)
- ✅ Service dependencies composed with `Layer.provide`
- ✅ HTTP adapter created with `HttpRpcRouter.toHttpApp`
- ✅ Complete dependency graph in one place

### Step 5: Client Usage (Type-Safe RPC Calls)

Modern @effect/rpc 0.69.5 provides type-safe client creation.

```typescript
// apps/web/src/lib/rpc/payment-client.ts
import { HttpRpcClient } from "@effect/rpc-http";
import { PaymentRpcs } from "@creativetoolkits/feature-payment/client";

// Create typed RPC client
export const PaymentRpcClientLive = HttpRpcClient.layer(PaymentRpcs, {
  url: "/api/rpc/payment",
});

// Usage in application
const program = Effect.gen(function* () {
  const client = yield* PaymentRpcs;

  // Type-safe RPC calls with full inference
  const status = yield* client.getPaymentStatus({ paymentId: "pay_123" });
  console.log(status.status); // "pending" | "succeeded" | "failed"

  const result = yield* client.processPayment({
    productId: "prod_123",
    amount: 1000,
  });
  console.log(result.clientSecret); // string
});

Effect.runPromise(program.pipe(Effect.provide(PaymentRpcClientLive)));
```

### Complete Architecture Flow

Modern RPC architecture with inline handlers and Layer-based context:

```
┌─────────────────────────────────────────────────────────────────────┐
│ CONTRACT LIBRARY (@creativetoolkits/contract-payment)              │
│                                                                     │
│ • Repository interfaces (PaymentRepository)                        │
│ • Domain entities (Payment, ProcessPaymentRequest)                 │
│ • RPC schemas (ProcessPaymentRequest, PaymentRpcError)            │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ DATA-ACCESS LIBRARY (@creativetoolkits/data-access-payment)        │
│                                                                     │
│ • PaymentRepositoryLive (implements contract interface)            │
│ • Database queries via DatabaseService                             │
│ • Returns Option.Option<T> for nullable results                    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE LIBRARY (@creativetoolkits/infra-rpc)               │
│                                                                     │
│ • Context tags (CurrentUser) - NO implementations                  │
│ • Shared RPC types and utilities                                   │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ FEATURE LIBRARY (@creativetoolkits/feature-payment)                │
│                                                                     │
│ • PaymentService (business logic, authorization, orchestration)    │
│ • RPC Router (Rpc.router with inline handlers)                     │
│   - Handlers access CurrentUser context                            │
│   - Handlers delegate to PaymentService                            │
│ • Single rpc.ts file (simple structure)                            │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ APPLICATION LAYER (apps/api)                                        │
│                                                                     │
│ • CurrentUser implementation (Layer.effect with auth)              │
│ • Complete layer composition (service + repo + infra)              │
│ • HTTP adapter with RpcRouter.toHandler                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Why This Modern Pattern?

✅ **Simplicity**: Single `rpc.ts` file with inline handlers (no handler files)
✅ **Type Safety**: Full TypeScript inference from schema to handler to client
✅ **Testability**: Replace CurrentUser layer for testing
✅ **Modern API**: Uses @effect/rpc 0.40+ `Rpc.router` (not obsolete RpcGroup)
✅ **Layer-Based Context**: Middleware via Layer.provide (not `.middleware()`)
✅ **Clear Separation**: Handlers orchestrate, services implement business logic

### Modern RPC Checklist

When implementing RPC in feature libraries, ensure:

- [ ] Uses `Rpc.router({ ... })` (not `RpcGroup.make`)
- [ ] Inline handlers with `Rpc.def({ handler: ... })`
- [ ] CurrentUser accessed with `yield* CurrentUser` in handlers
- [ ] Handlers call services, NOT repositories directly
- [ ] Single `rpc.ts` file (split only if >500 lines)
- [ ] Service has static Live and Test layers
- [ ] RPC schemas reference contract entities
- [ ] Error transformation at service layer (domain → RPC errors)
- [ ] CurrentUser provided via Layer in app, not in feature library
- [ ] Client uses `HttpRpcClient.layer` for type-safe calls

## Service Definition Pattern (NOT Repository)

Feature libraries implement **services** that orchestrate business logic, NOT repositories. Repositories are only in contracts (interfaces) and data-access (implementations).

**Generator Must Create (Service Definition):**
- ✅ Service tag extending `Context.Tag("ServiceName")` with inline interface
- ✅ Methods returning `Effect<A, E>` with explicit error types
- ✅ Static `Live` layer using `Layer.effect` or `Layer.scoped`
- ✅ Dependency injection via `yield* Repository` and `yield* Service`
- ✅ Service in `src/lib/server/service.ts`
- ✅ Error types in `src/lib/server/errors.ts` using `Data.TaggedError`
- ✅ Export service tag and Live layer from `server.ts`

**Generator Must NOT Create (Service Definition):**
- ❌ Repository implementations (belongs in data-access layer)
- ❌ Separate interface files (use inline interface with Context.Tag)
- ❌ Class constructors with manual DI (use Effect layers)
- ❌ Promise-based methods (use Effect)
- ❌ Untyped errors or string errors (use Data.TaggedError)
- ❌ Context.GenericTag (use Context.Tag in Effect 3.0+)

### Service with Inline Interface (< 10 methods)

```typescript
// libs/feature/payment/src/lib/server/service.ts
import { Context, Effect, Layer } from "effect";
import { ProductRepository } from "@creativetoolkits/contract-product";
import { UserRepository } from "@creativetoolkits/contract-user";
import { StripeService } from "@creativetoolkits/provider-stripe/server";
import { DatabaseService } from "@creativetoolkits/infra-database/server";

// Service with inline interface using Context.Tag (Modern Effect 3.0+ pattern)
export class PaymentService extends Context.Tag("PaymentService")<
  PaymentService,
  {
    readonly processPayment: (params: {
      userId: string;
      productId: string;
      amount: number;
    }) => Effect.Effect<PaymentResult, PaymentError>;

    readonly refundPayment: (params: {
      paymentId: string;
      reason?: string;
    }) => Effect.Effect<RefundResult, RefundError>;

    readonly getPaymentHistory: (
      userId: string,
    ) => Effect.Effect<readonly Payment[], DatabaseError>;
  }
>() {}
```

### Service Implementation with Static Live Layer

```typescript
// libs/feature/payment/src/lib/server/service.ts (continued)

// Service implementation as a static Live layer
export class PaymentService extends Context.Tag("PaymentService")<
  PaymentService,
  {
    readonly processPayment: (params: {
      userId: string;
      productId: string;
      amount: number;
    }) => Effect.Effect<PaymentResult, PaymentError>;

    readonly refundPayment: (params: {
      paymentId: string;
      reason?: string;
    }) => Effect.Effect<RefundResult, RefundError>;

    readonly getPaymentHistory: (
      userId: string,
    ) => Effect.Effect<readonly Payment[], DatabaseError>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const stripe = yield* StripeService;
      const database = yield* DatabaseService;
      const productRepo = yield* ProductRepository;
      const userRepo = yield* UserRepository;
      return {
        processPayment: (params) =>
          Effect.gen(function* () {
            // Validate user exists
            const user = yield* userRepo.findById(params.userId).pipe(
              Effect.flatMap(
                Option.match({
                  onNone: () =>
                    Effect.fail(
                      new InvalidUserError({ userId: params.userId }),
                    ),
                  onSome: Effect.succeed,
                }),
              ),
            );

            // Validate product exists
            const product = yield* productRepo.findById(params.productId).pipe(
              Effect.flatMap(
                Option.match({
                  onNone: () =>
                    Effect.fail(
                      new InvalidProductError({ productId: params.productId }),
                    ),
                  onSome: Effect.succeed,
                }),
              ),
            );

            // Create Stripe payment intent
            const payment = yield* stripe.paymentIntents.create({
              amount: params.amount,
              currency: "usd",
              metadata: {
                userId: params.userId,
                productId: params.productId,
              },
            });

            // Record payment in database
            yield* database.transaction((tx) =>
              Effect.gen(function* () {
                yield* tx.insert("payments", {
                  id: payment.id,
                  userId: params.userId,
                  productId: params.productId,
                  amount: params.amount,
                  status: "pending",
                });

                yield* tx.insert("payment_events", {
                  paymentId: payment.id,
                  type: "created",
                  timestamp: new Date(),
                });
              }),
            );

            return {
              paymentId: payment.id,
              clientSecret: payment.client_secret,
              status: "pending",
            };
          }),

        refundPayment: (params) =>
          Effect.gen(function* () {
            // Get payment from database
            const payment = yield* database
              .query((db) =>
                db
                  .selectFrom("payments")
                  .where("id", "=", params.paymentId)
                  .selectAll()
                  .executeTakeFirst(),
              )
              .pipe(
                Effect.flatMap((row) =>
                  row
                    ? Effect.succeed(row)
                    : Effect.fail(
                        new PaymentNotFoundError({
                          paymentId: params.paymentId,
                        }),
                      ),
                ),
              );

            // Process refund through Stripe
            const refund = yield* stripe.refunds.create({
              payment_intent: payment.stripe_payment_id,
              reason: params.reason || "requested_by_customer",
            });

            // Update payment status in database
            yield* database.transaction((tx) =>
              Effect.gen(function* () {
                yield* tx
                  .update("payments")
                  .set({ status: "refunded", refundedAt: new Date() })
                  .where("id", "=", params.paymentId)
                  .execute();

                yield* tx.insert("payment_events", {
                  paymentId: params.paymentId,
                  type: "refunded",
                  timestamp: new Date(),
                  metadata: { refundId: refund.id, reason: params.reason },
                });
              }),
            );

            return {
              refundId: refund.id,
              status: "refunded",
              amount: refund.amount,
            };
          }),

        getPaymentHistory: (userId) =>
          database.query((db) =>
            db
              .selectFrom("payments")
              .where("userId", "=", userId)
              .orderBy("createdAt", "desc")
              .selectAll()
              .execute(),
          ),
      };
    }),
  );
}
```

## Business Operations Pattern

Operations compose multiple services to implement complex business logic:

```typescript
// libs/feature/payment/src/lib/server/operations/checkout.ts
import { Effect, pipe } from "effect";
import { PaymentService } from "../service";
import { InventoryService } from "@creativetoolkits/feature-inventory/server";
import { EmailService } from "@creativetoolkits/infra-messaging/server";

export const checkoutOperation = (params: CheckoutParams) =>
  Effect.gen(function* () {
    const payment = yield* PaymentService;
    const inventory = yield* InventoryService;
    const email = yield* EmailService;

    // Reserve inventory with timeout
    const reservation = yield* inventory.reserve({
      items: params.items,
      duration: "15 minutes",
    });

    // Process payment with automatic inventory release on failure
    const result = yield* pipe(
      payment.processPayment({
        userId: params.userId,
        amount: params.total,
        items: params.items,
      }),
      Effect.tap(() =>
        // Confirm inventory on success
        inventory.confirm(reservation.id),
      ),
      Effect.tapError(() =>
        // Release inventory on failure
        inventory.release(reservation.id),
      ),
    );

    // Send confirmation email (fire and forget)
    yield* email
      .send({
        to: params.userEmail,
        template: "payment-confirmation",
        data: result,
      })
      .pipe(
        Effect.fork, // Run in background
      );

    return result;
  });
```

## Service Orchestration Patterns

**Generator Must Create (Orchestration):**
- ✅ Concurrent calls using `Effect.all` for independent operations
- ✅ Sequential calls using `Effect.gen` with yields for dependent operations
- ✅ Error handling with `Effect.catchAll` or `Effect.tapError`
- ✅ Resource cleanup with `Effect.ensuring` or `Effect.tap`
- ✅ Background tasks with `Effect.fork` for fire-and-forget
- ✅ Timeout handling with `Effect.timeout` for long operations

**Generator Must NOT Create (Orchestration):**
- ❌ Promise.all() for concurrent operations (use Effect.all)
- ❌ try/catch blocks (use Effect error handling)
- ❌ Manual Promise chains (use Effect composition)
- ❌ setTimeout for background tasks (use Effect.fork)
- ❌ Business logic in orchestration (delegate to services)

### Concurrent Service Calls

Execute multiple independent service calls in parallel for better performance:

```typescript
// libs/feature/marketplace/src/lib/server/operations/product-detail.ts
import { Effect } from "effect";
import { ProductRepository } from "@creativetoolkits/contract-product";
import { ReviewRepository } from "@creativetoolkits/contract-review";
import { SellerRepository } from "@creativetoolkits/contract-seller";
import { AnalyticsService } from "@creativetoolkits/feature-analytics/server";

export const getProductDetail = (productId: string) =>
  Effect.gen(function* () {
    const productRepo = yield* ProductRepository;
    const reviewRepo = yield* ReviewRepository;
    const sellerRepo = yield* SellerRepository;
    const analytics = yield* AnalyticsService;

    // Execute all queries concurrently using Effect.all
    const { product, reviews, seller, viewCount } = yield* Effect.all(
      {
        product: productRepo.findById(productId),
        reviews: reviewRepo.findByProduct(productId),
        seller: Effect.gen(function* () {
          const prod = yield* productRepo.findById(productId);
          return yield* sellerRepo.findById(prod.sellerId);
        }),
        viewCount: analytics.getProductViews(productId),
      },
      { concurrency: "unbounded" },
    ); // All run in parallel

    // Track view asynchronously (fire-and-forget)
    yield* analytics.trackProductView(productId).pipe(Effect.fork); // Run in background

    return {
      product,
      reviews,
      seller,
      analytics: { viewCount },
    };
  });
```

### Sequential Service Orchestration

When operations depend on each other, use sequential composition:

```typescript
// libs/feature/order/src/lib/server/operations/order-fulfillment.ts
export const fulfillOrder = (orderId: string) =>
  Effect.gen(function* () {
    const orders = yield* OrderRepository;
    const inventory = yield* InventoryService;
    const shipping = yield* ShippingService;
    const email = yield* EmailService;

    // Step 1: Validate order
    const order = yield* orders.findById(orderId);

    // Step 2: Reserve inventory (depends on order)
    const reservation = yield* inventory.reserve(order.items);

    // Step 3: Create shipment (depends on reservation)
    const shipment = yield* shipping.createShipment({
      orderId,
      items: reservation.items,
      address: order.shippingAddress,
    });

    // Step 4: Update order status (depends on shipment)
    yield* orders.updateStatus(orderId, "shipped");

    // Step 5: Send notification (can be async)
    yield* email
      .sendShipmentNotification(order.customerEmail, shipment)
      .pipe(Effect.fork);

    return { orderId, shipmentId: shipment.id };
  });
```

## Caching Strategies for Feature Services

Effect provides built-in caching operators for optimizing service performance. Choose the right strategy based on your use case.

### Decision Matrix: Caching Strategies

| Strategy            | Scope       | TTL Support | Persistence | Use Case                |
| ------------------- | ----------- | ----------- | ----------- | ----------------------- |
| Effect.cached       | Single proc | Indefinite  | In-memory   | Pure computations       |
| Effect.cachedWithTTL| Single proc | Yes (time)  | In-memory   | API rate limits         |
| Effect.once         | Single proc | Indefinite  | In-memory   | One-time initialization |
| cachedFunction      | Single proc | Indefinite  | In-memory   | Function memoization    |
| CacheService (Redis)| Distributed | Yes (custom)| Persistent  | Multi-server deploys    |
| Layered caching     | Both        | Yes         | Both        | High-traffic endpoints  |

### Pattern 1: Effect.cached - Indefinite Cache

Use for **pure computations** where same input always produces same output:

```typescript
// libs/feature/pricing/src/lib/server/service.ts
export const calculateDiscount = (tier: string, amount: number) =>
  Effect.gen(function* () {
    const rules = yield* DiscountRulesRepository;
    const tierRules = yield* rules.findByTier(tier);

    // Expensive calculation
    const discount = tierRules.rules.reduce(
      (acc, rule) => acc + calculateRule(rule, amount),
      0,
    );

    return discount;
  }).pipe(Effect.cached); // ← Cache indefinitely

// Usage - cached per (tier, amount) combination
const discount1 = yield* calculateDiscount("gold", 100); // Fresh
const discount2 = yield* calculateDiscount("gold", 100); // Cached!
```

**When to use:**
- ✅ Pure calculations (deterministic output)
- ✅ Reference data that rarely changes
- ✅ Expensive computations
- ❌ User-specific dynamic data
- ❌ Time-sensitive data

### Pattern 2: Effect.cachedWithTTL - Time-Based Expiration

Use for **frequently accessed data** that changes periodically:

```typescript
// libs/feature/catalog/src/lib/server/service.ts
export const getFeaturedProducts = () =>
  Effect.gen(function* () {
    const repo = yield* ProductRepository;
    const products = yield* repo.findByCriteria({ featured: true });
    return products;
  }).pipe(Effect.cachedWithTTL("10 minutes")); // ← Refresh every 10 minutes

// Usage
const products1 = yield* getFeaturedProducts(); // Fresh from DB
const products2 = yield* getFeaturedProducts(); // Cached
// ... 11 minutes later ...
const products3 = yield* getFeaturedProducts(); // Fresh again
```

**When to use:**
- ✅ API responses with rate limits
- ✅ Frequently accessed data
- ✅ Reducing database load
- ❌ Data requiring immediate consistency

### Pattern 3: Layered Caching (L1: Memory + L2: Redis)

Use for **high-traffic endpoints** in multi-server deployments:

```typescript
// libs/feature/product/src/lib/server/service.ts
export const getProductDetails = (productId: string) =>
  Effect.gen(function* () {
    // L2 Cache: Check Redis first
    const cache = yield* CacheService;
    const cached = yield* cache.get<Product>(`product:${productId}`);

    if (Option.isSome(cached)) {
      return cached.value;
    }

    // Cache miss - fetch from repository
    const repo = yield* ProductRepository;
    const product = yield* repo.findById(productId);

    if (Option.isNone(product)) {
      return yield* Effect.fail(new ProductNotFoundError({ productId }));
    }

    // Store in Redis with 1-hour TTL
    yield* cache.set(`product:${productId}`, product.value, "1 hour");

    return product.value;
  }).pipe(Effect.cached); // ← L1 Cache: In-memory

// Pattern: L1 (fast, per-process) + L2 (shared, durable)
```

**When to use:**
- ✅ High-traffic endpoints
- ✅ Multi-server deployments
- ✅ Expensive database queries
- ✅ Need cache consistency across servers

### Pattern 4: Effect.once - One-Time Initialization

Use for **application setup** that should run exactly once:

```typescript
// libs/feature/config/src/lib/server/service.ts
export const initializeFeatureFlags = () =>
  Effect.gen(function* () {
    const config = yield* ConfigService;
    const logger = yield* LoggingService;

    yield* logger.info("Loading feature flags");
    const flags = yield* config.loadFeatureFlags();

    yield* logger.info("Feature flags initialized", { count: flags.length });
    return flags;
  }).pipe(Effect.once); // ← Runs exactly once

// Multiple calls share same result
const flags1 = yield* initializeFeatureFlags(); // Initializes
const flags2 = yield* initializeFeatureFlags(); // Returns cached
```

**When to use:**
- ✅ Application initialization
- ✅ Configuration loading
- ✅ One-time setup operations

### Pattern 5: cachedFunction - Function Memoization

Use for **pure functions** with multiple argument combinations:

```typescript
import { cachedFunction } from "effect/Function";

// libs/feature/pricing/src/lib/server/service.ts
const calculateShippingCost = cachedFunction(
  (weight: number, distance: number, express: boolean) =>
    Effect.gen(function* () {
      const rules = yield* ShippingRulesRepository;
      // Expensive calculation...
      return calculateCost(rules, weight, distance, express);
    }),
);

// Each unique (weight, distance, express) combination is cached
export const getShippingQuote = (order: Order) =>
  Effect.gen(function* () {
    const cost = yield* calculateShippingCost(
      order.weight,
      order.distance,
      order.expressShipping,
    );
    return { cost, estimatedDays: calculateDays(order.distance) };
  });
```

**When to use:**
- ✅ Pure function memoization
- ✅ Expensive calculations with multiple inputs
- ✅ Deterministic transformations

### Pattern 6: Cache Invalidation

Always invalidate cache when underlying data changes:

```typescript
// libs/feature/product/src/lib/server/service.ts
export const updateProduct = (
  productId: string,
  updates: ProductUpdate,
) =>
  Effect.gen(function* () {
    const repo = yield* ProductRepository;
    const cache = yield* CacheService;

    // Update database
    const updated = yield* repo.update(productId, updates);

    // Invalidate cache (write-through pattern)
    yield* cache.delete(`product:${productId}`);

    return updated;
  });

// Pattern: Write-through invalidation
// 1. Update database
// 2. Invalidate cache
// 3. Next read will refresh cache
```

### Caching Best Practices

**Do:**
- ✅ Cache expensive computations
- ✅ Use TTL for time-sensitive data
- ✅ Invalidate cache on writes
- ✅ Layer caches (L1 + L2) for high traffic
- ✅ Monitor cache hit rates

**Don't:**
- ❌ Cache user-specific data indefinitely
- ❌ Cache data requiring immediate consistency
- ❌ Forget to invalidate on updates
- ❌ Over-cache (increased memory usage)

**See Also:**
- [EFFECT_PATTERNS.md - Built-in Caching Operators](./EFFECT_PATTERNS.md#built-in-effect-caching-operators)
- [INFRA.md - CacheService Implementation](./INFRA.md)

---

## Runtime Preservation for Callbacks

When integrating with **callback-based APIs** (WebSockets, event emitters, SDK callbacks), you must preserve the Effect runtime to execute Effect programs within callbacks.

> **Important**: Runtime preservation is ONLY needed at the **boundary between Effect and non-Effect code**. When using Effect-based infrastructure services like DatabaseService, DO NOT capture runtime manually - the infra layer handles this internally.

### Pattern: WebSocket Handler (Effect/Callback Boundary)

```typescript
// libs/feature/realtime/src/lib/server/websocket-handler.ts
import { Effect, Runtime } from "effect";
import type { WebSocket } from "ws";
import { MessageService } from "./service";
import { LoggingService } from "@creativetoolkits/infra-logging";

export const createWebSocketHandler = Effect.gen(function* () {
  // ✅ CORRECT: Capture runtime for WebSocket callbacks
  const runtime = yield* Effect.runtime<MessageService | LoggingService>();
  const runFork = Runtime.runFork(runtime);

  return (ws: WebSocket) => {
    // WebSocket callbacks execute outside Effect context
    ws.on("message", (data) => {
      const program = Effect.gen(function* () {
        const messageService = yield* MessageService;
        const logger = yield* LoggingService;

        const parsed = JSON.parse(data.toString());
        yield* logger.info("Received message", { data: parsed });

        // Process message with full Effect context
        const response = yield* messageService.processMessage(parsed);

        ws.send(JSON.stringify(response));
      });

      // ✅ Run Effect program with captured runtime
      runFork(program);
    });

    ws.on("error", (error) => {
      const program = Effect.gen(function* () {
        const logger = yield* LoggingService;
        yield* logger.error("WebSocket error", { error });
      });

      runFork(program);
    });
  };
});
```

### Pattern: Event Emitter Integration

```typescript
// libs/feature/notifications/src/lib/server/event-handler.ts
import { Effect, Runtime } from "effect";
import { EventEmitter } from "events";
import { NotificationService } from "./service";
import { LoggingService } from "@creativetoolkits/infra-logging";

export const setupEventHandlers = Effect.gen(function* () {
  const runtime = yield* Effect.runtime<NotificationService | LoggingService>();
  const runFork = Runtime.runFork(runtime);

  const emitter = new EventEmitter();

  // Handle payment events
  emitter.on("payment.completed", (data) => {
    const program = Effect.gen(function* () {
      const notifications = yield* NotificationService;
      const logger = yield* LoggingService;

      yield* logger.info("Payment completed event", { data });
      yield* notifications.sendPaymentReceipt(data.userId, data.paymentId);
    });

    runFork(program);
  });

  // Handle errors in event handlers
  emitter.on("error", (error) => {
    const program = Effect.gen(function* () {
      const logger = yield* LoggingService;
      yield* logger.error("Event handler error", { error });
    });

    runFork(program);
  });

  return emitter;
});
```

### When to Use Runtime Preservation

✅ **Use runtime preservation when at Effect/Callback boundary:**

- Integrating with WebSocket connections (`ws.on("message", ...)`)
- Handling event emitter callbacks (`emitter.on("event", ...)`)
- Using timers/intervals that need Effect context (`setTimeout`, `setInterval`)
- Third-party SDK callbacks (streaming APIs, webhook handlers)
- Browser event handlers (DOM events, fetch callbacks)

❌ **Don't use runtime preservation when:**

- **Using Effect-based infrastructure services** (DatabaseService.transaction, CacheService, etc.) ← Infra handles runtime internally
- You're already inside an Effect.gen (just use `yield*`)
- The API already returns an Effect (use Effect composition)
- You can refactor to use Effect primitives (Effect.async, Effect.acquireRelease)

### The Rule: Runtime Boundaries

**Capture runtime ONLY at the boundary between Effect code and non-Effect code.**

- ✅ SDK callbacks → Need runtime
- ✅ DOM events → Need runtime
- ✅ WebSocket handlers → Need runtime
- ❌ `database.transaction((tx) => Effect.gen(...))` → NO runtime needed (infra handles it)
- ❌ `cache.get(key)` → NO runtime needed (returns Effect)
- ❌ Inside Effect.gen → NO runtime needed (use yield\*)

### Best Practices

1. **Capture runtime at service initialization**, not per request
2. **Use `Runtime.runFork`** for fire-and-forget operations (WebSocket messages, events)
3. **Use `Runtime.runPromise`** when you need to await the result
4. **Provide minimal runtime scope** - only include necessary services
5. **Handle errors in the Effect program**, not at the runFork level
6. **Trust the infra layer** - don't re-capture runtime when using Effect-based services

## Workflow Pattern

Multi-step workflows with retries and error recovery:

```typescript
// libs/feature/payment/src/lib/server/workflows/subscription.ts
import { Effect, Schedule, pipe } from "effect";
import { PaymentService } from "../service";

export class SubscriptionWorkflow {
  static readonly process = (subscriptionId: string) =>
    pipe(
      Effect.gen(function* () {
        const payment = yield* PaymentService;

        // Step 1: Validate subscription
        const subscription = yield* payment.getSubscription(subscriptionId);

        // Step 2: Check payment method
        const paymentMethod = yield* payment.getPaymentMethod(
          subscription.paymentMethodId,
        );

        // Step 3: Process recurring payment
        const result = yield* payment.processRecurringPayment({
          subscriptionId,
          amount: subscription.amount,
          paymentMethodId: paymentMethod.id,
        });

        // Step 4: Update subscription status
        yield* payment.updateSubscriptionStatus(subscriptionId, "active");

        return result;
      }),
      // Retry with exponential backoff
      Effect.retry(
        Schedule.exponential("1 second").pipe(
          Schedule.jittered,
          Schedule.compose(Schedule.recurs(3)),
        ),
      ),
      // Handle final failure
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          const payment = yield* PaymentService;
          yield* payment.updateSubscriptionStatus(subscriptionId, "failed");
          yield* payment.notifySubscriptionFailure(subscriptionId, error);
          return yield* Effect.fail(error);
        }),
      ),
    );
}
```

## Error Handling with Data.TaggedError

**Generator Must Create (Error Handling):**
- ✅ Domain errors using `Data.TaggedError("ErrorName")` in `src/lib/server/errors.ts`
- ✅ Error types with context properties (readonly fields)
- ✅ Union type for all domain errors (e.g., `type PaymentError = ...`)
- ✅ RPC Schema errors using `Schema.TaggedError` in contract libraries
- ✅ Error transformation at RPC handler boundaries
- ✅ Export error types from `server.ts` and `index.ts`

**Generator Must NOT Create (Error Handling):**
- ❌ String errors or Error class instances
- ❌ Throwing exceptions (use Effect.fail)
- ❌ Untyped catch blocks
- ❌ Error codes as magic strings (use tagged errors)
- ❌ RPC errors in service layer (use Data.TaggedError)
- ❌ Mixed error types (domain + infrastructure) in same union

```typescript
// libs/feature/payment/src/lib/server/errors.ts
import { Data } from "effect";

// Business errors using Data.TaggedError (runtime errors)
export class PaymentDeclined extends Data.TaggedError("PaymentDeclined")<{
  readonly reason: string;
  readonly code: string;
  readonly amount: number;
}> {}

export class InsufficientFunds extends Data.TaggedError("InsufficientFunds")<{
  readonly available: number;
  readonly required: number;
}> {}

export class PaymentMethodExpired extends Data.TaggedError(
  "PaymentMethodExpired",
)<{
  readonly expiredAt: Date;
}> {}

export class InvalidUserError extends Data.TaggedError("InvalidUserError")<{
  readonly userId: string;
}> {}

export class InvalidProductError extends Data.TaggedError(
  "InvalidProductError",
)<{
  readonly productId: string;
}> {}

export class PaymentNotFoundError extends Data.TaggedError(
  "PaymentNotFoundError",
)<{
  readonly paymentId: string;
}> {}

// Union type for all payment errors
export type PaymentError =
  | PaymentDeclined
  | InsufficientFunds
  | PaymentMethodExpired
  | InvalidUserError
  | InvalidProductError
  | PaymentNotFoundError;

// Error transformation helper
export const transformDomainError = <E, A>(
  mapError: (error: E) => PaymentError,
) =>
  Effect.catchAll<A, E, PaymentError>((error) => Effect.fail(mapError(error)));
```

### RPC Error Schemas (Schema.TaggedError)

**IMPORTANT**: Use `Schema.TaggedError` for errors that cross RPC boundaries, NOT `Data.TaggedError`.

```typescript
// libs/contract/payment/src/lib/rpc/errors.ts
import { Schema } from "effect";

// ✅ CORRECT: Schema.TaggedError for RPC boundaries
export class PaymentRpcError extends Schema.TaggedError<PaymentRpcError>()(
  "PaymentRpcError",
  {
    message: Schema.String,
    code: Schema.String,
    timestamp: Schema.DateTimeUtc, // Schema encoding for Date
    metadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  },
) {}

// Transform domain errors to RPC errors at the boundary
export const toRpcError = (domainError: PaymentError): PaymentRpcError =>
  new PaymentRpcError({
    message: domainError.message || "Payment operation failed",
    code: domainError._tag,
    timestamp: new Date().toISOString(),
    metadata: domainError,
  });
```

**Decision Rule**:

- **Domain layer** (services, repositories): Use `Data.TaggedError`
- **RPC boundary** (contract/rpc schemas): Use `Schema.TaggedError`
- **Transform at boundary**: Convert domain errors to RPC errors in handlers

**Why Schema.TaggedError for RPC?**

- Enables runtime schema validation on encode/decode
- Supports complex type encoding (dates, branded types)
- Works seamlessly with `@effect/rpc` serialization
- Type-safe across network boundaries

## Client-Side Patterns

### RPC Client Configuration

```typescript
// libs/feature/payment/src/lib/rpc/client.ts
import { HttpResolver } from "@effect/rpc-http";
import { HttpClient } from "@effect/platform";
import { Effect, Layer, Context } from "effect";
import { RpcClient } from "@effect/rpc";
import { PaymentRpcs } from "./router";
import { AuthMiddlewareClientLive } from "@creativetoolkits/infra-rpc/client";

// Define client service tag
export class PaymentRpcClient extends Context.Tag("PaymentRpcClient")<
  PaymentRpcClient,
  RpcClient.RpcClient<typeof PaymentRpcs>
>() {}

// Create client layer
export const PaymentRpcClientLive = Layer.effect(
  PaymentRpcClient,
  Effect.gen(function* () {
    const http = yield* HttpClient.HttpClient;

    return RpcClient.make(PaymentRpcs, {
      transport: HttpResolver.make(
        http.post("/api/rpc/payment", {
          headers: { "Content-Type": "application/json" },
        }),
      ),
    });
  }),
).pipe(
  Layer.provide(AuthMiddlewareClientLive), // Client middleware for auth headers
);
```

### React Hook with Effect RPC

```typescript
// libs/feature/payment/src/lib/client/hooks/use-payment.ts
import { useState, useCallback, useContext } from 'react';
import { Effect, Exit, Runtime } from 'effect';
import { PaymentRpcClient } from '../../rpc/client';
import { EffectRuntimeContext } from '../contexts/runtime-context';

export function usePayment() {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get runtime from React context (set up at app level)
  const runtime = useContext(EffectRuntimeContext);

  const processPayment = useCallback(
    async (params: ProcessPaymentParams) => {
      setProcessing(true);
      setError(null);

      // Create Effect program
      const program = Effect.gen(function* () {
        const client = yield* PaymentRpcClient;
        return yield* client.processPayment(params);
      });

      // Run with runtime that has all layers
      const exit = await Runtime.runPromiseExit(runtime)(program);

      if (Exit.isFailure(exit)) {
        const cause = Exit.causeSquash(exit);
        setError(cause._tag || 'Payment failed');
        setProcessing(false);
        throw new Error(cause.message || 'Payment failed');
      }

      setProcessing(false);
      return exit.value;
    },
    [runtime]
  );

  const getPaymentStatus = useCallback(
    async (paymentId: string) => {
      const program = Effect.gen(function* () {
        const client = yield* PaymentRpcClient;
        return yield* client.getPaymentStatus({ paymentId });
      });

      const exit = await Runtime.runPromiseExit(runtime)(program);

      if (Exit.isSuccess(exit)) {
        return exit.value;
      }

      throw new Error('Failed to get payment status');
    },
    [runtime]
  );

  return {
    processPayment,
    getPaymentStatus,
    processing,
    error,
    reset: () => setError(null),
  };
}

// React component example
// libs/feature/payment/src/lib/client/components/payment-button.tsx
import { usePayment } from '../hooks/use-payment';

export function PaymentButton({ productId, amount }: PaymentButtonProps) {
  const { initiatePayment, processing, error } = usePayment();

  const handleClick = async () => {
    try {
      const result = await initiatePayment({
        productId,
        amount,
      });
      // Handle success
    } catch (error) {
      // Error already set in hook
    }
  };

  return (
    <>
      <button onClick={handleClick} disabled={processing}>
        {processing ? 'Processing...' : 'Pay Now'}
      </button>
      {error && <div className="error">{error}</div>}
    </>
  );
}
```

### Client State Management with Effect Atom

```typescript
// libs/feature/cart/src/lib/server/cart-store.ts
import { Atom, Context, Effect, Layer } from "effect";
import type { CartItem } from "../types";

/**
 * CartStore service manages shopping cart state using Effect Atom for thread-safe,
 * concurrent state management. Provides operations for cart manipulation.
 */
export interface CartStoreState {
  readonly items: CartItem[];
}

export class CartStore extends Context.Tag("CartStore")<
  CartStore,
  {
    readonly getItems: () => Effect.Effect<CartItem[]>;
    readonly addItem: (item: CartItem) => Effect.Effect<void>;
    readonly removeItem: (productId: string) => Effect.Effect<void>;
    readonly updateQuantity: (productId: string, quantity: number) => Effect.Effect<void>;
    readonly clearCart: () => Effect.Effect<void>;
    readonly getTotalPrice: () => Effect.Effect<number>;
  }
>() {
  /**
   * Live implementation using Effect Atom for thread-safe state
   */
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      // Create atom with initial cart state
      const cartAtom = yield* Atom.make<CartStoreState>({ items: [] });

      return {
        /**
         * Get all items in cart
         */
        getItems: () =>
          Effect.gen(function* () {
            const state = yield* Atom.get(cartAtom);
            return state.items;
          }),

        /**
         * Add or replace item in cart (updates if productId already exists)
         */
        addItem: (item: CartItem) =>
          Atom.update(cartAtom, (state) => ({
            items: [
              ...state.items.filter((i) => i.productId !== item.productId),
              item,
            ],
          })),

        /**
         * Remove item by productId
         */
        removeItem: (productId: string) =>
          Atom.update(cartAtom, (state) => ({
            items: state.items.filter((item) => item.productId !== productId),
          })),

        /**
         * Update quantity for item by productId
         */
        updateQuantity: (productId: string, quantity: number) =>
          Atom.update(cartAtom, (state) => ({
            items: state.items.map((item) =>
              item.productId === productId ? { ...item, quantity } : item,
            ),
          })),

        /**
         * Clear all items from cart
         */
        clearCart: () =>
          Atom.set(cartAtom, { items: [] }),

        /**
         * Calculate total price of all items
         */
        getTotalPrice: () =>
          Effect.gen(function* () {
            const state = yield* Atom.get(cartAtom);
            return state.items.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0
            );
          }),
      };
    })
  );

  /**
   * Test layer with in-memory implementation (no persistence)
   */
  static readonly Test = Layer.effect(
    this,
    Effect.gen(function* () {
      const cartAtom = yield* Atom.make<CartStoreState>({ items: [] });

      return {
        getItems: () =>
          Effect.gen(function* () {
            const state = yield* Atom.get(cartAtom);
            return state.items;
          }),
        addItem: (item: CartItem) =>
          Atom.update(cartAtom, (state) => ({
            items: [
              ...state.items.filter((i) => i.productId !== item.productId),
              item,
            ],
          })),
        removeItem: (productId: string) =>
          Atom.update(cartAtom, (state) => ({
            items: state.items.filter((item) => item.productId !== productId),
          })),
        updateQuantity: (productId: string, quantity: number) =>
          Atom.update(cartAtom, (state) => ({
            items: state.items.map((item) =>
              item.productId === productId ? { ...item, quantity } : item,
            ),
          })),
        clearCart: () => Atom.set(cartAtom, { items: [] }),
        getTotalPrice: () =>
          Effect.gen(function* () {
            const state = yield* Atom.get(cartAtom);
            return state.items.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0
            );
          }),
      };
    })
  );
}
```

**Key Benefits:**
- **Thread-safe**: Effect Atom ensures all updates are atomic and race-condition free
- **Type-safe**: Full TypeScript inference with Effect's type system
- **Concurrent**: Multiple fibers can safely update state simultaneously
- **Composable**: Easily integrates with other Effect services via dependency injection
- **Testable**: Test layer provides isolated state for testing without side effects

**For React Integration:**
```typescript
// libs/feature/cart/src/lib/client/hooks/use-cart.ts
import { useEffect, useState } from "react";
import { Effect, RunSync } from "effect";
import { CartStore } from "../store";

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    // Fetch initial state - run Effect synchronously in browser
    const program = Effect.gen(function* () {
      const store = yield* CartStore;
      const cartItems = yield* store.getItems();
      const price = yield* store.getTotalPrice();
      return { cartItems, price };
    });

    const result = RunSync.runSync(program);
    setItems(result.cartItems);
    setTotalPrice(result.price);
  }, []);

  const addItem = (item: CartItem) => {
    const program = Effect.gen(function* () {
      const store = yield* CartStore;
      yield* store.addItem(item);
      const newItems = yield* store.getItems();
      setItems(newItems);
    });
    RunSync.runSync(program);
  };

  return { items, totalPrice, addItem };
}
```

### Optimistic Updates with Effect RPC

```typescript
// libs/feature/wishlist/src/lib/client/hooks/use-wishlist.ts
import { useOptimistic, useEffect, useState } from "react";
import { Effect, Exit, Stream, Queue } from "effect";
import { WishlistServiceClient } from "../rpc/client";

export function useWishlist(userId: string) {
  const client = WishlistServiceClient.use();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial load and subscription
  useEffect(() => {
    const program = Effect.gen(function* () {
      // Get initial wishlist
      const initial = yield* client.getWishlist(userId);
      setWishlist(initial);
      setLoading(false);

      // Subscribe to updates via Effect Stream
      const updates = yield* client.subscribeToWishlist(userId);

      yield* Stream.runForEach(updates, (item) =>
        Effect.sync(() => {
          setWishlist((prev) => {
            const filtered = prev.filter((i) => i.productId !== item.productId);
            return item.removed ? filtered : [...filtered, item];
          });
        }),
      );
    });

    const fiber = Effect.runFork(program);

    return () => {
      Effect.runFork(fiber.interruptFork);
    };
  }, [userId, client]);

  // Optimistic state
  const [optimisticWishlist, addOptimistic] = useOptimistic(
    wishlist,
    (current, productId: string) => [
      ...current,
      { productId, addedAt: new Date() },
    ],
  );

  const addToWishlist = async (productId: string) => {
    // Optimistically update UI
    addOptimistic(productId);

    // Execute RPC
    const program = client.addToWishlist({ userId, productId });
    const exit = await Effect.runPromiseExit(program);

    if (Exit.isFailure(exit)) {
      // Rollback on error (the subscription will restore correct state)
      console.error("Failed to add to wishlist", exit.cause);
    }
  };

  return {
    wishlist: optimisticWishlist,
    addToWishlist,
    isLoading: loading,
  };
}
```

## Layer Composition

```typescript
// libs/feature/payment/src/lib/server/layers.ts
import { Layer } from "effect";
import { PaymentService } from "./service";
import { ProductRepositoryLive } from "@creativetoolkits/data-access-product/server";
import { UserRepositoryLive } from "@creativetoolkits/data-access-user/server";
import { DatabaseServiceLive } from "@creativetoolkits/infra-database/server";
import { StripeServiceLive } from "@creativetoolkits/provider-stripe/server";
import { LoggingServiceLive } from "@creativetoolkits/infra-logging/server";

// Complete layer with all dependencies
export const PaymentLive = PaymentService.Live.pipe(
  Layer.provide([
    ProductRepositoryLive,
    UserRepositoryLive,
    DatabaseServiceLive,
    StripeServiceLive,
    LoggingServiceLive,
  ]),
);

// Test layer with mocked dependencies
export const PaymentTest = PaymentService.Live.pipe(
  Layer.provide([
    ProductRepositoryTest,
    UserRepositoryTest,
    DatabaseServiceTest,
    StripeServiceMock,
    LoggingServiceTest,
  ]),
);
```

## Testing & Spec File Patterns

Feature libraries test business logic and service orchestration. Tests use `@effect/vitest` with minimal mocking for rapid iteration.

> **📘 Comprehensive Testing Guide:** See [TESTING_PATTERNS.md](./TESTING_PATTERNS.md) for complete testing standards and patterns.

**Standard Testing Pattern:**
- ✅ ALL imports from `@effect/vitest`
- ✅ ALL tests use `it.scoped()`
- ✅ ALL layers wrapped with `Layer.fresh()`

**Generator Must Create (Testing):**
- ✅ Single test file `src/lib/service.spec.ts`
- ✅ Tests using `it.scoped()` from `@effect/vitest`
- ✅ Inline mocks with `Layer.succeed` for dependencies
- ✅ Test business logic and orchestration behavior
- ✅ Vitest configuration with `@effect/vitest/setup`
- ✅ Test layer composition with mock dependencies
- ✅ All test layers wrapped with `Layer.fresh()`

**Generator Must NOT Create (Testing):**
- ❌ Separate `mock-factories.ts` files (inline mocks)
- ❌ Separate `test-layer.ts` files (inline layers)
- ❌ Multiple test files per service (one file only)
- ❌ Tests for infrastructure/providers (wrong layer)
- ❌ Tests for repositories (belongs in data-access)
- ❌ Manual `Effect.runPromise` (use `it.scoped()`)
- ❌ Use of `it.effect()` (deprecated in favor of `it.scoped()`)

### Test File Structure

**Single Test File**: `src/lib/service.spec.ts`

Tests verify that services correctly implement business logic while orchestrating dependencies. Use inline mocks with `it.scoped`.

#### ✅ DO:

- ✅ Test business logic (does the service implement the use case correctly?)
- ✅ Import ALL test utilities from `@effect/vitest` (describe, expect, it)
- ✅ Use `it.scoped()` for ALL tests (consistent with project standards)
- ✅ Wrap ALL test layers with `Layer.fresh()` for isolation
- ✅ Create inline mocks with `Layer.succeed`
- ✅ Focus on behavior, not implementation details
- ✅ Keep tests in one file: `src/lib/service.spec.ts`

#### ❌ DON'T:

- ❌ Create separate `mock-factories.ts` files (inline test data instead)
- ❌ Create separate `test-layer.ts` files (inline mocks instead)
- ❌ Test infrastructure (database, cache) logic (that's tested in infra/provider layers)
- ❌ Test repository implementations (that's tested in data-access layer)
- ❌ Create 5-6 test files (one file is sufficient)
- ❌ Use manual `Effect.runPromise` (use `it.scoped()` instead)
- ❌ Use `it.effect()` (deprecated in favor of `it.scoped()`)
- ❌ Mix imports from `vitest` and `@effect/vitest` (use @effect/vitest only)
- ❌ Forget `Layer.fresh()` wrapping (causes test state leakage)

### Example: Service Tests

**File**: `src/lib/service.spec.ts`

```typescript
// src/lib/service.spec.ts
import { Effect, Layer } from "effect";
import { describe, expect, it } from "@effect/vitest"; // ✅ All from @effect/vitest
import { PaymentService } from "./service";
import { ProductRepository } from "@creativetoolkits/contract-product";
import { StripeService } from "@creativetoolkits/provider-stripe";

// Mock dependencies inline
const ProductRepositoryMock = Layer.succeed(ProductRepository, {
  findById: (id) =>
    Effect.succeed({
      id,
      name: "Test Product",
      price: 1000,
      sellerId: "seller-123",
    }),
});

const StripeServiceMock = Layer.succeed(StripeService, {
  paymentIntents: {
    create: (params) =>
      Effect.succeed({
        id: "pi_test_123",
        client_secret: "secret_test",
        status: "requires_payment_method",
        amount: params.amount,
      }),
  },
});

describe("PaymentService", () => {
  // Use it.scoped for all tests
  it.scoped("processPayment creates payment intent", () => // ✅ Always it.scoped
    Effect.gen(function* () {
      const payment = yield* PaymentService;

      const result = yield* payment.processPayment({
        userId: "user_123",
        productId: "prod_456",
        amount: 1000,
      });

      expect(result.paymentId).toBe("pi_test_123");
      expect(result.status).toBe("pending");
    }).pipe(
      Effect.provide(
        Layer.fresh( // ✅ Always Layer.fresh
          Layer.mergeAll(
            PaymentServiceLive,
            ProductRepositoryMock,
            StripeServiceMock,
          )
        ),
      ),
    ),
  );

  it.scoped("handles payment failure gracefully", () => // ✅ Always it.scoped
    Effect.gen(function* () {
      const failingStripeMock = Layer.succeed(StripeService, {
        paymentIntents: {
          create: () =>
            Effect.fail(
              new StripeApiError({
                message: "Insufficient funds",
                code: "card_declined",
              }),
            ),
        },
      });

      const payment = yield* PaymentService;

      const result = yield* Effect.either(
        payment.processPayment({
          userId: "user_123",
          productId: "prod_456",
          amount: 1000,
        }),
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left._tag).toBe("PaymentError");
      }
    }).pipe(
      Effect.provide(
        Layer.fresh( // ✅ Always Layer.fresh
          Layer.mergeAll(
            PaymentServiceLive,
            ProductRepositoryMock,
            failingStripeMock,
          )
        ),
      ),
    ),
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

1. **One Test File**: Keep all service tests in `src/lib/service.spec.ts`
2. **Inline Mocks**: Create mocks inline with `Layer.succeed`, no separate files
3. **Use it.scoped()**: ALL tests use `it.scoped()` for consistency (not `it.effect()`)
4. **Always Layer.fresh**: Wrap ALL test layers with `Layer.fresh()` for isolation
5. **Focus on Business Logic**: Test use cases, not infrastructure coordination
6. **Minimal Mocking**: Mock only dependencies, not the service itself

## Platform-Specific Exports

**Generator Platform Export Decision Tree:**

```
Feature Generator Platform Decision:
├── Has React hooks/components/Atom state?
│   → YES: Create client.ts (React hooks, Atom state, components)
│   → NO: Skip client.ts
│
├── Has server-side services/business logic?
│   → YES: Create server.ts (ALWAYS - default for features)
│   → NO: Not a feature library (wrong layer)
│
└── Has edge runtime middleware/validation?
    → YES: Create edge.ts (rare - only for Next.js middleware, Vercel Edge)
    → NO: Skip edge.ts
```

**Generator Must Create (Platform Exports):**
- ✅ `index.ts` - Shared types and errors only (no runtime code)
- ✅ `server.ts` - ALWAYS create (services, layers, operations, RPC)
- ✅ `client.ts` - IF has React hooks, Atom state, or components
- ✅ `edge.ts` - IF has middleware or edge-compatible code (rare)
- ✅ Additional entry points in `project.json` build config
- ✅ Platform tags in `project.json` tags array

**Generator Must NOT Create (Platform Exports):**
- ❌ `client.ts` without React hooks or components
- ❌ `edge.ts` for standard server-side code (use server.ts)
- ❌ Runtime code in `index.ts` (types/errors only)
- ❌ Platform-specific code in shared files

**Export Examples:**

```typescript
// libs/feature/payment/src/index.ts
// Shared types only - safe for all platforms
export type {
  PaymentParams,
  PaymentResult,
  RefundResult,
  PaymentStatus,
} from "./lib/shared/types";

// libs/feature/payment/src/client.ts
// Client-side exports (React hooks, components)
export { usePayment } from "./lib/client/hooks/use-payment";
export { PaymentForm } from "./lib/client/components/payment-form";
export { PaymentButton } from "./lib/client/components/payment-button";

// libs/feature/payment/src/server.ts
// Server-side exports (services, layers)
export { PaymentService } from "./lib/server/service";
export { PaymentLive, PaymentTest } from "./lib/server/layers";
export { checkoutOperation } from "./lib/server/operations/checkout";
export * from "./lib/server/errors";

// libs/feature/payment/src/edge.ts
// Edge runtime exports (middleware compatible)
export { validatePaymentWebhook } from "./lib/edge/middleware";
export { PaymentEdgeService } from "./lib/edge/service";
```

## Nx Configuration

### project.json

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
        "declaration": true,
        "declarationMap": true,
        "batch": true,
        "clean": false,
        "additionalEntryPoints": [
          "libs/feature/payment/src/client.ts",
          "libs/feature/payment/src/server.ts",
          "libs/feature/payment/src/edge.ts"
        ]
      }
    },
    "test": {
      "executor": "@nx/vite:test",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "options": {
        "config": "libs/feature/payment/vitest.config.ts",
        "passWithNoTests": true
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "options": {
        "lintFilePatterns": ["libs/feature/payment/**/*.ts"]
      }
    },
    "typecheck": {
      "executor": "@nx/js:tsc",
      "options": {
        "tsConfig": "libs/feature/payment/tsconfig.lib.json",
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
    "tsBuildInfoFile": "../../../.tsbuildinfo/feature-payment.tsbuildinfo",
    "outDir": "../../../dist/libs/feature/payment"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["vitest.config.ts", "src/**/*.spec.ts", "src/**/*.test.ts"]
}
```

### package.json

```json
{
  "name": "@creativetoolkits/feature-payment",
  "version": "0.0.1",
  "type": "module",
  "main": "./src/index.js",
  "types": "./src/index.d.ts",
  "exports": {
    ".": {
      "import": "./src/index.js",
      "types": "./src/index.d.ts"
    },
    "./client": {
      "import": "./src/client.js",
      "types": "./src/client.d.ts"
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
    "effect": "^3.0.0",
    "react": "^19.0.0"
  },
  "dependencies": {
    "@creativetoolkits/contract-product": "*",
    "@creativetoolkits/contract-user": "*",
    "@creativetoolkits/data-access-product": "*",
    "@creativetoolkits/data-access-user": "*",
    "@creativetoolkits/infra-database": "*",
    "@creativetoolkits/infra-logging": "*",
    "@creativetoolkits/provider-stripe": "*"
  }
}
```

## Dependencies

Feature libraries can depend on:

- `@creativetoolkits/contract-*` - Domain contracts and interfaces
- `@creativetoolkits/data-access-*` - Data repositories
- `@creativetoolkits/infra-*` - Infrastructure services
- `@creativetoolkits/provider-*` - External service adapters
- `@creativetoolkits/ui-*` - UI components (client exports only)
- `@creativetoolkits/types-*` - Shared types
- `@creativetoolkits/util-*` - Utilities
- Other `@creativetoolkits/feature-*` - Feature composition

## Best Practices

1. **Service Granularity**: One service per feature domain
2. **Operation Composition**: Complex workflows built from simple operations
3. **Error Transformation**: Transform domain errors to feature-specific errors
4. **Layer Independence**: Services should work with different layer configurations
5. **Client-Server Separation**: Clear boundaries between runtime environments
6. **Testability**: Provide test layers for all services
7. **Documentation**: Document service contracts and operations

## Anti-Patterns to Avoid

1. ❌ **Direct database access** - Use data-access repositories
2. ❌ **Business logic in UI components** - Keep in services
3. ❌ **Circular dependencies between features** - Use dependency inversion
4. ❌ **Mixing client and server code** - Use platform-specific exports
5. ❌ **Using exceptions instead of Effect errors** - Use Effect.fail
6. ❌ **Tight coupling to specific providers** - Use dependency injection
7. ❌ **Type assertions** - Use Schema validation
8. ❌ **Manual resource cleanup** - Use Effect.acquireRelease

## Generator Template Usage

### Basic Generator Command

```bash
# Minimal feature (server-only)
pnpm exec nx g @workspace:feature payment --domain=payment

# Full-stack feature (client + server)
pnpm exec nx g @workspace:feature payment \
  --domain=payment \
  --includeClient=true \
  --includeRpc=true

# Feature with edge middleware (rare)
pnpm exec nx g @workspace:feature auth \
  --domain=auth \
  --includeEdge=true
```

### Generator Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | (required) | Feature name (e.g., `payment`, `auth`, `marketplace`) |
| `--domain` | `string` | (required) | Domain tag for Nx boundaries (e.g., `payment`, `user`) |
| `--includeClient` | `boolean` | `false` | Generate client.ts with React hooks + Atom state |
| `--includeServer` | `boolean` | `true` | Generate server.ts (always true, can't be disabled) |
| `--includeEdge` | `boolean` | `false` | Generate edge.ts with middleware (rare) |
| `--includeRpc` | `boolean` | `false` | Generate RPC group + handlers in rpc.ts |
| `--includeOperations` | `boolean` | `false` | Create operations/ directory for complex workflows |
| `--directory` | `string` | `libs/feature` | Custom directory path |

### What the Generator Creates

**Always Generated:**
```
libs/feature/payment/
├── src/
│   ├── index.ts                    # Shared types + errors
│   ├── server.ts                   # Services, layers, operations
│   └── lib/
│       ├── server/
│       │   ├── service.ts          # Context.Tag + Live layer
│       │   ├── errors.ts           # Data.TaggedError types
│       │   └── service.spec.ts     # Service tests
│       └── shared/
│           └── types.ts            # Shared TypeScript types
├── project.json                    # Nx config with proper tags
├── tsconfig.json, tsconfig.lib.json, tsconfig.spec.json
├── vitest.config.ts                # Vitest with @effect/vitest
└── README.md                       # Library documentation
```

**With `--includeClient=true`:**
```
├── src/
│   ├── client.ts                   # Client exports
│   └── lib/
│       └── client/
│           ├── hooks/              # React hooks
│           └── stores/             # Atom state management
```

**With `--includeRpc=true`:**
```
├── src/
│   └── lib/
│       └── rpc.ts                  # RPC group + inline handlers
```

**With `--includeEdge=true`:**
```
├── src/
│   ├── edge.ts                     # Edge exports
│   └── lib/
│       └── edge/
│           └── middleware.ts       # Edge middleware
```

**With `--includeOperations=true`:**
```
├── src/
│   └── lib/
│       └── server/
│           └── operations/         # Complex multi-step operations
```

### Generator Template Variables

The generator uses EJS templates with these variables:

| Variable | Example | Usage |
|----------|---------|-------|
| `<%= name %>` | `payment` | File names, imports |
| `<%= className %>` | `PaymentService` | Class names, PascalCase |
| `<%= propertyName %>` | `paymentService` | Variable names, camelCase |
| `<%= domain %>` | `payment` | Nx tags, domain boundary |
| `<%= projectRoot %>` | `libs/feature/payment` | Paths |
| `<%= includeClient %>` | `true` / `false` | Conditional files |
| `<%= includeRpc %>` | `true` / `false` | RPC generation |

### Generated Service Template

The generator creates a service skeleton:

```typescript
// Generated: src/lib/server/service.ts
import { Context, Effect, Layer } from "effect";
import type { <%= className %>Error } from "./errors";

export class <%= className %> extends Context.Tag("<%= className %>")<
  <%= className %>,
  {
    // TODO: Define service methods
    readonly doSomething: () => Effect.Effect<void, <%= className %>Error>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      // TODO: Inject dependencies
      // const repo = yield* SomeRepository;

      return {
        doSomething: () =>
          Effect.gen(function* () {
            // TODO: Implement business logic
            yield* Effect.log("Operation completed");
          })
      };
    })
  );
}
```

### Post-Generation Checklist

After running the generator:

- [ ] Update service interface with actual methods
- [ ] Define error types in `errors.ts`
- [ ] Add dependencies to `package.json`
- [ ] Implement business logic in service
- [ ] Add service tests in `service.spec.ts`
- [ ] Create RPC handlers if `--includeRpc=true`
- [ ] Add React hooks if `--includeClient=true`
- [ ] Update README.md with usage examples
- [ ] Verify Nx tags match domain boundaries
- [ ] Run `pnpm exec nx lint feature-<name>` to validate

## Migration Guide

For existing feature libraries:

1. **Update service definition** to use Context.Tag (NOT Context.GenericTag)
2. **Move repository interfaces** to contracts library
3. **Update layer composition** to use Layer.effect
4. **Add platform-specific exports** (client.ts, server.ts)
5. **Update error handling** to use Data.TaggedError
6. **Add proper Nx tags** in project.json
