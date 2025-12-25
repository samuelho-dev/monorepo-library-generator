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
export { DatabaseService } from "./lib/service"
export type { Database } from "./lib/service"

// ============================================================================
// Error Types
// ============================================================================
// Error types for error handling
export {
  DatabaseInternalError,
  DatabaseConfigError,
  DatabaseConnectionError,
  DatabaseTimeoutError,
} from "./lib/errors"
export type { DatabaseError, DatabaseServiceError } from "./lib/errors"

// ============================================================================
// Additional Layers
// ============================================================================