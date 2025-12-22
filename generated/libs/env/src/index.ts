/**
 * Environment Variables
 *
 * Type-safe environment variable access.

Usage:
```typescript
import { env } from '@workspace/env'

// All context - runtime detection
env.PUBLIC_API_URL  // string (works everywhere)
env.NODE_ENV        // string (works everywhere)
env.DATABASE_URL    // Redacted<string> (server only)
env.PORT            // number (server only)
```

Behavior:
- Server: All variables accessible
- Client: Only client + shared vars; server vars throw runtime error
- Validated eagerly on import (fail fast)
 *
 * @module @workspace/env
 */

// Re-export for advanced usage
export { Config, createEnv } from "./createEnv";
export type { Env } from "./env";
export { env } from "./env";
