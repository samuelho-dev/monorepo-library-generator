/**
 * User Authentication Sub-Module
 *
 * Barrel export for authentication sub-module within the user feature.

Exports all public API for the sub-module:
- AuthenticationService (Context.Tag)
- AuthenticationLive / AuthenticationTest (composed layers)
- AuthenticationHandlers (RPC handler implementations)
- Error types and interfaces

NOTE: State is managed by parent User atoms.
 *
 * @module @samuelho-dev/feature-user/server/services/authentication
 */


// ============================================================================
// Service Exports
// ============================================================================

export {
  // Context.Tag
  AuthenticationService,
  // Live layer implementation
  AuthenticationServiceLive,
  // Service interface type
  type AuthenticationServiceInterface,
  // Error type
  AuthenticationServiceError,
} from "./service";

// ============================================================================
// Composed Layer Exports
// ============================================================================

export {
  // Full production layer
  AuthenticationLive,
  // Test layer with mocks
  AuthenticationTest,
  // Dependencies layer for parent composition
  AuthenticationDependencies,
} from "./layer";

// ============================================================================
// RPC Handler Exports
// ============================================================================

export { AuthenticationHandlers } from "./handlers";
