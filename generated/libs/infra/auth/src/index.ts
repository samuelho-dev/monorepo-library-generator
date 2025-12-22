/**
 * Auth Infrastructure Library
 *
 * Authentication infrastructure with session/token verification and RPC middleware.

This library:
- Consumes SupabaseAuth from provider-supabase
- Provides AuthService for auth operations
- Exports middleware and handler factories for infra-rpc

Usage:
  import { AuthService, protectedHandler, publicHandler } from '@myorg/infra-auth';
 *
 */

// ============================================================================
// Errors
// ============================================================================

export {
  AuthError,
  type AuthInfraError,
  ForbiddenError,
  InvalidTokenError,
  SessionExpiredError,
  UnauthorizedError,
} from "./lib/service/errors";

// ============================================================================
// Types
// ============================================================================

// Re-export from provider for convenience
export type { AuthMethod, AuthUser } from "@myorg/provider-supabase";
export { AuthUserSchema } from "@myorg/provider-supabase";
export type {
  AuthContext,
  RequestMeta,
} from "./lib/service/types";
export {
  AuthContextSchema,
  RequestMetaSchema,
} from "./lib/service/types";

// ============================================================================
// Service
// ============================================================================

export { AuthService, type AuthServiceInterface } from "./lib/service/service";

// ============================================================================
// Middleware & Handler Factories
// ============================================================================

export {
  AuthContextTag,
  AuthMethodTag,
  // Context Tags
  CurrentUser,
  // Middleware creators
  createAuthMiddleware,
  createPublicMiddleware,
  extractRequestMeta,
  OptionalUser,
  // Context Types
  type ProtectedHandlerContext,
  type PublicHandlerContext,
  // Handler factories
  protectedHandler,
  publicHandler,
  RequestMetaTag,
} from "./lib/service/middleware";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Usage Examples

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

//

// import { Effect, Option } from 'effect';

// import { AuthService, protectedHandler, publicHandler } from '@myorg/infra-auth';

//

// // Protected handler - requires authentication

// const getProfile = protectedHandler<{ id: string }, Profile, Error>(

//   ({ ctx, input }) =>

//     Effect.gen(function* () {

//       console.log(`User ${ctx.user.name} requested profile ${input.id}`);

//       return yield* profileRepository.findById(input.id);

//     })

// );

//

// // Public handler - optional authentication

// const listProducts = publicHandler<{ page: number }, Product[], Error>(

//   ({ ctx, input }) =>

//     Effect.gen(function* () {

//       if (Option.isSome(ctx.user)) {

//         // Personalized results

//       }

//       return yield* productRepository.list(input);

//     })

// );

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
