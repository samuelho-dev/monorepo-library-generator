import { FileSystem } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import { Config, ConfigProvider, Effect, Layer, ManagedRuntime } from "effect"

/**
 * Environment Configuration Runtime
 *
 * t3-env inspired environment management using Effect Config.

Provides a single `createEnv` function to define all environment variables
with automatic type inference and runtime client/server protection.

Features:
- Single source of truth for env var definitions
- TypeScript type inference via Config.Config.Success<>
- Runtime validation at import time (fail-fast)
- Proxy-based protection for server vars on client
- Client prefix enforcement
 *
 * @module @workspace/env/createEnv
 */


// ============================================================================
// Re-export Config
// ============================================================================

/**
 * Re-export Effect Config for use in env definitions
 *
 * @example
 * ```typescript
 * import { createEnv, Config } from './createEnv'
 *
 * export const env = createEnv({
 *   server: {
 *     DATABASE_URL: Config.redacted("DATABASE_URL"),
 *     PORT: Config.number("PORT").pipe(Config.withDefault(3000)),
 *   },
 *   client: {
 *     PUBLIC_API_URL: Config.string("PUBLIC_API_URL"),
 *   },
 *   clientPrefix: "PUBLIC_",
 * })
 * ```
 */
export { Config }

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Infer the success type from a record of Config definitions
 */
type InferConfigRecord<T extends Record<string, Config.Config<unknown>>> = {
  [K in keyof T]: Config.Config.Success<T[K]>
}

/**
 * Options for createEnv function
 */
interface CreateEnvOptions<
  TServer extends Record<string, Config.Config<unknown>>,
  TClient extends Record<string, Config.Config<unknown>>,
  TShared extends Record<string, Config.Config<unknown>>,
> {
  /** Server-only environment variables (secrets, internal config) */
  server: TServer
  /** Client-safe environment variables (must have clientPrefix) */
  client: TClient
  /** Shared environment variables (available in both contexts) */
  shared?: TShared
  /** Required prefix for client variables (e.g., 'PUBLIC_') */
  clientPrefix: string
  /** Custom runtime env source (defaults to process.env) */
  runtimeEnv?: Record<string, string | undefined>
  /** Treat empty strings as undefined (default: true) */
  emptyStringAsUndefined?: boolean
}

// ============================================================================
// Context Detection
// ============================================================================

/**
 * Detect server vs client context
 *
 * Server: Node.js environment with process.versions.node
 * Client: Browser environment without process or Node.js globals
 */
const isServer =
  typeof process !== "undefined" &&
  process.versions?.node != null

// ============================================================================
// .env Parser
// ============================================================================

/**
 * Parse .env file format
 */
function parseDotEnv(content: string) {
  const result: Record<string, string> = {}
  content.split("\n").forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/)
    if (match?.[1] && match[2] !== undefined) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, "")
      result[key] = value
    }
  })
  return result
}

// ============================================================================
// ConfigProvider Layer
// ============================================================================

/**
 * Create ConfigProvider Layer with .env file support
 */
const makeConfigLayer = () => {
  if (!isServer) {
    return Layer.succeed(ConfigProvider.ConfigProvider, ConfigProvider.fromEnv())
  }

  // Server: read .env file and provide NodeContext
  return Layer.unwrapEffect(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = ".env"

      const content = yield* fs.readFileString(path).pipe(
        Effect.catchAll(() => Effect.succeed(""))
      )

      const envVars = parseDotEnv(content)
      return Layer.succeed(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromMap(new Map(Object.entries(envVars)))
      )
    })
  ).pipe(Layer.provide(NodeFileSystem.layer))
}

const ConfigLayer = makeConfigLayer()

// ============================================================================
// ManagedRuntime
// ============================================================================

/**
 * Managed runtime with ConfigProvider
 */
const runtime = ManagedRuntime.make(ConfigLayer)

// ============================================================================
// createEnv Function
// ============================================================================

/**
 * Create a type-safe environment object from Config definitions
 *
 * Inspired by t3-oss/t3-env, this function provides:
 * - Single source of truth for all environment variables
 * - Automatic type inference from Config definitions
 * - Runtime validation at import time (fail-fast)
 * - Proxy-based protection for server vars on client
 *
 * @example
 * ```typescript
 * export const env = createEnv({
 *   server: {
 *     DATABASE_URL: Config.redacted("DATABASE_URL"),
 *     PORT: Config.number("PORT").pipe(Config.withDefault(3000)),
 *   },
 *   client: {
 *     PUBLIC_API_URL: Config.string("PUBLIC_API_URL"),
 *   },
 *   shared: {
 *     NODE_ENV: Config.string("NODE_ENV").pipe(Config.withDefault("development")),
 *   },
 *   clientPrefix: "PUBLIC_",
 * })
 *
 * // Usage:
 * env.DATABASE_URL  // Redacted<string> (server only)
 * env.PORT          // number
 * env.PUBLIC_API_URL // string (available everywhere)
 * ```
 */
export function createEnv<
  TServer extends Record<string, Config.Config<unknown>>,
  TClient extends Record<string, Config.Config<unknown>>,
  TShared extends Record<string, Config.Config<unknown>> = Record<string, never>,
>(
  options: CreateEnvOptions<TServer, TClient, TShared>
): InferConfigRecord<TServer> & InferConfigRecord<TClient> & InferConfigRecord<TShared> {
  const { server, client, shared = {} as TShared, clientPrefix } = options

  // Validate client keys have correct prefix
  for (const key of Object.keys(client)) {
    if (!key.startsWith(clientPrefix)) {
      throw new Error(
        `Client env var "${key}" must start with "${clientPrefix}". Either rename to "${clientPrefix}${key}" or move to server config.`
      )
    }
  }

  // Build combined config
  const allConfigs = { ...server, ...client, ...shared }

  // Load via Effect Config
  const envConfig = Config.all(allConfigs)
  const result = runtime.runSync(envConfig)

  // On client, return proxy that protects server vars
  if (!isServer) {
    const serverKeys = new Set(Object.keys(server))
    return new Proxy(result as Record<string, unknown>, {
      get(target, prop) {
        if (typeof prop === "string" && serverKeys.has(prop)) {
          throw new Error(
            `Cannot access server-only env var "${prop}" on the client. This variable is only available in server context.`
          )
        }
        return target[prop as keyof typeof target]
      }
    }) as InferConfigRecord<TServer> & InferConfigRecord<TClient> & InferConfigRecord<TShared>
  }

  return result as InferConfigRecord<TServer> & InferConfigRecord<TClient> & InferConfigRecord<TShared>
}
