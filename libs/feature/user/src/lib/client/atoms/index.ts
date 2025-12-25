/**
 * Client Atoms Barrel Export
 *
 * Barrel export for client-side state atoms
 *
 * @module @samuelho-dev/feature-user/client/atoms
 */
export {
  // State Types
  type LoadingState,
  type PaginationState,
  type UserEntityState,
  type UserListState,
  type UserOperationState,
  type UserState,
  // Atoms
  userAtom,
  userEntityFamily,
  getUserAtom,
  // Derived Atoms
  userIsLoadingAtom,
  userErrorAtom,
  userDataAtom,
  userListAtom,
  // State Updaters
  updateUserEntity,
  updateUserList,
  updateUserOperation,
  resetUserState
} from "./user-atoms"
