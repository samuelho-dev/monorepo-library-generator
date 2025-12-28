/**
 * @samuelho-dev/infra-database
 *
 * Database infrastructure service

Provides Database functionality using Effect primitives.
Layers are available as static members on the service class.
 *
 * @module @samuelho-dev/infra-database
 */
// ============================================================================
// Service and Types
// ============================================================================
// Service with static layers (Memory, Test, Live)

export type { DatabaseError, DatabaseServiceError } from './lib/errors'
// ============================================================================
// Error Types
// ============================================================================
// Error types for error handling
export {
  DatabaseConfigError,
  DatabaseConnectionError,
  DatabaseInternalError,
  DatabaseTimeoutError
} from './lib/errors'
export type { Database } from './lib/service'
export { DatabaseService } from './lib/service'

// ============================================================================
// Additional Layers
// ============================================================================
