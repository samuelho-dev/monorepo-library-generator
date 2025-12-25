/**
 * Environment Configuration
 *
 * Type-safe environment variables using Effect Config.

This file defines all environment variables for your application.
Edit this file to add, remove, or modify environment variables.
Types are automatically inferred from the Config definitions.

Usage:
```typescript
import { env } from '@workspace/env'

env.DATABASE_URL  // Redacted<string>
env.PORT          // number
env.PUBLIC_API_URL // string
```

Re-run generator to sync with .env changes:
  pnpm exec monorepo-library-generator env
 *
 * @module @workspace/env
 */

import { createEnv, Config } from "./createEnv"

// ============================================================================
// Environment Definition
// ============================================================================

/**
 * Application environment variables
 *
 * - server: Only available on server (secrets, internal config)
 * - client: Available everywhere (must have PUBLIC_ prefix)
 * - shared: Available everywhere (no prefix required)
 */
export const env = createEnv({
  // Server-only variables (secrets, internal config)
  server: {
    DATABASE_URL: Config.redacted("DATABASE_URL"),
  },

  // Client-safe variables (must start with PUBLIC_)
  client: {
    // Add client-safe env vars here
    // PUBLIC_API_URL: Config.string("PUBLIC_API_URL"),
  },

  // Shared variables (available in both contexts)
  shared: {
    NODE_ENV: Config.string("NODE_ENV").pipe(Config.withDefault("development")),
  },

  // Required prefix for client variables
  clientPrefix: "PUBLIC_",
})

// ============================================================================
// Type Exports
// ============================================================================

/**
 * Environment type (inferred from createEnv)
 */
export type Env = typeof env
