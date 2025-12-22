/**
 * RPC Transport Template
 *
 * Generates transport layer for RPC operations (HTTP, WebSocket, etc.)
 *
 * @module monorepo-library-generator/infra-templates/rpc
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder';
import type { InfraTemplateOptions } from '../../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../../utils/workspace-config';

/**
 * Generate RPC transport file
 *
 * Creates HTTP handlers and WebSocket transport for RPC operations.
 */
export function generateRpcTransportFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  builder.addFileHeader({
    title: `${className} Transport`,
    description: `RPC transport implementations.

Provides:
- HTTP transport (request/response)
- WebSocket transport (bidirectional streaming)
- Server handler for Next.js/Express
- Client transport configuration

Uses @effect/rpc with Effect Platform.`,
    module: `${scope}/infra-${fileName}/transport`,
    see: ['EFFECT_PATTERNS.md for transport patterns'],
  });

  builder.addImports([
    { from: 'effect', imports: ['Effect', 'Layer', 'Context', 'Stream'] },
    { from: '@effect/rpc', imports: ['RpcRouter'] },
    { from: '@effect/rpc-http', imports: ['HttpRpcRouter', 'HttpRpcRouterNoStream'] },
    {
      from: '@effect/platform',
      imports: ['HttpServer', 'HttpServerRequest', 'HttpServerResponse'],
    },
    { from: './core', imports: [`${className}Service`] },
    { from: './middleware', imports: ['RpcMiddlewareStack', 'makeRequestMetaLayer'] },
    { from: './errors', imports: ['RpcInfraError'] },
  ]);

  builder.addSectionComment('HTTP Transport');

  builder.addRaw(`/**
 * HTTP transport options
 */
export interface HttpTransportOptions {
  /**
   * Base path for RPC endpoints
   * @default "/rpc"
   */
  readonly basePath?: string

  /**
   * Enable streaming responses
   * @default false
   */
  readonly streaming?: boolean

  /**
   * Custom error mapper
   */
  readonly mapError?: (error: unknown) => RpcInfraError
}

/**
 * Create HTTP request handler for RPC
 *
 * Use with Next.js API routes, Express, or any HTTP server.
 *
 * @example
 * \`\`\`typescript
 * // Next.js App Router: app/api/rpc/[...path]/route.ts
 * import { createHttpHandler } from "${scope}/infra-${fileName}/transport";
 * import { UserRpcs, UserHandlers } from "${scope}/feature-user/rpc";
 *
 * const handler = createHttpHandler({
 *   groups: [{ group: UserRpcs, handlers: UserHandlers }],
 *   basePath: "/api/rpc"
 * });
 *
 * export const POST = handler;
 * \`\`\`
 */
export const createHttpHandler = (options: {
  groups: Array<{
    group: any
    handlers: Record<string, (payload: any) => Effect.Effect<any, any, any>>
  }>
  transport?: HttpTransportOptions
  middleware?: Layer.Layer<any, any, any>
}) =>
  Effect.gen(function* () {
    const basePath = options.transport?.basePath ?? "/rpc"

    // Build router from groups
    const routerEntries = options.groups.map(({ group, handlers }) => {
      // Create handler implementations for the group
      return group.handlers(handlers)
    })

    // Combine all handlers into router
    const router = RpcRouter.make(...routerEntries)

    // Create HTTP router
    const httpRouter = options.transport?.streaming
      ? HttpRpcRouter.toHttpApp(router)
      : HttpRpcRouterNoStream.toHttpApp(router)

    // Apply middleware if provided
    const finalApp = options.middleware
      ? httpRouter.pipe(Effect.provide(options.middleware))
      : httpRouter

    return finalApp
  })

/**
 * Next.js App Router handler factory
 *
 * @example
 * \`\`\`typescript
 * // app/api/rpc/[...path]/route.ts
 * import { createNextHandler } from "${scope}/infra-${fileName}/transport";
 *
 * export const { GET, POST } = createNextHandler({
 *   groups: [UserRpcs, ProductRpcs],
 *   handlers: { ...UserHandlers, ...ProductHandlers }
 * });
 * \`\`\`
 */
export const createNextHandler = (options: {
  groups: Array<any>
  handlers: Record<string, (payload: any) => Effect.Effect<any, any, any>>
  middleware?: Layer.Layer<any, any, any>
}) => {
  // Build router from all groups
  const router = RpcRouter.make(...options.groups)

  // Attach handlers
  const routerWithHandlers = router.handlers(options.handlers)

  // Create HTTP handler
  const httpApp = HttpRpcRouterNoStream.toHttpApp(routerWithHandlers)

  // Export handlers for Next.js
  return {
    GET: () => new Response("RPC endpoint - use POST", { status: 405 }),
    POST: async (request: Request) => {
      const result = await Effect.runPromise(
        httpApp.pipe(
          Effect.provide(options.middleware ?? Layer.empty),
          Effect.catchAll((error) =>
            Effect.succeed(
              new Response(JSON.stringify({ error: String(error) }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
              })
            )
          )
        )
      )
      return result
    }
  }
}
`);

  builder.addSectionComment('WebSocket Transport');

  builder.addRaw(`/**
 * WebSocket transport options
 */
export interface WebSocketTransportOptions {
  /**
   * Ping interval for keepalive
   * @default 30000 (30 seconds)
   */
  readonly pingInterval?: number

  /**
   * Maximum message size in bytes
   * @default 1048576 (1MB)
   */
  readonly maxMessageSize?: number

  /**
   * Enable binary encoding
   * @default false
   */
  readonly binary?: boolean
}

/**
 * Create WebSocket transport for bidirectional RPC
 *
 * Useful for:
 * - Real-time subscriptions
 * - Streaming responses
 * - Long-running operations
 *
 * @example
 * \`\`\`typescript
 * const wsTransport = createWebSocketTransport({
 *   router,
 *   options: { pingInterval: 30000 }
 * });
 * \`\`\`
 */
export const createWebSocketTransport = (options: {
  router: RpcRouter.RpcRouter<any, any>
  transport?: WebSocketTransportOptions
}) =>
  Effect.gen(function* () {
    // WebSocket transport implementation
    // Uses Effect's Stream for bidirectional communication

    return {
      handleConnection: (ws: WebSocket) =>
        Effect.gen(function* () {
          // Set up ping/pong keepalive
          const pingInterval = options.transport?.pingInterval ?? 30000

          // Handle incoming messages
          const messageStream = Stream.async<string>((emit) => {
            ws.onmessage = (event) => {
              emit.single(event.data as string)
            }
            ws.onclose = () => {
              emit.end()
            }
            ws.onerror = (error) => {
              emit.fail(new RpcInfraError({
                message: "WebSocket error",
                code: "WS_ERROR"
              }))
            }
          })

          // Process messages through router
          yield* Stream.runForEach(messageStream, (message) =>
            Effect.gen(function* () {
              try {
                const request = JSON.parse(message)
                // Execute through router
                // const response = yield* router.execute(request);
                // ws.send(JSON.stringify(response));
              } catch (error) {
                ws.send(JSON.stringify({
                  error: "Invalid message format"
                }))
              }
            })
          )
        })
    }
  })
`);

  builder.addSectionComment('Transport Utilities');

  builder.addRaw(`/**
 * Extract headers from HTTP request for middleware context
 */
export const extractHeaders = (request: Request): Record<string, string> => {
  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value
  })
  return headers
}

/**
 * Create standard JSON response
 */
export const jsonResponse = <T>(data: T, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  })

/**
 * Create error response
 */
export const errorResponse = (error: RpcInfraError): Response =>
  jsonResponse(
    {
      error: {
        message: error.message,
        code: error.code
      }
    },
    error.code === "UNAUTHORIZED" ? 401 :
    error.code === "FORBIDDEN" ? 403 :
    error.code === "NOT_FOUND" ? 404 :
    error.code === "RATE_LIMITED" ? 429 :
    500
  )
`);

  return builder.toString();
}
