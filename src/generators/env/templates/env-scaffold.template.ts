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
  builder.addRaw("import { createEnv, Config } from \"./createEnv\"")
  builder.addBlankLine()

  // Separate vars by context
  const clientVars = vars.filter((v) => v.context === "client")
  const serverVars = vars.filter((v) => v.context === "server")
  const sharedVars = vars.filter((v) => v.context === "shared")

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
  if (serverVars.length === 0) {
    builder.addRaw("    // Add server-only env vars here")
    builder.addRaw("    // DATABASE_URL: Config.redacted(\"DATABASE_URL\"),")
  } else {
    for (const varDef of serverVars) {
      const configCall = generateConfigCall(varDef)
      builder.addRaw(`    ${varDef.name}: ${configCall},`)
    }
  }
  builder.addRaw("  },")
  builder.addBlankLine()

  // Client section
  builder.addRaw("  // Client-safe variables (must start with PUBLIC_)")
  builder.addRaw("  client: {")
  if (clientVars.length === 0) {
    builder.addRaw("    // Add client-safe env vars here")
    builder.addRaw("    // PUBLIC_API_URL: Config.string(\"PUBLIC_API_URL\"),")
  } else {
    for (const varDef of clientVars) {
      const configCall = generateConfigCall(varDef)
      builder.addRaw(`    ${varDef.name}: ${configCall},`)
    }
  }
  builder.addRaw("  },")
  builder.addBlankLine()

  // Shared section
  builder.addRaw("  // Shared variables (available in both contexts)")
  builder.addRaw("  shared: {")
  if (sharedVars.length === 0) {
    builder.addRaw(
      "    NODE_ENV: Config.string(\"NODE_ENV\").pipe(Config.withDefault(\"development\")),"
    )
  } else {
    for (const varDef of sharedVars) {
      const configCall = generateConfigCall(varDef)
      builder.addRaw(`    ${varDef.name}: ${configCall},`)
    }
  }
  builder.addRaw("  },")
  builder.addBlankLine()

  // Client prefix
  builder.addRaw("  // Required prefix for client variables")
  builder.addRaw("  clientPrefix: \"PUBLIC_\",")
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
