import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse
} from '@effect/platform'
import { Atom } from '@effect-atom/atom'
import { useAtom } from '@effect-atom/atom-react'
import { Cause, Effect, Option, Schema } from 'effect'
import { useMemo } from 'react'

/**
 * RPC Client Hooks
 *
 * Effect-native React hooks for making RPC calls from client components.

Provides:
- useRpcMutation: Effect-based mutation hook with typed error channel
- useRpcQuery: Effect-based query hook with auto-fetch
- useRpcLazyQuery: Effect-based lazy query hook
- No try/catch - errors flow through Effect's typed error channel

Usage:
  import { useRpcMutation, useRpcQuery, rpcCall } from "@samuelho-dev/infra-rpc/client"

  // With hooks - errors are typed, no catch blocks needed
  const { data, error, mutate, isLoading } = useRpcMutation(
    "createUser",
    CreateUserInputSchema,
    UserSchema
  )

  // Execute the mutation
  mutate({ name: "John", email: "john@example.com" })
 *
 */

// ============================================================================
// Types
// ============================================================================
/**
 * RPC Error - typed error for RPC operations
 *
 * All RPC errors flow through Effect's error channel with this structure.
 * No try/catch needed - errors are typed at the Effect level.
 */
export class RpcError extends Schema.TaggedError<RpcError>()('RpcError', {
  operation: Schema.String,
  message: Schema.String,
  code: Schema.optional(Schema.String),
  cause: Schema.optional(Schema.Unknown)
}) {}

/**
 * RPC State - represents the state of an RPC operation
 *
 * Used by hooks to track loading, success, and error states.
 */
export type RpcState<A, E> =
  | { readonly _tag: 'Initial' }
  | { readonly _tag: 'Loading' }
  | { readonly _tag: 'Success'; readonly value: A }
  | { readonly _tag: 'Failure'; readonly error: E }

/**
 * Create initial state
 */
function initialState<A, E>(): RpcState<A, E> {
  return { _tag: 'Initial' }
}

/**
 * Create loading state
 */
function loadingState<A, E>(): RpcState<A, E> {
  return { _tag: 'Loading' }
}

/**
 * Create success state
 */
function successState<A, E>(value: A): RpcState<A, E> {
  return { _tag: 'Success', value }
}

/**
 * Create failure state
 */
function failureState<A, E>(error: E): RpcState<A, E> {
  return { _tag: 'Failure', error }
}
// ============================================================================
// RPC Configuration
// ============================================================================
/**
 * RPC endpoint URL - configured via environment
 *
 * Uses process.env for client-side configuration.
 * Falls back to "/api/rpc" if not configured.
 */
// biome-ignore lint/style/noProcessEnv: Client-side RPC endpoint configured via environment
const RPC_ENDPOINT = process.env.PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '/api/rpc'

/**
 * Default timeout for RPC calls (30 seconds)
 */
const DEFAULT_TIMEOUT = 30000

// ============================================================================
// RPC Call Effect
// ============================================================================
/**
 * Make an RPC call as an Effect
 *
 * This is the core function for making RPC requests.
 * Returns Effect<T, RpcError> - errors flow through the typed error channel.
 * No try/catch needed - use Effect.map, Effect.mapError, Effect.catchAll.
 *
 * Uses @effect/platform HttpClient for browser-compatible HTTP requests.
 * Schema validation ensures type-safe response parsing.
 *
 * @param operation - The operation name (e.g., "getUser")
 * @param payload - The request payload (will be validated against inputSchema)
 * @param inputSchema - Schema for validating the input payload
 * @param outputSchema - Schema for validating the response
 * @returns Effect that resolves to validated response or fails with RpcError
 *
 * @example
 * ```typescript
 * const getUser = rpcCall(
 *   "getUser",
 *   { id: "123" },
 *   GetUserInputSchema,
 *   UserSchema
 * )
 *
 * // Run with Effect.runPromise or use in hooks
 * const user = await Effect.runPromise(
 *   getUser.pipe(Effect.provide(FetchHttpClient.layer))
 * )
 * ```
 */
