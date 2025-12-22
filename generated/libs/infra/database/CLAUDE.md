# @myorg/infra-database

Database orchestration infrastructure (coordinates database providers like Kysely)

## AI Agent Reference

This is an infrastructure library following Effect-based service patterns with granular bundle optimization.

### Structure (Optimized for Tree-Shaking)

- **types.ts**: Type-only exports (zero runtime overhead)
- **lib/service/**: Service definition
  - `service.ts`: Context.Tag with service interface
  - `config.ts`: Service configuration types (~2 KB)
  - `errors.ts`: Error types (~2 KB)

- **lib/providers/**: Provider implementations
  - `memory.ts`: In-memory provider (~3-4 KB)
  - Additional providers can be added here

- **lib/layers/**: Layer compositions
  - `server-layers.ts`: Server-side layers (~3 KB)
  - `client-layers.ts`: Client-side layers (~2 KB)

- **lib/client/hooks/**: React hooks
  - `use-database.ts`: Client-side hook (~2 KB)

### Import Patterns (Most to Least Optimized)

```typescript
// 1. Type-only import (zero runtime ~0.3 KB)
import type { DatabaseConfig } from '@myorg/infra-database/types';

// 2. Specific provider (smallest bundle ~4 KB)
import { MemoryProvider } from '@myorg/infra-database/providers/memory';

// 3. Service interface (~5 KB)
import { DatabaseService } from '@myorg/infra-database/service';

// 4. Specific layer (~3-4 KB)
import { DatabaseServiceLive } from '@myorg/infra-database/layers/server-layers';

// 5. Client hook (~2 KB)
import { useDatabase } from '@myorg/infra-database/client/hooks';

// 6. Platform barrel (~10-15 KB)
import { DatabaseService } from '@myorg/infra-database/server';

// 7. Package barrel (largest ~20 KB)
import { DatabaseService } from '@myorg/infra-database';
```

### Customization Guide

1. **Configure Service** (`lib/service/config.ts`):
   - Define configuration interface
   - Add environment-specific settings
   - Configure connection parameters

2. **Implement Providers** (`lib/providers/`):
   - Memory provider is included by default
   - Add additional providers as needed (PostgreSQL, Redis, etc.)
   - Each provider should implement the service interface

3. **Configure Layers** (`lib/layers/`):
   - `server-layers.ts`: Wire up server-side dependencies
   - `client-layers.ts`: Configure client-side providers (if applicable)
   - `edge-layers.ts`: Configure edge runtime providers (if applicable)

### Usage Example

```typescript
// Granular import for optimal bundle size
import { MemoryProvider } from '@myorg/infra-database/providers/memory';
import { DatabaseService } from '@myorg/infra-database/service';
import type { DatabaseConfig } from '@myorg/infra-database/types';

// Use with Layer pattern
const program = Effect.gen(function* () {
  const service = yield* DatabaseService;
  // Use service...
});

// Provide memory provider layer
const runnable = program.pipe(
  Effect.provide(MemoryProvider)
);

// Traditional approach (still works)
import { DatabaseServiceLive } from '@myorg/infra-database';

Effect.gen(function* () {
  const service = yield* DatabaseService;
  // ...
}).pipe(
  Effect.provide(DatabaseServiceLive)
);
```

### Client Usage

```typescript
import { useDatabase } from '@myorg/infra-database/client/hooks';

function MyComponent() {
  const database = useDatabase();
  // Use service in React component
}
```

### Bundle Optimization Notes

- **Always use granular imports** for production builds
- **Use type-only imports** when you only need types
- Providers are separate files for optimal tree-shaking
- Each layer can be imported independently
- Service interface is lightweight (~2 KB vs ~20 KB for full barrel)
- Client hooks are separated for minimal client bundle size
