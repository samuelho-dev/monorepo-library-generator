/**
 * Entry Points Template
 *
 * Generates tree-shakeable entry point files (client.ts, server.ts, index.ts).
 *
 * @module monorepo-library-generator/env-templates
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"

/**
 * Generate client.ts entry point (minimal bundle)
 */
export function generateClientEntryPoint(): string {
  const builder = new TypeScriptBuilder()

  builder.addFileHeader({
    title: "Client Entry Point",
    description:
      "Client-only environment variable access.\n\nTree-shakeable entry point for client bundles.\nOnly includes PUBLIC_ prefixed variables.\n\nBundle size: ~1-2KB",
    module: "@workspace/env/client"
  })

  builder.addRaw('export { clientEnv as env } from "./env"')
  builder.addRaw('export type { ClientEnv as Env } from "./types"')
  builder.addBlankLine()

  return builder.toString()
}

/**
 * Generate server.ts entry point
 */
export function generateServerEntryPoint(): string {
  const builder = new TypeScriptBuilder()

  builder.addFileHeader({
    title: "Server Entry Point",
    description:
      "Server-only environment variable access.\n\nExports all environment variables (client + server).\nUse this when you explicitly need server-only access.\n\nBundle size: ~3-5KB",
    module: "@workspace/env/server"
  })

  builder.addRaw('export { serverEnv, clientEnv, env } from "./env"')
  builder.addRaw('export type { ServerEnv, ClientEnv, Env } from "./types"')
  builder.addBlankLine()

  return builder.toString()
}

/**
 * Generate index.ts entry point (context-aware)
 */
export function generateIndexEntryPoint(): string {
  const builder = new TypeScriptBuilder()

  builder.addFileHeader({
    title: "Main Entry Point",
    description:
      "Context-aware environment variable access.\n\nAutomatically detects server vs client context:\n- Server: All variables available\n- Client: Only PUBLIC_ variables\n\nUse this for universal code that runs in both contexts.",
    module: "@workspace/env"
  })

  builder.addRaw('export { env, clientEnv, serverEnv } from "./env"')
  builder.addRaw('export type { Env, ClientEnv, ServerEnv } from "./types"')
  builder.addBlankLine()

  return builder.toString()
}
