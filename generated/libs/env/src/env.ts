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

import { Config, createEnv } from "./createEnv";

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
    API_SECRET: Config.redacted("API_SECRET"),
    REDIS_URL: Config.redacted("REDIS_URL"),
    PORT: Config.number("PORT").pipe(Config.withDefault(3000)),
    KYSELY_API_KEY: Config.redacted("KYSELY_API_KEY"),
    KYSELY_TIMEOUT: Config.number("KYSELY_TIMEOUT"),
    EFFECT_CACHE_API_KEY: Config.redacted("EFFECT_CACHE_API_KEY"),
    EFFECT_CACHE_TIMEOUT: Config.number("EFFECT_CACHE_TIMEOUT"),
    EFFECT_LOGGER_API_KEY: Config.redacted("EFFECT_LOGGER_API_KEY"),
    EFFECT_LOGGER_TIMEOUT: Config.number("EFFECT_LOGGER_TIMEOUT"),
    EFFECT_METRICS_API_KEY: Config.redacted("EFFECT_METRICS_API_KEY"),
    EFFECT_METRICS_TIMEOUT: Config.number("EFFECT_METRICS_TIMEOUT"),
    EFFECT_QUEUE_API_KEY: Config.redacted("EFFECT_QUEUE_API_KEY"),
    EFFECT_QUEUE_TIMEOUT: Config.number("EFFECT_QUEUE_TIMEOUT"),
    EFFECT_PUBSUB_API_KEY: Config.redacted("EFFECT_PUBSUB_API_KEY"),
    EFFECT_PUBSUB_TIMEOUT: Config.number("EFFECT_PUBSUB_TIMEOUT"),
    SUPABASE_URL: Config.string("SUPABASE_URL"),
    SUPABASE_ANON_KEY: Config.redacted("SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: Config.redacted("SUPABASE_SERVICE_ROLE_KEY"),
  },

  // Client-safe variables (must start with PUBLIC_)
  client: {
    PUBLIC_API_URL: Config.string("PUBLIC_API_URL"),
    PUBLIC_FEATURE_FLAG: Config.boolean("PUBLIC_FEATURE_FLAG"),
  },

  // Shared variables (available in both contexts)
  shared: {
    NODE_ENV: Config.string("NODE_ENV").pipe(Config.withDefault("development")),
  },

  // Required prefix for client variables
  clientPrefix: "PUBLIC_",
});

// ============================================================================
// Type Exports
// ============================================================================

/**
 * Environment type (inferred from createEnv)
 */
export type Env = typeof env;
