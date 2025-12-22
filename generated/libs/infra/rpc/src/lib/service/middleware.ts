import { Headers } from "@effect/platform";
import { RpcMiddleware } from "@effect/rpc";
import { Context, Effect, Layer, Option, Schema } from "effect";

/**
 * Rpc Middleware
 *
 * RPC middleware using native @effect/rpc RpcMiddleware.Tag.

Architecture: Interface Segregation Pattern
- AuthVerifier: Interface defined HERE (no npm deps on auth libraries)
- AuthMiddleware: Native RpcMiddleware.Tag with provides/failure
- getHandlerContext: DX helper for single yield in handlers

Middleware is applied per-RPC using .middleware(AuthMiddleware).

Protected vs Public:
- Protected: Add .middleware(AuthMiddleware) to Rpc definition
- Public: Don't add middleware - it's public by default
 *
 * @module @myorg/infra-rpc/middleware
 * @see @effect/rpc RpcMiddleware.Tag documentation
 */

// ============================================================================
// User Data Types
// ============================================================================

/**
 * Current user data provided by auth middleware
 *
 * Available to all protected RPC handlers after middleware runs.
 */
export interface CurrentUserData {
  readonly id: string;
  readonly email: string;
  readonly roles: ReadonlyArray<string>;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Request metadata from middleware
 */
export interface RequestMetadata {
  readonly requestId: string;
  readonly timestamp: Date;
  readonly source: string;
  readonly headers?: Record<string, string>;
}

// ============================================================================
// Context Tags
// ============================================================================

/**
 * CurrentUser Context Tag
 *
 * Provided by AuthMiddleware to protected handlers.
 *
 * @example
 * ```typescript
 * const handler = Effect.gen(function* () {
 *   const user = yield* CurrentUser;
 *   console.log("User:", user.id);
 * });
 * ```
 */
export class CurrentUser extends Context.Tag("@rpc/CurrentUser")<CurrentUser, CurrentUserData>() {}

/**
 * RequestMeta Context Tag
 */
export class RequestMeta extends Context.Tag("@rpc/RequestMeta")<RequestMeta, RequestMetadata>() {}

// ============================================================================
// Auth Errors (Schema.TaggedError for RPC boundary)
// ============================================================================

/**
 * Authentication/Authorization error
 *
 * Uses Schema.TaggedError because it crosses RPC boundaries.
 */
export class AuthError extends Schema.TaggedError<AuthError>()("AuthError", {
  code: Schema.Literal("UNAUTHORIZED", "FORBIDDEN", "TOKEN_EXPIRED", "INVALID_TOKEN"),
  message: Schema.String,
}) {}

// ============================================================================
// AuthVerifier Interface (Interface Segregation)
// ============================================================================

/**
 * AuthVerifier Interface
 *
 * DEFINED HERE in infra-rpc. IMPLEMENTED by infra-auth.
 * This ensures infra-rpc has ZERO npm dependencies on auth libraries.
 *
 * The implementation is provided via Layer composition at the application level.
 *
 * @example
 * ```typescript
 * // In infra-auth:
 * export const AuthVerifierLive = Layer.effect(
 *   AuthVerifier,
 *   Effect.gen(function* () {
 *     const authProvider = yield* AuthProvider;
 *     return {
 *       verify: (token) => authProvider.verifyToken(token).pipe(
 *         Effect.map((decoded) => ({
 *           id: decoded.sub,
 *           email: decoded.email,
 *           roles: decoded.roles ?? [],
 *         }))
 *       )
 *     };
 *   })
 * );
 * ```
 */
export class AuthVerifier extends Context.Tag("@rpc/AuthVerifier")<
  AuthVerifier,
  {
    /**
     * Verify a token and return user data
     *
     * @param token - Bearer token from Authorization header
     * @returns CurrentUserData on success, AuthError on failure
     */
    readonly verify: (token: string) => Effect.Effect<CurrentUserData, AuthError>;
  }
>() {}

// ============================================================================
// Native RpcMiddleware.Tag (per-RPC auth)
// ============================================================================

/**
 * AuthMiddleware using native RpcMiddleware.Tag
 *
 * Attach to individual Rpc definitions using .middleware():
 *
 * @example
 * ```typescript
 * // Protected RPC (requires auth)
 * export class GetUser extends Rpc.make("GetUser", {
 *   payload: GetUserRequest,
 *   success: UserResponse,
 *   failure: Schema.Union(UserError, AuthError),
 * }).middleware(AuthMiddleware) {}
 *
 * // Public RPC (no auth)
 * export class HealthCheck extends Rpc.make("HealthCheck", {
 *   payload: Schema.Struct({}),
 *   success: Schema.Struct({ status: Schema.String }),
 * }) {}
 * ```
 */
export class AuthMiddleware extends RpcMiddleware.Tag<AuthMiddleware>()("@rpc/AuthMiddleware", {
  provides: CurrentUser,
  failure: AuthError,
}) {}

/**
 * AuthMiddleware implementation Layer
 *
 * Uses AuthVerifier interface - NO hard dependencies on auth libraries.
 * AuthVerifier is provided by infra-auth at application composition time.
 */
export const AuthMiddlewareLive = Layer.effect(
  AuthMiddleware,
  Effect.gen(function* () {
    const verifier = yield* AuthVerifier;

    return ({ headers }) =>
      Effect.gen(function* () {
        const token = extractBearerToken(headers);

        if (Option.isNone(token)) {
          return yield* Effect.fail(
            new AuthError({ code: "UNAUTHORIZED", message: "Missing authorization token" }),
          );
        }

        // Delegate to AuthVerifier (implemented by infra-auth)
        return yield* verifier.verify(token.value);
      });
  }),
);

/**
 * Authentication method used
 */
export type AuthMethod = "bearer" | "api-key" | "service-role";

/**
 * Extended user data with auth method
 */
export interface AuthenticatedUserData extends CurrentUserData {
  readonly authMethod: AuthMethod;
}

/**
 * AuthMethod Context Tag
 *
 * Indicates how the user was authenticated.
 */
export class AuthMethodContext extends Context.Tag("@rpc/AuthMethod")<
  AuthMethodContext,
  AuthMethod
>() {}

/**
 * Extract authentication from headers (priority: API key > Bearer token)
 *
 * Uses @effect/platform Headers.get() for type-safe header access.
 */
const extractAuth = (
  headers: Headers.Headers,
): Option.Option<{ type: AuthMethod; token: string }> => {
  // Priority 1: API Key (x-api-key header)
  const apiKey = Headers.get(headers, "x-api-key");
  if (Option.isSome(apiKey)) {
    return Option.some({ type: "api-key" as const, token: apiKey.value });
  }

  // Priority 2: Bearer Token
  const auth = Headers.get(headers, "authorization");
  if (Option.isSome(auth) && auth.value.startsWith("Bearer ")) {
    return Option.some({ type: "bearer" as const, token: auth.value.slice(7) });
  }

  // Priority 3: Service Role (internal service-to-service)
  const serviceRole = Headers.get(headers, "x-service-role");
  if (Option.isSome(serviceRole)) {
    return Option.some({ type: "service-role" as const, token: serviceRole.value });
  }

  return Option.none();
};

/**
 * Extract bearer token from headers (legacy helper)
 */
const extractBearerToken = (headers: Headers.Headers): Option.Option<string> => {
  const auth = extractAuth(headers);
  return Option.map(auth, (a) => a.token);
};

// ============================================================================
// Handler Context Helper (DX Improvement)
// ============================================================================

/**
 * Combined handler context type
 *
 * Use with getHandlerContext for better DX in handlers.
 */
export interface HandlerContext {
  readonly user: CurrentUserData;
  readonly meta: RequestMetadata;
}

/**
 * Get handler context in a single yield
 *
 * DX improvement to avoid multiple yield* calls in every handler.
 *
 * @example
 * ```typescript
 * // Instead of:
 * GetUser: ({ id }) =>
 *   Effect.gen(function* () {
 *     const user = yield* CurrentUser;
 *     const meta = yield* RequestMeta;
 *     // ...
 *   })
 *
 * // Use:
 * GetUser: ({ id }) =>
 *   Effect.gen(function* () {
 *     const ctx = yield* getHandlerContext;
 *     ctx.user.id; // Authenticated user
 *     ctx.meta.requestId; // Request metadata
 *     // ...
 *   })
 * ```
 */
export const getHandlerContext = Effect.gen(function* () {
  const user = yield* CurrentUser;
  const meta = yield* RequestMeta;
  return { user, meta } as HandlerContext;
});

/**
 * Get handler context with optional services
 *
 * For handlers that may not have all context available.
 */
export const getHandlerContextOptional = Effect.gen(function* () {
  const user = yield* Effect.serviceOption(CurrentUser);
  const meta = yield* Effect.serviceOption(RequestMeta);
  return {
    user: Option.getOrNull(user),
    meta: Option.getOrNull(meta),
  };
});

// ============================================================================
// RequestMeta Middleware
// ============================================================================

/**
 * RequestMeta middleware
 *
 * Provides request metadata to handlers. Applied globally.
 */
export class RequestMetaMiddleware extends RpcMiddleware.Tag<RequestMetaMiddleware>()(
  "@rpc/RequestMetaMiddleware",
  {
    provides: RequestMeta,
  },
) {}

/**
 * RequestMeta middleware implementation
 */
export const RequestMetaMiddlewareLive = Layer.succeed(RequestMetaMiddleware, ({ headers }) =>
  Effect.succeed({
    requestId: headers["x-request-id"] ?? crypto.randomUUID(),
    timestamp: new Date(),
    source: headers["x-forwarded-for"] ?? "unknown",
    headers: headers as Record<string, string>,
  } satisfies RequestMetadata),
);

// ============================================================================
// Convenience Layers
// ============================================================================

/**
 * Test user for development/testing
 */
export const TestUser: CurrentUserData = {
  id: "test-user-id",
  email: "test@example.com",
  roles: ["user"],
};

/**
 * Test AuthMiddleware - always provides TestUser
 *
 * Use in development and testing.
 */
export const AuthMiddlewareTest = Layer.succeed(AuthMiddleware, (_) => Effect.succeed(TestUser));

/**
 * Admin test user for testing admin routes
 */
export const AdminTestUser: CurrentUserData = {
  id: "admin-user-id",
  email: "admin@example.com",
  roles: ["user", "admin"],
};

/**
 * Admin AuthMiddleware - provides admin user for testing admin routes
 */
export const AuthMiddlewareAdmin = Layer.succeed(AuthMiddleware, (_) =>
  Effect.succeed(AdminTestUser),
);
