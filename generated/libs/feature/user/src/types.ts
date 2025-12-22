/**
 * Type-Only Exports
 *
 * This file provides type-only exports for zero runtime overhead.
 * Use these imports when you only need types for TypeScript checking:
 *
 * @example
 * import type { UserData, UserServiceInterface } from '@myorg/feature-user/types';
 *
 * These imports are completely erased at compile time and add
 * zero bytes to your JavaScript bundle.
 */

// ============================================================================
// Shared Types
// ============================================================================

export type * from "./lib/shared/types";

// ============================================================================
// Error Types
// ============================================================================

export type * from "./lib/shared/errors";

// ============================================================================
// Server Types
// ============================================================================

// Service interface types
export type * from "./lib/server/service/service";
