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
import { Redacted } from "effect"
import { Config, createEnv } from "./createEnv"

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
    // Database
    DATABASE_URL: Config.redacted("DATABASE_URL").pipe(
      Config.withDefault(Redacted.make("postgresql://localhost:5432/dev"))
    ),

    // Supabase
    SUPABASE_URL: Config.string("SUPABASE_URL").pipe(
      Config.withDefault("http://localhost:54321")
    ),
    SUPABASE_ANON_KEY: Config.redacted("SUPABASE_ANON_KEY").pipe(
      Config.withDefault(Redacted.make("dev-anon-key"))
    ),
    SUPABASE_SERVICE_ROLE_KEY: Config.redacted("SUPABASE_SERVICE_ROLE_KEY").pipe(
      Config.withDefault(Redacted.make("dev-service-role-key"))
    ),

    // Redis
    REDIS_URL: Config.string("REDIS_URL").pipe(
      Config.withDefault("redis://localhost:6379")
    ),

    // Service Authentication (server-only, protected by context)
    SERVICE_AUTH_SECRET: Config.string("SERVICE_AUTH_SECRET").pipe(
      Config.withDefault("dev-service-secret")
    ),
    JWT_SECRET: Config.string("JWT_SECRET").pipe(
      Config.withDefault("dev-jwt-secret")
    ),

    // OpenTelemetry
    OTEL_SERVICE_NAME: Config.string("OTEL_SERVICE_NAME").pipe(
      Config.withDefault("dev-service")
    ),
    OTEL_SERVICE_VERSION: Config.string("OTEL_SERVICE_VERSION").pipe(
      Config.withDefault("0.0.0")
    ),
    OTEL_EXPORTER_OTLP_ENDPOINT: Config.string("OTEL_EXPORTER_OTLP_ENDPOINT").pipe(
      Config.withDefault("http://localhost:4318")
    ),
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: Config.string("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT").pipe(
      Config.withDefault("http://localhost:4318/v1/traces")
    ),
    OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: Config.string("OTEL_EXPORTER_OTLP_METRICS_ENDPOINT").pipe(
      Config.withDefault("http://localhost:4318/v1/metrics")
    ),
    OTEL_TRACES_ENABLED: Config.string("OTEL_TRACES_ENABLED").pipe(
      Config.withDefault("true")
    ),
    OTEL_METRICS_ENABLED: Config.string("OTEL_METRICS_ENABLED").pipe(
      Config.withDefault("true")
    ),
    OTEL_METRICS_EXPORT_INTERVAL_MS: Config.string("OTEL_METRICS_EXPORT_INTERVAL_MS").pipe(
      Config.withDefault("60000")
    ),
    OTEL_TRACES_SAMPLER_ARG: Config.string("OTEL_TRACES_SAMPLER_ARG").pipe(
      Config.withDefault("1.0")
    ),

    // Runtime environment
    NODE_ENV: Config.string("NODE_ENV").pipe(
      Config.withDefault("development")
    )
  },

  // Client-safe variables (must start with PUBLIC_)
  client: {
    // Add client-safe env vars here
    // PUBLIC_API_URL: Config.string("PUBLIC_API_URL")
  },

  // Shared variables (available in both contexts)
  shared: {},

  // Required prefix for client variables
  clientPrefix: "PUBLIC_"
})

// ============================================================================
// Type Exports
// ============================================================================
/**
 * Environment type (inferred from createEnv)
 */
export type Env = typeof env
