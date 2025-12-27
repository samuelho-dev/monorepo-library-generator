/**
 * User Authentication Sub-Module
 *
 * Contract definitions for the authentication sub-module of the user domain.

This sub-module contains:
- Errors: Authentication-specific domain errors (SINGLE SOURCE OF TRUTH)
- Entities: Authentication-specific domain entities
- Events: Authentication-specific domain events
- RPC: Authentication-specific RPC definitions with prefixed operations

CONTRACT-FIRST ARCHITECTURE:
Errors defined here are the SINGLE SOURCE OF TRUTH.
Data-access and feature layers should import these errors.

Usage:
```typescript
import {
  AuthenticationNotFoundError,
  AuthenticationItem,
  AuthenticationAddItem
} from "@samuelho-dev/contract-user/authentication";
```
 *
 * @module @samuelho-dev/contract-user/authentication
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
  type AuthenticationDomainError,
  type AuthenticationError,
  AuthenticationNotFoundError,
  AuthenticationOperationError,
  type AuthenticationRepositoryError,
  AuthenticationValidationError
} from "./errors"

// ============================================================================
// Entity Exports
// ============================================================================
export {
  Authentication,
  AuthenticationId,
  AuthenticationItem,
  encodeAuthentication,
  parseAuthentication,
  parseAuthenticationItem
} from "./entities"

// ============================================================================
// Event Exports
// ============================================================================
export {
  AuthenticationCreated,
  AuthenticationDeleted,
  type AuthenticationEvent,
  AuthenticationEvents,
  AuthenticationUpdated
} from "./events"

// ============================================================================
// RPC Exports
// ============================================================================
export {
  AuthenticationCreate,
  AuthenticationDelete,
  AuthenticationGet,
  AuthenticationList,
  AuthenticationRpcs,
  AuthenticationRpcsByRoute,
  AuthenticationUpdate,
  CreateAuthenticationInput,
  UpdateAuthenticationInput
} from "./rpc-definitions"

export {
  AuthenticationNotFoundRpcError,
  AuthenticationPermissionRpcError,
  AuthenticationRpcError,
  AuthenticationValidationRpcError
} from "./rpc-errors"
