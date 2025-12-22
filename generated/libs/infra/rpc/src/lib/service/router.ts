import type { Layer } from "effect";
import { Effect } from "effect";

/**
 * Rpc Router
 *
 * RPC router composition using native @effect/rpc.

Features:
- Compose multiple RpcGroups into a single router
- Layer-based handler registration via RpcGroup.toLayer
- HTTP transport integration
- App Router integration for Next.js

Middleware is applied per-RPC, not per-router.
See middleware.ts for AuthMiddleware usage.
 *
 * @module @myorg/infra-rpc/router
 * @see @effect/rpc documentation
 * @see middleware.ts for auth patterns
 */

// ============================================================================
// Router Composition
// ============================================================================

/**
 * Compose multiple RpcGroups into a single router
 *
 * Each feature library exports its RpcGroup and handler Layer.
 * This utility combines them into a single router.
 *
 * @example
 * ```typescript
 * import { UserRpcs } from "@scope/contract-user/rpc";
 * import { UserHandlers } from "@scope/feature-user/rpc";
 * import { ProductRpcs } from "@scope/contract-product/rpc";
 * import { ProductHandlers } from "@scope/feature-product/rpc";
 *
 * // Create combined router
 * const router = RpcRouter.make(UserRpcs, ProductRpcs);
 *
 * // Combine handler layers
 * const handlers = Layer.mergeAll(UserHandlers, ProductHandlers);
 * ```
 */

/**
 * Router configuration for HTTP server
 */
export interface RouterConfig {
  /**
   * Base path for RPC endpoints
   * @default "/rpc"
   */
  readonly basePath?: string;

  /**
   * Enable health check endpoint
   * @default true
   */
  readonly healthCheck?: boolean;

  /**
   * Enable introspection endpoint (lists available operations)
   * @default false (production should be false)
   */
  readonly introspection?: boolean;
}

/**
 * Default router configuration
 */
export const defaultRouterConfig: Required<RouterConfig> = {
  basePath: "/rpc",
  healthCheck: true,
  introspection: false,
};

// ============================================================================
// HTTP Integration
// ============================================================================

/**
 * Create HTTP routes from an RPC router
 *
 * This creates the HTTP endpoints for RPC operations.
 * Middleware is already applied at the Rpc definition level.
 *
 * @example
 * ```typescript
 * import { HttpRouter, HttpServer } from "@effect/platform";
 * import { RpcServer } from "@effect/rpc-http";
 *
 * const rpcRouter = RpcRouter.make(UserRpcs, ProductRpcs);
 *
 * const httpApp = HttpRouter.empty.pipe(
 *   HttpRouter.mount("/rpc", RpcServer.toHttpApp(rpcRouter))
 * );
 *
 * // Provide handler and middleware layers
 * const app = httpApp.pipe(
 *   Effect.provide(
 *     Layer.mergeAll(
 *       UserHandlers,
 *       ProductHandlers,
 *       AuthMiddlewareLive,
 *       RequestMetaMiddlewareLive
 *     )
 *   )
 * );
 * ```
 */

/**
 * Layers required for RPC execution
 *
 * This type helps ensure all required layers are provided.
 */
export type RpcRequiredLayers<R> =
  R extends Layer.Layer<infer _A, infer _E, infer Deps> ? Deps : never;

// ============================================================================
// App Router Integration (Next.js)
// ============================================================================

/**
 * Create a Next.js App Router handler
 *
 * @example
 * ```typescript
 * // app/api/rpc/[...path]/route.ts
 * import { RpcServer } from "@effect/rpc-http";
 * import { Layer, Effect } from "effect";
 *
 * // Import your RPC router and handler layers
 * import { rpcRouter, rpcHandlers, rpcMiddleware } from "@scope/infra-rpc";
 * import { UserHandlers } from "@scope/feature-user";
 * import { ProductHandlers } from "@scope/feature-product";
 *
 * // Combine all layers
 * const appLayer = Layer.mergeAll(
 *   UserHandlers,
 *   ProductHandlers,
 *   rpcMiddleware.AuthMiddlewareLive,
 *   rpcMiddleware.RequestMetaMiddlewareLive
 * );
 *
 * // Create RPC HTTP app
 * const rpcApp = RpcServer.toHttpApp(rpcRouter).pipe(
 *   Effect.provide(appLayer)
 * );
 *
 * // Export handlers
 * export const POST = async (request: Request) => {
 *   const result = await Effect.runPromise(rpcApp(request));
 *   return new Response(JSON.stringify(result), {
 *     headers: { "Content-Type": "application/json" }
 *   });
 * };
 *
 * export const GET = () => {
 *   return Response.json({ message: "RPC endpoint - use POST" });
 * };
 * ```
 */

