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

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { InfraTemplateOptions } from "../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

/**
 * Generate RPC transport file
 *
 * Creates transport implementations for RPC:
 * - HTTP for external clients and cross-process calls
 */
export function generateRpcTransportFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Transport`,
    description: `RPC transport implementations for HTTP communication.

Architecture:
- HTTP Transport: Standard HTTP for external clients/cross-process calls

All transports share the same handler definitions - only the transport layer differs.`,
    module: `${scope}/infra-${fileName}/transport`,
    see: ["@effect/rpc documentation for transport details"]
  })

  builder.addImports([
    {
      from: "effect",
      imports: ["Effect", "Layer", "Context", "Option", "Cause", "Exit"]
    },
    {
      from: "@effect/platform",
      imports: ["HttpClient", "HttpClientRequest"]
    },
    { from: "@effect/schema", imports: ["Schema"] },
    { from: "./errors", imports: ["RpcInfraError"] }
  ])

  builder.addSectionComment("Transport Types")

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
`)

  builder.addSectionComment("HTTP Transport")

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
 * Makes RPC calls via HTTP transport with Schema validation.
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
 * const UserSchema = Schema.Struct({ id: Schema.String, name: Schema.String });
 *
 * // Use in Effect
 * const program = Effect.gen(function*() {
 *   const client = yield* HttpRpcClient;
 *   const user = yield* client.call("getUser", { id: "123" }, UserSchema);
 *   return user;
 * }).pipe(Effect.provide(HttpClientLive));
 * \`\`\`
 */
export class HttpRpcClient extends Context.Tag("HttpRpcClient")<
  HttpRpcClient,
  {
    /**
     * Execute an RPC call via HTTP transport with Schema validation
     */
    readonly call: <A, I, Deps>(
      operation: string,
      payload: unknown,
      responseSchema: Schema.Schema<A, I, Deps>,
      options?: { headers?: Record<string, string> }
    ) => Effect.Effect<A, RpcInfraError, HttpClient.HttpClient | Deps>
  }
>() {
  /**
   * Create layer with configuration
   */
  static layer(config: HttpRpcClientConfig): Layer.Layer<HttpRpcClient> {
    return Layer.succeed(HttpRpcClient, {
      call: <A, I, Deps>(
        operation: string,
        payload: unknown,
        responseSchema: Schema.Schema<A, I, Deps>,
        options?: { headers?: Record<string, string> }
      ) =>
        Effect.gen(function*() {
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
            Effect.catchAllCause((cause) =>
              Effect.fail(
                new RpcInfraError({
                  message: \`RPC call failed: \${Cause.pretty(cause)}\`,
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

          // Schema for RPC error response validation
          const RpcErrorResponseSchema = Schema.Struct({
            error: Schema.optional(Schema.Struct({
              message: Schema.optional(Schema.String),
              code: Schema.optional(Schema.String)
            }))
          })

          // Check for RPC-level error using Schema validation
          if (body && typeof body === "object" && "error" in body) {
            const errorResult = Schema.decodeUnknownOption(RpcErrorResponseSchema)(body)
            const errorBody = Option.isSome(errorResult) ? errorResult.value : { error: undefined }
            return yield* Effect.fail(
              new RpcInfraError({
                message: errorBody.error?.message ?? "Unknown RPC error",
                code: errorBody.error?.code ?? "RPC_ERROR"
              })
            )
          }

          // Validate response against provided schema
          const decoded = yield* Schema.decodeUnknown(responseSchema)(body).pipe(
            Effect.mapError((parseError) =>
              new RpcInfraError({
                message: \`Response validation failed: \${parseError.message}\`,
                code: "VALIDATION_ERROR"
              })
            )
          )

          return decoded
        }).pipe(
          Effect.withSpan(\`HttpRpc.\${operation}\`)
        )
    })
  }

  /**
   * Test layer - returns mock responses validated against schema
   *
   * @param mockResponses - Map of operation names to mock response data
   */
  static Test(mockResponses: Record<string, unknown> = {}) {
    return Layer.succeed(HttpRpcClient, {
      call: <A, I, Deps>(
        operation: string,
        _payload: unknown,
        responseSchema: Schema.Schema<A, I, Deps>,
        _options?: { headers?: Record<string, string> }
      ) => {
        const response = mockResponses[operation]
        if (response !== undefined) {
          return Schema.decodeUnknown(responseSchema)(response).pipe(
            Effect.mapError((parseError) =>
              new RpcInfraError({
                message: \`Mock validation failed: \${parseError.message}\`,
                code: "VALIDATION_ERROR"
              })
            )
          )
        }
        return Effect.fail(
          new RpcInfraError({
            message: \`No mock for \${operation}\`,
            code: "NO_MOCK"
          })
        )
      }
    })
  }
}
`)

  builder.addSectionComment("Next.js Handler Factory")

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

