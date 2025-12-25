/**
 * Type-Only Exports
 *
 * This file provides type-only exports for zero runtime overhead.
 * Use these imports when you only need types for TypeScript checking:
 *
 * @example
 * import type { Product } from '@samuelho-dev/contract-product/types';
 *
 * These imports are completely erased at compile time and add
 * zero bytes to your JavaScript bundle.
 */

// ============================================================================
// Entity Types
// ============================================================================

// Entity types from @samuelho-dev/types-database (prisma-effect-kysely generated)
export type { UserSelect, UserInsert, UserUpdate } from "@samuelho-dev/types-database";

// ID types are defined in rpc-definitions.ts (branded Schema types)
// They are re-exported via ./lib/rpc below

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
// ============================================================================
// RPC Types
// ============================================================================

export type * from "./lib/rpc";

