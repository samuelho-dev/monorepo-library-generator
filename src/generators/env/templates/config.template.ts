/**
 * Config Template
 *
 * Generates Effect Config loaders for environment variables.
 *
 * @module monorepo-library-generator/env-templates
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { ParsedEnvVar } from "../utils/parse-dotenv"

/**
 * Generate config file with Effect Config loaders
 */
export function generateConfigFile(vars: ParsedEnvVar[]): string {
  const builder = new TypeScriptBuilder()

  // File header
  builder.addFileHeader({
    title: "Environment Configuration Loaders",
    description:
      "Effect Config loaders for environment variables.\n\nUses @effect/platform Config system for type-safe environment access.\nSecrets use Config.redacted() for protection.\n\nGenerated automatically from .env file.",
    module: "@workspace/env/config"
  })

  // Imports
  builder.addImport("effect", "Config")
  // Import types only if needed (when there are vars for that context)
  builder.addBlankLine()

  // Separate vars by context
  const clientVars = vars.filter((v) => v.context === "client")
  const serverVars = vars.filter((v) => v.context === "server")
  const sharedVars = vars.filter((v) => v.context === "shared")

  // Generate client config loader
  builder.addSectionComment("Client Configuration Loader")
  builder.addRaw("/**")
  builder.addRaw(" * Client environment configuration")
  builder.addRaw(" *")
  builder.addRaw(" * Loads client-safe environment variables using Effect Config.")
  builder.addRaw(" * These variables are safe to expose in client bundles.")
  builder.addRaw(" */")

  const allClientVars = [...sharedVars, ...clientVars]

  // Handle empty client config - use empty object with inferred type
  if (allClientVars.length === 0) {
    builder.addRaw("export const clientConfig = Config.succeed({})")
  } else {
    // Use object syntax for Config.all
    builder.addRaw("export const clientConfig = Config.all({")

    // Add each var as object property
    for (const varDef of allClientVars) {
      const configCall = generateConfigCall(varDef)
      builder.addRaw(`  ${varDef.name}: ${configCall},`)
    }

    builder.addRaw("})")
  }

  builder.addBlankLine()

  // Generate server config loader
  builder.addSectionComment("Server Configuration Loader")
  builder.addRaw("/**")
  builder.addRaw(" * Server environment configuration")
  builder.addRaw(" *")
  builder.addRaw(" * Loads server-only environment variables using Effect Config.")
  builder.addRaw(" * Includes secrets protected with Config.redacted().")
  builder.addRaw(" */")

  // Handle empty server config - use empty object with inferred type
  if (serverVars.length === 0) {
    builder.addRaw("export const serverConfig = Config.succeed({})")
  } else {
    // Use object syntax for Config.all
    builder.addRaw("export const serverConfig = Config.all({")

    for (const varDef of serverVars) {
      const configCall = generateConfigCall(varDef)
      builder.addRaw(`  ${varDef.name}: ${configCall},`)
    }

    builder.addRaw("})")
  }

  builder.addBlankLine()

  // Generate merged config loader
  builder.addSectionComment("Merged Configuration Loader")
  builder.addRaw("/**")
  builder.addRaw(" * Complete environment configuration (client + server)")
  builder.addRaw(" *")
  builder.addRaw(" * Combines clientConfig and serverConfig into a single merged config.")
  builder.addRaw(" * Only available in server context.")
  builder.addRaw(" */")
  builder.addRaw("export const envConfig = Config.all({")
  builder.addRaw("  client: clientConfig,")
  builder.addRaw("  server: serverConfig")
  builder.addRaw("}).pipe(")
  builder.addRaw("  Config.map(({ client, server }) => ({ ...client, ...server }))")
  builder.addRaw(")")
  builder.addBlankLine()

  return builder.toString()
}

/**
 * Generate Config call for a variable
 */
function generateConfigCall(varDef: ParsedEnvVar): string {
  const { name, type, isSecret, hasDefault } = varDef

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
      case "string":
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
