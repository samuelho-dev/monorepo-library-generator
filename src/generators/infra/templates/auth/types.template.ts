/**
 * Auth Infrastructure Types Template
 *
 * Generates type definitions for auth infrastructure.
 *
 * @module monorepo-library-generator/infra-templates/auth/types
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { InfraTemplateOptions } from "../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

/**
 * Generate auth types.ts file
 */
export function generateAuthTypesFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { packageName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: "Auth Infrastructure Types",
    description: `Type definitions for auth infrastructure.

Re-exports types from provider-supabase and adds auth-specific types
for middleware and RPC integration.`,
    module: `${packageName}/types`
  })
  builder.addBlankLine()

  // Imports
  builder.addImports([{ from: "effect", imports: ["Schema"] }])
  builder.addBlankLine()

  // Import from provider-supabase for local use
  builder.addSectionComment("Provider Imports")
  builder.addBlankLine()

  builder.addRaw(`// Import auth schemas from provider-supabase
// NOTE: Consumers should import types directly from ${scope}/provider-supabase
import { AuthUserSchema as ProviderAuthUserSchema } from "${scope}/provider-supabase"`)
  builder.addBlankLine()

  // Auth context types for RPC
  builder.addSectionComment("RPC Auth Context Types")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Authentication context for RPC handlers
 *
 * Contains all auth-related information available to handlers.
 * Used by protectedHandler and publicHandler factories.
 */
export interface AuthContext {
  /**
   * The authenticated user (always present in protected routes)
   */
  readonly user: Schema.Schema.Type<typeof ProviderAuthUserSchema>

  /**
   * How the user was authenticated
   */
  readonly authMethod: "session" | "api-key" | "service-role"

  /**
   * Session token (for session auth)
   */
  readonly sessionToken?: string

  /**
   * API key ID (for api-key auth, if using ApiKeyRepository)
   */
  readonly apiKeyId?: string
}

/**
 * Auth context schema for validation
 */
export const AuthContextSchema = Schema.Struct({
  user: ProviderAuthUserSchema,
  authMethod: Schema.Literal("session", "api-key", "service-role"),
  sessionToken: Schema.optional(Schema.String),
  apiKeyId: Schema.optional(Schema.String)
})`)
  builder.addBlankLine()

  // HTTP Headers note
  builder.addSectionComment("HTTP Headers")
  builder.addBlankLine()

  builder.addRaw(`// NOTE: For Headers type, import directly from @effect/platform:
// import { Headers } from "@effect/platform"
//
// For RequestMetadata type, import directly from ${scope}/infra-rpc:
// import type { RequestMetadata } from "${scope}/infra-rpc"`)

  return builder.toString()
}
