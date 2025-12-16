/**
 * Types Template
 *
 * Generates TypeScript type definitions with branded types for environment variables.
 *
 * @module monorepo-library-generator/env-templates
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { ParsedEnvVar } from "../utils/parse-dotenv"

/**
 * Generate types file with branded type definitions
 */
export function generateTypesFile(vars: ParsedEnvVar[]): string {
  const builder = new TypeScriptBuilder()

  // File header
  builder.addFileHeader({
    title: "Environment Variable Types",
    description:
      "Type-safe environment variable definitions with branded types.\n\nBranded types prevent accidental mixing of client and server environments.\nThe Env type is an intersection of ClientEnv and ServerEnv.\n\nGenerated automatically from .env file.",
    module: "@workspace/env/types"
  })

  builder.addBlankLine()

  // Check if we need Redacted import
  const hasSecrets = vars.some((v) => v.isSecret)
  if (hasSecrets) {
    builder.addImport("effect", "Redacted", true)
    builder.addBlankLine()
  }

  // Separate vars by context
  const clientVars = vars.filter((v) => v.context === "client")
  const serverVars = vars.filter((v) => v.context === "server")
  const sharedVars = vars.filter((v) => v.context === "shared")

  // Add branded type symbols
  builder.addSectionComment("Branded Type Symbols")
  builder.addRaw("/**")
  builder.addRaw(" * Unique symbol for ClientEnv branding")
  builder.addRaw(" * Prevents accidental assignment between ClientEnv and ServerEnv")
  builder.addRaw(" */")
  builder.addRaw("declare const ClientEnvBrand: unique symbol")
  builder.addBlankLine()

  builder.addRaw("/**")
  builder.addRaw(" * Unique symbol for ServerEnv branding")
  builder.addRaw(" * Prevents accidental assignment between ServerEnv and ClientEnv")
  builder.addRaw(" */")
  builder.addRaw("declare const ServerEnvBrand: unique symbol")
  builder.addBlankLine()

  // Generate ClientEnv interface
  builder.addSectionComment("Client Environment")
  builder.addRaw("/**")
  builder.addRaw(" * Client-safe environment variables")
  builder.addRaw(" *")
  builder.addRaw(" * These variables are safe to expose in client bundles.")
  builder.addRaw(" * Typically includes PUBLIC_*, NEXT_PUBLIC_*, VITE_* prefixed vars.")
  builder.addRaw(" *")
  builder.addRaw(" * @property {symbol} [ClientEnvBrand] - Branded type symbol")
  builder.addRaw(" */")
  builder.addRaw("export interface ClientEnv {")
  builder.addRaw("  readonly [ClientEnvBrand]: typeof ClientEnvBrand")

  // Add shared vars to client env
  for (const varDef of sharedVars) {
    const tsType = getTsType(varDef)
    builder.addRaw(`  readonly ${varDef.name}: ${tsType}`)
  }

  // Add client-only vars
  for (const varDef of clientVars) {
    const tsType = getTsType(varDef)
    builder.addRaw(`  readonly ${varDef.name}: ${tsType}`)
  }

  builder.addRaw("}")
  builder.addBlankLine()

  // Generate ServerEnv interface
  builder.addSectionComment("Server Environment")
  builder.addRaw("/**")
  builder.addRaw(" * Server-only environment variables")
  builder.addRaw(" *")
  builder.addRaw(" * These variables should NEVER be exposed to client bundles.")
  builder.addRaw(" * Includes database URLs, API secrets, and other sensitive data.")
  builder.addRaw(" *")
  builder.addRaw(" * @property {symbol} [ServerEnvBrand] - Branded type symbol")
  builder.addRaw(" */")
  builder.addRaw("export interface ServerEnv {")
  builder.addRaw("  readonly [ServerEnvBrand]: typeof ServerEnvBrand")

  for (const varDef of serverVars) {
    const tsType = getTsType(varDef)
    const comment = varDef.isSecret ? " // Secret - redacted for security" : ""
    builder.addRaw(`  readonly ${varDef.name}: ${tsType}${comment}`)
  }

  builder.addRaw("}")
  builder.addBlankLine()

  // Generate merged Env type
  builder.addSectionComment("Merged Environment")
  builder.addRaw("/**")
  builder.addRaw(" * Complete environment (client + server)")
  builder.addRaw(" *")
  builder.addRaw(" * Intersection type that combines ClientEnv and ServerEnv.")
  builder.addRaw(" * Use this on the server where all variables are available.")
  builder.addRaw(" *")
  builder.addRaw(" * On the client, only ClientEnv properties will be populated.")
  builder.addRaw(" */")
  builder.addRaw("export type Env = ClientEnv & ServerEnv")
  builder.addBlankLine()

  return builder.toString()
}

/**
 * Convert parsed env var to TypeScript type
 * Secrets use Redacted<string> for protection
 */
function getTsType(varDef: ParsedEnvVar): string {
  // Secrets use Redacted wrapper
  if (varDef.isSecret) {
    return "Redacted<string>"
  }

  // Non-secrets use plain types
  switch (varDef.type) {
    case "number":
      return "number"
    case "boolean":
      return "boolean"
    case "string":
    default:
      return "string"
  }
}
