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
// Error Exports (Contract-First)
// ============================================================================
// Errors are the SINGLE SOURCE OF TRUTH - data-access and feature layers import these
export {
  ProfileNotFoundError,
  ProfileValidationError,
  ProfileOperationError,
  type ProfileDomainError,
  type ProfileRepositoryError,
  type ProfileError
} from "./errors"

// ============================================================================
// Entity Exports
// ============================================================================
export {
  ProfileId,
  Profile,
  ProfileItem,
  parseProfile,
  encodeProfile,
  parseProfileItem
} from "./entities"

// ============================================================================
// Event Exports
// ============================================================================
export {
  ProfileCreated,
  ProfileUpdated,
  ProfileDeleted,
  ProfileEvents,
  type ProfileEvent
} from "./events"

// ============================================================================
// RPC Exports
// ============================================================================
export {
  RouteTag,
  type RouteType,
  CreateProfileInput,
  UpdateProfileInput,
  ProfileGet,
  ProfileList,
  ProfileCreate,
  ProfileUpdate,
  ProfileDelete,
  ProfileRpcs,
  ProfileRpcsByRoute
} from "./rpc-definitions"

export {
  ProfileNotFoundRpcError,
  ProfileValidationRpcError,
  ProfilePermissionRpcError,
  ProfileRpcError
} from "./rpc-errors"
