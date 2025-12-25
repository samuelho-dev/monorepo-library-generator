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

export * from "./errors";

// ============================================================================
// Entity Exports
// ============================================================================

export * from "./entities";

// ============================================================================
// Event Exports
// ============================================================================

export * from "./events";

// ============================================================================
// RPC Exports
// ============================================================================

export * from "./rpc-definitions";
export * from "./rpc-errors";
