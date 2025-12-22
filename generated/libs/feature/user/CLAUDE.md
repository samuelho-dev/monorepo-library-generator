# @myorg/feature-user

user feature

## Quick Reference

This is an AI-optimized reference for @myorg/feature-user, a feature library following Effect-based service patterns with granular bundle optimization.

### Structure (Optimized for Tree-Shaking)

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/shared/**: Shared types, errors, and schemas
  - `errors.ts`: Data.TaggedError-based error types
  - `types.ts`: Domain types, configs, and results
  - `schemas.ts`: Schema validation

- **lib/server/**: Server-side business logic
  - `service/interface.ts`: Context.Tag with static layers (~5 KB)
  - `service/index.ts`: Service barrel export
  - `layers.ts`: Layer compositions (Live, Test, Dev, Auto)
  - `service.spec.ts`: Service tests
- **lib/rpc/**: RPC layer
  - `rpc.ts`: RPC router definition
  - `handlers.ts`: RPC handlers (~4-8 KB)
  - `errors.ts`: RPC-specific errors

- **lib/client/**: Client-side state management
  - `hooks/`: React hooks
  - `atoms/`: Jotai atoms
  - `components/`: UI components

### Import Patterns (Most to Least Optimized)

```typescript
// 1. Service interface import (smallest bundle ~5 KB)
import { UserService } from '@myorg/feature-user/server/service';

// 2. Type-only import (zero runtime ~0.3 KB)
import type { UserConfig, UserResult } from '@myorg/feature-user/types';

// 3. Server barrel (~10-15 KB)
import { UserService, UserServiceLayers } from '@myorg/feature-user/server';

// 4. RPC handlers (~8-12 KB)
import { userHandlers } from '@myorg/feature-user/rpc/handlers';

// 5. Package barrel (largest ~20-40 KB depending on features)
import { UserService } from '@myorg/feature-user';
```

### Customization Guide

1. **Define Service Interface** (`lib/server/service/interface.ts`):
   - Add your business logic methods
   - Configure Live layer with dependencies
   - Update Test layer for testing

2. **Implement Business Logic**:
   - Service methods use Effect.gen for composition
   - Yield dependencies via Context.Tag pattern
   - Return Effect types for composability

3. **Configure Layers** (`lib/server/layers.ts`):
   - Wire up service dependencies
   - Configure Live layer with actual implementations
   - Customize Test layer for testing

4. **Add RPC Endpoints** (`lib/rpc/`):
   - Define routes in `rpc.ts`
   - Implement handlers in `handlers.ts`
   - Keep handlers lightweight (delegate to service)

### Usage Example

```typescript
// Granular import for optimal bundle size
import { UserService } from '@myorg/feature-user/server/service';
import type { UserResult } from '@myorg/feature-user/types';

// Use service in your application
const program = Effect.gen(function* () {
  const service = yield* UserService;
  const result: UserResult = yield* service.exampleOperation();
  return result;
});

// Provide layer at application level
const runnable = program.pipe(
  Effect.provide(UserService.Live)
);
```

### RPC Usage

```typescript
import { userHandlers } from '@myorg/feature-user/rpc/handlers';
import { UserService } from '@myorg/feature-user/server/service';

// Compose with RPC server
const rpcLayer = Layer.mergeAll(
  UserService.Live,
  // ... other dependencies
);

const server = userHandlers.pipe(
  Effect.provide(rpcLayer)
);
```

### Bundle Optimization Notes

- **Always use granular imports** for production builds
- **Use type-only imports** when you only need types
- Service interface is lightweight (~5 KB vs ~40 KB for full barrel)
- Each module can be imported independently for optimal tree-shaking
- RPC handlers are separate files for lazy loading