/**
 * RPC handler map type
 */
export type RpcHandlerMap = Record<
  string,
  (payload: unknown) => Effect.Effect<unknown, unknown, unknown>
>;

/**
 * Combine multiple handler maps into one
 *
 * @example
 * ```typescript
 * const allHandlers = combineHandlers(
 *   userHandlers,
 *   productHandlers,
 *   orderHandlers
 * );
 * ```
 */
export const combineHandlers = <T extends RpcHandlerMap>(...handlers: ReadonlyArray<T>): T =>
  Object.assign({}, ...handlers) as T;

/**
 * Options for creating a Next.js RPC handler
 */
export interface NextRpcHandlerOptions<R, E> {
  /**
   * RPC handler map
   */
  readonly handlers: RpcHandlerMap;

  /**
   * Combined layer providing all dependencies
   */
  readonly layer: Layer.Layer<R, E, never>;

  /**
   * Custom error handler
   */
  readonly onError?: (error: unknown) => Response;

  /**
   * Router configuration
   */
  readonly config?: RouterConfig;
}

/**
 * Create a Next.js route handler for RPC
 *
 * @example
 * ```typescript
 * // app/api/rpc/route.ts
 * import { createNextRpcHandler } from "@scope/infra-rpc/router";
 *
 * const handler = createNextRpcHandler({
 *   handlers: allHandlers,
 *   layer: appLayer,
 * });
 *
 * export const POST = handler.POST;
 * export const GET = handler.GET;
 * ```
 */
/**
 * Next.js RPC handler result
 */
export interface NextRpcHandler {
  readonly POST: (request: Request) => Promise<Response>;
  readonly GET: () => Response;
}

export const createNextRpcHandler = <R, E>(
  options: NextRpcHandlerOptions<R, E>,
): NextRpcHandler => {
  const config = { ...defaultRouterConfig, ...options.config };

  const execute = async (request: Request) => {
    try {
      const body = (await request.json()) as { operation?: string; payload?: unknown };
      const operation = body.operation;
      const payload = body.payload;

      if (!operation || typeof operation !== "string") {
        return Response.json(
          { _tag: "RpcInfraError", message: "Missing operation", code: "INVALID_REQUEST" },
          { status: 400 },
        );
      }

      const handler = options.handlers[operation];
      if (!handler) {
        return Response.json(
          { _tag: "RpcInfraError", message: `Unknown operation: ${operation}`, code: "NOT_FOUND" },
          { status: 404 },
        );
      }

      // Build runnable effect by providing the layer
      const runnableEffect = Effect.provide(
        handler(payload) as Effect.Effect<unknown, unknown, R>,
        options.layer,
      );

      const result = await Effect.runPromise(runnableEffect);
      return Response.json(result);
    } catch (error) {
      if (options.onError) {
        return options.onError(error);
      }

      const message = error instanceof Error ? error.message : "Internal error";
      return Response.json(
        { _tag: "RpcInfraError", message, code: "INTERNAL_ERROR" },
        { status: 500 },
      );
    }
  };

  return {
    POST: execute,

    GET: () => {
      if (config.healthCheck) {
        return Response.json({
          status: "ok",
          basePath: config.basePath,
          timestamp: new Date().toISOString(),
        });
      }
      return Response.json({ message: "RPC endpoint - use POST" });
    },
  };
};

// ============================================================================
// Server Actions Integration
// ============================================================================

