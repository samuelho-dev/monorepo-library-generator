import { Atom } from "@effect-atom/atom"

/**
 * User Client State
 *
 * Centralized state management for user feature using @effect-atom/atom.

Contract-First Architecture:
- This parent module atom is the SINGLE source of truth for user state
- RPC integration via useRpcClient for data fetching
- Sub-modules access state through these atoms (no sub-module atoms)

State Hierarchy:
  UserAtom (this file)
  ├── Loading/error state
  ├── Entity data
  ├── Lists and pagination
  └── Sub-module operational state

Usage:
  import { useUser } from "@samuelho-dev/feature-user/client";
  const { data, isLoading, fetch } = useUser();
 *
 * @module @samuelho-dev/feature-user/client/atoms
 */


import type { UserSelect as User } from "@samuelho-dev/contract-user";

// ============================================================================
// State Types
// ============================================================================

/**
 * Loading state for async operations
 */
export type LoadingState = "idle" | "loading" | "refreshing" | "error";

/**
 * Pagination state for list operations
 */
export interface PaginationState {
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly hasMore: boolean;
}

/**
 * User entity state (single item)
 */
export interface UserEntityState {
  readonly data: User | null;
  readonly loadingState: LoadingState;
  readonly error: string | null;
  readonly lastUpdated: number | null;
}

/**
 * User list state (collection)
 */
export interface UserListState {
  readonly items: ReadonlyArray<User>;
  readonly loadingState: LoadingState;
  readonly error: string | null;
  readonly pagination: PaginationState;
  readonly lastUpdated: number | null;
}

/**
 * User operation state (for mutations)
 */
export interface UserOperationState {
  readonly isSubmitting: boolean;
  readonly error: string | null;
  readonly lastOperation: string | null;
}

/**
 * Combined User state
 */
export interface UserState {
  readonly entity: UserEntityState;
  readonly list: UserListState;
  readonly operation: UserOperationState;
}

// ============================================================================
// Initial States
// ============================================================================

const initialUserEntityState: UserEntityState = {
  data: null,
  loadingState: "idle",
  error: null,
  lastUpdated: null,
};

const initialUserListState: UserListState = {
  items: [],
  loadingState: "idle",
  error: null,
  pagination: {
    page: 1,
    pageSize: 20,
    totalCount: 0,
    hasMore: false,
  },
  lastUpdated: null,
};

const initialUserOperationState: UserOperationState = {
  isSubmitting: false,
  error: null,
  lastOperation: null,
};

const initialUserState: UserState = {
  entity: initialUserEntityState,
  list: initialUserListState,
  operation: initialUserOperationState,
};

// ============================================================================
// Atoms
// ============================================================================

/**
 * Main user state atom
 *
 * Central state for the entire user feature domain.
 * Sub-modules access this atom for shared state.
 */
export const userAtom = Atom.make<UserState>(initialUserState);

/**
 * User entity cache (by ID)
 *
 * Atom.family for caching individual entities.
 * Automatically deduplicates fetches for the same ID.
 */
export const userEntityFamily = Atom.family((id: string) =>
  Atom.make<UserEntityState>(initialUserEntityState)
);

// ============================================================================
// Derived Atoms
// ============================================================================

/**
 * Is any operation loading?
 */
export const userIsLoadingAtom = Atom.map(
  userAtom,
  (state) =>
    state.entity.loadingState === "loading" ||
    state.list.loadingState === "loading" ||
    state.operation.isSubmitting
);

/**
 * Current error (if any)
 */
export const userErrorAtom = Atom.map(
  userAtom,
  (state) =>
    state.entity.error || state.list.error || state.operation.error
);

/**
 * Current entity data
 */
export const userDataAtom = Atom.map(
  userAtom,
  (state) => state.entity.data
);

/**
 * Current list items
 */
export const userListAtom = Atom.map(
  userAtom,
  (state) => state.list.items
);

// ============================================================================
// State Updaters
// ============================================================================

/**
 * Update entity state
 */
export function updateUserEntity(
  update: Partial<UserEntityState>
): (state: UserState) => UserState {
  return (state) => ({
    ...state,
    entity: { ...state.entity, ...update },
  });
}

/**
 * Update list state
 */
export function updateUserList(
  update: Partial<UserListState>
): (state: UserState) => UserState {
  return (state) => ({
    ...state,
    list: { ...state.list, ...update },
  });
}

/**
 * Update operation state
 */
export function updateUserOperation(
  update: Partial<UserOperationState>
): (state: UserState) => UserState {
  return (state) => ({
    ...state,
    operation: { ...state.operation, ...update },
  });
}

/**
 * Reset all state to initial
 */
export function resetUserState(): UserState {
  return initialUserState;
}
