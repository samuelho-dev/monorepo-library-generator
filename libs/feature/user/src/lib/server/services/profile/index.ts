/**
 * User Profile Sub-Module
 *
 * Barrel export for profile sub-module within the user feature.

Exports all public API for the sub-module:
- ProfileService (Context.Tag)
- ProfileLive / ProfileTest (composed layers)
- ProfileHandlers (RPC handler implementations)
- Error types and interfaces

NOTE: State is managed by parent User atoms.
 *
 * @module @samuelho-dev/feature-user/server/services/profile
 */


// ============================================================================
// Service Exports
// ============================================================================

export {
  // Context.Tag
  ProfileService,
  // Live layer implementation
  ProfileServiceLive,
  // Service interface type
  type ProfileServiceInterface,
  // Error type
  ProfileServiceError,
} from "./service";

// ============================================================================
// Composed Layer Exports
// ============================================================================

export {
  // Full production layer
  ProfileLive,
  // Test layer with mocks
  ProfileTest,
  // Dependencies layer for parent composition
  ProfileDependencies,
} from "./layer";

// ============================================================================
// RPC Handler Exports
// ============================================================================

export { ProfileHandlers } from "./handlers";
