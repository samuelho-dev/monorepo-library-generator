/**
 * Data Access Layers Template
 *
 * Generates server/layers.ts file for data-access libraries with Effect layer compositions.
 * Uses the layer factory pattern for consistent, maintainable layer generation.
 *
 * @module monorepo-library-generator/data-access/layers-template
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import type { DataAccessTemplateOptions } from "../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"
import {
  createAutoLayer,
  createDomainLayers,
  createInfrastructureLayers,
  createLayerImports,
  INFRASTRUCTURE_SERVICES
} from "../../shared/factories"

/**
 * Generate server/layers.ts file for data-access library
 *
 * Creates Effect layer compositions with infrastructure dependencies.
 * Provides Live, Dev, Test, and Auto layers for all environments.
 */
export function generateLayersFile(options: DataAccessTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, propertyName } = options
  const domainName = propertyName
  const scope = WORKSPACE_CONFIG.getScope()

  // File header
  builder.addFileHeader({
    title: `${className} Data Access Layers`,
    description: `Effect layer compositions for ${domainName} data access.

Provides different layer implementations for different environments:
- Live: Production with all infrastructure
- Dev: Development with local infrastructure
- Test: Testing with in-memory/mock infrastructure
- Auto: Automatically selects based on NODE_ENV

Infrastructure included:
- DatabaseService: Data persistence
- LoggingService: Structured logging
- MetricsService: Observability
- CacheService: Read-through caching`,
    module: `${scope}/data-access-${fileName}/server`
  })
  builder.addBlankLine()

  // Generate imports using factory
  createLayerImports({
    scope,
    infrastructureServices: [...INFRASTRUCTURE_SERVICES.dataAccess],
    className,
    fileName,
    libraryType: "data-access"
  })(builder)

  // Generate infrastructure layers using factory
  createInfrastructureLayers({
    services: [...INFRASTRUCTURE_SERVICES.dataAccess],
    scope,
    includeDev: true
  })(builder)

  // Generate domain layers using factory
  createDomainLayers({
    className,
    domainServices: [`${className}Repository`],
    libraryType: "data-access",
    includeDev: true
  })(builder)

  // Generate auto layer using factory
  createAutoLayer({
    className,
    layerPrefix: "DataAccess",
    includeDev: true
  })(builder)

  return builder.toString()
}
