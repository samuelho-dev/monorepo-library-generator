# @myorg/data-access-user

user data access

## AI Agent Reference

This is a data-access library following Effect-based repository patterns with granular bundle optimization.

### Structure (Optimized for Tree-Shaking)

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/shared/**: Shared types, errors, and validation
  - `errors.ts`: Data.TaggedError-based error types
  - `types.ts`: Entity types, filters, pagination
  - `validation.ts`: Input validation helpers

- **lib/repository/**: Granular repository implementation
  - `interface.ts`: Context.Tag with static layers
  - `operations/create.ts`: Create operations (~4 KB)
  - `operations/read.ts`: Read/query operations (~5 KB)
  - `operations/update.ts`: Update operations (~3 KB)
  - `operations/delete.ts`: Delete operations (~3 KB)
  - `operations/aggregate.ts`: Count/exists operations (~3 KB)
  - `index.ts`: Barrel export for convenience

- **lib/queries.ts**: Kysely query builders
- **lib/server/layers.ts**: Server-side Layer compositions (Live, Test, Dev, Auto)

### Import Patterns (Most to Least Optimized)

```typescript
// 1. Granular operation import (smallest bundle ~4-5 KB)
import { createOperations } from '@myorg/data-access-user/repository/operations/create';

// 2. Type-only import (zero runtime ~0.3 KB)
import type { User, UserCreateInput } from '@myorg/data-access-user/types';

// 3. Operation category (~8-12 KB)
import { createOperations, readOperations } from '@myorg/data-access-user/repository/operations';

// 4. Full repository (~15-20 KB)
import { UserRepository } from '@myorg/data-access-user/repository';

// 5. Package barrel (largest ~25-30 KB)
import { UserRepository } from '@myorg/data-access-user';
```

### Customization Guide

1. **Update Entity Types** (`lib/shared/types.ts`):
   - Modify entity schema to match your domain
   - Add custom filter types
   - Update pagination options

2. **Implement Repository Operations**:
   - `lib/repository/operations/create.ts`: Customize create logic
   - `lib/repository/operations/read.ts`: Add domain-specific queries
   - `lib/repository/operations/update.ts`: Implement update validation
   - Each operation can be implemented independently

3. **Configure Layers** (`lib/server/layers.ts`):
   - Wire up dependencies (database, cache, etc.)
   - Configure Live layer with actual implementations
   - Customize Test layer for testing

### Usage Example

```typescript
// Granular import for optimal bundle size
import { createOperations } from '@myorg/data-access-user/repository/operations/create';
import type { UserCreateInput } from '@myorg/data-access-user/types';

// Use directly without full repository
const program = Effect.gen(function* () {
  const created = yield* createOperations.create({
    // ...entity data
  } as UserCreateInput);
  return created;
});

// Traditional approach (still works)
import { UserRepository } from '@myorg/data-access-user';

Effect.gen(function* () {
  const repo = yield* UserRepository;
  const result = yield* repo.findById("id-123");
  // ...
});
```
