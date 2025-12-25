import { useAtom, useAtomValue } from "@effect-atom/atom-react"
import type { CreateUserInput, UpdateUserInput, UserSelect as User } from "@samuelho-dev/contract-user"
import { Option, Schema } from "effect"
import { useCallback, useMemo } from "react"
import { resetUserState, updateUserEntity, updateUserList, updateUserOperation, userAtom, userDataAtom, userErrorAtom, userIsLoadingAtom, userListAtom } from "../atoms/user-atoms"
import type { UserState } from "../atoms/user-atoms"

/**
 * useUser Hook
 *
 * React hook for user operations.

Contract-First Architecture:
- Uses useRpcClient from infra-rpc for type-safe RPC calls
- State managed via parent module atoms (centralized state)
- Sub-modules access state through this hook

Usage:
  import { useUser } from "@samuelho-dev/feature-user/client"  function MyComponent() {
    const {
      data, list, isLoading, error,
      fetchById, fetchList, create, update, remove, reset
    } = useUser()
    // ...
  }
 *
 * @module @samuelho-dev/feature-user/client/hooks
 */

/**
 * Schema for RPC error responses
 *
 * RPC errors are Schema.TaggedError types serialized as JSON.
 * This schema extracts the message field from any RPC error.
 */
const RpcErrorSchema = Schema.Struct({
  _tag: Schema.String,
  message: Schema.String
})

type RpcErrorMessage = Schema.Schema.Type<typeof RpcErrorSchema>

/**
 * Extract error message from RPC error response using Schema
 *
 * Uses Schema.decodeUnknownOption for type-safe parsing without coercion.
 */
function getErrorMessage(error: unknown, fallback: string): string {
  const result: Option.Option<RpcErrorMessage> = Schema.decodeUnknownOption(RpcErrorSchema)(error)
  return Option.isSome(result) ? result.value.message : fallback
}


// ============================================================================
// Hook Return Type
// ============================================================================
/**
 * Return type for useUser hook
 */
export interface UseUserReturn {
  // State
  readonly state: UserState;
  readonly data: User | null;
  readonly list: ReadonlyArray<User>
  readonly isLoading: boolean;
  readonly error: string | null  // Entity operations
  readonly fetchById: (id: string) => Promise<User | null>
  readonly create: (input: CreateUserInput) => Promise<User>
  readonly update: (id: string, input: UpdateUserInput) => Promise<User>
  readonly remove: (id: string) => Promise<void>

  // List operations
  readonly fetchList: (options?: { page?: number; pageSize?: number }) => Promise<void>
  readonly refreshList: () => Promise<void>

  // State management
  readonly reset: () => void;
  readonly clearError: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================
/**
 * RPC endpoint URL - configured via environment
 *
 * Uses process.env for client-side configuration.
 * Falls back to "/api/rpc" if PUBLIC_API_URL is not configured.
 */
const RPC_ENDPOINT = process.env["PUBLIC_API_URL"] ?? process.env["NEXT_PUBLIC_API_URL"] ?? "/api/rpc"

/**
 * Make an RPC call to the server
 *
 * Uses typed response - caller should cast result to expected type.
 * Server-side validation ensures type safety.
 */
async function rpcCall<T>(operation: string, payload: unknown): Promise<T> {
  const response = await fetch(RPC_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ _tag: operation, payload })
  })

  const body: unknown = await response.json()

  if (!response.ok) {
    throw body
  }

  return body as T
}

/**
 * List response type from server
 */
interface ListResponse<T> {
  readonly items: ReadonlyArray<T>
  readonly total: number;
  readonly hasMore: boolean;
}

/**
 * useUser - Main hook for user operations
 *
 * Provides:
 * - Type-safe RPC calls to server endpoints
 * - Centralized state management via atoms
 * - Loading/error state tracking
 * - CRUD operations with automatic state updates
 *
 * @example
 * ```tsx
 * function UserList() {
 *   const { list, isLoading, fetchList } = useUser()
 *
 *   useEffect(() => {
 *     fetchList()
 *   }, [fetchList])
 *
 *   if (isLoading) return <Loading />
 *   return <ul>{list.map(item => <li key={item.id}>{item.name}</li>)}</ul>
 * }
 * ```
 */
