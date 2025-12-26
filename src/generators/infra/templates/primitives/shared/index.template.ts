/**
 * Primitive Index Template
 *
 * Generates index.ts for primitive infrastructure services (cache, queue, pubsub, etc.).
 * These services have static layers on the service class and use specialized templates.
 *
 * @module monorepo-library-generator/infra-templates/primitives/shared
 */

import { TypeScriptBuilder } from "../../../../../utils/code-builder"
import { detectInfraConcern } from "../../../../../utils/infra-provider-mapping"
import type { InfraTemplateOptions } from "../../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../../utils/workspace-config"

/**
 * Generate index.ts file for primitive infrastructure services
 */
export function generatePrimitiveIndexFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, name } = options
  const scope = WORKSPACE_CONFIG.getScope()
  const concern = detectInfraConcern(name)

  builder.addFileHeader({
    title: `${scope}/infra-${fileName}`,
    description: `${className} infrastructure service

Provides ${className} functionality using Effect primitives.
Layers are available as static members on the service class.`,
    module: `${scope}/infra-${fileName}`
  })

  builder.addSectionComment("Service and Types")

  // Determine what to export from service based on concern type
  const typeExports = getServiceTypeExports(className, concern)

  builder.addRaw(`// Service with static layers (Memory, Test, Live)
export { ${className}Service } from "./lib/service"
${typeExports ? `export type { ${typeExports} } from "./lib/service"` : ""}
`)

  builder.addSectionComment("Error Types")

  builder.addRaw(`// Error types for error handling
export {
  ${className}InternalError,
  ${className}ConfigError,
  ${className}ConnectionError,
  ${className}TimeoutError,
} from "./lib/errors"
export type { ${className}Error, ${className}ServiceError } from "./lib/errors"
`)

  builder.addSectionComment("Additional Layers")

  // Add concern-specific layer exports
  const layerExport = getLayerExport(className, concern)
  if (layerExport) {
    builder.addRaw(layerExport)
  }

  return builder.toString()
}

/**
 * Get service-specific type exports based on concern type
 * Returns type names for export type { ... } syntax (verbatimModuleSyntax compatible)
 */
function getServiceTypeExports(className: string, concern: string) {
  switch (concern) {
    case "cache":
      return "CacheHandle, SimpleCacheHandle"

    case "database":
      return "Database"

    case "queue":
      return "BoundedQueueHandle, QueueOptions, UnboundedQueueHandle"

    case "pubsub":
      return "TopicHandle, TopicOptions"

    case "logging":
      return `${className}Operations, LogContext`

    case "metrics":
      return "CounterHandle, GaugeHandle, HistogramHandle, MetricOptions"

    default:
      return ""
  }
}

/**
 * Get layer export based on concern type
 * Layers are now at lib/layers.ts (not in a subdirectory)
 */
function getLayerExport(className: string, concern: string) {
  switch (concern) {
    case "cache":
      return `// Redis-backed distributed layer
export { ${className}RedisLayer } from "./lib/layers"
`

    case "queue":
      return `// Redis-backed distributed layer
export {
  ${className}RedisLayer,
  withJobEnqueuing
} from "./lib/layers"
`

    case "pubsub":
      return `// Redis-backed distributed layer
export {
  ${className}RedisLayer,
  withEventPublishing
} from "./lib/layers"
`

    case "logging":
      return `// OpenTelemetry integration
export {
  make${className}OtelLayer,
  withMinLogLevel,
  LogLevelConfigs
} from "./lib/layers"
export type { OtelLoggingConfig } from "./lib/layers"
`

    case "metrics":
      return `// OpenTelemetry integration
export {
  make${className}OtelLayer,
  HistogramBoundaries,
  StandardMetricNames
} from "./lib/layers"
export type { OtelMetricsConfig } from "./lib/layers"
`

    default:
      return null
  }
}
