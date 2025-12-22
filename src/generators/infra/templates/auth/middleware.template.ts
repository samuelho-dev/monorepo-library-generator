/**
 * Auth Infrastructure Middleware Template
 *
 * Generates RPC auth middleware for protected and public routes.
 * Integrates with @effect/rpc middleware system.
 *
 * @module monorepo-library-generator/infra-templates/auth/middleware
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder';
import type { InfraTemplateOptions } from '../../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../../utils/workspace-config';

/**
 * Generate auth middleware.ts file
 */
export function generateAuthMiddlewareFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { packageName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  builder.addFileHeader({
    title: 'Auth Middleware for RPC',
    description: `Provides auth middleware for @effect/rpc handlers.

Features:
- Dual authentication: session (Bearer token) + API key (x-api-key)
- Protected routes require authentication
- Public routes have optional authentication
- Context bundling for handler factories

This middleware is consumed by infra-rpc.`,
    module: `${packageName}/middleware`,
  });
  builder.addBlankLine();

  // Imports
  builder.addImports([{ from: 'effect', imports: ['Context', 'Effect', 'Option'] }]);
  builder.addRaw(`import { Headers } from "@effect/platform";
import type { AuthUser } from "${scope}/provider-supabase";
import { AuthService } from "./service";
import { UnauthorizedError } from "./errors";
import type { AuthContext, RequestMeta } from "./types";`);
  builder.addBlankLine();

  // Context Tags for RPC
  builder.addSectionComment('RPC Context Tags');
  builder.addBlankLine();

  builder.addRaw(`/**
 * Current authenticated user
 *
 * Available in protected handlers after auth middleware runs.
 */
export class CurrentUser extends Context.Tag("CurrentUser")<
  CurrentUser,
  AuthUser
>() {}

/**
 * Optional current user
 *
 * Available in public handlers - may be None if not authenticated.
 */
export class OptionalUser extends Context.Tag("OptionalUser")<
  OptionalUser,
  Option.Option<AuthUser>
>() {}

/**
 * Full auth context
 *
 * Available in all handlers after auth middleware runs.
 */
export class AuthContextTag extends Context.Tag("AuthContext")<
  AuthContextTag,
  AuthContext
>() {}

/**
 * Request metadata
 *
 * Contains request ID, user agent, client IP, etc.
 */
export class RequestMetaTag extends Context.Tag("RequestMeta")<
  RequestMetaTag,
  RequestMeta
>() {}

/**
 * Auth method used for this request
 */
export class AuthMethodTag extends Context.Tag("AuthMethod")<
  AuthMethodTag,
  "session" | "api-key" | "service-role" | "anonymous"
>() {}`);
  builder.addBlankLine();

  // Protected context interface
  builder.addSectionComment('Handler Context Types');
  builder.addBlankLine();

  builder.addRaw(`/**
 * Context available in protected handlers
 *
 * Used by protectedHandler factory to bundle context.
 */
export interface ProtectedHandlerContext {
  readonly user: AuthUser;
  readonly meta: RequestMeta;
  readonly authMethod: "session" | "api-key" | "service-role";
}

/**
 * Context available in public handlers
 *
 * User is optional - may be None for unauthenticated requests.
 */
export interface PublicHandlerContext {
  readonly user: Option.Option<AuthUser>;
  readonly meta: RequestMeta;
  readonly authMethod: "session" | "api-key" | "service-role" | "anonymous";
}`);
  builder.addBlankLine();

  // Middleware implementations
  builder.addSectionComment('Middleware Implementations');
  builder.addBlankLine();

  builder.addRaw(`/**
 * Extract request metadata from headers
 *
 * Uses @effect/platform Headers.get() for type-safe header access.
 */
export function extractRequestMeta(headers: Headers.Headers) {
  return {
    requestId: Headers.get(headers, "x-request-id").pipe(Option.getOrElse(() => crypto.randomUUID())),
    userAgent: Headers.get(headers, "user-agent").pipe(Option.getOrElse(() => "unknown")),
    clientIp: Headers.get(headers, "x-forwarded-for").pipe(
      Option.map((v) => v.split(",")[0]?.trim() ?? "unknown"),
      Option.orElse(() => Headers.get(headers, "x-real-ip")),
      Option.getOrElse(() => "unknown")
    ),
    origin: Headers.get(headers, "origin").pipe(Option.getOrElse(() => "unknown")),
  };
}

/**
 * Auth middleware for protected routes
 *
 * Requires authentication. Fails with UnauthorizedError if not authenticated.
 *
 * @example
 * \`\`\`typescript
 * const handler = Rpc.effect(MyRpc, (payload) =>
 *   Effect.gen(function* () {
 *     const user = yield* CurrentUser;
 *     // user is guaranteed to exist
 *   })
 * ).pipe(
 *   Rpc.middleware(authMiddleware)
 * );
 * \`\`\`
 */
export function createAuthMiddleware(headers: Headers.Headers) {
  return Effect.gen(function* () {
    const authService = yield* AuthService;
    const authContextOpt = yield* authService.buildAuthContext(headers);

    if (Option.isNone(authContextOpt)) {
      return yield* Effect.fail(
        new UnauthorizedError({
          message: "Authentication required",
        })
      );
    }

    const authContext = authContextOpt.value;
    const meta = extractRequestMeta(headers);

    // Provide context for the handler
    return {
      user: authContext.user,
      meta,
      authMethod: authContext.authMethod,
    } satisfies ProtectedHandlerContext;
  }).pipe(Effect.withSpan("authMiddleware"));
}

/**
 * Public middleware for optional auth
 *
 * Attempts authentication but doesn't fail if not authenticated.
 * User will be Option.none() for anonymous requests.
 *
 * @example
 * \`\`\`typescript
 * const handler = Rpc.effect(MyRpc, (payload) =>
 *   Effect.gen(function* () {
 *     const userOpt = yield* OptionalUser;
 *     if (Option.isSome(userOpt)) {
 *       // User is authenticated
 *     }
 *   })
 * ).pipe(
 *   Rpc.middleware(publicMiddleware)
 * );
 * \`\`\`
 */
export function createPublicMiddleware(headers: Headers.Headers) {
  return Effect.gen(function* () {
    const authService = yield* AuthService;
    const authContextOpt = yield* authService.buildAuthContext(headers).pipe(
      Effect.catchAll(() => Effect.succeed(Option.none<AuthContext>()))
    );

    const meta = extractRequestMeta(headers);

    if (Option.isSome(authContextOpt)) {
      const authContext = authContextOpt.value;
      return {
        user: Option.some(authContext.user),
        meta,
        authMethod: authContext.authMethod,
      } satisfies PublicHandlerContext;
    }

    return {
      user: Option.none(),
      meta,
      authMethod: "anonymous" as const,
    } satisfies PublicHandlerContext;
  }).pipe(Effect.withSpan("publicMiddleware"));
}`);
  builder.addBlankLine();

  // Handler factories
  builder.addSectionComment('Handler Factories');
  builder.addBlankLine();

  builder.addRaw(`/**
 * Create a protected handler with bundled context
 *
 * The handler receives { ctx, input } where ctx contains:
 * - user: AuthUser (guaranteed)
 * - meta: RequestMeta
 * - authMethod: "session" | "api-key" | "service-role"
 *
 * @example
 * \`\`\`typescript
 * const getUser = protectedHandler<GetUserInput, User, GetUserError>(
 *   ({ ctx, input }) =>
 *     Effect.gen(function* () {
 *       // Access ctx.user.id, ctx.user.email, etc.
 *       console.log(\`User \${ctx.user.name} requested user \${input.id}\`);
 *       return yield* userRepository.findById(input.id);
 *     })
 * );
 * \`\`\`
 */
export const protectedHandler = <I, O, E, R>(
  fn: (args: { ctx: ProtectedHandlerContext; input: I }) => Effect.Effect<O, E, R>
) =>
  (payload: I) =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;
      const meta = yield* RequestMetaTag;
      const authMethod = yield* AuthMethodTag;

      const ctx: ProtectedHandlerContext = {
        user,
        meta,
        authMethod: authMethod as "session" | "api-key" | "service-role",
      };

      return yield* fn({ ctx, input: payload });
    });

/**
 * Create a public handler with bundled context
 *
 * The handler receives { ctx, input } where ctx contains:
 * - user: Option<AuthUser> (may be None)
 * - meta: RequestMeta
 * - authMethod: "session" | "api-key" | "service-role" | "anonymous"
 *
 * @example
 * \`\`\`typescript
 * const listProducts = publicHandler<ListInput, Product[], ListError>(
 *   ({ ctx, input }) =>
 *     Effect.gen(function* () {
 *       if (Option.isSome(ctx.user)) {
 *         // Personalized results for authenticated users
 *       }
 *       return yield* productRepository.list(input);
 *     })
 * );
 * \`\`\`
 */
export const publicHandler = <I, O, E, R>(
  fn: (args: { ctx: PublicHandlerContext; input: I }) => Effect.Effect<O, E, R>
): (payload: I) => Effect.Effect<O, E, R | OptionalUser | RequestMetaTag | AuthMethodTag> => {
  return (payload: I) =>
    Effect.gen(function* () {
      const userOpt = yield* OptionalUser;
      const meta = yield* RequestMetaTag;
      const authMethod = yield* AuthMethodTag;

      const ctx: PublicHandlerContext = {
        user: userOpt,
        meta,
        authMethod,
      };

      return yield* fn({ ctx, input: payload });
    });
};`);

  return builder.toString();
}
