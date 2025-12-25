# @samuelho-dev/infra-auth

Auth

## AI Agent Reference

This is an infrastructure library following Effect-based service patterns.

### Structure (Flat lib/ Directory)

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/service.ts**: Context.Tag with static layers (Live, Test, Dev, Auto)
- **lib/errors.ts**: Data.TaggedError-based error types
- **lib/config.ts**: Service configuration types
- **lib/memory.ts**: In-memory provider implementation


### Import Patterns

```typescript
// Type-only import (zero runtime)
import type { AuthConfig } from '@samuelho-dev/infra-auth/types';

// Service import
import { AuthService } from '@samuelho-dev/infra-auth';

Effect.gen(function*() {
  const service = yield* AuthService;
  // Use service...
});
```

### Customization Guide

1. **Configure Service** (`lib/config.ts`):
   - Define configuration interface
   - Add environment-specific settings
   - Configure connection parameters

2. **Implement Providers** (`lib/memory.ts`, add more as needed):
   - Memory provider is included by default
   - Add additional providers as needed (PostgreSQL, Redis, etc.)
   - Each provider should implement the service interface

3. **Configure Layers** (`lib/service.ts` static members):
   - Live: Production layer with real implementation
   - Test: Mock layer for unit tests
   - Dev: Debug logging layer
   - Auto: Environment-aware layer selection (NODE_ENV)

### Usage Example

```typescript
import { AuthService } from '@samuelho-dev/infra-auth';
import type { AuthConfig } from '@samuelho-dev/infra-auth/types';

// Standard usage
const program = Effect.gen(function*() {
  const service = yield* AuthService;
  // Use service...
});

// With layers
const result = program.pipe(
  Effect.provide(AuthService.Live)  // Production
  // or Effect.provide(AuthService.Test)   // Testing
  // or Effect.provide(AuthService.Auto)   // NODE_ENV-based
);
```

### Testing Strategy

1. **Use Test layer** - pure mock implementation for unit tests
2. **Use Dev layer** - debug logging for development
3. **Use Live layer** - production implementation
4. **Use Auto layer** - NODE_ENV-based automatic selection
