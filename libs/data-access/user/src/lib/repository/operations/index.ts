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

export { type AggregateUserOperations, aggregateOperations } from './aggregate'
export { type CreateUserOperations, createOperations } from './create'
export { type DeleteUserOperations, deleteOperations } from './delete'
export { type ReadUserOperations, readOperations } from './read'
export { type UpdateUserOperations, updateOperations } from './update'