export function rpcCall<I, O>(
  operation: string,
  payload: I,
  inputSchema: Schema.Schema<I, unknown>,
  outputSchema: Schema.Schema<O, unknown>
): Effect.Effect<O, RpcError, HttpClient.HttpClient> {
  return Effect.gen(function* () {
    // Validate input
    const validatedInput = yield* Schema.decode(inputSchema)(payload).pipe(
      Effect.mapError(
        (parseError) =>
          new RpcError({
            operation,
            message: `Input validation failed: ${parseError.message}`,
            code: 'VALIDATION_ERROR'
          })
      )
    )

    // Get HttpClient from context
    const client = yield* HttpClient.HttpClient

    // Build request
    const request = HttpClientRequest.post(RPC_ENDPOINT).pipe(
      HttpClientRequest.jsonBody({
        _tag: operation,
        payload: validatedInput
      })
    )

    // Execute request with timeout
    const response = yield* Effect.flatMap(request, (req) =>
      client.execute(req).pipe(
        Effect.timeout(DEFAULT_TIMEOUT),
        Effect.mapError(
          (error) =>
            new RpcError({
              operation,
              message: `Request failed: ${String(error)}`,
              code: 'NETWORK_ERROR',
              cause: error
            })
        )
      )
    )

    // Check response status
    if (response.status >= 400) {
      const errorBody = yield* HttpClientResponse.json(response).pipe(
        Effect.catchAll(() => Effect.succeed({ message: response.statusText }))
      )
      return yield* Effect.fail(
        new RpcError({
          operation,
          message: (errorBody as { message?: string }).message ?? `HTTP ${response.status}`,
          code: `HTTP_${response.status}`,
          cause: errorBody
        })
      )
    }

    // Parse response body
    const body = yield* HttpClientResponse.json(response).pipe(
      Effect.mapError(
        (error) =>
          new RpcError({
            operation,
            message: 'Failed to parse response JSON',
            code: 'PARSE_ERROR',
            cause: error
          })
      )
    )

    // Validate response against schema
    const validated = yield* Schema.decodeUnknown(outputSchema)(body).pipe(
      Effect.mapError(
        (parseError) =>
          new RpcError({
            operation,
            message: `Response validation failed: ${parseError.message}`,
            code: 'VALIDATION_ERROR'
          })
      )
    )

    return validated
  }).pipe(Effect.withSpan(`rpc.${operation}`))
}

/**
 * Create a runnable RPC Effect with HttpClient layer provided
 *
 * Convenience function that adds FetchHttpClient.layer automatically.
 */
export function rpcCallWithLayer<I, O>(
  operation: string,
  payload: I,
  inputSchema: Schema.Schema<I, unknown>,
  outputSchema: Schema.Schema<O, unknown>
): Effect.Effect<O, RpcError> {
  return rpcCall(operation, payload, inputSchema, outputSchema).pipe(
    Effect.provide(FetchHttpClient.layer)
  )
}

// ============================================================================
// Mutation Hook
// ============================================================================
/**
 * Hook for RPC mutations with Effect-native error handling
 *
 * Uses Effect + Atom.fn for reactive state management.
 * Errors flow through Effect's typed error channel - no try/catch needed.
 *
 * @param operation - The RPC operation name
 * @param inputSchema - Schema for validating input
 * @param outputSchema - Schema for validating response
 * @returns Mutation state with mutate, isLoading, error, data, reset
 *
 * @example
 * ```tsx
 * function CreateUserForm() {
 *   const { mutate, isLoading, error, data } = useRpcMutation(
 *     "createUser",
 *     CreateUserInputSchema,
 *     UserSchema
 *   )
 *
 *   const handleSubmit = (data: CreateUserInput) => {
 *     mutate(data) // No await needed - state updates reactively
 *   }
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {error && <Error message={error.message} code={error.code} />}
 *       {data && <Success user={data} />}
 *       <button disabled={isLoading}>Create</button>
 *     </form>
 *   )
 * }
 * ```
 */
export function useRpcMutation<I, O>(
  operation: string,
  inputSchema: Schema.Schema<I, unknown>,
  outputSchema: Schema.Schema<O, unknown>
) {
  // Create Atom.fn that executes the RPC call
  const mutationAtom = useMemo(
    () => Atom.fn((input: I) => rpcCallWithLayer(operation, input, inputSchema, outputSchema)),
    [operation]
  )

  // Use the Atom hook - returns [Result, dispatch]
  const [result, mutate] = useAtom(mutationAtom)

  // Map Atom Result to our state shape
  const state = useMemo((): RpcState<O, RpcError> => {
    if (result._tag === 'Initial') return initialState()
    if (result._tag === 'Waiting') return loadingState()
    if (result._tag === 'Success') return successState(result.value)
    if (result._tag === 'Failure') {
      // Extract RpcError from Cause
      const error = Cause.failureOption(result.cause)
      if (Option.isSome(error)) {
        return failureState(error.value)
      }
      // Defect or interrupted - create generic error
      return failureState(
        new RpcError({
          operation,
          message: 'An unexpected error occurred',
          code: 'UNEXPECTED_ERROR'
        })
      )
    }
    return initialState()
  }, [result, operation])

  return {
    mutate,
    isLoading: state._tag === 'Loading',
    error: state._tag === 'Failure' ? state.error : null,
    data: state._tag === 'Success' ? state.value : null,
    state,
    reset: () => {} // Atom handles reset automatically on next call
  } as const
}

