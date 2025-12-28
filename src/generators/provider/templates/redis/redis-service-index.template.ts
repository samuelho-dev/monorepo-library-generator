/**
 * Redis Service Index Template
 *
 * Generates the barrel export for the Redis provider service directory.
 *
 * @module monorepo-library-generator/provider/templates/redis/service-index
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder'
import type { ProviderTemplateOptions } from '../../../../utils/types'

/**
 * Generate Redis service index.ts file
 */
export function generateRedisServiceIndexFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { packageName } = options

  builder.addFileHeader({
    title: 'Redis Service - Barrel Export',
    description: `Service directory exports for Redis provider.

Exports:
- Redis: Main service Context.Tag with Live/Test/Dev layers
- RedisServiceInterface: Service interface type
- Sub-services: cache, pubsub, queue factories
- Errors: All Redis error types
- Types: Configuration and interface types`,
    module: `${packageName}/service`
  })
  builder.addBlankLine()

  // Main service export
  builder.addSectionComment('Main Service')
  builder.addBlankLine()

  builder.addRaw(`export {
  Redis,
  RedisService,
  type RedisServiceInterface,
} from "./service"`)
  builder.addBlankLine()

  // Sub-service factories
  builder.addSectionComment('Sub-Service Factories')
  builder.addBlankLine()

  builder.addRaw(`export { makeCacheClient } from "./cache"
export { makePubSubClient } from "./pubsub"
export { makeQueueClient } from "./queue"`)
  builder.addBlankLine()

  // Error exports
  builder.addSectionComment('Errors')
  builder.addBlankLine()

  builder.addRaw(`export {
  RedisError,
  RedisConnectionError,
  RedisTimeoutError,
  RedisCommandError,
  RedisKeyError,
  RedisPubSubError,
  mapRedisError,
} from "./errors"
export type { RedisProviderError } from "./errors"`)
  builder.addBlankLine()

  // Type exports
  builder.addSectionComment('Types')
  builder.addBlankLine()

  builder.addRaw(`export type {
  RedisConfig,
  ScanOptions,
  ScanResult,
  RedisCacheClient,
  RedisPubSubClient,
  RedisQueueClient,
} from "./types"

export { RedisConfigSchema } from "./types"`)

  return builder.toString()
}
