# @samuelho-dev/feature-user

User feature with CurrentUser integration

## Quick Reference

This is an AI-optimized reference for @samuelho-dev/feature-user, a feature library following Effect-based service patterns.

### Structure (Flat lib/ Directory)

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/service.ts**: Context.Tag with static layers (Live, Test, Dev, Auto)
- **lib/errors.ts**: Data.TaggedError-based error types
- **lib/types.ts**: Domain types, configs, and results
- **lib/schemas.ts**: Schema validation
- **lib/rpc.ts**: RPC route definitions
- **lib/handlers.ts**: RPC handler implementations
- **lib/client/hooks/**: React hooks
- **lib/client/atoms/**: Jotai atoms

### Import Patterns

```typescript
// Type-only import (zero runtime)
import type { UserConfig, UserResult } from '@samuelho-dev/feature-user/types';

// Service import
import { UserService } from '@samuelho-dev/feature-user';

Effect.gen(function*() {
  const service = yield* UserService;
  const result = yield* service.exampleOperation();
  return result;
});
```

### Customization Guide

1. **Define Service Interface** (`lib/service.ts`):
   - Add your business logic methods
   - Configure Live layer with dependencies
   - Update Test layer for testing

2. **Implement Business Logic**:
   - Service methods use Effect.gen for composition
   - Yield dependencies via Context.Tag pattern
   - Return Effect types for composability

3. **Configure Layers** (`lib/service.ts` static members):
   - Live: Production layer with real implementations
   - Test: Mock layer for unit tests
   - Dev: Debug logging layer
   - Auto: Environment-aware layer selection (NODE_ENV)

4. **Add RPC Endpoints** (`lib/rpc.ts` and `lib/handlers.ts`):
   - Define routes in rpc.ts
   - Implement handlers in handlers.ts
   - Keep handlers lightweight (delegate to service)

### Usage Example

```typescript
import { UserService } from '@samuelho-dev/feature-user';
import type { UserResult } from '@samuelho-dev/feature-user/types';

// Standard usage
const program = Effect.gen(function*() {
  const service = yield* UserService;
  const result = yield* service.exampleOperation();
  return result;
});

// With layers
const runnable = program.pipe(
  Effect.provide(UserService.Live)  // Production
  // or Effect.provide(UserService.Test)   // Testing
  // or Effect.provide(UserService.Auto)   // NODE_ENV-based
);
```

### RPC Usage

```typescript
import { userHandlers } from '@samuelho-dev/feature-user';
import { UserService } from '@samuelho-dev/feature-user';

// Compose with RPC server
const rpcLayer = Layer.mergeAll(
  UserService.Live,
  // ... other dependencies
);

const server = userHandlers.pipe(
  Effect.provide(rpcLayer)
);
```

### Testing Strategy

1. **Use Test layer** - pure mock implementation for unit tests
2. **Use Dev layer** - debug logging for development
3. **Use Live layer** - production implementation
4. **Use Auto layer** - NODE_ENV-based automatic selection