// ============================================================================
// Query Hook
// ============================================================================
/**
 * Hook for RPC queries with automatic fetching using Effect + Atom
 *
 * Uses Effect + Atom.fn for reactive query management.
 * Automatically fetches when input changes.
 * Errors flow through Effect's typed error channel.
 *
 * @param operation - The RPC operation name
 * @param input - Query input
 * @param inputSchema - Schema for validating input
 * @param outputSchema - Schema for validating response
 * @param options - Query options (enabled flag)
 * @returns Query state with data, isLoading, error, refetch
 *
 * @example
 * ```tsx
 * function UserProfile({ userId }: { userId: string }) {
 *   const { data, isLoading, error, refetch } = useRpcQuery(
 *     "getUser",
 *     { id: userId },
 *     GetUserInputSchema,
 *     UserSchema,
 *     { enabled: Boolean(userId) }
 *   )
 *
 *   if (isLoading) return <Loading />
 *   if (error) return <Error message={error.message} code={error.code} />
 *   if (!data) return null
 *
 *   return <UserCard user={data} />
 * }
 * ```
 */
export function useRpcQuery<I, O>(
  operation: string,
  input: I,
  inputSchema: Schema.Schema<I, unknown>,
  outputSchema: Schema.Schema<O, unknown>,
  options?: { readonly enabled?: boolean }
) {
  const enabled = options?.enabled ?? true

  // Create Atom.fn for automatic fetching
  const queryAtom = useMemo(
    () =>
      Atom.fn((_: undefined) =>
        enabled
          ? rpcCallWithLayer(operation, input, inputSchema, outputSchema)
          : Effect.succeed(null as O | null)
      ),
    [operation, JSON.stringify(input), enabled]
  )

  // Use the Atom hook
  const [result, refetch] = useAtom(queryAtom)

  // Trigger initial fetch on mount and when dependencies change
  useMemo(() => {
    if (enabled) {
      refetch()
    }
  }, [enabled, refetch])

  // Map Atom Result to our state shape
  const state = useMemo((): RpcState<O | null, RpcError> => {
    if (result._tag === 'Initial') return initialState()
    if (result._tag === 'Waiting') return loadingState()
    if (result._tag === 'Success') return successState(result.value)
    if (result._tag === 'Failure') {
      const error = Cause.failureOption(result.cause)
      if (Option.isSome(error)) {
        return failureState(error.value)
      }
      return failureState(
        new RpcError({
          operation,
          message: 'An unexpected error occurred',
          code: 'UNEXPECTED_ERROR'
        })
      )
    }
    return initialState()
  }, [result, operation])

  return {
    data: state._tag === 'Success' ? state.value : null,
    isLoading: state._tag === 'Loading',
    error: state._tag === 'Failure' ? state.error : null,
    refetch: () => refetch(),
    state
  } as const
}

// ============================================================================
// Lazy Query Hook
// ============================================================================
/**
 * Hook for RPC queries that are triggered manually using Effect + Atom
 *
 * Unlike useRpcQuery, this does not fetch automatically.
 * Call execute() to trigger the fetch.
 * Errors flow through Effect's typed error channel.
 *
 * @param operation - The RPC operation name
 * @param inputSchema - Schema for validating input
 * @param outputSchema - Schema for validating response
 * @returns Query state with data, isLoading, error, execute
 *
 * @example
 * ```tsx
 * function SearchUsers() {
 *   const { data, isLoading, error, execute } = useRpcLazyQuery(
 *     "searchUsers",
 *     SearchUsersInputSchema,
 *     Schema.Array(UserSchema)
 *   )
 *
 *   const handleSearch = (query: string) => {
 *     execute({ query }) // No await needed - state updates reactively
 *   }
 *
 *   return (
 *     <div>
 *       <SearchInput onSearch={handleSearch} />
 *       {isLoading && <Loading />}
 *       {error && <Error message={error.message} code={error.code} />}
 *       {data && <UserList users={data} />}
 *     </div>
 *   )
 * }
 * ```
 */
export function useRpcLazyQuery<I, O>(
  operation: string,
  inputSchema: Schema.Schema<I, unknown>,
  outputSchema: Schema.Schema<O, unknown>
) {
  // Create Atom.fn that executes the RPC call (same as mutation)
  const queryAtom = useMemo(
    () => Atom.fn((input: I) => rpcCallWithLayer(operation, input, inputSchema, outputSchema)),
    [operation]
  )

  // Use the Atom hook
  const [result, execute] = useAtom(queryAtom)

  // Map Atom Result to our state shape
  const state = useMemo((): RpcState<O, RpcError> => {
    if (result._tag === 'Initial') return initialState()
    if (result._tag === 'Waiting') return loadingState()
    if (result._tag === 'Success') return successState(result.value)
    if (result._tag === 'Failure') {
      const error = Cause.failureOption(result.cause)
      if (Option.isSome(error)) {
        return failureState(error.value)
      }
      return failureState(
        new RpcError({
          operation,
          message: 'An unexpected error occurred',
          code: 'UNEXPECTED_ERROR'
        })
      )
    }
    return initialState()
  }, [result, operation])

  return {
    data: state._tag === 'Success' ? state.value : null,
    isLoading: state._tag === 'Loading',
    error: state._tag === 'Failure' ? state.error : null,
    execute,
    state
  } as const
}
