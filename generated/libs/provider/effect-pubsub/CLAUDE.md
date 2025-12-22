# @myorg/provider-effect-pubsub

Effect.PubSub provider for pub/sub messaging

## Quick Reference

This is an AI-optimized reference for Effect.PubSub, a provider library following Effect-based service patterns with granular bundle optimization.

## Architecture

### Structure (Optimized for Tree-Shaking)

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/service/**: Granular service implementation
  - `interface.ts`: Context.Tag with static layers
  - `operations/create.ts`: Create operations (~3-4 KB)
  - `operations/query.ts`: Query operations (~4-5 KB)
  - `operations/update.ts`: Update operations (~3 KB)
  - `operations/delete.ts`: Delete operations (~2-3 KB)
  - `index.ts`: Service barrel export

- **lib/errors.ts**: Data.TaggedError-based error types
- **lib/types.ts**: Service types and configurations
- **lib/validation.ts**: Input validation helpers
- **lib/layers.ts**: Layer compositions (Live, Test, Dev)

## Import Patterns (Most to Least Optimized)

```typescript
// 1. Granular operation import (smallest bundle ~3-5 KB)
import { createOperations } from '@myorg/provider-effect-pubsub/service/operations/create';

// 2. Type-only import (zero runtime ~0.3 KB)
import type { Resource, EffectPubsubConfig } from '@myorg/provider-effect-pubsub/types';

// 3. Operation category (~8-10 KB)
import { createOperations, queryOperations } from '@myorg/provider-effect-pubsub/service/operations';

// 4. Full service (~12-15 KB)
import { EffectPubsub } from '@myorg/provider-effect-pubsub/service';

// 5. Package barrel (largest ~18-20 KB)
import { EffectPubsub } from '@myorg/provider-effect-pubsub';
```

### Customization Guide

1. **Configure External Service** (`lib/service/interface.ts`):
   - Initialize Effect.PubSub SDK client in Live layer
   - Configure authentication and connection settings
   - Add health check implementation

2. **Implement Operations**:
   - `lib/service/operations/create.ts`: Implement create with SDK
   - `lib/service/operations/query.ts`: Implement list/get with SDK
   - `lib/service/operations/update.ts`: Implement update with SDK
   - `lib/service/operations/delete.ts`: Implement delete with SDK
   - Each operation can be implemented independently

3. **Configure Layers** (`lib/layers.ts`):
   - Wire up SDK client dependencies
   - Configure retry policies and timeouts
   - Customize Test layer for testing

### Usage Example

```typescript
// Granular import for optimal bundle size
import { createOperations } from '@myorg/provider-effect-pubsub/service/operations/create';
import type { Resource } from '@myorg/provider-effect-pubsub/types';

// Use directly without full service
const program = Effect.gen(function* () {
  const created = yield* createOperations.create({
    // ...resource data
  });
  return created;
});

// Traditional approach (still works)
import { EffectPubsub } from '@myorg/provider-effect-pubsub';

Effect.gen(function* () {
  const service = yield* EffectPubsub;
  const result = yield* service.list({ page: 1, limit: 10 });
  // ...
});
```

### Bundle Optimization Notes

- **Always use granular imports** for production builds
- **Use type-only imports** when you only need types
- Operations are lazy-loaded via dynamic imports
- Each operation can be imported independently for optimal tree-shaking
- Service interface uses minimal overhead (~2 KB vs ~18 KB for full barrel)

## SDK Integration Guide

### Baseline Implementation

The generated library includes a **working baseline implementation** using in-memory storage.
This allows you to:
- Use the service immediately without SDK setup
- Test Effect patterns and layer composition
- Verify integration points before adding external dependencies

### Replacing with Real SDK

Follow these steps to integrate with the actual Effect.PubSub SDK:

#### 1. Install SDK Package

```bash
pnpm add effect.pubsub-sdk
# Or the actual package name for Effect.PubSub
```

#### 2. Update Live Layer (`lib/layers.ts`)

Replace the in-memory store with SDK initialization:

```typescript
export const EffectPubsubLive = Layer.effect(
  EffectPubsub,
  Effect.gen(function* () {
    const config: EffectPubsubConfig = {
      apiKey: env.EFFECT_PUBSUB_API_KEY,
      timeout: env.EFFECT_PUBSUB_TIMEOUT || 20000,
    };

    // Initialize SDK client
    const client = new Effect.PubSubSDK(config);

    return {
      config,
      healthCheck: Effect.succeed({ status: "healthy" as const })
        .pipe(Effect.withSpan("EffectPubsub.healthCheck")),

      // Replace store.list with SDK call
      list: (params) =>
        Effect.tryPromise({
          try: () => client.list({
            page: params?.page ?? 1,
            limit: params?.limit ?? 10
          }),
          catch: (error) => new EffectPubsubInternalError({
            message: "Failed to list items",
            cause: error
          })
        }).pipe(
          Effect.timeoutFail({
            duration: `${config.timeout} millis`,
            onTimeout: () => new EffectPubsubTimeoutError({
              message: "list operation timed out",
              timeoutMs: config.timeout,
              operation: "list"
            })
          }),
          Effect.withSpan("EffectPubsub.list")
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
export const EffectPubsubLive = Layer.scoped(
  EffectPubsub,
  Effect.gen(function* () {
    const config: EffectPubsubConfig = {
      apiKey: env.EFFECT_PUBSUB_API_KEY,
      timeout: env.EFFECT_PUBSUB_TIMEOUT || 20000,
    };

    // Initialize SDK with cleanup
    const client = yield* Effect.acquireRelease(
      Effect.tryPromise(() => Effect.PubSubSDK.connect(config)),
      (client) => Effect.sync(() => client.close())
    );

    // Or use Effect.addFinalizer for simpler cleanup
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => client.close())
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
    catch: (error) => new EffectPubsubInternalError({
      message: "Failed to list items",
      cause: error
    })
  }).pipe(
    Effect.tap(() => Effect.logDebug("[EffectPubsub] list called", params)),
    Effect.timeoutFail({ /* ... */ }),
    Effect.withSpan("EffectPubsub.list")
  ),
```

#### 5. Update Custom Layer Factory

Replace in-memory store in `makeEffectPubsubLayer`:

```typescript
export function makeEffectPubsubLayer(config: EffectPubsubConfig) {
  return Layer.scoped(
    EffectPubsub,
    Effect.gen(function* () {
      const client = new Effect.PubSubSDK(config);

      yield* Effect.addFinalizer(() =>
        Effect.sync(() => client.close())
      );

      return {
        // ... SDK-based implementation
      };
    }),
  );
}
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

The baseline implementation remains useful for unit tests and demonstrations.
