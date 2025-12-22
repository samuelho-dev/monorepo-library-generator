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
  type Database,
  DatabaseService,
} from "./lib/service/service";

// ============================================================================
// Error Types
// ============================================================================

// Error types for error handling
export {
  DatabaseConfigError,
  DatabaseConnectionError,
  type DatabaseError,
  DatabaseInternalError,
  DatabaseServiceError,
  DatabaseTimeoutError,
} from "./lib/service/errors";

// ============================================================================
// Additional Layers
// ============================================================================
