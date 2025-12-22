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
  UnauthorizedError,
  ForbiddenError,
  InvalidTokenError,
  SessionExpiredError,
  type AuthInfraError,
} from "./lib/service/errors";

// ============================================================================
// Types
// ============================================================================


export type {
  AuthContext,
  RequestMeta,
} from "./lib/service/types";

export {
  AuthContextSchema,
  RequestMetaSchema,
} from "./lib/service/types";

// Re-export from provider for convenience
export type { AuthUser, AuthMethod } from "@myorg/provider-supabase";
export { AuthUserSchema } from "@myorg/provider-supabase";

// ============================================================================
// Service
// ============================================================================


export { AuthService, type AuthServiceInterface } from "./lib/service/service";

// ============================================================================
// Middleware & Handler Factories
// ============================================================================


export {
  // Context Tags
  CurrentUser,
  OptionalUser,
  AuthContextTag,
  RequestMetaTag,
  AuthMethodTag,
  // Context Types
  type ProtectedHandlerContext,
  type PublicHandlerContext,
  // Middleware creators
  createAuthMiddleware,
  createPublicMiddleware,
  extractRequestMeta,
  // Handler factories
  protectedHandler,
  publicHandler,
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