// Schema for RPC request body validation
const RpcRequestBodySchema = Schema.Struct({
  operation: Schema.String,
  payload: Schema.optional(Schema.Unknown)
})

/**
 * Options for handlers without requirements (R = never)
 * Uses discriminated union with _tag for type-safe narrowing
 */
interface NextHandlerOptionsNoRequirements {
  readonly _tag: "no-requirements"
  readonly handlers: Record<string, (payload: unknown) => Effect.Effect<unknown, unknown, never>>
}

/**
 * Options for handlers with requirements - layers are required
 * Uses discriminated union with _tag for type-safe narrowing
 */
interface NextHandlerOptionsWithRequirements<R> {
  readonly _tag: "with-requirements"
  readonly handlers: Record<string, (payload: unknown) => Effect.Effect<unknown, unknown, R>>
  readonly layers: Layer.Layer<R, never, never>
}

/**
 * Union type for handler options
 */
type NextHandlerOptions<R> = NextHandlerOptionsNoRequirements | NextHandlerOptionsWithRequirements<R>

/**
 * Overload: Handlers without requirements - no layers needed
 */
export function createNextHandler(
  options: NextHandlerOptionsNoRequirements
): NextHandler

/**
 * Overload: Handlers with requirements - layers required
 */
export function createNextHandler<R>(
  options: NextHandlerOptionsWithRequirements<R>
): NextHandler

/**
 * Implementation using Effect idiomatic pattern with function overloads.
 * Uses discriminated union _tag field for type-safe narrowing without type predicates.
 */
