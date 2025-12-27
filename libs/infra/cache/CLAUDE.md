---
scope: libs/infra/cache/
updated: 2025-12-27
relates_to:
  - ../../CLAUDE.md
  - ../../../docs/INFRA.md
  - ../../../docs/EFFECT_PATTERNS.md
---

# @samuelho-dev/infra-cache

Cache orchestration infrastructure (coordinates cache providers)

## AI Agent Reference

This is an infrastructure library following Effect-based service patterns.

### Structure (Flat lib/ Directory)

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/service.ts**: Context.Tag with static layers (Live, Test, Dev, Auto)
- **lib/errors.ts**: Data.TaggedError-based error types
- **lib/config.ts**: Service configuration types
- **lib/memory.ts**: In-memory provider implementation
- **lib/client/hooks/use-cache.ts**: React hook

### Import Patterns

```typescript
// Type-only import (zero runtime)
import type { CacheConfig } from '@samuelho-dev/infra-cache/types'// Service import
import { CacheService } from '@samuelho-dev/infra-cache'Effect.gen(function*() {
  const service = yield* CacheService;
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
import { CacheService } from '@samuelho-dev/infra-cache';
import type { CacheConfig } from '@samuelho-dev/infra-cache/types'// Standard usage
const program = Effect.gen(function*() {
  const service = yield* CacheService;
  // Use service...
})

// With layers
const result = program.pipe(
  Effect.provide(CacheService.Live)  // Production
  // or Effect.provide(CacheService.Test)   // Testing
  // or Effect.provide(CacheService.Auto)   // NODE_ENV-based
)
```

### Client Usage

```typescript
import { useCache } from '@samuelho-dev/infra-cache/client/hooks'function MyComponent() {
  const cache = useCache()
  // Use service in React component
}
```

### Testing Strategy

1. **Use Test layer** - pure mock implementation for unit tests
2. **Use Dev layer** - debug logging for development
3. **Use Live layer** - production implementation
4. **Use Auto layer** - NODE_ENV-based automatic selection

## For Future Claude Code Instances

- [ ] Uses Context.Tag with static layers (Live, Test, Dev, Auto)
- [ ] Coordinates with provider-redis for cache backing
- [ ] Memory provider is included for testing
- [ ] Use Layer.scoped for connection lifecycle management
- [ ] Config is in `lib/config.ts`
