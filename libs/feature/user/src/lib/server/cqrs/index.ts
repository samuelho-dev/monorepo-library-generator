/**
 * User CQRS Index
 *
 * Barrel export for user CQRS patterns.

CQRS (Command Query Responsibility Segregation) separates
read and write operations for scalability and clarity.

Structure:
- commands/ - Write operations (state changes)
- queries/ - Read operations (data retrieval)
- operations/ - Middleware-enabled execution
- projections/ - Read model maintenance
 *
 * @module @samuelho-dev/feature-user/server/cqrs
 */

export type { CommandBusInterface } from './commands'
// ============================================================================
// Commands
// ============================================================================
export { Command, UserCommandBus } from './commands'
export type { Middleware, OperationExecutorInterface, OperationMetadata } from './operations'
// ============================================================================
// Operations
// ============================================================================
export {
  createRetryMiddleware,
  createValidationMiddleware,
  UserOperationExecutor
} from './operations'
export type {
  ProjectionBuilderInterface,
  ProjectionDefinition,
  ProjectionHandler,
  ReadModelStore,
  UserReadModel
} from './projections'
// ============================================================================
// Projections
// ============================================================================
export { UserProjectionBuilder } from './projections'
export type { QueryBusInterface } from './queries'
// ============================================================================
// Queries
// ============================================================================
export { Query, UserQueryBus } from './queries'
