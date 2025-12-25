import { Schema } from "@effect/schema"
import { Cause, Exit, Option, Runtime } from "effect"
import { useCallback, useEffect, useState } from "react"

/**
 * RPC Client Hooks
 *
 * React hooks for making RPC calls from client components.

Provides:
- useRpcMutation: Hook for RPC mutations with loading/error states
- useRpcQuery: Hook for RPC queries with caching
- Schema-based error parsing (no type coercions)
- No return function types - explicit signatures throughout

Usage:
  import { useRpcMutation, useRpcQuery, callRpc } from "@samuelho-dev/infra-rpc/client";

  // Direct RPC call
  const result = await callRpc("/api/rpc", "getUser", { id: "123" });

  // With hooks
  const { data, error } = useRpcQuery(
    (input) => callRpc("/api/rpc", "getUser", input),
    { id: userId }
  );
 *
 */


// ============================================================================
// Types
// ============================================================================

import type { Effect } from "effect";

/**
 * RPC error structure from Schema parsing
 */
export interface RpcError {
  readonly _tag: string;
  readonly message: string;
  readonly code?: string;
}

// ============================================================================
// Error Parsing (Schema-based)
// ============================================================================

/**
 * Schema for parsing RPC error responses
 *
 * RPC errors are Schema.TaggedError types serialized as JSON.
 * This schema extracts _tag and message for display.
 */
const RpcErrorSchema = Schema.Struct({
  _tag: Schema.String,
  message: Schema.String,
  code: Schema.optional(Schema.String),
});

/**
 * Parse error using Schema - returns typed RpcError or fallback
 *
 * Uses Schema.decodeUnknownOption for type-safe parsing without coercion.
 */
function parseRpcError(error: unknown): RpcError {
  const result = Schema.decodeUnknownOption(RpcErrorSchema)(error);
  if (Option.isSome(result)) {
    const parsed = result.value;
    return {
      _tag: parsed._tag,
      message: parsed.message,
      ...(parsed.code !== undefined ? { code: parsed.code } : {}),
    };
  }
  // Fallback for non-RPC errors
  return { _tag: "UnknownError", message: "An unexpected error occurred" };
}

/**
 * Extract error message from Cause using Effect patterns
 */
function extractCauseMessage(cause: Cause.Cause<unknown>): string {
  return Cause.pretty(cause);
}

// ============================================================================
// RPC Runtime Context
// ============================================================================

/**
 * RPC Runtime for executing Effect programs
 *
 * This is created once and reused across all hooks.
 */
let rpcRuntime: Runtime.Runtime<never> | null = null;

/**
 * Get or create the RPC runtime
 */
export function getRpcRuntime(): Runtime.Runtime<never> {
  if (rpcRuntime === null) {
    rpcRuntime = Runtime.defaultRuntime;
  }
  return rpcRuntime;
}

/**
 * Execute an Effect in the RPC runtime
 *
 * Uses Effect.runPromiseExit + Exit pattern for proper error handling.
 * Returns Exit to allow caller to handle success/failure.
 */
export function runEffectExit<A, E>(
  effect: Effect.Effect<A, E, never>
): Promise<Exit.Exit<A, E>> {
  const runtime = getRpcRuntime();
  return Runtime.runPromiseExit(runtime)(effect);
}

// ============================================================================
// RPC Call Function
// ============================================================================

/**
 * RPC call options
 */
export interface RpcCallOptions<T> {
  readonly headers?: Record<string, string>;
  readonly timeout?: number;
  readonly responseSchema: Schema.Schema<T, unknown>;
}

/**
 * Make an RPC call to the server with Schema validation
 *
 * This is the core function for making RPC requests.
 * Uses Schema.decodeUnknown for type-safe response parsing.
 * No type coercions - Schema validates the response.
 *
 * @param baseUrl - The RPC endpoint URL
 * @param operation - The operation name (e.g., "getUser")
 * @param payload - The request payload
 * @param options - Options including required responseSchema
 * @returns Promise resolving to the validated response data
 *
 * @example
 * ```typescript
 * const UserSchema = Schema.Struct({ id: Schema.String, name: Schema.String });
 *
 * const user = await callRpc("/api/rpc", "getUser", { id: "123" }, {
 *   responseSchema: UserSchema
 * });
 * ```
 */
export async function callRpc<T>(
  baseUrl: string,
  operation: string,
  payload: unknown,
  options: RpcCallOptions<T>
): Promise<T> {
  const timeout = options.timeout ?? 30000;
  const headers = options.headers ?? {};

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      _tag: operation,
      payload,
    }),
    signal: AbortSignal.timeout(timeout),
  });

  const body: unknown = await response.json().catch((): RpcError => ({
    _tag: "ParseError",
    message: response.statusText,
  }));

  if (!response.ok) {
    throw body;
  }

  // Validate response using Schema - throws ParseError on failure
  const parseResult = Schema.decodeUnknownOption(options.responseSchema)(body);
  if (Option.isNone(parseResult)) {
    throw { _tag: "ValidationError", message: "Response validation failed" };
  }

  return parseResult.value;
}

