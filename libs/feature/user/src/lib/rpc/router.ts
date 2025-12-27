import { AllMiddlewareLive, AllMiddlewareTest } from "@samuelho-dev/infra-rpc"
import { Layer } from "effect"
import { UserHandlersLayer } from "./handlers"

/**
 * User RPC Router
 *
 * Router for user RPC operations.

Contract-First Architecture:
- Handlers implement contract RPCs
- Middleware applied automatically based on RouteTag
- Router creates HTTP endpoint

Usage:
  // In Next.js App Router (app/api/user/route.ts)
  import { createUserHandler } from "@samuelho-dev/feature-user/rpc";
  export const POST = createUserHandler()
 *
 */
// ============================================================================
// Handler Imports
// ============================================================================
// ============================================================================
// Middleware Imports
// ============================================================================
// ============================================================================
// Layer Composition
// ============================================================================
/**
 * Combined layer for production
 *
 * Includes all handlers and middleware for production use.
 * Compose with your infrastructure layers.
 */
export const UserProductionLayer = Layer.mergeAll(
  UserHandlersLayer,
  AllMiddlewareLive
)

/**
 * Combined layer for testing
 *
 * Includes all handlers with test middleware.
 */
export const UserTestLayer = Layer.mergeAll(
  UserHandlersLayer,
  AllMiddlewareTest
)

// ============================================================================
// HTTP Handler (Next.js / Express)
// ============================================================================
/**
 * Create Next.js App Router handler
 *
 * Uses @effect/rpc Layer-based pattern with RpcGroup.toLayer.
 * The handlers Layer provides all RPC implementations.
 *
 * @example
 * ```typescript
 * // app/api/user/route.ts
 * import { UserHandlers, UserProductionLayer } from "@samuelho-dev/feature-user/rpc";
 * import { RpcServer } from "@effect/rpc-http";
 * import { HttpRouter, HttpServer } from "@effect/platform";
 *
 * // Mount RPC handlers
 * const httpApp = HttpRouter.empty.pipe(
 *   HttpRouter.mount("/rpc", RpcServer.toHttpApp(UserRpcs))
 * )
 *
 * // Provide layers and run
 * const runnable = httpApp.pipe(
 *   Effect.provide(UserHandlers),
 *   Effect.provide(UserProductionLayer)
 * )
 * ```
 *
 * For simpler Next.js integration, use Effect.runPromise directly:
 * @example
 * ```typescript
 * // app/api/user/route.ts
 * export async function POST(request: Request) {
 *   const body = await request.json()
 *   // Handle RPC call using provided layers
 *   const result = await Effect.runPromise(
 *     handleRpcRequest(body).pipe(
 *       Effect.provide(UserHandlers),
 *       Effect.provide(UserProductionLayer)
 *     )
 *   )
 *   return Response.json(result)
 * }
 * ```
 */

// ============================================================================
// Handler Import Notes
// ============================================================================
// NOTE: For handler access, import directly from ./handlers:
// import { UserHandlers, UserHandlersLayer } from "./handlers"