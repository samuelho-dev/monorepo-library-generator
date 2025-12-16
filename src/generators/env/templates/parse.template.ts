/**
 * Environment Parse Template
 *
 * Generates runtime validation and filtering logic for environment variables.
 *
 * @module monorepo-library-generator/env-templates
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { ParsedEnvVar } from "../utils/parse-dotenv"

/**
 * Generate parse file with validation and filtering logic
 */
export function generateParseFile(vars: ParsedEnvVar[]): string {
  const builder = new TypeScriptBuilder()

  // File header
  builder.addFileHeader({
    title: "Environment Variable Parser",
    description:
      "Runtime validation and filtering of environment variables.\n\nFeatures:\n- Eager validation on import (fail fast)\n- Type coercion from process.env strings\n- Platform-aware filtering (server vs client)\n- Effect Schema validation",
    module: "@workspace/env/parse"
  })

  // Imports
  builder.addImport("effect", "Schema as S")
  // Type-only import for Env type
  builder.addImport("./schema", "Env", true)
  // Value imports for EnvSchema and isPublicVar (used at runtime)
  builder.addImport("./schema", "EnvSchema")
  builder.addImport("./schema", "isPublicVar")
  builder.addBlankLine()

  // Generate parseEnv function
  builder.addSectionComment("Environment Parsing")
  builder.addRaw("/**")
  builder.addRaw(" * Parse and validate process.env")
  builder.addRaw(" *")
  builder.addRaw(" * Eagerly validates all environment variables on import.")
  builder.addRaw(" * Throws if validation fails (fail fast).")
  builder.addRaw(" */")
  builder.addRaw("function parseEnv(): Env {")
  builder.addRaw("  try {")
  builder.addRaw("    // Convert process.env strings to proper types")
  builder.addRaw("    const raw = {")

  // Add each variable with type coercion
  for (const varDef of vars) {
    const coercion = getTypeCoercion(varDef)
    builder.addRaw(`      ${varDef.name}: ${coercion},`)
  }

  builder.addRaw("    }")
  builder.addBlankLine()
  builder.addRaw("    // Validate against schema (throws on error)")
  builder.addRaw("    return S.decodeUnknownSync(EnvSchema)(raw)")
  builder.addRaw("  } catch (error) {")
  builder.addRaw('    console.error("❌ Environment validation failed:", error)')
  builder.addRaw('    throw new Error("Invalid environment configuration")')
  builder.addRaw("  }")
  builder.addRaw("}")
  builder.addBlankLine()

  // Parse once on import
  builder.addSectionComment("Parse on Import")
  builder.addRaw("/** Parsed and validated environment variables */")
  builder.addRaw("const fullEnv = parseEnv()")
  builder.addBlankLine()

  // Generate getFilteredEnv function
  builder.addSectionComment("Runtime Filtering")
  builder.addRaw("/**")
  builder.addRaw(" * Filter environment variables based on runtime context")
  builder.addRaw(" *")
  builder.addRaw(" * - Server (Node.js): Returns all variables")
  builder.addRaw(" * - Client (Browser): Returns only PUBLIC_ prefixed variables")
  builder.addRaw(" */")
  builder.addRaw("export function getFilteredEnv(): Env {")
  builder.addRaw("  // Check for Node.js environment (server-side)")
  builder.addRaw("  const isServer = typeof process !== 'undefined' && process.versions != null && process.versions.node != null")
  builder.addBlankLine()
  builder.addRaw("  if (isServer) {")
  builder.addRaw("    // Server: return all variables")
  builder.addRaw("    return fullEnv")
  builder.addRaw("  }")
  builder.addBlankLine()
  builder.addRaw("  // Client: filter to only public variables")
  builder.addRaw("  return Object.fromEntries(")
  builder.addRaw("    Object.entries(fullEnv).filter(([key]) => isPublicVar(key))")
  builder.addRaw("  ) as Env")
  builder.addRaw("}")

  return builder.toString()
}

/**
 * Get type coercion logic for environment variable
 */
function getTypeCoercion(varDef: ParsedEnvVar): string {
  const envVar = `process.env["${varDef.name}"]`

  switch (varDef.type) {
    case "number":
      // Special handling for PORT with default
      if (varDef.name === "PORT") {
        return `${envVar} ? Number(${envVar}) : 3000`
      }
      return `${envVar} ? Number(${envVar}) : undefined`

    case "boolean":
      return `${envVar} === 'true' ? true : ${envVar} === 'false' ? false : undefined`

    case "string":
    default:
      // Special handling for NODE_ENV with default
      if (varDef.name === "NODE_ENV") {
        return `${envVar} || 'development'`
      }
      return envVar
  }
}
