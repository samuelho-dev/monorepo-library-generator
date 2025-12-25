# Feature Library Generator

Generate feature libraries that orchestrate business logic by composing services from data-access and infrastructure layers using Effect.ts patterns.

## Purpose

Feature libraries implement the **Service Layer Pattern** for business logic orchestration:
- Coordinate multiple repositories and infrastructure services
- Implement complex use cases and workflows
- Provide optional RPC endpoints (@effect/rpc)
- Generate optional React hooks and state management (Jotai atoms)
- Support multiple platforms (node, browser, universal, edge)

## Design Rationale

### Why Service Layer?

**Problem**: Business logic scattered across controllers, repositories, and UI leads to:
- Duplicated workflow logic
- Tight coupling between presentation and persistence
- Difficult testing (can't test business rules in isolation)
- Mixed responsibilities (UI concerns mixed with business rules)

**Solution**: Service layer orchestrates use cases:

```typescript
// Feature: Process Payment
export const processPayment = (amount: number, customerId: string) =>
  Effect.gen(function*() {
    // Orchestrate cross-service workflow
    const paymentRepo = yield* PaymentRepository
    const stripe = yield* StripeService
    const logger = yield* LoggingService
    const cache = yield* CacheService

    // 1. Charge customer via Stripe
    const charge = yield* stripe.createCharge({ amount, customerId })

    // 2. Persist payment record
    const payment = yield* paymentRepo.create({
      chargeId: charge.id,
      amount,
      status: "completed"
    })

    // 3. Log audit trail
    yield* logger.info(`Payment processed: ${payment.id}`)

    // 4. Invalidate cache
    yield* cache.delete(`customer:${customerId}:payments`)

    return payment
  })
```

**Benefits**:
- **Single Responsibility**: Each service does one thing (charge, persist, log, cache)
- **Testability**: Mock each dependency independently
- **Reusability**: Service methods compose into larger workflows
- **Transaction Management**: Coordinate multi-service transactions

### Why Universal Platform by Default?

Features default to `platform: universal`:

**Rationale**:
- Business logic often runs both client and server (validation, calculations)
- Universal libraries work in all environments
- Specific platform code in separate exports (server.ts, client.ts)
- Enables code sharing without duplication

### Architecture Layers

```
┌─────────────────────────────────────────────┐
│         Feature Layer (This Library)        │
│  ┌──────────────────────────────────────┐  │
│  │  Business Logic (processPayment)     │  │
│  └──────────────────────────────────────┘  │
└────────┬─────────────┬─────────────┬────────┘
         │ depends on  │             │
         ▼             ▼             ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │data-access│  │  infra  │  │ provider │
   │ (repos)  │  │ (cache) │  │ (stripe) │
   └────┬─────┘  └──────────┘  └──────────┘
        │ depends on
        ▼
   ┌──────────┐
   │ contract │
   │  (types) │
   └──────────┘
```

## Generated Files

### Always Generated

- `lib/shared/types.ts` - Feature DTOs and request/response types
- `lib/shared/errors.ts` - Feature-level business rule errors
- `lib/shared/schemas.ts` - Request/response validation schemas
- `lib/server/service.ts` - Business logic service implementation
- `lib/server/layers.ts` - Service layer composition
- `lib/server/service.spec.ts` - Service unit tests

### Optional (with flags)

- `lib/client/hooks/use-<feature>.ts` - React hooks (`--includeClientServer`)
- `lib/client/atoms/<feature>-atoms.ts` - Jotai state atoms (`--includeClientServer`)
- `lib/server/rpc.ts` - RPC router with handlers (`--includeRPC`)
- `lib/edge/middleware.ts` - Edge runtime middleware (`--includeEdge`)

## Usage

### Basic Feature

```bash
pnpm exec nx g @tools/workspace-plugin:feature payment --platform=node
```

```typescript
// lib/server/service.ts
export const processPayment = (amount: number, customerId: string) =>
  Effect.gen(function*() {
    const paymentRepo = yield* PaymentRepository
    const stripe = yield* StripeService

    const charge = yield* stripe.createCharge({ amount, customerId })
    const payment = yield* paymentRepo.create({
      chargeId: charge.id,
      amount
    })

    return payment
  })
```

### With RPC Endpoints

```bash
pnpm exec nx g @tools/workspace-plugin:feature payment --includeRPC
```

```typescript
// lib/server/rpc.ts
import { Rpc } from "@effect/rpc"

export const PaymentRouter = Rpc.make({
  processPayment: Rpc.effect(
    ProcessPaymentRequest,
    ProcessPaymentResponse,
    ({ amount, customerId }) => processPayment(amount, customerId)
  )
})
```

### With React Hooks

```bash
pnpm exec nx g @tools/workspace-plugin:feature payment --includeClientServer
```

```typescript
// lib/client/hooks/use-payment.ts
export function usePayment() {
  const [payment, setPayment] = useAtom(paymentAtom)

  const process = useCallback((amount: number, customerId: string) =>
    Effect.runPromise(
      processPayment(amount, customerId).pipe(
        Effect.tap((result) => Effect.sync(() => setPayment(result)))
      )
    ), [setPayment]
  )

  return { payment, process }
}
```

## Best Practices

1. **Keep Features Focused**: One feature = one use case or workflow
2. **Compose Services**: Use Effect.gen + yield* for readable composition
3. **Handle Errors at Boundary**: Catch and transform errors for consumers
4. **Test with Mock Layers**: Swap dependencies for fast unit tests
5. **Document Workflows**: Use JSDoc to explain multi-step processes

## References

- **Service Layer Pattern**: https://martinfowler.com/eaaCatalog/serviceLayer.html
- **Effect Composition**: https://effect.website/docs/essentials/pipeline
- **Effect RPC**: https://effect.website/docs/guides/use-cases/http-apis
