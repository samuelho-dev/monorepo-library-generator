/**
 * Environment Schema Template
 *
 * Generates Effect Schema definitions for environment variables.
 *
 * @module monorepo-library-generator/env-templates
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { ParsedEnvVar } from "../utils/parse-dotenv"

/**
 * Generate schema file with Effect Schema definitions
 */
export function generateSchemaFile(vars: ParsedEnvVar[]): string {
  const builder = new TypeScriptBuilder()

  // File header
  builder.addFileHeader({
    title: "Environment Variable Schema",
    description:
      "Type-safe environment variable definitions using Effect Schema.\n\nValidation rules:\n- All variables are optional by default\n- Types are inferred from .env file values\n- PUBLIC_ prefix variables are client-safe\n\nGenerated automatically from .env file.",
    module: "@workspace/env/schema"
  })

  // Imports
  builder.addImport("effect", "Schema as S")
  builder.addBlankLine()

  // Generate EnvSchema
  builder.addSectionComment("Environment Variable Schema")
  builder.addRaw("/**")
  builder.addRaw(" * Environment variables schema")
  builder.addRaw(" *")
  builder.addRaw(" * Variables are separated by prefix convention:")
  builder.addRaw(" * - Regular vars (DATABASE_URL, API_KEY, etc.) = Server-only")
  builder.addRaw(" * - PUBLIC_/NEXT_PUBLIC_/VITE_ prefix = Client-safe")
  builder.addRaw(" */")
  builder.addRaw("export const EnvSchema = S.Struct({")

  // Add each variable to schema
  for (const varDef of vars) {
    const schemaType = getSchemaType(varDef.type)
    const comment = varDef.isPublic ? "// Client-safe" : "// Server-only"

    builder.addRaw(`  ${varDef.name}: S.optional(${schemaType}), ${comment}`)
  }

  builder.addRaw("})")
  builder.addBlankLine()

  // Type export
  builder.addSectionComment("Type Exports")
  builder.addRaw("/** Environment variables type */")
  builder.addRaw("export type Env = S.Schema.Type<typeof EnvSchema>")
  builder.addBlankLine()

  // Helper function
  builder.addSectionComment("Helper Functions")
  builder.addRaw("/**")
  builder.addRaw(" * Check if environment variable is client-safe")
  builder.addRaw(" *")
  builder.addRaw(" * @param key - Environment variable name")
  builder.addRaw(" * @returns true if variable can be accessed in browser")
  builder.addRaw(" */")
  builder.addRaw("export const isPublicVar = (key: string): boolean =>")
  builder.addRaw("  key.startsWith('PUBLIC_') ||")
  builder.addRaw("  key.startsWith('NEXT_PUBLIC_') ||")
  builder.addRaw("  key.startsWith('VITE_') ||")
  builder.addRaw("  key === 'NODE_ENV'")

  return builder.toString()
}

/**
 * Get Effect Schema type for environment variable
 */
function getSchemaType(type: "string" | "number" | "boolean"): string {
  switch (type) {
    case "number":
      return "S.Number"
    case "boolean":
      return "S.Boolean"
    case "string":
    default:
      return "S.String"
  }
}
