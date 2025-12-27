/**
 * User Profile Sub-Module
 *
 * Contract definitions for the profile sub-module of the user domain.

This sub-module contains:
- Errors: Profile-specific domain errors (SINGLE SOURCE OF TRUTH)
- Entities: Profile-specific domain entities
- Events: Profile-specific domain events
- RPC: Profile-specific RPC definitions with prefixed operations

CONTRACT-FIRST ARCHITECTURE:
Errors defined here are the SINGLE SOURCE OF TRUTH.
Data-access and feature layers should import these errors.

Usage:
```typescript
import {
  ProfileNotFoundError,
  ProfileItem,
  ProfileAddItem
} from "@samuelho-dev/contract-user/profile";
```
 *
 * @module @samuelho-dev/contract-user/profile
 */

// ============================================================================
// Parent Entity Re-Export
// ============================================================================
// Sub-modules use parent entity type - re-export for convenience
export type { UserEntity } from "../lib/rpc-definitions"

// ============================================================================
// Error Exports (Contract-First)
// ============================================================================
// Errors are the SINGLE SOURCE OF TRUTH - data-access and feature layers import these
export {
  type ProfileDomainError,
  type ProfileError,
  ProfileNotFoundError,
  ProfileOperationError,
  type ProfileRepositoryError,
  ProfileValidationError
} from "./errors"

// ============================================================================
// Entity Exports
// ============================================================================
export { encodeProfile, parseProfile, parseProfileItem, Profile, ProfileId, ProfileItem } from "./entities"

// ============================================================================
// Event Exports
// ============================================================================
export { ProfileCreated, ProfileDeleted, type ProfileEvent, ProfileEvents, ProfileUpdated } from "./events"

// ============================================================================
// RPC Exports
// ============================================================================
export {
  CreateProfileInput,
  ProfileCreate,
  ProfileDelete,
  ProfileGet,
  ProfileList,
  ProfileRpcs,
  ProfileRpcsByRoute,
  ProfileUpdate,
  UpdateProfileInput
} from "./rpc-definitions"

export {
  ProfileNotFoundRpcError,
  ProfilePermissionRpcError,
  ProfileRpcError,
  ProfileValidationRpcError
} from "./rpc-errors"
