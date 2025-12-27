/**
 * Auth Infrastructure Library
 *
 * Authentication infrastructure with session/token verification.

Contract-First Architecture:
- Consumes SupabaseAuth from provider-supabase
- Provides AuthService for auth operations
- Provides AuthVerifierLive layer for infra-rpc middleware

Integration with infra-rpc:
  import { AuthMiddlewareLive } from '@samuelho-dev/infra-rpc';
  import { AuthVerifierLive } from '@samuelho-dev/infra-auth'  // Compose layers
  const middleware = AuthMiddlewareLive.pipe(
    Layer.provide(AuthVerifierLive)
  )
 *
 */

// ============================================================================
// Errors
// ============================================================================

export {
  AuthError,
  type AuthServiceError,
  ForbiddenError,
  InvalidApiKeyError,
  InvalidTokenError,
  SessionExpiredError,
  UnauthorizedError
} from "./lib/errors"

// ============================================================================
// Types
// ============================================================================

export type { AuthContext } from "./lib/types"

export { AuthContextSchema } from "./lib/types"

// Re-export from provider for convenience
export type { AuthMethod, AuthUser } from "@samuelho-dev/provider-supabase"
export { AuthUserSchema } from "@samuelho-dev/provider-supabase"

// ============================================================================
// Service
// ============================================================================

export { AuthService, type AuthServiceInterface } from "./lib/service"

// ============================================================================
// AuthVerifier Implementation (for infra-rpc)
// ============================================================================

export { AuthVerifierLive } from "./lib/service"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Integration Example
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// import { Layer } from 'effect';
// import { AuthMiddlewareLive, AllMiddlewareLive } from '@samuelho-dev/infra-rpc';
// import { AuthVerifierLive, AuthService } from '@samuelho-dev/infra-auth';
// import { SupabaseAuth } from '@samuelho-dev/provider-supabase';
//
// // Compose auth layers for RPC middleware
// const RpcAuthLayer = AuthMiddlewareLive.pipe(
//   Layer.provide(AuthVerifierLive),
//   Layer.provide(AuthService.Live),
//   Layer.provide(SupabaseAuth.Live),
// )
//
// // Use with RPC router
// const router = MyRpcGroup.toRouter(handlers).pipe(
//   Effect.provide(RpcAuthLayer),
// )
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
