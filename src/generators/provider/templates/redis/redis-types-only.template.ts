/**
 * Redis Provider Types-Only Template
 *
 * Generates the src/types.ts file for Redis provider with correct flat lib/ paths.
 * This differs from the standard provider template which uses lib/service/ paths.
 *
 * @module monorepo-library-generator/provider/templates/redis/types-only
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
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

  const builder = new TypeScriptBuilder()

  // File header
  builder.addFileHeader({
    title: "Type-Only Exports",
    description: `This file provides type-only exports for zero runtime overhead.
 * Use these imports when you only need types for TypeScript checking:
 *
 * @example
 * import type { RedisConfig, RedisCacheClient } from '${packageName}/types';
 *
 * These imports are completely erased at compile time and add
 * zero bytes to your JavaScript bundle.`
  })

  builder.addBlankLine()

  // Service Types Section
  builder.addSectionComment("Service Types")
  builder.addBlankLine()
  builder.addComment("Main Redis service interface and sub-service interfaces")
  builder.addRaw("export type * from \"./lib/redis\"")

  builder.addBlankLine()

  // Configuration Types Section
  builder.addSectionComment("Configuration Types")
  builder.addBlankLine()
  builder.addComment("RedisConfig, ScanOptions, ScanResult, sub-service interfaces")
  builder.addRaw("export type * from \"./lib/types\"")

  builder.addBlankLine()

  // Error Types Section
  builder.addSectionComment("Error Types")
  builder.addBlankLine()
  builder.addComment("RedisError, RedisConnectionError, RedisTimeoutError, etc.")
  builder.addRaw("export type * from \"./lib/errors\"")

  builder.addBlankLine()

  return builder.toString()
}
