/**
 * Type-Only Exports
 *
 * This file provides type-only exports for zero runtime overhead.
 * Use these imports when you only need types for TypeScript checking:
 *
 * @example
 * import type { ServiceConfig } from '@samuelho-dev/provider-supabase/types';
 *
 * These imports are completely erased at compile time and add
 * zero bytes to your JavaScript bundle.
 */

// ============================================================================
// Service Internals (types, errors)
// ============================================================================

// Types and errors are in lib/ directory (flat structure)
export type * from "./lib/errors"
export type * from "./lib/types"
