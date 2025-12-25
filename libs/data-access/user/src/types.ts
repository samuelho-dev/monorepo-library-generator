/**
 * Type-Only Exports
 *
 * This file provides type-only exports for zero runtime overhead.
 * Use these imports when you only need types for TypeScript checking:
 *
 * @example
 * import type { User, UserCreateInput } from '@samuelho-dev/data-access-user/types';
 *
 * These imports are completely erased at compile time and add
 * zero bytes to your JavaScript bundle.
 */

// ============================================================================
// Repository Types
// ============================================================================

export type * from "./lib/repository"

// ============================================================================
// Shared Types
// ============================================================================

export type * from "./lib/shared/types"

// ============================================================================
// Error Types
// ============================================================================

export type * from "./lib/shared/errors"

// ============================================================================
// Validation Types
// ============================================================================

export type * from "./lib/shared/validation"
