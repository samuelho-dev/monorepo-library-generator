import { useAtom, useAtomValue } from "@effect-atom/atom-react"
import { Schema } from "@effect/schema"
import { Option } from "effect"
import { useCallback, useMemo } from "react"

/**
 * useUser Hook
 *
 * React hook for user operations.

Contract-First Architecture:
- Uses useRpcClient from infra-rpc for type-safe RPC calls
- State managed via parent module atoms (centralized state)
- Sub-modules access state through this hook

Usage:
  import { useUser } from "@samuelho-dev/feature-user/client";

  function MyComponent() {
    const {
      data, list, isLoading, error,
      fetchById, fetchList, create, update, remove, reset
    } = useUser();
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
  message: Schema.String,
});

/**
 * Extract error message from RPC error response using Schema
 *
 * Uses Schema.decodeUnknownOption for type-safe parsing without coercion.
 */
function getErrorMessage(error: unknown, fallback: string): string {
  const result = Schema.decodeUnknownOption(RpcErrorSchema)(error);
  return Option.isSome(result) ? result.value.message : fallback;
}


import { useRpcClient } from "@samuelho-dev/infra-rpc";
import { UserRpcs } from "@samuelho-dev/contract-user";
import type { UserSelect as User, CreateUserInput, UpdateUserInput } from "@samuelho-dev/contract-user";
import {
  userAtom,
  userIsLoadingAtom,
  userErrorAtom,
  userDataAtom,
  userListAtom,
  updateUserEntity,
  updateUserList,
  updateUserOperation,
  resetUserState,
  type UserState,
} from "../atoms/user-atoms";

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
  readonly list: ReadonlyArray<User>;
  readonly isLoading: boolean;
  readonly error: string | null;

  // Entity operations
  readonly fetchById: (id: string) => Promise<User | null>;
  readonly create: (input: CreateUserInput) => Promise<User>;
  readonly update: (id: string, input: UpdateUserInput) => Promise<User>;
  readonly remove: (id: string) => Promise<void>;

  // List operations
  readonly fetchList: (options?: { page?: number; pageSize?: number }) => Promise<void>;
  readonly refreshList: () => Promise<void>;

  // State management
  readonly reset: () => void;
  readonly clearError: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * useUser - Main hook for user operations
 *
 * Provides:
 * - Type-safe RPC calls via useRpcClient
 * - Centralized state management via atoms
 * - Loading/error state tracking
 * - CRUD operations with automatic state updates
 *
 * @example
 * ```tsx
 * function UserList() {
 *   const { list, isLoading, fetchList } = useUser();
 *
 *   useEffect(() => {
 *     fetchList();
 *   }, [fetchList]);
 *
 *   if (isLoading) return <Loading />;
 *   return <ul>{list.map(item => <li key={item.id}>{item.name}</li>)}</ul>;
 * }
 * ```
 */
