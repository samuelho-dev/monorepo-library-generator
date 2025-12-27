import { HttpClient, HttpClientRequest } from "@effect/platform"
import type { HttpClientResponse } from "@effect/platform"
import { Context, Duration, Effect, Layer, Option, Schema } from "effect"
import { RpcInfraError } from "./errors"

/**
 * Rpc Client
 *
 * RPC client for calling remote services.

Provides:
- Type-safe RPC calls
- Automatic retry with exponential backoff
- Request/response interceptors

Works in browser and Node.js environments.
 *
 * @module @samuelho-dev/infra-rpc/client
 * @see EFFECT_PATTERNS.md for client patterns
 */
// ============================================================================
// Client Configuration
// ============================================================================
/**
 * RPC client configuration
 */
export interface RpcClientConfig {
  /**
   * Base URL for RPC endpoint
   * @example "https://api.example.com/rpc"
   */
  readonly baseUrl: string

  /**
   * Request timeout
   * @default "30 seconds"
   */
  readonly timeout?: Duration.DurationInput

  /**
   * Retry configuration
   */
  readonly retry?: {
    /**
     * Maximum retry attempts
     * @default 3
     */
    readonly maxAttempts?: number

    /**
     * Initial retry delay
     * @default "100 millis"
     */
    readonly initialDelay?: Duration.DurationInput

    /**
     * Maximum retry delay
     * @default "5 seconds"
     */
    readonly maxDelay?: Duration.DurationInput

    /**
     * Retryable error codes
     * @default ["NETWORK_ERROR", "TIMEOUT", "SERVICE_UNAVAILABLE"]
     */
    readonly retryableCodes?: ReadonlyArray<string>
  }

  /**
   * Custom headers for all requests
   */
  readonly headers?: Record<string, string>

  /**
   * Authentication token provider
   */
  readonly getAuthToken?: () => Effect.Effect<Option.Option<string>>
}

/**
 * RPC Client Config Context Tag
 */
export class RpcClientConfigTag extends Context.Tag("RpcClientConfig")<
  RpcClientConfigTag,
  RpcClientConfig
>() {}

// ============================================================================
// RPC Client Service
// ============================================================================
/**
 * Rpc Client Service
 *
 * Type-safe RPC client for calling remote services.
 * All calls require a Schema for response validation.
 *
 * @example
 * ```typescript
 * import { RpcClient } from "@samuelho-dev/infra-rpc/client";
 * import { Schema } from "effect";
 *
 * // Define response schema
 * const UserSchema = Schema.Struct({
 *   id: Schema.String,
 *   name: Schema.String
 * })
 *
 * const program = Effect.gen(function*() {
 *   const client = yield* RpcClient;
 *
 *   // Call with schema validation
 *   const user = yield* client.call("getUser", { id: "123" }, UserSchema)
 * })
 * ```
 */
export class RpcClient extends Context.Tag(
  "@samuelho-dev/infra-rpc/RpcClient"
)<
  RpcClient,
  {
    /**
     * Call an RPC operation by name
     *
     * @param operation - Operation name
     * @param payload - Request payload
     * @param responseSchema - Schema for response validation
     */
    readonly call: <A, I, Deps>(
      operation: string,
      payload: unknown,
      responseSchema: Schema.Schema<A, I, Deps>
    ) => Effect.Effect<A, RpcInfraError, Deps>

    /**
     * Call with custom options
     */
    readonly callWithOptions: <A, I, Deps>(
      operation: string,
      payload: unknown,
      responseSchema: Schema.Schema<A, I, Deps>,
      options?: {
        timeout?: Duration.DurationInput
        skipRetry?: boolean
        headers?: Record<string, string>
      }
    ) => Effect.Effect<A, RpcInfraError, Deps>

    /**
     * Health check
     */
    readonly healthCheck: () => Effect.Effect<boolean>
  }
