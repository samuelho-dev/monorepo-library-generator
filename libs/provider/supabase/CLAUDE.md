# @samuelho-dev/provider-supabase

Supabase provider for auth, storage, and client operations

## Quick Reference

This is an AI-optimized reference for Supabase, a provider library following Effect-based service patterns.

## Architecture

### Structure (Flat lib/ Directory)

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/service.ts**: Context.Tag with static layers (Live, Test, Dev, Auto)
- **lib/errors.ts**: Data.TaggedError-based error types
- **lib/types.ts**: Service types and configurations
- **lib/validation.ts**: Input validation helpers

## Import Patterns

```typescript
// Type-only import (zero runtime)
import type { Resource, SupabaseConfig } from '@samuelho-dev/provider-supabase/types';

// Service import
import { Supabase } from '@samuelho-dev/provider-supabase';

Effect.gen(function*() {
  const service = yield* Supabase;
  const result = yield* service.list({ page: 1, limit: 10 });
  // ...
});
```

### Customization Guide

1. **Configure External Service** (`lib/service.ts`):
   - Initialize Supabase SDK client in Live layer
   - Configure authentication and connection settings
   - Add health check implementation

2. **Implement Operations** (`lib/service.ts`):
   - list(): Query multiple resources
   - get(): Query single resource by ID
   - create(): Create new resource
   - update(): Update existing resource
   - delete(): Remove resource

3. **Configure Layers** (`lib/service.ts` static members):
   - Live: Production layer with real SDK
   - Test: Mock layer for unit tests
   - Dev: Debug logging layer
   - Auto: Environment-aware layer selection (NODE_ENV)

### Usage Example

```typescript
import { Supabase } from '@samuelho-dev/provider-supabase';
import type { Resource } from '@samuelho-dev/provider-supabase/types';

// Standard usage
const program = Effect.gen(function*() {
  const service = yield* Supabase;
  const items = yield* service.list({ page: 1, limit: 10 });
  return items;
});

// With layers
const result = program.pipe(
  Effect.provide(Supabase.Live)  // Production
  // or Effect.provide(Supabase.Test)   // Testing
  // or Effect.provide(Supabase.Auto)   // NODE_ENV-based
);
```

## SDK Integration Guide

### Baseline Implementation

The generated library includes a **working baseline implementation** using in-memory storage.
This allows you to:
- Use the service immediately without SDK setup
- Test Effect patterns and layer composition
- Verify integration points before adding external dependencies

### Replacing with Real SDK

Follow these steps to integrate with the actual Supabase SDK:

#### 1. Install SDK Package

```bash
pnpm add supabase-sdk
# Or the actual package name for Supabase
```

#### 2. Update Live Layer (`lib/service.ts`)

Replace the in-memory store with SDK initialization in the static Live layer:

```typescript
static readonly Live = Layer.effect(
  Supabase,
  Effect.gen(function*() {
    const config: SupabaseConfig = {
      apiKey: env.SUPABASE_API_KEY,
      timeout: env.SUPABASE_TIMEOUT || 20000,
    };

    // Initialize SDK client
    const client = new SupabaseSDK(config);

    return {
      config,
      healthCheck: Effect.succeed({ status: "healthy" as const })
        .pipe(Effect.withSpan("Supabase.healthCheck")),

      // Replace store.list with SDK call
      list: (params) =>
        Effect.tryPromise({
          try: () => client.list({
            page: params?.page ?? 1,
            limit: params?.limit ?? 10
          }),
          catch: (error) => new SupabaseInternalError({
            message: "Failed to list items",
            cause: error
          })
        }).pipe(
          Effect.timeoutFail({
            duration: `${config.timeout} millis`,
            onTimeout: () => new SupabaseTimeoutError({
              message: "list operation timed out",
              timeoutMs: config.timeout,
              operation: "list"
            })
          }),
          Effect.withSpan("Supabase.list")
        ),

      // Repeat for get, create, update, delete operations
      // ... (follow same pattern with Effect.tryPromise + timeoutFail)
    };
  }),
);
```

#### 3. Add Resource Cleanup (If Needed)

If your SDK requires cleanup (connections, pools, etc.), switch to `Layer.scoped`:

```typescript
static readonly Live = Layer.scoped(
  Supabase,
  Effect.gen(function*() {
    const config: SupabaseConfig = {
      apiKey: env.SUPABASE_API_KEY,
      timeout: env.SUPABASE_TIMEOUT || 20000,
    };

    // Initialize SDK with cleanup
    const client = yield* Effect.acquireRelease(
      Effect.tryPromise(() => SupabaseSDK.connect(config)),
      (client) => Effect.sync(() => client.close())
    );

    return {
      // ... service implementation
    };
  }),
);
```

#### 4. Update Dev Layer (Optional)

Add debug logging to Dev layer for development:

```typescript
list: (params) =>
  Effect.tryPromise({
    try: () => client.list(params),
    catch: (error) => new SupabaseInternalError({
      message: "Failed to list items",
      cause: error
    })
  }).pipe(
    Effect.tap(() => Effect.logDebug("[Supabase] list called", params)),
    Effect.timeoutFail({ /* ... */ }),
    Effect.withSpan("Supabase.list")
  ),
```

### Integration Checklist

- [ ] Install SDK package
- [ ] Update Live layer with SDK initialization
- [ ] Replace in-memory operations with SDK calls
- [ ] Add timeout wrappers (`Effect.timeoutFail`)
- [ ] Add error handling (`Effect.tryPromise` with typed errors)
- [ ] Keep distributed tracing (`Effect.withSpan`)
- [ ] Add cleanup if SDK requires it (`Layer.scoped` + `Effect.addFinalizer`)
- [ ] Update Dev layer with debug logging
- [ ] Test with real SDK credentials
- [ ] Remove in-memory store helper (or keep for testing)

### Testing Strategy

1. **Keep Test layer unchanged** - it should remain a pure mock
2. **Use Dev layer for local testing** with real SDK
3. **Use Live layer in production**
4. **Use Auto layer for environment-aware selection** (NODE_ENV)

The baseline implementation remains useful for unit tests and demonstrations.
