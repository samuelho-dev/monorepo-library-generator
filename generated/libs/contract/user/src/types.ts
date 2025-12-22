/**
 * Type-Only Exports
 *
 * This file provides type-only exports for zero runtime overhead.
 * Use these imports when you only need types for TypeScript checking:
 *
 * @example
 * import type { Product } from '@myorg/contract-product/types';
 *
 * These imports are completely erased at compile time and add
 * zero bytes to your JavaScript bundle.
 */

// ============================================================================
// Entity Types
// ============================================================================

// Entity types from database schema
export type { User, UserId, UserInsert, UserUpdate } from "./lib/types/database";

// ============================================================================
// Error Types
// ============================================================================

export type * from "./lib/errors";

// ============================================================================
// Port Types
// ============================================================================

export type * from "./lib/ports";

// ============================================================================
// Event Types
// ============================================================================

export type * from "./lib/events";

