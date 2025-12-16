/**
 * Environment Index Template
 *
 * Generates main export for type-safe environment variables.
 *
 * @module monorepo-library-generator/env-templates
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"

/**
 * Generate index file with env export
 */
export function generateIndexFile(): string {
  const builder = new TypeScriptBuilder()

  // File header
  builder.addFileHeader({
    title: "Environment Variables",
    description:
      "Type-safe environment variable access.\n\nUsage:\n```typescript\nimport { env } from '@workspace/env'\n\n// Server-side\nconst dbUrl = env.DATABASE_URL\nconst apiSecret = env.API_SECRET\n\n// Client-side (only PUBLIC_ vars)\nconst apiUrl = env.PUBLIC_API_URL\n```\n\nPlatform separation:\n- Server (Node.js): Access all variables\n- Client (Browser): Access only PUBLIC_ prefixed variables\n\nValidation:\n- Validated eagerly on import (fail fast)\n- Uses Effect Schema for type safety\n- Throws if required variables are missing",
    module: "@workspace/env"
  })

  // Imports
  builder.addImport("./parse", "getFilteredEnv")
  builder.addBlankLine()

  // Main export
  builder.addSectionComment("Environment Export")
  builder.addRaw("/**")
  builder.addRaw(" * Type-safe environment variables")
  builder.addRaw(" *")
  builder.addRaw(" * Server vs Client:")
  builder.addRaw(" * - Server (Node.js): Access all variables")
  builder.addRaw(" * - Client (Browser): Access only PUBLIC_ prefixed variables")
  builder.addRaw(" *")
  builder.addRaw(" * Validation:")
  builder.addRaw(" * - Validated eagerly on import (fail fast)")
  builder.addRaw(" * - Uses Effect Schema for type safety")
  builder.addRaw(" * - Throws if validation fails")
  builder.addRaw(" */")
  builder.addRaw("export const env = getFilteredEnv()")
  builder.addBlankLine()

  // Type re-export
  builder.addSectionComment("Type Exports")
  builder.addRaw("/** Environment variables type */")
  builder.addRaw("export type { Env } from './schema'")

  return builder.toString()
}
