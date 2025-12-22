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
 * @module @myorg/data-access-user/repository/operations
 */


// ============================================================================
// Re-export all operations
// ============================================================================


// Create operations
export type { CreateUserOperations } from "./create"
export { createOperations } from "./create"

// Read operations
export type { ReadUserOperations } from "./read"
export { readOperations } from "./read"

// Update operations
export type { UpdateUserOperations } from "./update"
export { updateOperations } from "./update"

// Delete operations
export type { DeleteUserOperations } from "./delete"
export { deleteOperations } from "./delete"

// Aggregate operations
export type { AggregateUserOperations } from "./aggregate"
export { aggregateOperations } from "./aggregate"