export function createNextHandler<R>(
  options: NextHandlerOptions<R>
) {
  return {
    GET: () => new Response("RPC endpoint - use POST", { status: 405 }),
    POST: async (request: Request) => {
      try {
        const rawBody: unknown = await request.json()

        // Validate request body with Schema
        const parseResult = Schema.decodeUnknownOption(RpcRequestBodySchema)(rawBody)
        if (Option.isNone(parseResult)) {
          return new Response(
            JSON.stringify({ error: { message: "Invalid request body: expected { operation: string, payload?: unknown }", code: "BAD_REQUEST" } }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          )
        }

        const body = parseResult.value
        const { operation, payload } = body

        // Run effect - discriminated union narrowing via _tag
        // Handler lookup happens within each branch for proper type narrowing
        let exit: Exit.Exit<unknown, unknown>
        if (options._tag === "with-requirements") {
          const handler = options.handlers[operation]
          if (!handler) {
            return new Response(
              JSON.stringify({ error: { message: \`Unknown operation: \${operation}\`, code: "NOT_FOUND" } }),
              { status: 404, headers: { "Content-Type": "application/json" } }
            )
          }
          exit = await Effect.runPromiseExit(Effect.provide(handler(payload), options.layers))
        } else {
          const handler = options.handlers[operation]
          if (!handler) {
            return new Response(
              JSON.stringify({ error: { message: \`Unknown operation: \${operation}\`, code: "NOT_FOUND" } }),
              { status: 404, headers: { "Content-Type": "application/json" } }
            )
          }
          exit = await Effect.runPromiseExit(handler(payload))
        }

        if (Exit.isSuccess(exit)) {
          return new Response(JSON.stringify(exit.value), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          })
        }

        return new Response(
          JSON.stringify({ error: { message: Cause.pretty(exit.cause), code: "INTERNAL_ERROR" } }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        )
      } catch (error) {
        // Only for non-Effect errors (e.g., JSON parsing)
        return new Response(
          JSON.stringify({ error: { message: "Request processing failed", code: "INTERNAL_ERROR" } }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        )
      }
    }
  }
}
`)

  builder.addSectionComment("Transport Utilities")

  builder.addRaw(`/**
 * Extract headers from HTTP request for middleware context
 */
export const extractHeaders = (request: Request) => {
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
`)

  builder.addSectionComment("Unified RPC Client")

  builder.addRaw(`/**
 * RPC Client
 *
 * Unified RPC client that uses HTTP transport with Schema validation.
 *
 * @example
 * \`\`\`typescript
 * // HTTP transport
 * const HttpClientLive = RpcTransportClient.layer({
 *   mode: "http",
 *   baseUrl: "https://api.example.com/rpc"
 * });
 *
 * const UserSchema = Schema.Struct({ id: Schema.String, name: Schema.String });
 *
 * const program = Effect.gen(function*() {
 *   const client = yield* RpcTransportClient;
 *   return yield* client.call("getUser", { id: "123" }, UserSchema);
 * });
 * \`\`\`
 */
export class RpcTransportClient extends Context.Tag("RpcTransportClient")<
  RpcTransportClient,
  {
    readonly call: <A, I, Deps>(
      operation: string,
      payload: unknown,
      responseSchema: Schema.Schema<A, I, Deps>
    ) => Effect.Effect<A, RpcInfraError, Deps>
  }
>() {
  /**
   * Create layer from transport configuration
   */
  static layer(config: RpcTransportConfig): Layer.Layer<RpcTransportClient, never, HttpClient.HttpClient> {
    return Layer.effect(
      RpcTransportClient,
      Effect.gen(function*() {
        const httpClient = yield* HttpClient.HttpClient
        return {
          call: <A, I, Deps>(
            operation: string,
            payload: unknown,
            responseSchema: Schema.Schema<A, I, Deps>
          ) =>
            Effect.gen(function*() {
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
                Effect.catchAllCause((cause) =>
                  Effect.fail(
                    new RpcInfraError({
                      message: \`RPC call failed: \${Cause.pretty(cause)}\`,
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

              // Schema for RPC error response validation
              const RpcErrorResponseSchema = Schema.Struct({
                error: Schema.optional(Schema.Struct({
                  message: Schema.optional(Schema.String),
                  code: Schema.optional(Schema.String)
                }))
              })

              // Check for RPC-level error using Schema validation
              if (body && typeof body === "object" && "error" in body) {
                const errorResult = Schema.decodeUnknownOption(RpcErrorResponseSchema)(body)
                const errorBody = Option.isSome(errorResult) ? errorResult.value : { error: undefined }
                return yield* Effect.fail(
                  new RpcInfraError({
                    message: errorBody.error?.message ?? "Unknown RPC error",
                    code: errorBody.error?.code ?? "RPC_ERROR"
                  })
                )
              }

              // Validate response against provided schema
              const decoded = yield* Schema.decodeUnknown(responseSchema)(body).pipe(
                Effect.mapError((parseError) =>
                  new RpcInfraError({
                    message: \`Response validation failed: \${parseError.message}\`,
                    code: "VALIDATION_ERROR"
                  })
                )
              )

              return decoded
            }).pipe(
              Effect.withSpan(\`RpcTransportClient.\${operation}\`)
            )
        }
      })
    )
  }
}
`)

  return builder.toString()
}
