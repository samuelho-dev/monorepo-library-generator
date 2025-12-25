# @samuelho-dev/infra-queue

Queue orchestration infrastructure with Supervisor for background workers

## AI Agent Reference

This is an infrastructure library following Effect-based service patterns.

### Structure (Flat lib/ Directory)

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/service.ts**: Context.Tag with static layers (Live, Test, Dev, Auto)
- **lib/errors.ts**: Data.TaggedError-based error types
- **lib/config.ts**: Service configuration types
- **lib/memory.ts**: In-memory provider implementation
- **lib/client/hooks/use-queue.ts**: React hook

### Import Patterns

```typescript
// Type-only import (zero runtime)
import type { QueueConfig } from '@samuelho-dev/infra-queue/types'// Service import
import { QueueService } from '@samuelho-dev/infra-queue'Effect.gen(function*() {
  const service = yield* QueueService;
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
import { QueueService } from '@samuelho-dev/infra-queue';
import type { QueueConfig } from '@samuelho-dev/infra-queue/types'// Standard usage
const program = Effect.gen(function*() {
  const service = yield* QueueService;
  // Use service...
})

// With layers
const result = program.pipe(
  Effect.provide(QueueService.Live)  // Production
  // or Effect.provide(QueueService.Test)   // Testing
  // or Effect.provide(QueueService.Auto)   // NODE_ENV-based
)
```

### Client Usage

```typescript
import { useQueue } from '@samuelho-dev/infra-queue/client/hooks'function MyComponent() {
  const queue = useQueue()
  // Use service in React component
}
```

### Testing Strategy

1. **Use Test layer** - pure mock implementation for unit tests
2. **Use Dev layer** - debug logging for development
3. **Use Live layer** - production implementation
4. **Use Auto layer** - NODE_ENV-based automatic selection
