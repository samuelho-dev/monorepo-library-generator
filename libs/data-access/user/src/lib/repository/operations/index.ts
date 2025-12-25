/**
 * User Repository Operations
 *
 * Barrel exports for all repository operations.

For optimal bundle size, import specific operations:
  import { createOperations } from '@scope/data-access-user/repository/operations/create'
  import { readOperations } from '@scope/data-access-user/repository/operations/read'

For convenience, import from this barrel:
  import { createOperations, readOperations } from '@scope/data-access-user/repository/operations'
 *
 * @module @samuelho-dev/data-access-user/repository/operations
 */

// ============================================================================
// Re-export all operations
// ============================================================================

export { aggregateOperations, type AggregateUserOperations } from "./aggregate"
export { createOperations, type CreateUserOperations } from "./create"
export { deleteOperations, type DeleteUserOperations } from "./delete"
export { readOperations, type ReadUserOperations } from "./read"
export { updateOperations, type UpdateUserOperations } from "./update"