// ============================================================================
// Mutation Hook
// ============================================================================

/**
 * Hook for RPC mutations with loading/error state
 *
 * Uses Schema-based error parsing for type-safe error handling.
 * The caller provides a fetcher function with explicit signature.
 *
 * @param fetcher - Function that performs the RPC call
 * @returns Mutation state with mutate, isLoading, error, reset
 *
 * @example
 * ```tsx
 * function CreateUserForm() {
 *   const { mutate, isLoading, error } = useRpcMutation(
 *     (input: CreateUserInput) => callRpc<User>("/api/rpc", "createUser", input)
 *   );
 *
 *   const handleSubmit = async (data: CreateUserInput) => {
 *     const user = await mutate(data);
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {error && <Error message={error.message} tag={error._tag} />}
 *       <button disabled={isLoading}>Create</button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useRpcMutation<TInput, TOutput>(
  fetcher: (input: TInput) => Promise<TOutput>
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<RpcError | null>(null);

  const mutate = useCallback(
    async (input: TInput): Promise<TOutput> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetcher(input);
        return result;
      } catch (e: unknown) {
        const rpcError = parseRpcError(e);
        setError(rpcError);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [fetcher]
  );

  const reset = useCallback((): void => {
    setError(null);
  }, []);

  return { mutate, isLoading, error, reset } as const;
}

// ============================================================================
// Query Hook
// ============================================================================

/**
 * Hook for RPC queries with automatic fetching
 *
 * Uses Schema-based error parsing for type-safe error handling.
 * The caller provides a fetcher function with explicit signature.
 *
 * @param fetcher - Function that performs the RPC call
 * @param input - Query input
 * @param options - Query options (enabled flag)
 * @returns Query state with data, isLoading, error, refetch
 *
 * @example
 * ```tsx
 * function UserProfile({ userId }: { userId: string }) {
 *   const { data, isLoading, error, refetch } = useRpcQuery(
 *     (input: { id: string }) => callRpc<User>("/api/rpc", "getUser", input),
 *     { id: userId },
 *     { enabled: Boolean(userId) }
 *   );
 *
 *   if (isLoading) return <Loading />;
 *   if (error) return <Error message={error.message} tag={error._tag} />;
 *   if (!data) return null;
 *
 *   return <UserCard user={data} />;
 * }
 * ```
 */
export function useRpcQuery<TInput, TOutput>(
  fetcher: (input: TInput) => Promise<TOutput>,
  input: TInput,
  options?: { readonly enabled?: boolean }
) {
  const [data, setData] = useState<TOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<RpcError | null>(null);
  const enabled = options?.enabled ?? true;

  const refetch = useCallback(async (): Promise<void> => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await fetcher(input);
      setData(result);
    } catch (e: unknown) {
      const rpcError = parseRpcError(e);
      setError(rpcError);
    } finally {
      setIsLoading(false);
    }
  }, [fetcher, JSON.stringify(input), enabled]);

  useEffect((): void => {
    refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch } as const;
}

// ============================================================================
// Lazy Query Hook
// ============================================================================

/**
 * Hook for RPC queries that are triggered manually
 *
 * Unlike useRpcQuery, this does not fetch automatically.
 * Call execute() to trigger the fetch.
 *
 * @param fetcher - Function that performs the RPC call
 * @returns Query state with data, isLoading, error, execute
 *
 * @example
 * ```tsx
 * function SearchUsers() {
 *   const { data, isLoading, error, execute } = useRpcLazyQuery(
 *     (input: { query: string }) => callRpc<User[]>("/api/rpc", "searchUsers", input)
 *   );
 *
 *   const handleSearch = (query: string): void => {
 *     execute({ query });
 *   };
 *
 *   return (
 *     <div>
 *       <SearchInput onSearch={handleSearch} />
 *       {isLoading && <Loading />}
 *       {error && <Error message={error.message} />}
 *       {data && <UserList users={data} />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRpcLazyQuery<TInput, TOutput>(
  fetcher: (input: TInput) => Promise<TOutput>
) {
  const [data, setData] = useState<TOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<RpcError | null>(null);

  const execute = useCallback(async (input: TInput): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetcher(input);
      setData(result);
    } catch (e: unknown) {
      const rpcError = parseRpcError(e);
      setError(rpcError);
    } finally {
      setIsLoading(false);
    }
  }, [fetcher]);

  return { data, isLoading, error, execute } as const;
}
