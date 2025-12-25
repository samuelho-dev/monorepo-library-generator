# @samuelho-dev/infra-pubsub

PubSub orchestration infrastructure (coordinates pubsub providers)

## AI Agent Reference

This is an infrastructure library following Effect-based service patterns.

### Structure (Flat lib/ Directory)

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/service.ts**: Context.Tag with static layers (Live, Test, Dev, Auto)
- **lib/errors.ts**: Data.TaggedError-based error types
- **lib/config.ts**: Service configuration types
- **lib/memory.ts**: In-memory provider implementation
- **lib/client/hooks/use-pubsub.ts**: React hook

### Import Patterns

```typescript
// Type-only import (zero runtime)
import type { PubsubConfig } from '@samuelho-dev/infra-pubsub/types'// Service import
import { PubsubService } from '@samuelho-dev/infra-pubsub'Effect.gen(function*() {
  const service = yield* PubsubService;
  // Use service...
})
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
import { PubsubService } from '@samuelho-dev/infra-pubsub';
import type { PubsubConfig } from '@samuelho-dev/infra-pubsub/types'// Standard usage
const program = Effect.gen(function*() {
  const service = yield* PubsubService;
  // Use service...
})

// With layers
const result = program.pipe(
  Effect.provide(PubsubService.Live)  // Production
  // or Effect.provide(PubsubService.Test)   // Testing
  // or Effect.provide(PubsubService.Auto)   // NODE_ENV-based
)
```

### Client Usage

```typescript
import { usePubsub } from '@samuelho-dev/infra-pubsub/client/hooks'function MyComponent() {
  const pubsub = usePubsub()
  // Use service in React component
}
```

### Testing Strategy

1. **Use Test layer** - pure mock implementation for unit tests
2. **Use Dev layer** - debug logging for development
3. **Use Live layer** - production implementation
4. **Use Auto layer** - NODE_ENV-based automatic selection
