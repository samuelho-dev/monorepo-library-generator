/**
 * RPC Transport Template
 *
 * Generates transport layer for RPC operations (HTTP).
 *
 * Transport Types:
 * - HTTP: Standard request/response over HTTP for cross-process/network calls
 *
 * @module monorepo-library-generator/infra-templates/rpc
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder';
import type { InfraTemplateOptions } from '../../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../../utils/workspace-config';

/**
 * Generate RPC transport file
 *
 * Creates transport implementations for RPC:
 * - HTTP for external clients and cross-process calls
 */
export function generateRpcTransportFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  builder.addFileHeader({
    title: `${className} Transport`,
    description: `RPC transport implementations for HTTP communication.

Architecture:
- HTTP Transport: Standard HTTP for external clients/cross-process calls

All transports share the same handler definitions - only the transport layer differs.`,
    module: `${scope}/infra-${fileName}/transport`,
    see: ['@effect/rpc documentation for transport details'],
  });

  builder.addImports([
    {
      from: 'effect',
      imports: ['Effect', 'Layer', 'Context'],
    },
    {
      from: '@effect/platform',
      imports: ['HttpClient', 'HttpClientRequest'],
    },
    { from: './errors', imports: ['RpcInfraError'] },
  ]);

  builder.addSectionComment('Transport Types');

  builder.addRaw(`/**
 * Transport mode determines how RPC calls are executed
 */
export type TransportMode = "http"

/**
 * Base transport configuration
 */
export interface TransportConfig {
  readonly mode: TransportMode
}

/**
 * HTTP transport config - for cross-process/network calls
 */
export interface HttpTransportConfig extends TransportConfig {
  readonly mode: "http"
  /**
   * Base URL for RPC endpoint
   */
  readonly baseUrl: string
  /**
   * Custom headers to include
   */
  readonly headers?: Record<string, string>
}

/**
 * Combined transport config union
 */
export type RpcTransportConfig = HttpTransportConfig
`);

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
   * Custom error mapper
   */
  readonly mapError?: (error: unknown) => RpcInfraError
}

/**
 * HTTP RPC Client Configuration
 */
export interface HttpRpcClientConfig {
  /**
   * Base URL for RPC endpoint
   * @example "https://api.example.com/rpc"
   */
  readonly baseUrl: string

  /**
   * Default headers to include with every request
   * @example { "x-api-key": "secret-key" }
   */
  readonly headers?: Record<string, string>

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  readonly timeout?: number
}

/**
 * HTTP RPC Client
 *
 * Makes RPC calls via HTTP transport.
 * Use for calling external services or cross-process communication.
 *
 * @example
 * \`\`\`typescript
 * // Configure HTTP client
 * const HttpClientLive = HttpRpcClient.layer({
 *   baseUrl: "https://api.example.com/rpc",
 *   headers: { "x-api-key": env.API_KEY }
 * });
 *
 * // Use in Effect
 * const program = Effect.gen(function* () {
 *   const client = yield* HttpRpcClient;
 *   const user = yield* client.call("getUser", { id: "123" });
 *   return user;
 * }).pipe(Effect.provide(HttpClientLive));
 * \`\`\`
 */
export class HttpRpcClient extends Context.Tag("HttpRpcClient")<
  HttpRpcClient,
  {
    /**
     * Execute an RPC call via HTTP transport
     */
    readonly call: <R>(
      operation: string,
      payload: unknown,
      options?: { headers?: Record<string, string> }
    ) => Effect.Effect<R, RpcInfraError, HttpClient.HttpClient>
  }
