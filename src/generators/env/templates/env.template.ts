/**
 * Env Template
 *
 * Generates static environment object exports with ManagedRuntime.
 *
 * @module monorepo-library-generator/env-templates
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { ParsedEnvVar } from "../utils/parse-dotenv"

/**
 * Generate env file with static object exports
 */
export function generateEnvFile(_vars: ParsedEnvVar[]): string {
  const builder = new TypeScriptBuilder()

  // File header
  builder.addFileHeader({
    title: "Environment Variable Exports",
    description:
      "Static environment object exports using Effect Config and ManagedRuntime.\n\nEnvironment variables are loaded eagerly on module initialization.\nContext detection ensures client receives only PUBLIC_ vars.\n\nGenerated automatically from .env file.",
    module: "@workspace/env/env"
  })

  // Imports
  builder.addImport("effect", "Effect")
  builder.addImport("effect", "Layer")
  builder.addImport("effect", "ManagedRuntime")
  builder.addImport("effect", "ConfigProvider")
  builder.addImport("@effect/platform-node", "NodeFileSystem")
  builder.addImport("@effect/platform-node", "NodeContext")
  builder.addImport("./config", "clientConfig")
  builder.addImport("./config", "serverConfig")
  builder.addImport("./config", "envConfig")
  builder.addImport("./types", "ClientEnv", true)
  builder.addImport("./types", "ServerEnv", true)
  builder.addImport("./types", "Env", true)
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
  builder.addRaw('  typeof process !== "undefined" &&')
  builder.addRaw("  process.versions?.node != null")
  builder.addBlankLine()

  // ConfigProvider Layer
  builder.addSectionComment("ConfigProvider Layer")
  builder.addRaw("/**")
  builder.addRaw(" * ConfigProvider Layer with .env file support")
  builder.addRaw(" *")
  builder.addRaw(" * Server: Loads .env file from filesystem")
  builder.addRaw(" * Client: Uses process.env directly")
  builder.addRaw(" */")
  builder.addRaw("const ConfigLayer = isServer")
  builder.addRaw("  ? Layer.unwrapEffect(")
  builder.addRaw("      Effect.gen(function* () {")
  builder.addRaw("        const fs = yield* NodeFileSystem.FileSystem")
  builder.addRaw('        const path = ".env"')
  builder.addRaw("")
  builder.addRaw("        // Load .env file")
  builder.addRaw("        const content = yield* fs.readFileString(path).pipe(")
  builder.addRaw('          Effect.catchAll(() => Effect.succeed(""))')
  builder.addRaw("        )")
  builder.addRaw("")
  builder.addRaw("        // Parse and create ConfigProvider")
  builder.addRaw("        const envVars = parseDotEnv(content)")
  builder.addRaw("        return Layer.succeed(")
  builder.addRaw("          ConfigProvider.ConfigProvider,")
  builder.addRaw("          ConfigProvider.fromMap(new Map(Object.entries(envVars)))")
  builder.addRaw("        )")
  builder.addRaw("      })")
  builder.addRaw("    )")
  builder.addRaw("  : Layer.succeed(ConfigProvider.ConfigProvider, ConfigProvider.fromEnv())")
  builder.addBlankLine()

  // parseDotEnv helper
  builder.addSectionComment(".env Parser")
  builder.addRaw("/**")
  builder.addRaw(" * Parse .env file format")
  builder.addRaw(" *")
  builder.addRaw(" * @param content - .env file content")
  builder.addRaw(" * @returns Record of environment variables")
  builder.addRaw(" */")
  builder.addRaw("function parseDotEnv(content: string): Record<string, string> {")
  builder.addRaw("  const result: Record<string, string> = {}")
  builder.addRaw('  content.split("\\n").forEach(line => {')
  builder.addRaw('    const match = line.match(/^([^=:#]+)=(.*)$/)')
  builder.addRaw("    if (match) {")
  builder.addRaw("      const key = match[1].trim()")
  builder.addRaw("      const value = match[2].trim().replace(/^[\"']|[\"']$/g, \"\")")
  builder.addRaw("      result[key] = value")
  builder.addRaw("    }")
  builder.addRaw("  })")
  builder.addRaw("  return result")
  builder.addRaw("}")
  builder.addBlankLine()

  // ManagedRuntime
  builder.addSectionComment("ManagedRuntime")
  builder.addRaw("/**")
  builder.addRaw(" * Create managed runtime with ConfigProvider")
  builder.addRaw(" *")
  builder.addRaw(" * Manages lifecycle of config loading and resource cleanup.")
  builder.addRaw(" */")
  builder.addRaw("const runtime = ManagedRuntime.make(")
  builder.addRaw("  isServer ? ConfigLayer.pipe(Layer.provide(NodeContext.layer)) : ConfigLayer")
  builder.addRaw(")")
  builder.addBlankLine()

  // Environment exports
  builder.addSectionComment("Environment Exports")
  builder.addRaw("/**")
  builder.addRaw(" * Client environment (PUBLIC_ vars only)")
  builder.addRaw(" *")
  builder.addRaw(" * Loaded eagerly on module initialization.")
  builder.addRaw(" * Safe to use in client bundles.")
  builder.addRaw(" */")
  builder.addRaw("export const clientEnv = runtime.runSync(clientConfig)")
  builder.addBlankLine()

  builder.addRaw("/**")
  builder.addRaw(" * Server environment (server-only vars)")
  builder.addRaw(" *")
  builder.addRaw(" * Only available in server context.")
  builder.addRaw(" * Empty object in client context.")
  builder.addRaw(" */")
  builder.addRaw("export const serverEnv = isServer")
  builder.addRaw("  ? runtime.runSync(serverConfig)")
  builder.addRaw("  : ({} as ServerEnv)")
  builder.addBlankLine()

  builder.addRaw("/**")
  builder.addRaw(" * Complete environment (client + server)")
  builder.addRaw(" *")
  builder.addRaw(" * Server: All variables available")
  builder.addRaw(" * Client: Only PUBLIC_ variables (cast for type compatibility)")
  builder.addRaw(" */")
  builder.addRaw("export const env = isServer")
  builder.addRaw("  ? runtime.runSync(envConfig)")
  builder.addRaw("  : (clientEnv as unknown as Env)")
  builder.addBlankLine()

  return builder.toString()
}