export function useUser(): UseUserReturn {
  // Atom state
  const [state, setState] = useAtom(userAtom)
  const isLoading = useAtomValue(userIsLoadingAtom)
  const error = useAtomValue(userErrorAtom)
  const data = useAtomValue(userDataAtom)
  const list = useAtomValue(userListAtom)

  // Fetch by ID
  const fetchById = useCallback(async (id: string) => {
    setState(updateUserEntity({ loadingState: "loading", error: null }))
    try {
      const result = await rpcCall<User>("GetUser", { id })
      setState(updateUserEntity({
        data: result,
        loadingState: "idle",
        lastUpdated: Date.now()
      }))
      return result
    } catch (e) {
      const errorMessage = getErrorMessage(e, "Failed to fetch")
      setState(updateUserEntity({ loadingState: "error", error: errorMessage }))
      return null
    }
  }, [setState])

  // Fetch list
  const fetchList = useCallback(async (options?: { page?: number; pageSize?: number }) => {
    const page = options?.page ?? state.list.pagination.page
    const pageSize = options?.pageSize ?? state.list.pagination.pageSize

    setState(updateUserList({ loadingState: "loading", error: null }))
    try {
      const result = await rpcCall<ListResponse<User>>("ListUsers", { page, pageSize })
      setState(updateUserList({
        items: result.items,
        loadingState: "idle",
        pagination: {
          page,
          pageSize,
          totalCount: result.total,
          hasMore: result.hasMore
        },
        lastUpdated: Date.now()
      }))
    } catch (e) {
      const errorMessage = getErrorMessage(e, "Failed to fetch list")
      setState(updateUserList({ loadingState: "error", error: errorMessage }))
    }
  }, [setState, state.list.pagination.page, state.list.pagination.pageSize])

  // Refresh list (reload current page)
  const refreshList = useCallback(async () => {
    setState(updateUserList({ loadingState: "refreshing" }))
    await fetchList()
  }, [fetchList, setState])

  // Create
  const create = useCallback(async (input: CreateUserInput) => {
    setState(updateUserOperation({ isSubmitting: true, error: null, lastOperation: "create" }))
    try {
      const result = await rpcCall<User>("CreateUser", input)
      setState(updateUserOperation({ isSubmitting: false }))
      // Refresh list after creation
      await refreshList()
      return result
    } catch (e) {
      const errorMessage = getErrorMessage(e, "Failed to create")
      setState(updateUserOperation({ isSubmitting: false, error: errorMessage }))
      throw e
    }
  }, [setState, refreshList])

  // Update
  const update = useCallback(async (id: string, input: UpdateUserInput) => {
    setState(updateUserOperation({ isSubmitting: true, error: null, lastOperation: "update" }))
    try {
      const result = await rpcCall<User>("UpdateUser", { id, ...input })
      setState(updateUserOperation({ isSubmitting: false }))
      // Update entity if it's the current one
      if (state.entity.data?.id === id) {
        setState(updateUserEntity({ data: result, lastUpdated: Date.now() }))
      }
      // Refresh list after update
      await refreshList()
      return result
    } catch (e) {
      const errorMessage = getErrorMessage(e, "Failed to update")
      setState(updateUserOperation({ isSubmitting: false, error: errorMessage }))
      throw e
    }
  }, [setState, refreshList, state.entity.data?.id])

  // Remove
  const remove = useCallback(async (id: string) => {
    setState(updateUserOperation({ isSubmitting: true, error: null, lastOperation: "delete" }))
    try {
      await rpcCall<{ success: boolean }>("DeleteUser", { id })
      setState(updateUserOperation({ isSubmitting: false }))
      // Clear entity if it's the deleted one
      if (state.entity.data?.id === id) {
        setState(updateUserEntity({ data: null }))
      }
      // Refresh list after deletion
      await refreshList()
    } catch (e) {
      const errorMessage = getErrorMessage(e, "Failed to delete")
      setState(updateUserOperation({ isSubmitting: false, error: errorMessage }))
      throw e
    }
  }, [setState, refreshList, state.entity.data?.id])

  // Reset state
  const reset = useCallback(() => {
    setState(resetUserState())
  }, [setState])

  // Clear error
  const clearError = useCallback(() => {
    setState((s) => ({
      ...s,
      entity: { ...s.entity, error: null },
      list: { ...s.list, error: null },
      operation: { ...s.operation, error: null }
    }))
  }, [setState])

  return useMemo(() => ({
    // State
    state,
    data,
    list,
    isLoading,
    error,

    // Entity operations
    fetchById,
    create,
    update,
    remove,

    // List operations
    fetchList,
    refreshList,

    // State management
    reset,
    clearError
  }), [
    state, data, list, isLoading, error,
    fetchById, create, update, remove,
    fetchList, refreshList, reset, clearError
  ])
}
