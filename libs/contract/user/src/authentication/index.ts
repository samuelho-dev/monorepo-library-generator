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
