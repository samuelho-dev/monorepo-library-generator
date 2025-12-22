/**
 * @myorg/infra-database
 *
 * Database infrastructure service

Provides Database functionality using Effect primitives.
Layers are available as static members on the service class.
 *
 * @module @myorg/infra-database
 */

// ============================================================================
// Service and Types
// ============================================================================

// Service with static layers (Memory, Test, Live)
export {
  DatabaseService,
  type Database
} from "./lib/service/service"

// ============================================================================
// Error Types
// ============================================================================

// Error types for error handling
export {
  DatabaseServiceError,
  DatabaseInternalError,
  DatabaseConfigError,
  DatabaseConnectionError,
  DatabaseTimeoutError,
  type DatabaseError
} from "./lib/service/errors"

// ============================================================================
// Additional Layers
// ============================================================================
