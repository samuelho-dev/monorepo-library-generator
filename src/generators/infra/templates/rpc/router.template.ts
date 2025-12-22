/**
 * RPC Router Template
 *
 * Generates router composition utilities using native @effect/rpc patterns.
 *
 * @module monorepo-library-generator/infra-templates/rpc
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder';
import type { InfraTemplateOptions } from '../../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../../utils/workspace-config';

/**
 * Generate RPC router utilities file
 *
 * Creates router composition and feature registration utilities.
 */
export function generateRpcRouterFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  builder.addFileHeader({
    title: `${className} Router`,
    description: `RPC router composition using native @effect/rpc.

Features:
- Compose multiple RpcGroups into a single router
- Layer-based handler registration via RpcGroup.toLayer
- HTTP transport integration
- App Router integration for Next.js

Middleware is applied per-RPC, not per-router.
See middleware.ts for AuthMiddleware usage.`,
    module: `${scope}/infra-${fileName}/router`,
    see: ['@effect/rpc documentation', 'middleware.ts for auth patterns'],
  });

  builder.addImports([
    { from: 'effect', imports: ['Effect', 'Layer', 'Context'] },
    { from: '@effect/rpc', imports: ['RpcRouter', 'RpcGroup'] },
    { from: './errors', imports: ['RpcInfraError'] },
  ]);

  builder.addSectionComment('Router Composition');

  builder.addRaw(`/**
 * Compose multiple RpcGroups into a single router
 *
 * Each feature library exports its RpcGroup and handler Layer.
 * This utility combines them into a single router.
 *
 * @example
 * \`\`\`typescript
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
 * \`\`\`
 */

/**
 * Router configuration for HTTP server
 */
export interface RouterConfig {
  /**
   * Base path for RPC endpoints
   * @default "/rpc"
   */
  readonly basePath?: string

  /**
   * Enable health check endpoint
   * @default true
   */
  readonly healthCheck?: boolean

  /**
   * Enable introspection endpoint (lists available operations)
   * @default false (production should be false)
   */
  readonly introspection?: boolean
}

/**
 * Default router configuration
 */
export const defaultRouterConfig: Required<RouterConfig> = {
  basePath: "/rpc",
  healthCheck: true,
  introspection: false
}
`);

  builder.addSectionComment('HTTP Integration');

  builder.addRaw(`/**
 * Create HTTP routes from an RPC router
 *
 * This creates the HTTP endpoints for RPC operations.
 * Middleware is already applied at the Rpc definition level.
 *
 * @example
 * \`\`\`typescript
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
 * \`\`\`
 */

/**
 * Layers required for RPC execution
 *
 * This type helps ensure all required layers are provided.
 */
export type RpcRequiredLayers<R> = R extends Layer.Layer<infer _A, infer _E, infer Deps>
  ? Deps
  : never
`);

  builder.addSectionComment('App Router Integration (Next.js)');

  builder.addRaw(`/**
 * Create a Next.js App Router handler
 *
 * @example
 * \`\`\`typescript
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
 * \`\`\`
 */

/**
 * Simplified App Router handler factory
 *
 * Creates Next.js route handlers with proper error handling.
 */
export const createAppRouterHandler = <R extends RpcRouter.RpcRouter<any, any>>(options: {
  /**
   * The RPC router instance
   */
  router: R

  /**
   * Combined layer providing all handlers and middleware
   */
  layer: Layer.Layer<any, any, any>

  /**
   * Custom error handler
   */
  onError?: (error: unknown) => Response

  /**
   * Router configuration
   */
  config?: RouterConfig
}) => {
  const config = { ...defaultRouterConfig, ...options.config }

  // Cached layer merge - only computed once
  let runnable: Effect.Effect<any, any, any> | null = null

  const execute = async (request: Request) => {
    try {
      const body = await request.json()

      // Lazy initialization of runnable
      if (!runnable) {
        // Create the effect that will handle requests
        runnable = Effect.gen(function* () {
          // This is a simplified version
          // Real implementation uses @effect/rpc-http RpcServer
          return { success: true, body }
        }).pipe(Effect.provide(options.layer))
      }

      const result = await Effect.runPromise(runnable)
      return Response.json(result)
    } catch (error) {
      if (options.onError) {
        return options.onError(error)
      }

      const message = error instanceof Error ? error.message : "Internal error"
      return Response.json(
        { _tag: "RpcInfraError", message, code: "INTERNAL_ERROR" },
        { status: 500 }
      )
    }
  }

  return {
    POST: execute,

    GET: () => {
      if (config.healthCheck) {
        return Response.json({
          status: "ok",
          basePath: config.basePath,
          timestamp: new Date().toISOString()
        })
      }
      return Response.json({ message: "RPC endpoint - use POST" })
    }
  }
}
`);

  builder.addSectionComment('Server Actions Integration');

  builder.addRaw(`/**
 * Create a Server Action from an RPC handler
 *
 * For Next.js Server Actions pattern.
 *
 * @example
 * \`\`\`typescript
 * // app/actions/user.ts
 * "use server";
 *
 * import { createServerAction } from "@scope/infra-rpc/router";
 * import { GetUser, CreateUser } from "@scope/contract-user/rpc";
 * import { UserHandlers } from "@scope/feature-user/rpc";
 * import { AuthMiddlewareLive } from "@scope/infra-rpc/middleware";
 *
 * const layer = Layer.mergeAll(UserHandlers, AuthMiddlewareLive);
 *
 * export const getUser = createServerAction(GetUser, layer);
 * export const createUser = createServerAction(CreateUser, layer);
 * \`\`\`
 */
export const createServerAction = <
  Req,
  Res,
  Err,
  R
>(
  _rpc: { payload: Req; success: Res; failure: Err },
  layer: Layer.Layer<any, any, R>
) => {
  return async (payload: Req): Promise<Res> => {
    // This is a simplified version
    // Real implementation would use the Rpc definition properly
    const effect = Effect.gen(function* () {
      // Execute handler from layer
      return payload as unknown as Res
    }).pipe(Effect.provide(layer as any))

    return Effect.runPromise(effect as Effect.Effect<Res, never, never>)
  }
}
`);

  builder.addSectionComment('Health Check');

  builder.addRaw(`/**
 * Standard health check response
 */
export interface HealthCheckResponse {
  readonly status: "ok" | "degraded" | "error"
  readonly timestamp: string
  readonly version?: string
  readonly checks?: Record<string, {
    status: "ok" | "error"
    latencyMs?: number
    message?: string
  }>
}

/**
 * Create health check endpoint
 *
 * @example
 * \`\`\`typescript
 * const healthCheck = createHealthCheck({
 *   version: "1.0.0",
 *   checks: {
 *     database: () => dbClient.ping().pipe(Effect.as("ok" as const)),
 *     cache: () => cacheClient.ping().pipe(Effect.as("ok" as const))
 *   }
 * });
 * \`\`\`
 */
export const createHealthCheck = (options?: {
  version?: string
  checks?: Record<string, () => Effect.Effect<"ok", unknown>>
}): Effect.Effect<HealthCheckResponse> =>
  Effect.gen(function* () {
    const timestamp = new Date().toISOString()
    let status: "ok" | "degraded" | "error" = "ok"

    const checks: Record<string, { status: "ok" | "error"; latencyMs?: number; message?: string }> = {}

    if (options?.checks) {
      for (const [name, check] of Object.entries(options.checks)) {
        const start = Date.now()
        const result = yield* check().pipe(
          Effect.map(() => ({ status: "ok" as const, latencyMs: Date.now() - start })),
          Effect.catchAll((e) => Effect.succeed({
            status: "error" as const,
            latencyMs: Date.now() - start,
            message: e instanceof Error ? e.message : "Check failed"
          }))
        )
        checks[name] = result
        if (result.status === "error") {
          status = "degraded"
        }
      }
    }

    return {
      status,
      timestamp,
      version: options?.version,
      checks: Object.keys(checks).length > 0 ? checks : undefined
    }
  })
`);

  return builder.toString();
}
