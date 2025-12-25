/**
 * Type-Only Exports
 *
 * This file provides type-only exports for zero runtime overhead.
 * Use these imports when you only need types for TypeScript checking:
 *
 * @example
 * import type { RedisConfig, RedisCacheClient } from '@samuelho-dev/provider-redis/types';
 *
 * These imports are completely erased at compile time and add
 * zero bytes to your JavaScript bundle.
 */

// ============================================================================
// Service Types
// ============================================================================

// Main Redis service interface and sub-service interfaces
export type * from "./lib/redis"

// ============================================================================
// Configuration Types
// ============================================================================

// RedisConfig, ScanOptions, ScanResult, sub-service interfaces
export type * from "./lib/types"

// ============================================================================
// Error Types
// ============================================================================

// RedisError, RedisConnectionError, RedisTimeoutError, etc.
export type * from "./lib/errors"