export function useUser(): UseUserReturn {
  // Atom state
  const [state, setState] = useAtom(userAtom);
  const isLoading = useAtomValue(userIsLoadingAtom);
  const error = useAtomValue(userErrorAtom);
  const data = useAtomValue(userDataAtom);
  const list = useAtomValue(userListAtom);

  // RPC client
  const rpcClient = useRpcClient(UserRpcs);

  // Fetch by ID
  const fetchById = useCallback(async (id: string): Promise<User | null> => {
    setState(updateUserEntity({ loadingState: "loading", error: null }));
    try {
      const result = await rpcClient.getUser({ id });
      setState(updateUserEntity({
        data: result,
        loadingState: "idle",
        lastUpdated: Date.now(),
      }));
      return result;
    } catch (e) {
      const errorMessage = getErrorMessage(e, "Failed to fetch");
      setState(updateUserEntity({ loadingState: "error", error: errorMessage }));
      return null;
    }
  }, [rpcClient, setState]);

  // Fetch list
  const fetchList = useCallback(async (options?: { page?: number; pageSize?: number }): Promise<void> => {
    const page = options?.page ?? state.list.pagination.page;
    const pageSize = options?.pageSize ?? state.list.pagination.pageSize;

    setState(updateUserList({ loadingState: "loading", error: null }));
    try {
      const result = await rpcClient.listUsers({ page, pageSize });
      // Use typed constant to avoid type assertion
      const items: ReadonlyArray<User> = result.items;
      setState(updateUserList({
        items,
        loadingState: "idle",
        pagination: {
          page,
          pageSize,
          totalCount: result.total,
          hasMore: result.hasMore,
        },
        lastUpdated: Date.now(),
      }));
    } catch (e) {
      const errorMessage = getErrorMessage(e, "Failed to fetch list");
      setState(updateUserList({ loadingState: "error", error: errorMessage }));
    }
  }, [rpcClient, setState, state.list.pagination.page, state.list.pagination.pageSize]);

  // Refresh list (reload current page)
  const refreshList = useCallback(async (): Promise<void> => {
    setState(updateUserList({ loadingState: "refreshing" }));
    await fetchList();
  }, [fetchList, setState]);

  // Create
  const create = useCallback(async (input: CreateUserInput): Promise<User> => {
    setState(updateUserOperation({ isSubmitting: true, error: null, lastOperation: "create" }));
    try {
      const result = await rpcClient.createUser(input);
      setState(updateUserOperation({ isSubmitting: false }));
      // Refresh list after creation
      await refreshList();
      return result;
    } catch (e) {
      const errorMessage = getErrorMessage(e, "Failed to create");
      setState(updateUserOperation({ isSubmitting: false, error: errorMessage }));
      throw e;
    }
  }, [rpcClient, setState, refreshList]);

  // Update
  const update = useCallback(async (id: string, input: UpdateUserInput): Promise<User> => {
    setState(updateUserOperation({ isSubmitting: true, error: null, lastOperation: "update" }));
    try {
      const result = await rpcClient.updateUser({ id, ...input });
      setState(updateUserOperation({ isSubmitting: false }));
      // Update entity if it's the current one
      if (state.entity.data?.id === id) {
        setState(updateUserEntity({ data: result, lastUpdated: Date.now() }));
      }
      // Refresh list after update
      await refreshList();
      return result;
    } catch (e) {
      const errorMessage = getErrorMessage(e, "Failed to update");
      setState(updateUserOperation({ isSubmitting: false, error: errorMessage }));
      throw e;
    }
  }, [rpcClient, setState, refreshList, state.entity.data?.id]);

  // Remove
  const remove = useCallback(async (id: string): Promise<void> => {
    setState(updateUserOperation({ isSubmitting: true, error: null, lastOperation: "delete" }));
    try {
      await rpcClient.deleteUser({ id });
      setState(updateUserOperation({ isSubmitting: false }));
      // Clear entity if it's the deleted one
      if (state.entity.data?.id === id) {
        setState(updateUserEntity({ data: null }));
      }
      // Refresh list after deletion
      await refreshList();
    } catch (e) {
      const errorMessage = getErrorMessage(e, "Failed to delete");
      setState(updateUserOperation({ isSubmitting: false, error: errorMessage }));
      throw e;
    }
  }, [rpcClient, setState, refreshList, state.entity.data?.id]);

  // Reset state
  const reset = useCallback(() => {
    setState(resetUserState());
  }, [setState]);

  // Clear error
  const clearError = useCallback(() => {
    setState((s) => ({
      ...s,
      entity: { ...s.entity, error: null },
      list: { ...s.list, error: null },
      operation: { ...s.operation, error: null },
    }));
  }, [setState]);

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
    clearError,
  }), [
    state, data, list, isLoading, error,
    fetchById, create, update, remove,
    fetchList, refreshList, reset, clearError,
  ]);
}
