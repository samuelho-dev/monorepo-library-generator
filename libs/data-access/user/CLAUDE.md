# @samuelho-dev/data-access-user

user data access

## AI Agent Reference

This is a data-access library following Effect-based repository patterns.

### Structure (Flat lib/ Directory)

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/repository.ts**: Context.Tag with static layers (Live, Test, Dev, Auto)
- **lib/errors.ts**: Data.TaggedError-based error types
- **lib/types.ts**: Entity types, filters, pagination
- **lib/validation.ts**: Input validation helpers
- **lib/queries.ts**: Kysely query builders
- **lib/cache.ts**: Read-through caching layer

### Import Patterns

```typescript
// Type-only import (zero runtime)
import type { User, UserCreateInput } from '@samuelho-dev/data-access-user/types';

// Repository import
import { UserRepository } from '@samuelho-dev/data-access-user';

Effect.gen(function*() {
  const repo = yield* UserRepository;
  const result = yield* repo.findById("id-123");
  // ...
});
```

### Customization Guide

1. **Update Entity Types** (`lib/types.ts`):
   - Modify entity schema to match your domain
   - Add custom filter types
   - Update pagination options

2. **Implement Repository Operations** (`lib/repository.ts`):
   - findById(), findMany(), findFirst() for reads
   - create(), createMany() for creates
   - update(), updateMany() for updates
   - delete(), deleteMany() for deletes
   - count(), exists() for aggregates

3. **Configure Layers** (`lib/repository.ts` static members):
   - Live: Production layer with real database
   - Test: Mock layer for unit tests
   - Dev: Debug logging layer
   - Auto: Environment-aware layer selection (NODE_ENV)

### Usage Example

```typescript
import { UserRepository } from '@samuelho-dev/data-access-user';
import type { UserCreateInput } from '@samuelho-dev/data-access-user/types';

// Standard usage
const program = Effect.gen(function*() {
  const repo = yield* UserRepository;
  const entity = yield* repo.findById("id-123");
  return entity;
});

// With layers
const result = program.pipe(
  Effect.provide(UserRepository.Live)  // Production
  // or Effect.provide(UserRepository.Test)   // Testing
  // or Effect.provide(UserRepository.Auto)   // NODE_ENV-based
);

// With caching layer
import { UserCache } from '@samuelho-dev/data-access-user';

Effect.gen(function*() {
  const repo = yield* UserRepository;
  const cache = yield* UserCache;

  // Reads go through cache (automatic lookup on miss)
  const entity = yield* cache.get("id-123", () => repo.findById("id-123"));
});
```

### Testing Strategy

1. **Use Test layer** - pure mock implementation for unit tests
2. **Use Dev layer** - debug logging for development
3. **Use Live layer** - production implementation
4. **Use Auto layer** - NODE_ENV-based automatic selection