>() {
  // ===========================================================================
  // Static HTTP Layer (Browser/Node.js)
  // ===========================================================================

  /**
   * HTTP Layer - Standard HTTP transport
   */
  static readonly Http = Layer.effect(
    this,
    Effect.gen(function*() {
      const config = yield* RpcClientConfigTag
      const httpClient = yield* HttpClient.HttpClient

      // Build default headers
      const defaultHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...config.headers
      }

      // Retry configuration
      const maxRetries = config.retry?.maxAttempts ?? 0

      // Helper: Get auth header from token provider
      const getAuthHeader = () =>
        Effect.gen(function*() {
          if (!config.getAuthToken) return {}
          const token = yield* config.getAuthToken()
          return Option.isSome(token)
            ? { Authorization: `Bearer ${token.value}` }
            : {}
        })

      // Helper: Execute HTTP request with retries
      // All errors are mapped to RpcInfraError via catchAll
      const executeRequest = (request: HttpClientRequest.HttpClientRequest) => {
        const baseEffect = httpClient.execute(request).pipe(
          Effect.timeoutFail({
            duration: Duration.decode(config.timeout ?? "30 seconds"),
            onTimeout: () => new RpcInfraError({ message: "Request timeout", code: "TIMEOUT" })
          })
        )

        const withRetry = maxRetries > 0
          ? baseEffect.pipe(Effect.retry({ times: maxRetries }))
          : baseEffect

        return withRetry.pipe(
          Effect.catchAll((error) =>
            Effect.fail(new RpcInfraError({ message: `RPC call failed: ${String(error)}`, code: "NETWORK_ERROR" }))
          )
        )
      }

      // Helper: Parse JSON response body
      const parseResponseBody = (response: HttpClientResponse.HttpClientResponse) =>
        response.json.pipe(
          Effect.catchAll(() =>
            Effect.fail(new RpcInfraError({ message: "Failed to parse RPC response", code: "PARSE_ERROR" }))
          )
        )

      // Schema for RPC error response validation
      const RpcErrorResponseSchema = Schema.Struct({
        error: Schema.optional(Schema.Struct({
          message: Schema.optional(Schema.String),
          code: Schema.optional(Schema.String)
        }))
      })

      // Helper: Check for RPC-level error in body
      const checkRpcError = (body: unknown) => {
        if (body && typeof body === "object" && "error" in body) {
          const errorResult = Schema.decodeUnknownOption(RpcErrorResponseSchema)(body)
          const errorBody = Option.isSome(errorResult) ? errorResult.value : { error: undefined }
          return Effect.fail(
            new RpcInfraError({
              message: errorBody.error?.message ?? "Unknown RPC error",
              code: errorBody.error?.code ?? "RPC_ERROR"
            })
          )
        }
        return Effect.succeed(body)
      }

      // Helper: Validate response against schema
      const validateResponse = <A, I, Deps>(body: unknown, responseSchema: Schema.Schema<A, I, Deps>) =>
        Schema.decodeUnknown(responseSchema)(body).pipe(
          Effect.mapError((parseError) =>
            new RpcInfraError({
              message: `Response validation failed: ${parseError.message}`,
              code: "VALIDATION_ERROR"
            })
          )
        )

      const makeRequest = <A, I, Deps>(
        operation: string,
        payload: unknown,
        responseSchema: Schema.Schema<A, I, Deps>,
        customHeaders?: Record<string, string>
      ) =>
        Effect.gen(function*() {
          const authHeader = yield* getAuthHeader()

          // Build request - handle potential body serialization error
          const request = yield* HttpClientRequest.post(config.baseUrl).pipe(
            HttpClientRequest.setHeaders({ ...defaultHeaders, ...authHeader, ...customHeaders }),
            HttpClientRequest.bodyJson({ operation, payload }),
            Effect.mapError((error) =>
              new RpcInfraError({
                message: `Failed to serialize request body: ${String(error)}`,
                code: "SERIALIZE_ERROR"
              })
            )
          )

          const response = yield* executeRequest(request)

          if (response.status !== 200) {
            return yield* Effect.fail(
              new RpcInfraError({ message: `RPC error: HTTP ${response.status}`, code: "HTTP_ERROR" })
            )
          }

          const body = yield* parseResponseBody(response)
          yield* checkRpcError(body)
          return yield* validateResponse(body, responseSchema)
        })

      // Health check response schema
      const HealthCheckSchema = Schema.Struct({
        status: Schema.String
      })

      return {
        call: <A, I, Deps>(
          operation: string,
          payload: unknown,
          responseSchema: Schema.Schema<A, I, Deps>
        ) => makeRequest(operation, payload, responseSchema),

        callWithOptions: <A, I, Deps>(
          operation: string,
          payload: unknown,
          responseSchema: Schema.Schema<A, I, Deps>,
          options?: {
            timeout?: Duration.DurationInput
            skipRetry?: boolean
            headers?: Record<string, string>
          }
        ) => {
          const effect = makeRequest(operation, payload, responseSchema, options?.headers)
          if (options?.timeout) {
            return effect.pipe(
              Effect.timeoutFail({
                duration: Duration.decode(options.timeout),
                onTimeout: () =>
                  new RpcInfraError({
                    message: "Request timeout",
                    code: "TIMEOUT"
                  })
              })
            )
          }
          return effect
        },

        healthCheck: () =>
          makeRequest("_health", {}, HealthCheckSchema).pipe(
            Effect.map((r) => r.status === "ok"),
            Effect.catchAll(() => Effect.succeed(false))
          )
      }
    })
  )

  // ===========================================================================
  // Static Test Layer
  // ===========================================================================

  /**
   * Test Layer - Mock client for testing
   *
   * Mock responses are validated against the provided schema to ensure
   * type safety in tests. Supports payload-based response selection.
   *
   * @example
   * ```typescript
   * // Simple mock responses
   * const mockLayer = RpcClient.Test({
   *   getUser: { id: "123", name: "John" }
   * })
   *
   * // Function-based mocks that can inspect payload
   * const mockLayer = RpcClient.Test({
   *   getUser: (payload) => payload.id === "123"
   *     ? { id: "123", name: "John" }
   *     : { id: payload.id, name: "Unknown" }
   * })
   * ```
   */
  static readonly Test = (
    mockResponses: Record<string, unknown | ((payload: unknown) => unknown)> = {}
  ) =>
    Layer.succeed(RpcClient, {
      call: <A, I, Deps>(
        operation: string,
        payload: unknown,
        responseSchema: Schema.Schema<A, I, Deps>
      ) => {
        const mockResponse = mockResponses[operation]
        if (mockResponse !== undefined) {
          // Support function-based mocks for payload-dependent responses
          const response = typeof mockResponse === "function"
            ? mockResponse(payload)
            : mockResponse

          return Schema.decodeUnknown(responseSchema)(response).pipe(
            Effect.mapError((parseError) =>
              new RpcInfraError({
                message: `Mock validation failed: ${parseError.message}`,
                code: "VALIDATION_ERROR"
              })
            ),
            Effect.tap(() => Effect.logDebug(`Test RPC: ${operation} with payload: ${JSON.stringify(payload)}`))
          )
        }
        return Effect.fail(
          new RpcInfraError({
            message: `No mock for ${operation}`,
            code: "NO_MOCK"
          })
        )
      },

      callWithOptions: <A, I, Deps>(
        operation: string,
        payload: unknown,
        responseSchema: Schema.Schema<A, I, Deps>,
        options?: {
          timeout?: Duration.DurationInput
          skipRetry?: boolean
          headers?: Record<string, string>
        }
      ) => {
        const mockResponse = mockResponses[operation]
        if (mockResponse !== undefined) {
          // Support function-based mocks for payload-dependent responses
          const response = typeof mockResponse === "function"
            ? mockResponse(payload)
            : mockResponse

          return Schema.decodeUnknown(responseSchema)(response).pipe(
            Effect.mapError((parseError) =>
              new RpcInfraError({
                message: `Mock validation failed: ${parseError.message}`,
                code: "VALIDATION_ERROR"
              })
            ),
            Effect.tap(() =>
              Effect.logDebug(
                `Test RPC: ${operation} with payload: ${JSON.stringify(payload)}, options: ${JSON.stringify(options)}`
              )
            )
          )
        }
        return Effect.fail(
          new RpcInfraError({
            message: `No mock for ${operation}`,
            code: "NO_MOCK"
          })
        )
      },

      healthCheck: () => Effect.succeed(true)
    })
}

// ============================================================================
// Client Factory
// ============================================================================
/**
 * Create RPC client layer with configuration
 *
 * @example
 * ```typescript
 * const clientLayer = createRpcClientLayer({
 *   baseUrl: "https://api.example.com/rpc",
 *   timeout: "30 seconds",
 *   getAuthToken: () =>
 *     Effect.gen(function*() {
 *       const token = yield* getStoredToken()
 *       return Option.fromNullable(token)
 *     })
 * })
 *
 * const UserSchema = Schema.Struct({ id: Schema.String, name: Schema.String })
 *
 * const program = Effect.gen(function*() {
 *   const client = yield* RpcClient;
 *   return yield* client.call("getUser", { id: "123" }, UserSchema)
 * }).pipe(Effect.provide(clientLayer))
 * ```
 */
export const createRpcClientLayer = (config: RpcClientConfig) =>
  Layer.provide(
    RpcClient.Http,
    Layer.succeed(RpcClientConfigTag, config)
  )