/**
 * Create a Server Action from an Effect handler
 *
 * For Next.js Server Actions pattern. Takes a handler function
 * and a fully-satisfied layer, returns an async function.
 *
 * On success, the promise resolves with the result.
 * On failure, the promise rejects with the typed error.
 *
 * @example
 * ```typescript
 * // app/actions/user.ts
 * "use server";
 *
 * import { Effect, Layer } from "effect";
 * import { createServerAction } from "@scope/infra-rpc/router";
 * import { UserRepository } from "@scope/data-access-user";
 * import { DatabaseLive } from "@scope/provider-database";
 *
 * // Define the handler with typed payload
 * const getUserHandler = (input: { id: string }) =>
 *   Effect.gen(function* () {
 *     const repo = yield* UserRepository;
 *     return yield* repo.findById(input.id);
 *   });
 *
 * // Create fully-satisfied layer (no remaining requirements)
 * const layer = UserRepository.Live.pipe(
 *   Layer.provide(DatabaseLive)
 * );
 *
 * // Export as Server Action
 * export const getUser = createServerAction(getUserHandler, layer);
 * ```
 */
export const createServerAction = <Payload, Success, Failure, R>(
  handler: (payload: Payload) => Effect.Effect<Success, Failure, R>,
  layer: Layer.Layer<R, never, never>,
): ((payload: Payload) => Promise<Success>) => {
  return (payload: Payload): Promise<Success> => {
    const program = handler(payload).pipe(Effect.provide(layer));
    return Effect.runPromise(program);
  };
};

/**
 * Create a Server Action that returns Exit instead of throwing
 *
 * Use this when you want to handle errors explicitly in the client.
 *
 * @example
 * ```typescript
 * import { Exit } from "effect";
 * import { createServerActionSafe } from "@scope/infra-rpc/router";
 *
 * export const getUser = createServerActionSafe(getUserHandler, layer);
 *
 * // In client component
 * const result = await getUser({ id: "123" });
 * if (Exit.isSuccess(result)) {
 *   console.log(result.value);
 * } else {
 *   console.error(result.cause);
 * }
 * ```
 */
export const createServerActionSafe = <Payload, Success, Failure, R>(
  handler: (payload: Payload) => Effect.Effect<Success, Failure, R>,
  layer: Layer.Layer<R, never, never>,
) => {
  return (payload: Payload) => {
    const program = handler(payload).pipe(Effect.provide(layer));
    return Effect.runPromiseExit(program);
  };
};

// ============================================================================
// Health Check
// ============================================================================

/**
 * Standard health check response
 */
export interface HealthCheckResponse {
  readonly status: "ok" | "degraded" | "error";
  readonly timestamp: string;
  readonly version?: string;
  readonly checks?: Record<
    string,
    {
      status: "ok" | "error";
      latencyMs?: number;
      message?: string;
    }
  >;
}

/**
 * Create health check endpoint
 *
 * @example
 * ```typescript
 * const healthCheck = createHealthCheck({
 *   version: "1.0.0",
 *   checks: {
 *     database: () => dbClient.ping().pipe(Effect.as("ok" as const)),
 *     cache: () => cacheClient.ping().pipe(Effect.as("ok" as const))
 *   }
 * });
 * ```
 */
export const healthCheck = (options?: {
  version?: string;
  checks?: Record<string, () => Effect.Effect<"ok", unknown>>;
}): Effect.Effect<HealthCheckResponse> =>
  Effect.gen(function* () {
    const timestamp = new Date().toISOString();
    let status: "ok" | "degraded" | "error" = "ok";

    const checksResult: Record<
      string,
      { status: "ok" | "error"; latencyMs?: number; message?: string }
    > = {};

    if (options?.checks) {
      for (const [name, check] of Object.entries(options.checks)) {
        const start = Date.now();
        const result = yield* check().pipe(
          Effect.map(() => ({ status: "ok" as const, latencyMs: Date.now() - start })),
          Effect.catchAll((e) =>
            Effect.succeed({
              status: "error" as const,
              latencyMs: Date.now() - start,
              message: e instanceof Error ? e.message : "Check failed",
            }),
          ),
        );
        checksResult[name] = result;
        if (result.status === "error") {
          status = "degraded";
        }
      }
    }

    // Build response with only defined properties (exactOptionalPropertyTypes)
    const response: HealthCheckResponse = {
      status,
      timestamp,
    };

    if (options?.version !== undefined) {
      (response as { version: string }).version = options.version;
    }

    if (Object.keys(checksResult).length > 0) {
      (response as { checks: typeof checksResult }).checks = checksResult;
    }

    return response;
  });

/**
 * Alias for healthCheck
 * @deprecated Use healthCheck instead
 */
export const createHealthCheck = healthCheck;
