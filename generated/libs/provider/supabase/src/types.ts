/**
 * Type-Only Exports
 *
 * This file provides type-only exports for zero runtime overhead.
 * Use these imports when you only need types for TypeScript checking:
 *
 * @example
 * import type { CacheItem, CacheServiceInterface } from '@myorg/provider-supabase/types';
 *
 * These imports are completely erased at compile time and add
 * zero bytes to your JavaScript bundle.
 */

// ============================================================================
// Service Types
// ============================================================================

export type * from "./lib/service/index";

// ============================================================================
// Shared Types
// ============================================================================

export type * from "./lib/types";

// ============================================================================
// Error Types
// ============================================================================

export type * from "./lib/errors";
