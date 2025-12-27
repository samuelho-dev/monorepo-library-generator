import { Schema } from "effect"

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
// Provider Imports
// ============================================================================

// Import auth schemas from provider-supabase
// NOTE: Consumers should import types directly from @samuelho-dev/provider-supabase
import { AuthUserSchema as ProviderAuthUserSchema } from "@samuelho-dev/provider-supabase"

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

// NOTE: For Headers type, import directly from @effect/platform:
// import { Headers } from "@effect/platform"
//
// For RequestMetadata type, import directly from @samuelho-dev/infra-rpc:
// import type { RequestMetadata } from "@samuelho-dev/infra-rpc"
