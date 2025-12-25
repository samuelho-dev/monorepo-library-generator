# @samuelho-dev/infra-observability

Unified observability infrastructure with OTEL SDK, LoggingService, and MetricsService

## AI Agent Reference

This is an infrastructure library following Effect-based service patterns.

### Structure (Flat lib/ Directory)

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/service.ts**: Context.Tag with static layers (Live, Test, Dev, Auto)
- **lib/errors.ts**: Data.TaggedError-based error types
- **lib/config.ts**: Service configuration types
- **lib/memory.ts**: In-memory provider implementation
- **lib/client/hooks/use-observability.ts**: React hook

### Import Patterns

```typescript
// Type-only import (zero runtime)
import type { ObservabilityConfig } from '@samuelho-dev/infra-observability/types'// Service import
import { ObservabilityService } from '@samuelho-dev/infra-observability'Effect.gen(function*() {
  const service = yield* ObservabilityService;
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
import { ObservabilityService } from '@samuelho-dev/infra-observability';
import type { ObservabilityConfig } from '@samuelho-dev/infra-observability/types'// Standard usage
const program = Effect.gen(function*() {
  const service = yield* ObservabilityService;
  // Use service...
})

// With layers
const result = program.pipe(
  Effect.provide(ObservabilityService.Live)  // Production
  // or Effect.provide(ObservabilityService.Test)   // Testing
  // or Effect.provide(ObservabilityService.Auto)   // NODE_ENV-based
)
```

### Client Usage

```typescript
import { useObservability } from '@samuelho-dev/infra-observability/client/hooks'function MyComponent() {
  const observability = useObservability()
  // Use service in React component
}
```

### Testing Strategy

1. **Use Test layer** - pure mock implementation for unit tests
2. **Use Dev layer** - debug logging for development
3. **Use Live layer** - production implementation
4. **Use Auto layer** - NODE_ENV-based automatic selection
