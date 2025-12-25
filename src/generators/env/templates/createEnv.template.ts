/**
 * CreateEnv Template
 *
 * Generates the createEnv runtime library for t3-env style environment management.
 * Provides a single function to define all env vars with type inference and runtime protection.
 *
 * @module monorepo-library-generator/env-templates
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"

/**
 * Generate createEnv.ts - the runtime library for environment management
 *
 * This generates a t3-env inspired `createEnv` function that:
 * - Accepts server/client/shared config definitions
 * - Validates client prefix at runtime
 * - Uses Effect Config for loading and type inference
 * - Returns a Proxy that protects server vars on client
 */
export function generateCreateEnvFile() {
  const builder = new TypeScriptBuilder()

  // File header
  builder.addFileHeader({
    title: "Environment Configuration Runtime",
    description: "t3-env inspired environment management using Effect Config.\n\n" +
      "Provides a single `createEnv` function to define all environment variables\n" +
      "with automatic type inference and runtime client/server protection.\n\n" +
      "Features:\n" +
      "- Single source of truth for env var definitions\n" +
      "- TypeScript type inference via Config.Config.Success<>\n" +
      "- Runtime validation at import time (fail-fast)\n" +
      "- Proxy-based protection for server vars on client\n" +
      "- Client prefix enforcement",
    module: "@workspace/env/createEnv"
  })

  // Imports
  builder.addImport("effect", "Config")
  builder.addImport("effect", "Effect")
  builder.addImport("effect", "Layer")
  builder.addImport("effect", "ManagedRuntime")
  builder.addImport("effect", "ConfigProvider")
  builder.addImport("@effect/platform", "FileSystem")
  builder.addImport("@effect/platform-node", "NodeFileSystem")
  builder.addBlankLine()

  // Re-export Config for user convenience
  builder.addSectionComment("Re-export Config")
  builder.addRaw("/**")
  builder.addRaw(" * Re-export Effect Config for use in env definitions")
  builder.addRaw(" *")
  builder.addRaw(" * @example")
  builder.addRaw(" * ```typescript")
  builder.addRaw(" * import { createEnv, Config } from './createEnv'")
  builder.addRaw(" *")
  builder.addRaw(" * export const env = createEnv({")
  builder.addRaw(" *   server: {")
  builder.addRaw(" *     DATABASE_URL: Config.redacted(\"DATABASE_URL\"),")
  builder.addRaw(" *     PORT: Config.number(\"PORT\").pipe(Config.withDefault(3000)),")
  builder.addRaw(" *   },")
  builder.addRaw(" *   client: {")
  builder.addRaw(" *     PUBLIC_API_URL: Config.string(\"PUBLIC_API_URL\"),")
  builder.addRaw(" *   },")
  builder.addRaw(" *   clientPrefix: \"PUBLIC_\",")
  builder.addRaw(" * })")
  builder.addRaw(" * ```")
  builder.addRaw(" */")
  builder.addRaw("export { Config }")
  builder.addBlankLine()

  // Type definitions
  builder.addSectionComment("Type Definitions")
  builder.addRaw("/**")
  builder.addRaw(" * Infer the success type from a record of Config definitions")
  builder.addRaw(" */")
  builder.addRaw("type InferConfigRecord<T extends Record<string, Config.Config<unknown>>> = {")
  builder.addRaw("  [K in keyof T]: Config.Config.Success<T[K]>")
  builder.addRaw("}")
  builder.addBlankLine()

  builder.addRaw("/**")
  builder.addRaw(" * Options for createEnv function")
  builder.addRaw(" */")
  builder.addRaw("interface CreateEnvOptions<")
  builder.addRaw("  TServer extends Record<string, Config.Config<unknown>>,")
  builder.addRaw("  TClient extends Record<string, Config.Config<unknown>>,")
  builder.addRaw("  TShared extends Record<string, Config.Config<unknown>>,")
  builder.addRaw("> {")
  builder.addRaw("  /** Server-only environment variables (secrets, internal config) */")
  builder.addRaw("  server: TServer")
  builder.addRaw("  /** Client-safe environment variables (must have clientPrefix) */")
  builder.addRaw("  client: TClient")
  builder.addRaw("  /** Shared environment variables (available in both contexts) */")
  builder.addRaw("  shared?: TShared")
  builder.addRaw("  /** Required prefix for client variables (e.g., 'PUBLIC_') */")
  builder.addRaw("  clientPrefix: string")
  builder.addRaw("  /** Custom runtime env source (defaults to process.env) */")
  builder.addRaw("  runtimeEnv?: Record<string, string | undefined>")
  builder.addRaw("  /** Treat empty strings as undefined (default: true) */")
  builder.addRaw("  emptyStringAsUndefined?: boolean")
  builder.addRaw("}")
  builder.addBlankLine()

  // Context detection
  builder.addSectionComment("Context Detection")
  builder.addRaw("/**")
  builder.addRaw(" * Detect server vs client context")
  builder.addRaw(" *")
  builder.addRaw(" * Server: Node.js environment with process.versions.node")
  builder.addRaw(" * Client: Browser environment without process or Node.js globals")
  builder.addRaw(" */")
  builder.addRaw("const isServer =")
  builder.addRaw("  typeof process !== \"undefined\" &&")
  builder.addRaw("  process.versions?.node != null")
  builder.addBlankLine()

  // .env Parser
  builder.addSectionComment(".env Parser")
  builder.addRaw("/**")
  builder.addRaw(" * Parse .env file format")
  builder.addRaw(" */")
  builder.addRaw("function parseDotEnv(content: string) {")
  builder.addRaw("  const result: Record<string, string> = {}")
  builder.addRaw("  for (const line of content.split(\"\\n\")) {")
  builder.addRaw("    const match = line.match(/^([^=:#]+)=(.*)$/)")
  builder.addRaw("    if (match?.[1] && match[2] !== undefined) {")
  builder.addRaw("      const key = match[1].trim()")
  builder.addRaw("      const value = match[2].trim().replace(/^[\"']|[\"']$/g, \"\")")
  builder.addRaw("      result[key] = value")
  builder.addRaw("    }")
  builder.addRaw("  }")
  builder.addRaw("  return result")
  builder.addRaw("}")
  builder.addBlankLine()

  // ConfigProvider Layer
  builder.addSectionComment("ConfigProvider Layer")
  builder.addRaw("/**")
  builder.addRaw(" * Create ConfigProvider Layer with .env file support")
  builder.addRaw(" */")
  builder.addRaw("const makeConfigLayer = () => {")
  builder.addRaw("  if (!isServer) {")
  builder.addRaw(
    "    return Layer.succeed(ConfigProvider.ConfigProvider, ConfigProvider.fromEnv())"
  )
  builder.addRaw("  }")
  builder.addRaw("")
  builder.addRaw("  // Server: read .env file and provide NodeContext")
  builder.addRaw("  return Layer.unwrapEffect(")
  builder.addRaw("    Effect.gen(function*() {")
  builder.addRaw("      const fs = yield* FileSystem.FileSystem")
  builder.addRaw("      const path = \".env\"")
  builder.addRaw("")
  builder.addRaw("      const content = yield* fs.readFileString(path).pipe(")
  builder.addRaw("        Effect.catchAll(() => Effect.succeed(\"\"))")
  builder.addRaw("      )")
  builder.addRaw("")
  builder.addRaw("      const envVars = parseDotEnv(content)")
  builder.addRaw("      return Layer.succeed(")
  builder.addRaw("        ConfigProvider.ConfigProvider,")
  builder.addRaw("        ConfigProvider.fromMap(new Map(Object.entries(envVars)))")
  builder.addRaw("      )")
  builder.addRaw("    })")
  builder.addRaw("  ).pipe(Layer.provide(NodeFileSystem.layer))")
  builder.addRaw("}")
  builder.addRaw("")
  builder.addRaw("const ConfigLayer = makeConfigLayer()")
  builder.addBlankLine()

  // ManagedRuntime
  builder.addSectionComment("ManagedRuntime")
  builder.addRaw("/**")
  builder.addRaw(" * Managed runtime with ConfigProvider")
  builder.addRaw(" */")
  builder.addRaw("const runtime = ManagedRuntime.make(ConfigLayer)")
  builder.addBlankLine()

  // createEnv function
  builder.addSectionComment("createEnv Function")
  builder.addRaw("/**")
  builder.addRaw(" * Create a type-safe environment object from Config definitions")
  builder.addRaw(" *")
  builder.addRaw(" * Inspired by t3-oss/t3-env, this function provides:")
  builder.addRaw(" * - Single source of truth for all environment variables")
  builder.addRaw(" * - Automatic type inference from Config definitions")
  builder.addRaw(" * - Runtime validation at import time (fail-fast)")
  builder.addRaw(" * - Proxy-based protection for server vars on client")
  builder.addRaw(" *")
  builder.addRaw(" * @example")
  builder.addRaw(" * ```typescript")
  builder.addRaw(" * export const env = createEnv({")
  builder.addRaw(" *   server: {")
  builder.addRaw(" *     DATABASE_URL: Config.redacted(\"DATABASE_URL\"),")
  builder.addRaw(" *     PORT: Config.number(\"PORT\").pipe(Config.withDefault(3000)),")
  builder.addRaw(" *   },")
  builder.addRaw(" *   client: {")
  builder.addRaw(" *     PUBLIC_API_URL: Config.string(\"PUBLIC_API_URL\"),")
  builder.addRaw(" *   },")
  builder.addRaw(" *   shared: {")
  builder.addRaw(
    " *     NODE_ENV: Config.string(\"NODE_ENV\").pipe(Config.withDefault(\"development\")),"
  )
  builder.addRaw(" *   },")
  builder.addRaw(" *   clientPrefix: \"PUBLIC_\",")
  builder.addRaw(" * })")
  builder.addRaw(" *")
  builder.addRaw(" * // Usage:")
  builder.addRaw(" * env.DATABASE_URL  // Redacted<string> (server only)")
  builder.addRaw(" * env.PORT          // number")
  builder.addRaw(" * env.PUBLIC_API_URL // string (available everywhere)")
  builder.addRaw(" * ```")
  builder.addRaw(" */")
  builder.addRaw("export function createEnv<")
  builder.addRaw("  TServer extends Record<string, Config.Config<unknown>>,")
  builder.addRaw("  TClient extends Record<string, Config.Config<unknown>>,")
  builder.addRaw(
    "  TShared extends Record<string, Config.Config<unknown>> = Record<string, never>,"
  )
  builder.addRaw(">(")
  builder.addRaw("  options: CreateEnvOptions<TServer, TClient, TShared>")
  builder.addRaw(
    "): InferConfigRecord<TServer> & InferConfigRecord<TClient> & InferConfigRecord<TShared> {"
  )
  builder.addRaw("  const { server, client, shared = {} as TShared, clientPrefix } = options")
  builder.addBlankLine()
  builder.addRaw("  // Validate client keys have correct prefix")
  builder.addRaw("  for (const key of Object.keys(client)) {")
  builder.addRaw("    if (!key.startsWith(clientPrefix)) {")
  builder.addRaw("      throw new Error(")
  builder.addRaw(
    "        `Client env var \"${key}\" must start with \"${clientPrefix}\". Either rename to \"${clientPrefix}${key}\" or move to server config.`"
  )
  builder.addRaw("      )")
  builder.addRaw("    }")
  builder.addRaw("  }")
  builder.addBlankLine()
  builder.addRaw("  // Build combined config")
  builder.addRaw("  const allConfigs = { ...server, ...client, ...shared }")
  builder.addBlankLine()
  builder.addRaw("  // Load via Effect Config")
  builder.addRaw("  const envConfig = Config.all(allConfigs)")
  builder.addRaw("  const result = runtime.runSync(envConfig)")
  builder.addBlankLine()
  builder.addRaw("  // On client, return proxy that protects server vars")
  builder.addRaw("  if (!isServer) {")
  builder.addRaw("    const serverKeys = new Set(Object.keys(server))")
  builder.addRaw("    return new Proxy(result, {")
  builder.addRaw("      get(target, prop) {")
  builder.addRaw("        if (typeof prop === \"string\" && serverKeys.has(prop)) {")
  builder.addRaw("          throw new Error(")
  builder.addRaw(
    "            `Cannot access server-only env var \"${prop}\" on the client. This variable is only available in server context.`"
  )
  builder.addRaw("          )")
  builder.addRaw("        }")
  builder.addRaw("        return target[prop as keyof typeof target]")
  builder.addRaw("      }")
  builder.addRaw(
    "    }) as InferConfigRecord<TServer> & InferConfigRecord<TClient> & InferConfigRecord<TShared>"
  )
  builder.addRaw("  }")
  builder.addBlankLine()
  builder.addRaw(
    "  return result as InferConfigRecord<TServer> & InferConfigRecord<TClient> & InferConfigRecord<TShared>"
  )
  builder.addRaw("}")
  builder.addBlankLine()

  return builder.toString()
}
