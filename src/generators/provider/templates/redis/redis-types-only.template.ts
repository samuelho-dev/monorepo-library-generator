/**
 * Redis Provider Types-Only Template
 *
 * Generates the src/types.ts file for Redis provider with correct flat lib/ paths.
 * This differs from the standard provider template which uses lib/service/ paths.
 *
 * @module monorepo-library-generator/provider/templates/redis/types-only
 */

import type { ProviderTemplateOptions } from "../../../../utils/types"

/**
 * Generate Redis provider types-only export file
 *
 * Unlike standard providers that use lib/service/ subdirectory,
 * Redis uses flat lib/ directory structure:
 * - lib/types.ts (not lib/service/types.ts)
 * - lib/errors.ts (not lib/service/errors.ts)
 * - lib/redis.ts (not lib/service/index.ts)
 */
export function generateRedisTypesOnlyFile(options: ProviderTemplateOptions) {
  const { packageName } = options

  return `/**
 * Type-Only Exports
 *
 * This file provides type-only exports for zero runtime overhead.
 * Use these imports when you only need types for TypeScript checking:
 *
 * @example
 * import type { RedisConfig, RedisCacheClient } from '${packageName}/types';
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
`
}
