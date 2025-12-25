/**
 * Type-Only Exports
 *
 * This file provides type-only exports for zero runtime overhead.
 * Use these imports when you only need types for TypeScript checking:
 *
 * @example
 * import type { CacheItem, CacheServiceInterface } from '@samuelho-dev/provider-kysely/types';
 *
 * These imports are completely erased at compile time and add
 * zero bytes to your JavaScript bundle.
 */

// ============================================================================
// Service Internals (types, errors, validation)
// ============================================================================

// Types and errors are in lib/service/ subdirectory
export type * from "./lib/service/index";
export type * from "./lib/service/types";
export type * from "./lib/service/errors";
