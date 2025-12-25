import { Schema } from "effect"

// Import for local use
import { AuthUserSchema as ProviderAuthUserSchema } from "@samuelho-dev/provider-supabase"

/**
 * Auth Infrastructure Types
 *
 * Type definitions for auth infrastructure.

Re-exports types from provider-supabase and adds auth-specific types
for middleware and RPC integration.
 *
 * @module @samuelho-dev/infra-auth/types
 */

// ============================================================================
// Re-exports from Provider
// ============================================================================

// Re-export user and session types from provider-supabase
export type { AuthMethod, AuthUser, SupabaseSession } from "@samuelho-dev/provider-supabase"

export { AuthUserSchema, SupabaseSessionSchema } from "@samuelho-dev/provider-supabase"

// ============================================================================
// RPC Auth Context Types
// ============================================================================

/**
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
})

// ============================================================================
// HTTP Headers
// ============================================================================

// Re-export Headers from @effect/platform for type-safe header access
export { Headers } from "@effect/platform"
export type { Headers as RequestHeaders } from "@effect/platform"

// ============================================================================
// Request Metadata (from infra-rpc)
// ============================================================================

// Re-export request metadata from infra-rpc (single source of truth)
export type { RequestMetadata as RequestMeta } from "@samuelho-dev/infra-rpc"
