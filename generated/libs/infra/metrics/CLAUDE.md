# @myorg/infra-metrics

Metrics orchestration infrastructure with Supervisor for fiber tracking

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
  - `use-metrics.ts`: Client-side hook (~2 KB)

### Import Patterns (Most to Least Optimized)

```typescript
// 1. Type-only import (zero runtime ~0.3 KB)
import type { MetricsConfig } from '@myorg/infra-metrics/types';

// 2. Specific provider (smallest bundle ~4 KB)
import { MemoryProvider } from '@myorg/infra-metrics/providers/memory';

// 3. Service interface (~5 KB)
import { MetricsService } from '@myorg/infra-metrics/service';

// 4. Specific layer (~3-4 KB)
import { MetricsServiceLive } from '@myorg/infra-metrics/layers/server-layers';

// 5. Client hook (~2 KB)
import { useMetrics } from '@myorg/infra-metrics/client/hooks';

// 6. Platform barrel (~10-15 KB)
import { MetricsService } from '@myorg/infra-metrics/server';

// 7. Package barrel (largest ~20 KB)
import { MetricsService } from '@myorg/infra-metrics';
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
import { MemoryProvider } from '@myorg/infra-metrics/providers/memory';
import { MetricsService } from '@myorg/infra-metrics/service';
import type { MetricsConfig } from '@myorg/infra-metrics/types';

// Use with Layer pattern
const program = Effect.gen(function* () {
  const service = yield* MetricsService;
  // Use service...
});

// Provide memory provider layer
const runnable = program.pipe(
  Effect.provide(MemoryProvider)
);

// Traditional approach (still works)
import { MetricsServiceLive } from '@myorg/infra-metrics';

Effect.gen(function* () {
  const service = yield* MetricsService;
  // ...
}).pipe(
  Effect.provide(MetricsServiceLive)
);
```

### Client Usage

```typescript
import { useMetrics } from '@myorg/infra-metrics/client/hooks';

function MyComponent() {
  const metrics = useMetrics();
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