>() {
  /**
   * Create layer with configuration
   */
  static layer(config: HttpRpcClientConfig): Layer.Layer<HttpRpcClient> {
    return Layer.succeed(HttpRpcClient, {
      call: <R>(
        operation: string,
        payload: unknown,
        options?: { headers?: Record<string, string> }
      ) =>
        Effect.gen(function* () {
          const httpClient = yield* HttpClient.HttpClient

          // Build request
          const request = HttpClientRequest.post(config.baseUrl).pipe(
            HttpClientRequest.setHeaders({
              "Content-Type": "application/json",
              ...config.headers,
              ...options?.headers
            }),
            HttpClientRequest.bodyJson({
              operation,
              payload
            })
          )

          // Execute request
          const response = yield* Effect.flatMap(
            request,
            (req) => httpClient.execute(req)
          ).pipe(
            Effect.timeout(config.timeout ?? 30000),
            Effect.catchAll((error) =>
              Effect.fail(
                new RpcInfraError({
                  message: \`RPC call failed: \${String(error)}\`,
                  code: "NETWORK_ERROR"
                })
              )
            )
          )

          // Parse response
          if (response.status !== 200) {
            return yield* Effect.fail(
              new RpcInfraError({
                message: \`RPC error: HTTP \${response.status}\`,
                code: "HTTP_ERROR"
              })
            )
          }

          const body = yield* response.json.pipe(
            Effect.catchAll(() =>
              Effect.fail(
                new RpcInfraError({
                  message: "Failed to parse RPC response",
                  code: "PARSE_ERROR"
                })
              )
            )
          )

          // Check for RPC-level error
          if (body && typeof body === "object" && "error" in body) {
            const errorBody = body as { error?: { message?: string; code?: string } }
            return yield* Effect.fail(
              new RpcInfraError({
                message: errorBody.error?.message ?? "Unknown RPC error",
                code: errorBody.error?.code ?? "RPC_ERROR"
              })
            )
          }

          return body as R
        }).pipe(
          Effect.withSpan(\`HttpRpc.\${operation}\`)
        ) as Effect.Effect<R, RpcInfraError, HttpClient.HttpClient>
    })
  }

  /**
   * Test layer - returns mock responses
   */
  static readonly Test = Layer.succeed(HttpRpcClient, {
    call: <R>() => Effect.succeed({} as R)
  })
}
`);

  builder.addSectionComment('Next.js Handler Factory');

  builder.addRaw(`/**
 * Next.js App Router handler factory
 *
 * Creates HTTP handlers for Next.js App Router API routes.
 *
 * @example
 * \`\`\`typescript
 * // app/api/rpc/route.ts
 * import { createNextHandler } from "${scope}/infra-${fileName}/transport";
 * import { UserHandlers } from "${scope}/feature-user/rpc";
 *
 * export const { POST } = createNextHandler({
 *   handlers: UserHandlers,
 * });
 * \`\`\`
 */
/**
 * Next.js handler result type
 */
export interface NextHandler {
  readonly GET: () => Response
  readonly POST: (request: Request) => Promise<Response>
}

export const createNextHandler = <R>(options: {
  handlers: Record<string, (payload: unknown) => Effect.Effect<unknown, unknown, R>>
  layers?: Layer.Layer<R, never, never>
}): NextHandler => {
  return {
    GET: () => new Response("RPC endpoint - use POST", { status: 405 }),
    POST: async (request: Request): Promise<Response> => {
      try {
        const body = await request.json() as { operation?: string; payload?: unknown }
        const { operation, payload } = body

        if (!operation || typeof operation !== "string") {
          return new Response(
            JSON.stringify({ error: { message: "Missing operation", code: "BAD_REQUEST" } }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          )
        }

        const handler = options.handlers[operation]
        if (!handler) {
          return new Response(
            JSON.stringify({ error: { message: \`Unknown operation: \${operation}\`, code: "NOT_FOUND" } }),
            { status: 404, headers: { "Content-Type": "application/json" } }
          )
        }

        const effect = handler(payload).pipe(
          options.layers ? Effect.provide(options.layers) : (e) => e as Effect.Effect<unknown, unknown, never>
        )

        const result = await Effect.runPromise(effect as Effect.Effect<unknown, never, never>)
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error"
        return new Response(
          JSON.stringify({ error: { message, code: "INTERNAL_ERROR" } }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        )
      }
    }
  }
}
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

  builder.addSectionComment('Unified RPC Client');

  builder.addRaw(`/**
 * RPC Client
 *
 * Unified RPC client that uses HTTP transport.
 *
 * @example
 * \`\`\`typescript
 * // HTTP transport
 * const HttpClientLive = RpcTransportClient.layer({
 *   mode: "http",
 *   baseUrl: "https://api.example.com/rpc"
 * });
 *
 * const program = Effect.gen(function* () {
 *   const client = yield* RpcTransportClient;
 *   return yield* client.call("getUser", { id: "123" });
 * });
 * \`\`\`
 */
export class RpcTransportClient extends Context.Tag("RpcTransportClient")<
  RpcTransportClient,
  {
    readonly call: <R>(
      operation: string,
      payload: unknown
    ) => Effect.Effect<R, RpcInfraError>
  }
>() {
  /**
   * Create layer from transport configuration
   */
  static layer(config: RpcTransportConfig): Layer.Layer<RpcTransportClient, never, HttpClient.HttpClient> {
    return Layer.effect(
      RpcTransportClient,
      Effect.gen(function* () {
        const httpClient = yield* HttpClient.HttpClient
        return {
          call: <R>(
            operation: string,
            payload: unknown
          ) =>
            Effect.gen(function* () {
              // Build request
              const request = HttpClientRequest.post(config.baseUrl).pipe(
                HttpClientRequest.setHeaders({
                  "Content-Type": "application/json",
                  ...config.headers
                }),
                HttpClientRequest.bodyJson({
                  operation,
                  payload
                })
              )

              // Execute request
              const response = yield* Effect.flatMap(
                request,
                (req) => httpClient.execute(req)
              ).pipe(
                Effect.catchAll((error) =>
                  Effect.fail(
                    new RpcInfraError({
                      message: \`RPC call failed: \${String(error)}\`,
                      code: "NETWORK_ERROR"
                    })
                  )
                )
              )

              // Parse response
              if (response.status !== 200) {
                return yield* Effect.fail(
                  new RpcInfraError({
                    message: \`RPC error: HTTP \${response.status}\`,
                    code: "HTTP_ERROR"
                  })
                )
              }

              const body = yield* response.json.pipe(
                Effect.catchAll(() =>
                  Effect.fail(
                    new RpcInfraError({
                      message: "Failed to parse RPC response",
                      code: "PARSE_ERROR"
                    })
                  )
                )
              )

              // Check for RPC-level error
              if (body && typeof body === "object" && "error" in body) {
                const errorBody = body as { error?: { message?: string; code?: string } }
                return yield* Effect.fail(
                  new RpcInfraError({
                    message: errorBody.error?.message ?? "Unknown RPC error",
                    code: errorBody.error?.code ?? "RPC_ERROR"
                  })
                )
              }

              return body as R
            }).pipe(
              Effect.withSpan(\`RpcTransportClient.\${operation}\`)
            ) as Effect.Effect<R, RpcInfraError>
        }
      })
    )
  }
}
`);

  return builder.toString();
}
