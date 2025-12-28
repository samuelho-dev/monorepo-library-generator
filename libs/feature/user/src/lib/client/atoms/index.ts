/**
 * Client Atoms Barrel Export
 *
 * Barrel export for client-side state atoms
 *
 * @module @samuelho-dev/feature-user/client/atoms
 */
export {
  getUserAtom,
  // State Types
  type LoadingState,
  type PaginationState,
  resetUserState,
  type UserEntityState,
  type UserListState,
  type UserOperationState,
  type UserState,
  // State Updaters
  updateUserEntity,
  updateUserList,
  updateUserOperation,
  // Atoms
  userAtom,
  userDataAtom,
  userEntityFamily,
  userErrorAtom,
  // Derived Atoms
  userIsLoadingAtom,
  userListAtom
} from './user-atoms'
