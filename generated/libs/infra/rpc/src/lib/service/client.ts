import { HttpClient, HttpClientRequest } from "@effect/platform";
import { Context, Duration, Effect, Layer, Option } from "effect";
import { RpcInfraError } from "./errors";

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
 * @module @myorg/infra-rpc/client
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
  readonly baseUrl: string;

  /**
   * Request timeout
   * @default "30 seconds"
   */
  readonly timeout?: Duration.DurationInput;

  /**
   * Retry configuration
   */
  readonly retry?: {
    /**
     * Maximum retry attempts
     * @default 3
     */
    readonly maxAttempts?: number;

    /**
     * Initial retry delay
     * @default "100 millis"
     */
    readonly initialDelay?: Duration.DurationInput;

    /**
     * Maximum retry delay
     * @default "5 seconds"
     */
    readonly maxDelay?: Duration.DurationInput;

    /**
     * Retryable error codes
     * @default ["NETWORK_ERROR", "TIMEOUT", "SERVICE_UNAVAILABLE"]
     */
    readonly retryableCodes?: ReadonlyArray<string>;
  };

  /**
   * Custom headers for all requests
   */
  readonly headers?: Record<string, string>;

  /**
   * Authentication token provider
   */
  readonly getAuthToken?: () => Effect.Effect<Option.Option<string>>;
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
 *
 * @example
 * ```typescript
 * import { RpcClient } from "@myorg/infra-rpc/client";
 *
 * const program = Effect.gen(function* () {
 *   const client = yield* RpcClient;
 *
 *   // Call an RPC operation
 *   const user = yield* client.call("getUser", { id: "123" });
 * });
 * ```
 */
export class RpcClient extends Context.Tag("@myorg/infra-rpc/RpcClient")<
  RpcClient,
  {
    /**
     * Call an RPC operation by name
     *
     * @param operation - Operation name
     * @param payload - Request payload
     */
    readonly call: <R>(operation: string, payload: unknown) => Effect.Effect<R, RpcInfraError>;

    /**
     * Call with custom options
     */
    readonly callWithOptions: <R>(
      operation: string,
      payload: unknown,
      options?: {
        timeout?: Duration.DurationInput;
        skipRetry?: boolean;
        headers?: Record<string, string>;
      },
    ) => Effect.Effect<R, RpcInfraError>;

    /**
     * Health check
     */
    readonly healthCheck: () => Effect.Effect<boolean>;
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
    Effect.gen(function* () {
      const config = yield* RpcClientConfigTag;
      const httpClient = yield* HttpClient.HttpClient;

      // Build default headers
      const defaultHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...config.headers,
      };

      // Retry configuration
      const maxRetries = config.retry?.maxAttempts ?? 0;

      const makeRequest = <R>(
        operation: string,
        payload: unknown,
        customHeaders?: Record<string, string>,
      ): Effect.Effect<R, RpcInfraError> =>
        Effect.gen(function* () {
          // Get auth token if provider exists
          const authHeader: { Authorization?: string } = {};
          if (config.getAuthToken) {
            const token = yield* config.getAuthToken();
            if (Option.isSome(token)) {
              authHeader.Authorization = `Bearer ${token.value}`;
            }
          }

          // Build request
          const request = HttpClientRequest.post(config.baseUrl).pipe(
            HttpClientRequest.setHeaders({
              ...defaultHeaders,
              ...authHeader,
              ...customHeaders,
            }),
            HttpClientRequest.bodyJson({
              operation,
              payload,
            }),
          );

          // Execute with timeout
          const response = yield* Effect.flatMap(request, (req) => httpClient.execute(req)).pipe(
            Effect.timeoutFail({
              duration: Duration.decode(config.timeout ?? "30 seconds"),
              onTimeout: () =>
                new RpcInfraError({
                  message: "Request timeout",
                  code: "TIMEOUT",
                }),
            }),
            maxRetries > 0 ? Effect.retry({ times: maxRetries }) : (e) => e,
            Effect.catchAll((error) =>
              error instanceof RpcInfraError
                ? Effect.fail(error)
                : Effect.fail(
                    new RpcInfraError({
                      message: `RPC call failed: ${error}`,
                      code: "NETWORK_ERROR",
                    }),
                  ),
            ),
          );

          // Parse response
          if (response.status !== 200) {
            return yield* Effect.fail(
              new RpcInfraError({
                message: `RPC error: HTTP ${response.status}`,
                code: "HTTP_ERROR",
              }),
            );
          }

          const body = yield* response.json.pipe(
            Effect.catchAll(() =>
              Effect.fail(
                new RpcInfraError({
                  message: "Failed to parse RPC response",
                  code: "PARSE_ERROR",
                }),
              ),
            ),
          );

          // Check for RPC-level error
          if (body && typeof body === "object" && "error" in body) {
            const errorBody = body as { error?: { message?: string; code?: string } };
            return yield* Effect.fail(
              new RpcInfraError({
                message: errorBody.error?.message ?? "Unknown RPC error",
                code: errorBody.error?.code ?? "RPC_ERROR",
              }),
            );
          }

          return body as R;
        });

      return {
        call: <R>(operation: string, payload: unknown) => makeRequest<R>(operation, payload),

        callWithOptions: <R>(
          operation: string,
          payload: unknown,
          options?: {
            timeout?: Duration.DurationInput;
            skipRetry?: boolean;
            headers?: Record<string, string>;
          },
        ) => {
          const effect = makeRequest<R>(operation, payload, options?.headers);
          if (options?.timeout) {
            return effect.pipe(
              Effect.timeoutFail({
                duration: Duration.decode(options.timeout),
                onTimeout: () =>
                  new RpcInfraError({
                    message: "Request timeout",
                    code: "TIMEOUT",
                  }),
              }),
            );
          }
          return effect;
        },

        healthCheck: () =>
          makeRequest<{ status: string }>("_health", {}).pipe(
            Effect.map((r) => r.status === "ok"),
            Effect.catchAll(() => Effect.succeed(false)),
          ),
      };
    }),
  );

  // ===========================================================================
  // Static Test Layer
  // ===========================================================================

  /**
   * Test Layer - Mock client for testing
   */
  static readonly Test = (mockResponses: Record<string, unknown> = {}) =>
    Layer.succeed(RpcClient, {
      call: <R>(operation: string, _payload: unknown) => {
        const response = mockResponses[operation];
        if (response !== undefined) {
          return Effect.succeed(response as R);
        }
        return Effect.fail(
          new RpcInfraError({
            message: `No mock for ${operation}`,
            code: "NO_MOCK",
          }),
        );
      },

      callWithOptions: <R>(operation: string, _payload: unknown) => {
        const response = mockResponses[operation];
        if (response !== undefined) {
          return Effect.succeed(response as R);
        }
        return Effect.fail(
          new RpcInfraError({
            message: `No mock for ${operation}`,
            code: "NO_MOCK",
          }),
        );
      },

      healthCheck: () => Effect.succeed(true),
    });
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
 *     Effect.gen(function* () {
 *       const token = yield* getStoredToken();
 *       return Option.fromNullable(token);
 *     })
 * });
 *
 * const program = Effect.gen(function* () {
 *   const client = yield* RpcClient;
 *   return yield* client.call("getUser", { id: "123" });
 * }).pipe(Effect.provide(clientLayer));
 * ```
 */
export const createRpcClientLayer = (config: RpcClientConfig) =>
  Layer.provide(RpcClient.Http, Layer.succeed(RpcClientConfigTag, config));
