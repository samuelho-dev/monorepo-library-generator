/**
 * Type-Only Exports
 *
 * This file provides type-only exports for zero runtime overhead.
 * Use these imports when you only need types for TypeScript checking:
 *
 * @example
 * import type { KyselyConfig, DatabaseError } from '@samuelho-dev/provider-kysely/types';
 *
 * These imports are completely erased at compile time and add
 * zero bytes to your JavaScript bundle.
 */

// ============================================================================
// Error Types
// ============================================================================

export type * from './lib/errors'

// ============================================================================
// Service Types
// ============================================================================

export type { KyselyServiceInterface } from './lib/interface'
export type { KyselyConfig, MockServiceOptions } from './lib/service'
