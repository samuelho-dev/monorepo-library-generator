/**
 * .env File Parser
 *
 * Parses existing .env files and extracts environment variable definitions.
 * Infers types from values and identifies public vs server-only variables.
 */

import * as fs from "node:fs"
import * as path from "node:path"

export interface ParsedEnvVar {
  name: string
  type: "string" | "number" | "boolean"
  isPublic: boolean
  isSecret: boolean // *_SECRET, *_KEY, DATABASE_URL, REDIS_URL
  context: "client" | "server" | "shared"
  hasDefault?: string | undefined // For Config.withDefault()
}

const envVar = (
  name: string,
  type: ParsedEnvVar["type"],
  context: ParsedEnvVar["context"],
  options: { isPublic?: boolean; isSecret?: boolean; hasDefault?: string } = {}
) => ({
  name,
  type,
  isPublic: options.isPublic ?? false,
  isSecret: options.isSecret ?? false,
  context,
  ...(options.hasDefault !== undefined ? { hasDefault: options.hasDefault } : {})
})

/**
 * Parse .env file and extract variable definitions
 *
 * @param filePath - Absolute path to .env file
 * @returns Array of parsed environment variables
 */
export function parseDotEnvFile(filePath: string) {
  // Check if .env file exists
  if (!fs.existsSync(filePath)) {
    return getDefaultEnvVars()
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8")
    const vars: Array<ParsedEnvVar> = []

    for (const line of content.split("\n")) {
      const trimmed = line.trim()

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith("#")) {
        continue
      }

      // Parse KEY=value format
      const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
      if (!match?.[1] || match[2] === undefined) {
        continue
      }

      const name = match[1]
      const value = match[2]

      // Remove quotes if present
      const cleanValue = value.replace(/^["']|["']$/g, "")

      const isPublic = name.startsWith("PUBLIC_") ||
        name.startsWith("NEXT_PUBLIC_") ||
        name.startsWith("VITE_") ||
        name === "NODE_ENV"
      const isSecret = name.endsWith("_SECRET") ||
        name.endsWith("_KEY") ||
        name === "DATABASE_URL" ||
        name === "REDIS_URL"

      vars.push({
        name,
        type: inferType(cleanValue),
        isPublic,
        isSecret,
        // NODE_ENV is always shared (regardless of isPublic), others follow normal rules
        context: name === "NODE_ENV" ? "shared" : isPublic ? "client" : "server",
        hasDefault: name === "NODE_ENV" ? "development" : name === "PORT" ? "3000" : undefined
      })
    }

    if (vars.length === 0) {
      return getDefaultEnvVars()
    }
    return vars
  } catch {
    return getDefaultEnvVars()
  }
}

/**
 * Infer variable type from string value
 *
 * @param value - String value from .env file
 * @returns Inferred type
 */
function inferType(value: string) {
  // Boolean values
  if (value === "true" || value === "false") {
    return "boolean"
  }

  // Numeric values
  if (value !== "" && !Number.isNaN(Number(value))) {
    return "number"
  }

  // Default to string
  return "string"
}

/**
 * Default environment variables when no .env file exists
 */
export function getDefaultEnvVars() {
  return [
    // Node environment (shared)
    envVar("NODE_ENV", "string", "shared", { isPublic: true, hasDefault: "development" }),

    // Server-only variables
    envVar("DATABASE_URL", "string", "server", { isSecret: true }),
    envVar("API_SECRET", "string", "server", { isSecret: true }),
    envVar("REDIS_URL", "string", "server", { isSecret: true }),
    envVar("PORT", "number", "server", { hasDefault: "3000" }),

    // Provider-specific variables (built-in providers)
    envVar("KYSELY_API_KEY", "string", "server", { isSecret: true }),
    envVar("KYSELY_TIMEOUT", "number", "server"),
    envVar("EFFECT_CACHE_API_KEY", "string", "server", { isSecret: true }),
    envVar("EFFECT_CACHE_TIMEOUT", "number", "server"),
    envVar("EFFECT_LOGGER_API_KEY", "string", "server", { isSecret: true }),
    envVar("EFFECT_LOGGER_TIMEOUT", "number", "server"),
    envVar("EFFECT_METRICS_API_KEY", "string", "server", { isSecret: true }),
    envVar("EFFECT_METRICS_TIMEOUT", "number", "server"),
    envVar("EFFECT_QUEUE_API_KEY", "string", "server", { isSecret: true }),
    envVar("EFFECT_QUEUE_TIMEOUT", "number", "server"),
    envVar("EFFECT_PUBSUB_API_KEY", "string", "server", { isSecret: true }),
    envVar("EFFECT_PUBSUB_TIMEOUT", "number", "server"),

    // Supabase provider variables
    envVar("SUPABASE_URL", "string", "server"),
    envVar("SUPABASE_ANON_KEY", "string", "server", { isSecret: true }),
    envVar("SUPABASE_SERVICE_ROLE_KEY", "string", "server", { isSecret: true }),

    // Client-safe variables (PUBLIC_ prefix)
    envVar("PUBLIC_API_URL", "string", "client", { isPublic: true }),
    envVar("PUBLIC_FEATURE_FLAG", "boolean", "client", { isPublic: true })
  ]
}

/**
 * Find .env file in workspace
 *
 * Searches for .env file starting from workspace root
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @returns Absolute path to .env file, or null if not found
 */
export function findDotEnvFile(workspaceRoot: string) {
  const possiblePaths = [
    path.join(workspaceRoot, ".env"),
    path.join(workspaceRoot, ".env.local"),
    path.join(workspaceRoot, ".env.development")
  ]

  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      return envPath
    }
  }

  return null
}
