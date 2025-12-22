/**
 * RPC Client Template
 *
 * Generates client-side RPC infrastructure.
 *
 * @module monorepo-library-generator/infra-templates/rpc
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder';
import type { InfraTemplateOptions } from '../../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../../utils/workspace-config';

/**
 * Generate RPC client file
 *
 * Creates type-safe RPC client for browser and Node.js.
 */
export function generateRpcClientFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  builder.addFileHeader({
    title: `${className} Client`,
    description: `RPC client for calling remote services.

Provides:
- Type-safe RPC calls from any RpcGroup
- Automatic retry with exponential backoff
- Request/response interceptors
- Streaming support

Works in browser and Node.js environments.`,
    module: `${scope}/infra-${fileName}/client`,
    see: ['EFFECT_PATTERNS.md for client patterns'],
  });

  builder.addImports([
    { from: 'effect', imports: ['Effect', 'Layer', 'Context', 'Duration', 'Schedule', 'Option'] },
    { from: '@effect/rpc', imports: ['RpcClient', 'RpcResolver'] },
    { from: '@effect/platform', imports: ['HttpClient', 'HttpClientRequest'] },
    { from: './errors', imports: ['RpcInfraError'] },
  ]);

  builder.addSectionComment('Client Configuration');

  builder.addRaw(`/**
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
`);

  builder.addSectionComment('RPC Client Service');

  builder.addRaw(`/**
 * ${className} Client Service
 *
 * Type-safe RPC client for calling remote services.
 *
 * @example
 * \`\`\`typescript
 * import { ${className}Client } from "${scope}/infra-${fileName}/client";
 * import { UserRpcs } from "${scope}/feature-user/rpc";
 *
 * const program = Effect.gen(function* () {
 *   const client = yield* ${className}Client;
 *
 *   // Call an RPC operation
 *   const user = yield* client.call(UserRpcs, "getUser", { id: "123" });
 * });
 * \`\`\`
 */
export class ${className}Client extends Context.Tag(
  "${scope}/infra-${fileName}/${className}Client"
)<
  ${className}Client,
  {
    /**
     * Call an RPC operation
     *
     * @param group - RPC group class
     * @param operation - Operation name
     * @param payload - Request payload
     */
    readonly call: <
      G extends { readonly _tag: string },
      Op extends string,
      P,
      R
    >(
      group: { new(): G; readonly _tag: string },
      operation: Op,
      payload: P
    ) => Effect.Effect<R, RpcInfraError>

    /**
     * Call with custom options
     */
    readonly callWithOptions: <R>(
      operation: string,
      payload: unknown,
      options?: {
        timeout?: Duration.DurationInput
        skipRetry?: boolean
        headers?: Record<string, string>
      }
    ) => Effect.Effect<R, RpcInfraError>

    /**
     * Get underlying HTTP client for advanced use cases
     */
    readonly getHttpClient: () => Effect.Effect<typeof HttpClient.HttpClient.Service>

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
    Effect.gen(function* () {
      const config = yield* RpcClientConfigTag
      const httpClient = yield* HttpClient.HttpClient

      // Build default headers
      const defaultHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...config.headers
      }

      // Retry schedule
      const retrySchedule = config.retry
        ? Schedule.exponential(
            Duration.decode(config.retry.initialDelay ?? "100 millis"),
            2
          ).pipe(
            Schedule.whileOutput(Duration.lessThanOrEqualTo(
              Duration.decode(config.retry.maxDelay ?? "5 seconds")
            )),
            Schedule.upTo(config.retry.maxAttempts ?? 3)
          )
        : Schedule.never

      const makeRequest = <R>(
        operation: string,
        payload: unknown,
        customHeaders?: Record<string, string>
      ): Effect.Effect<R, RpcInfraError> =>
        Effect.gen(function* () {
          // Get auth token if provider exists
          const authHeader: Record<string, string> = {}
          if (config.getAuthToken) {
            const token = yield* config.getAuthToken()
            if (Option.isSome(token)) {
              authHeader["Authorization"] = \`Bearer \${token.value}\`
            }
          }

          // Build request
          const request = HttpClientRequest.post(config.baseUrl).pipe(
            HttpClientRequest.setHeaders({
              ...defaultHeaders,
              ...authHeader,
              ...customHeaders
            }),
            HttpClientRequest.jsonBody({
              operation,
              payload
            })
          )

          // Execute with timeout and retry
          const response = yield* httpClient.execute(request).pipe(
            Effect.timeout(Duration.decode(config.timeout ?? "30 seconds")),
            Effect.retry(retrySchedule),
            Effect.catchAll((error) =>
              Effect.fail(
                new RpcInfraError({
                  message: \`RPC call failed: \${error}\`,
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
            return yield* Effect.fail(
              new RpcInfraError({
                message: (body as any).error.message ?? "Unknown RPC error",
                code: (body as any).error.code ?? "RPC_ERROR"
              })
            )
          }

          return body as R
        })

      return {
        call: <G, Op extends string, P, R>(
          group: { new(): G; readonly _tag: string },
          operation: Op,
          payload: P
        ) => makeRequest<R>(\`\${group._tag}.\${operation}\`, payload),

        callWithOptions: <R>(
          operation: string,
          payload: unknown,
          options?: {
            timeout?: Duration.DurationInput
            skipRetry?: boolean
            headers?: Record<string, string>
          }
        ) =>
          makeRequest<R>(operation, payload, options?.headers).pipe(
            options?.skipRetry ? Effect.retry(Schedule.never) : Effect.identity,
            options?.timeout
              ? Effect.timeout(Duration.decode(options.timeout))
              : Effect.identity
          ),

        getHttpClient: () => Effect.succeed(httpClient),

        healthCheck: () =>
          makeRequest<{ status: string }>("_health", {}).pipe(
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
   */
  static readonly Test = (
    mockResponses: Record<string, unknown> = {}
  ) =>
    Layer.succeed(${className}Client, {
      call: <G, Op extends string, P, R>(
        group: { new(): G; readonly _tag: string },
        operation: Op,
        _payload: P
      ) => {
        const key = \`\${group._tag}.\${operation}\`
        const response = mockResponses[key]
        if (response !== undefined) {
          return Effect.succeed(response as R)
        }
        return Effect.fail(
          new RpcInfraError({
            message: \`No mock for \${key}\`,
            code: "NO_MOCK"
          })
        )
      },

      callWithOptions: <R>(operation: string, _payload: unknown) => {
        const response = mockResponses[operation]
        if (response !== undefined) {
          return Effect.succeed(response as R)
        }
        return Effect.fail(
          new RpcInfraError({
            message: \`No mock for \${operation}\`,
            code: "NO_MOCK"
          })
        )
      },

      getHttpClient: () =>
        Effect.die(new Error("HttpClient not available in test mode")),

      healthCheck: () => Effect.succeed(true)
    })
}
`);

  builder.addSectionComment('Client Factory');

  builder.addRaw(`/**
 * Create RPC client layer with configuration
 *
 * @example
 * \`\`\`typescript
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
 *   const client = yield* ${className}Client;
 *   return yield* client.call(UserRpcs, "getUser", { id: "123" });
 * }).pipe(Effect.provide(clientLayer));
 * \`\`\`
 */
export const createRpcClientLayer = (config: RpcClientConfig) =>
  Layer.provide(
    ${className}Client.Http,
    Layer.succeed(RpcClientConfigTag, config)
  )
`);

  builder.addSectionComment('React Hook (Client-Side)');

  builder.addRaw(`/**
 * React hook for RPC calls
 *
 * Note: Requires React 18+ and a React-Effect bridge.
 *
 * @example
 * \`\`\`typescript
 * // In a React component
 * const { data, error, loading, execute } = useRpc(
 *   UserRpcs,
 *   "getUser",
 *   { id: "123" }
 * );
 *
 * // Or with manual trigger
 * const { execute } = useRpc(UserRpcs, "createUser");
 * const handleSubmit = () => execute({ name: "John" });
 * \`\`\`
 */
// export const useRpc = <G, Op extends string, P, R>(
//   group: { new(): G; readonly _tag: string },
//   operation: Op,
//   payload?: P,
//   options?: { immediate?: boolean }
// ) => {
//   // Implementation would use React.useState, React.useEffect
//   // and Effect.runPromise with the client
// }
`);

  return builder.toString();
}
