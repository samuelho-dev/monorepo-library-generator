/**
 * User Repository
 *
 * Complete repository implementation with granular operation exports.

Import options (from most optimal to most convenient):

1. Granular (smallest bundle):
   import { createOperations } from '@scope/data-access-user/repository/operations/create'

2. Operation category:
   import { createOperations, readOperations } from '@scope/data-access-user/repository/operations'

3. Full repository:
   import { UserRepository } from '@scope/data-access-user/repository'

4. Package barrel (largest bundle):
   import { UserRepository } from '@scope/data-access-user'
 *
 * @module @myorg/data-access-user/repository
 */

// ============================================================================
// Re-export repository interface and tag
// ============================================================================

export type { UserRepositoryInterface } from "./repository";
export { UserRepository } from "./repository";

// ============================================================================
// Re-export all operations
// ============================================================================

export type {
  AggregateUserOperations,
  CreateUserOperations,
  DeleteUserOperations,
  ReadUserOperations,
  UpdateUserOperations,
} from "./operations";

export {
  aggregateOperations,
  createOperations,
  deleteOperations,
  readOperations,
  updateOperations,
} from "./operations";
