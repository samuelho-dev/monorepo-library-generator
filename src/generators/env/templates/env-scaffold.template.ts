/**
 * Env Scaffold Template
 *
 * Generates the user's env.ts file with a createEnv call.
 * This is the file users will modify to define their environment variables.
 *
 * @module monorepo-library-generator/env-templates
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import type { ParsedEnvVar } from "../utils/parse-dotenv"

/**
 * Generate env.ts - the user's environment definition file
 *
 * This is scaffolded from the .env file and can be customized by the user.
 */
export function generateEnvScaffoldFile(vars: Array<ParsedEnvVar>) {
  const builder = new TypeScriptBuilder()

  // File header
  builder.addFileHeader({
    title: "Environment Configuration",
    description: "Type-safe environment variables using Effect Config.\n\n" +
      "This file defines all environment variables for your application.\n" +
      "Edit this file to add, remove, or modify environment variables.\n" +
      "Types are automatically inferred from the Config definitions.\n\n" +
      "Usage:\n" +
      "```typescript\n" +
      "import { env } from '@workspace/env'\n\n" +
      "env.DATABASE_URL  // Redacted<string>\n" +
      "env.PORT          // number\n" +
      "env.PUBLIC_API_URL // string\n" +
      "```\n\n" +
      "Re-run generator to sync with .env changes:\n" +
      "  pnpm exec monorepo-library-generator env",
    module: "@workspace/env"
  })

  // Imports
  builder.addRaw("import { Redacted } from \"effect\"")
  builder.addRaw("import { Config, createEnv } from \"./createEnv\"")
  builder.addBlankLine()

  // Separate vars by context
  const clientVars = vars.filter((v) => v.context === "client")
  const serverVars = vars.filter((v) => v.context === "server")
  // Note: sharedVars (context === "shared") can be added here when shared context support is implemented

  // Generate createEnv call
  builder.addSectionComment("Environment Definition")
  builder.addRaw("/**")
  builder.addRaw(" * Application environment variables")
  builder.addRaw(" *")
  builder.addRaw(" * - server: Only available on server (secrets, internal config)")
  builder.addRaw(" * - client: Available everywhere (must have PUBLIC_ prefix)")
  builder.addRaw(" * - shared: Available everywhere (no prefix required)")
  builder.addRaw(" */")
  builder.addRaw("export const env = createEnv({")

  // Server section
  builder.addRaw("  // Server-only variables (secrets, internal config)")
  builder.addRaw("  server: {")

  // Always include infrastructure variables with defaults
  builder.addRaw("    // Database")
  builder.addRaw("    DATABASE_URL: Config.redacted(\"DATABASE_URL\").pipe(")
  builder.addRaw("      Config.withDefault(Redacted.make(\"postgresql://localhost:5432/dev\"))")
  builder.addRaw("    ),")
  builder.addBlankLine()

  builder.addRaw("    // Supabase")
  builder.addRaw("    SUPABASE_URL: Config.string(\"SUPABASE_URL\").pipe(")
  builder.addRaw("      Config.withDefault(\"http://localhost:54321\")")
  builder.addRaw("    ),")
  builder.addRaw("    SUPABASE_ANON_KEY: Config.redacted(\"SUPABASE_ANON_KEY\").pipe(")
  builder.addRaw("      Config.withDefault(Redacted.make(\"dev-anon-key\"))")
  builder.addRaw("    ),")
  builder.addRaw(
    "    SUPABASE_SERVICE_ROLE_KEY: Config.redacted(\"SUPABASE_SERVICE_ROLE_KEY\").pipe("
  )
  builder.addRaw("      Config.withDefault(Redacted.make(\"dev-service-role-key\"))")
  builder.addRaw("    ),")
  builder.addBlankLine()

  builder.addRaw("    // Redis")
  builder.addRaw("    REDIS_URL: Config.string(\"REDIS_URL\").pipe(")
  builder.addRaw("      Config.withDefault(\"redis://localhost:6379\")")
  builder.addRaw("    ),")
  builder.addBlankLine()

  builder.addRaw("    // Service Authentication (server-only, protected by context)")
  builder.addRaw("    SERVICE_AUTH_SECRET: Config.string(\"SERVICE_AUTH_SECRET\").pipe(")
  builder.addRaw("      Config.withDefault(\"dev-service-secret\")")
  builder.addRaw("    ),")
  builder.addRaw("    JWT_SECRET: Config.string(\"JWT_SECRET\").pipe(")
  builder.addRaw("      Config.withDefault(\"dev-jwt-secret\")")
  builder.addRaw("    ),")
  builder.addBlankLine()

  builder.addRaw("    // OpenTelemetry")
  builder.addRaw("    OTEL_SERVICE_NAME: Config.string(\"OTEL_SERVICE_NAME\").pipe(")
  builder.addRaw("      Config.withDefault(\"dev-service\")")
  builder.addRaw("    ),")
  builder.addRaw("    OTEL_SERVICE_VERSION: Config.string(\"OTEL_SERVICE_VERSION\").pipe(")
  builder.addRaw("      Config.withDefault(\"0.0.0\")")
  builder.addRaw("    ),")
  builder.addRaw(
    "    OTEL_EXPORTER_OTLP_ENDPOINT: Config.string(\"OTEL_EXPORTER_OTLP_ENDPOINT\").pipe("
  )
  builder.addRaw("      Config.withDefault(\"http://localhost:4318\")")
  builder.addRaw("    ),")
  builder.addRaw(
    "    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: Config.string(\"OTEL_EXPORTER_OTLP_TRACES_ENDPOINT\").pipe("
  )
  builder.addRaw("      Config.withDefault(\"http://localhost:4318/v1/traces\")")
  builder.addRaw("    ),")
  builder.addRaw(
    "    OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: Config.string(\"OTEL_EXPORTER_OTLP_METRICS_ENDPOINT\").pipe("
  )
  builder.addRaw("      Config.withDefault(\"http://localhost:4318/v1/metrics\")")
  builder.addRaw("    ),")
  builder.addRaw("    OTEL_TRACES_ENABLED: Config.string(\"OTEL_TRACES_ENABLED\").pipe(")
  builder.addRaw("      Config.withDefault(\"true\")")
  builder.addRaw("    ),")
  builder.addRaw("    OTEL_METRICS_ENABLED: Config.string(\"OTEL_METRICS_ENABLED\").pipe(")
  builder.addRaw("      Config.withDefault(\"true\")")
  builder.addRaw("    ),")
  builder.addRaw(
    "    OTEL_METRICS_EXPORT_INTERVAL_MS: Config.string(\"OTEL_METRICS_EXPORT_INTERVAL_MS\").pipe("
  )
  builder.addRaw("      Config.withDefault(\"60000\")")
  builder.addRaw("    ),")
  builder.addRaw("    OTEL_TRACES_SAMPLER_ARG: Config.string(\"OTEL_TRACES_SAMPLER_ARG\").pipe(")
  builder.addRaw("      Config.withDefault(\"1.0\")")
  builder.addRaw("    ),")
  builder.addBlankLine()

  builder.addRaw("    // Runtime environment")
  builder.addRaw("    NODE_ENV: Config.string(\"NODE_ENV\").pipe(")
  builder.addRaw("      Config.withDefault(\"development\")")
  builder.addRaw("    )")

  // Add any user-defined server vars (excluding infrastructure vars already defined above)
  const infraVars = new Set([
    "DATABASE_URL",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "REDIS_URL",
    "SERVICE_AUTH_SECRET",
    "JWT_SECRET",
    "OTEL_SERVICE_NAME",
    "OTEL_SERVICE_VERSION",
    "OTEL_EXPORTER_OTLP_ENDPOINT",
    "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
    "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT",
    "OTEL_TRACES_ENABLED",
    "OTEL_METRICS_ENABLED",
    "OTEL_METRICS_EXPORT_INTERVAL_MS",
    "OTEL_TRACES_SAMPLER_ARG",
    "NODE_ENV"
  ])
  const userServerVars = serverVars.filter((v) => !infraVars.has(v.name))

  if (userServerVars.length > 0) {
    // Need to add comma after NODE_ENV since there are more vars
    builder.addRaw(",")
    builder.addBlankLine()
    builder.addRaw("    // User-defined server variables")
    for (let i = 0; i < userServerVars.length; i++) {
      const varDef = userServerVars[i]
      const configCall = generateConfigCall(varDef)
      const isLast = i === userServerVars.length - 1
      builder.addRaw(`    ${varDef.name}: ${configCall}${isLast ? "" : ","}`)
    }
  }

  builder.addRaw("  },")
  builder.addBlankLine()

  // Client section
  builder.addRaw("  // Client-safe variables (must start with PUBLIC_)")
  builder.addRaw("  client: {")
  if (clientVars.length === 0) {
    builder.addRaw("    // Add client-safe env vars here")
    builder.addRaw("    // PUBLIC_API_URL: Config.string(\"PUBLIC_API_URL\")")
  } else {
    for (let i = 0; i < clientVars.length; i++) {
      const varDef = clientVars[i]
      const configCall = generateConfigCall(varDef)
      const isLast = i === clientVars.length - 1
      builder.addRaw(`    ${varDef.name}: ${configCall}${isLast ? "" : ","}`)
    }
  }
  builder.addRaw("  },")
  builder.addBlankLine()

  // Shared section (empty - NODE_ENV is in server section for proper type inference)
  builder.addRaw("  // Shared variables (available in both contexts)")
  builder.addRaw("  shared: {},")
  builder.addBlankLine()

  // Client prefix
  builder.addRaw("  // Required prefix for client variables")
  builder.addRaw("  clientPrefix: \"PUBLIC_\"")
  builder.addRaw("})")
  builder.addBlankLine()

  // Type exports for convenience
  builder.addSectionComment("Type Exports")
  builder.addRaw("/**")
  builder.addRaw(" * Environment type (inferred from createEnv)")
  builder.addRaw(" */")
  builder.addRaw("export type Env = typeof env")
  builder.addBlankLine()

  return builder.toString()
}

/**
 * Generate Config call for a variable
 */
function generateConfigCall(varDef: ParsedEnvVar) {
  const { hasDefault, isSecret, name, type } = varDef

  // Choose Config method based on type and secret status
  let configMethod: string

  if (isSecret) {
    configMethod = `Config.redacted("${name}")`
  } else {
    switch (type) {
      case "number":
        configMethod = `Config.number("${name}")`
        break
      case "boolean":
        configMethod = `Config.boolean("${name}")`
        break
      default:
        configMethod = `Config.string("${name}")`
        break
    }
  }

  // Add default if present
  if (hasDefault) {
    const defaultValue = type === "number" ? hasDefault : `"${hasDefault}"`
    return `${configMethod}.pipe(Config.withDefault(${defaultValue}))`
  }

  return configMethod
}
