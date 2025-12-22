/**
 * Primitive Index Template
 *
 * Generates index.ts for primitive infrastructure services (cache, queue, pubsub, etc.).
 * These services have static layers on the service class and use specialized templates.
 *
 * @module monorepo-library-generator/infra-templates/primitives/shared
 */

import { TypeScriptBuilder } from '../../../../../utils/code-builder';
import { detectInfraConcern } from '../../../../../utils/infra-provider-mapping';
import type { InfraTemplateOptions } from '../../../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../../../utils/workspace-config';

/**
 * Generate index.ts file for primitive infrastructure services
 */
export function generatePrimitiveIndexFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName, name } = options;
  const scope = WORKSPACE_CONFIG.getScope();
  const concern = detectInfraConcern(name);

  builder.addFileHeader({
    title: `${scope}/infra-${fileName}`,
    description: `${className} infrastructure service

Provides ${className} functionality using Effect primitives.
Layers are available as static members on the service class.`,
    module: `${scope}/infra-${fileName}`,
  });

  builder.addSectionComment('Service and Types');

  // Determine what to export from service based on concern type
  const serviceExports = getServiceExports(className, concern);

  builder.addRaw(`// Service with static layers (Memory, Test, Live)
export {
  ${className}Service,
${serviceExports}
} from "./lib/service/service"
`);

  builder.addSectionComment('Error Types');

  builder.addRaw(`// Error types for error handling
export {
  ${className}ServiceError,
  ${className}InternalError,
  ${className}ConfigError,
  ${className}ConnectionError,
  ${className}TimeoutError,
  type ${className}Error
} from "./lib/service/errors"
`);

  builder.addSectionComment('Additional Layers');

  // Add concern-specific layer exports
  const layerExport = getLayerExport(className, concern);
  if (layerExport) {
    builder.addRaw(layerExport);
  }

  return builder.toString();
}

/**
 * Get service-specific exports based on concern type
 */
function getServiceExports(className: string, concern: string) {
  switch (concern) {
    case 'cache':
      return `  type CacheHandle,
  type SimpleCacheHandle`;

    case 'database':
      return `  type Database`;

    case 'queue':
      return `  type BoundedQueueHandle,
  type UnboundedQueueHandle,
  type QueueOptions`;

    case 'pubsub':
      return `  type TopicHandle,
  type TopicOptions`;

    case 'logging':
      return `  type LogContext,
  type ${className}Operations`;

    case 'metrics':
      return `  type CounterHandle,
  type GaugeHandle,
  type HistogramHandle,
  type MetricOptions`;

    default:
      return '';
  }
}

/**
 * Get layer export based on concern type
 */
function getLayerExport(className: string, concern: string) {
  switch (concern) {
    case 'cache':
      return `// Redis-backed distributed layer
export {
  ${className}RedisLayer,
  RedisClientTag,
  type RedisClient
} from "./lib/layers/redis-layer"
`;

    case 'queue':
      return `// Redis-backed distributed layer
export {
  ${className}RedisLayer,
  RedisQueueClientTag,
  type RedisQueueClient
} from "./lib/layers/redis-layer"
`;

    case 'pubsub':
      return `// Redis-backed distributed layer
export {
  ${className}RedisLayer,
  RedisPubSubClientTag,
  type RedisPubSubClient
} from "./lib/layers/redis-layer"
`;

    case 'logging':
      return `// OpenTelemetry integration
export {
  make${className}OtelLayer,
  withMinLogLevel,
  LogLevelConfigs,
  type OtelLoggingConfig
} from "./lib/layers/otel-layer"
`;

    case 'metrics':
      return `// OpenTelemetry integration
export {
  make${className}OtelLayer,
  HistogramBoundaries,
  StandardMetricNames,
  type OtelMetricsConfig
} from "./lib/layers/otel-layer"
`;

    default:
      return null;
  }
}
