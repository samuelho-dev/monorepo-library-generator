import { Schema } from "effect"

/**
 * Auth Infrastructure Types
 *
 * Type definitions for auth infrastructure.

Re-exports types from provider-supabase and adds auth-specific types
for middleware and RPC integration.
 *
 * @module @myorg/infra-auth/types
 */



// ============================================================================
// Re-exports from Provider
// ============================================================================


// Re-export user and session types from provider-supabase
export type {
  AuthUser,
  SupabaseSession,
  AuthMethod,
} from "@myorg/provider-supabase";

export {
  AuthUserSchema,
  SupabaseSessionSchema,
} from "@myorg/provider-supabase";

// Import for local use
import { AuthUserSchema as ProviderAuthUserSchema } from "@myorg/provider-supabase";

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
  readonly user: Schema.Schema.Type<typeof ProviderAuthUserSchema>;

  /**
   * How the user was authenticated
   */
  readonly authMethod: "session" | "api-key" | "service-role";

  /**
   * Session token (for session auth)
   */
  readonly sessionToken?: string;

  /**
   * API key ID (for api-key auth, if using ApiKeyRepository)
   */
  readonly apiKeyId?: string;
}

/**
 * Auth context schema for validation
 */
export const AuthContextSchema = Schema.Struct({
  user: ProviderAuthUserSchema,
  authMethod: Schema.Literal("session", "api-key", "service-role"),
  sessionToken: Schema.optional(Schema.String),
  apiKeyId: Schema.optional(Schema.String),
});

// ============================================================================
// HTTP Headers
// ============================================================================


// Re-export Headers from @effect/platform for type-safe header access
export { Headers } from "@effect/platform";
export type { Headers as RequestHeaders } from "@effect/platform";

// ============================================================================
// Request Metadata
// ============================================================================


/**
 * Request metadata extracted from HTTP headers
 *
 * Available in RPC context for logging and auditing.
 * All fields are guaranteed to have values (with defaults where needed).
 */
export interface RequestMeta {
  readonly requestId: string;
  readonly userAgent: string;
  readonly clientIp: string;
  readonly origin: string;
}

/**
 * Request metadata schema
 */
export const RequestMetaSchema = Schema.Struct({
  requestId: Schema.String,
  userAgent: Schema.String,
  clientIp: Schema.String,
  origin: Schema.String,
});