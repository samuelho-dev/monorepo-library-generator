/**
 * Infrastructure Index Barrel Template Definition
 *
 * Declarative template for generating index.ts in infrastructure libraries.
 * Main library entry point.
 *
 * @module monorepo-library-generator/templates/definitions/infra/index-barrel
 */

import type { TemplateDefinition } from '../../core/types'

/**
 * Infrastructure Index Barrel Template Definition
 *
 * Generates the main index.ts file with:
 * - Service interface export
 * - Configuration exports
 * - Layer exports
 * - Error exports
 */
export const infraIndexTemplate: TemplateDefinition = {
  id: 'infra/index-barrel',
  meta: {
    title: '{scope}/infra-{fileName}',
    description: `{className} infrastructure service
Provides {className} functionality for the application.`,
    module: '{scope}/infra-{fileName}'
  },
  imports: [],
  sections: [
    // Server-Only Mode
    {
      title: 'Server-Only Mode: Export Everything from Root',
      content: {
        type: 'raw',
        value: `// Service interface and layers
export { {className}Service } from "./lib/service"
export type { {className}Config } from "./lib/config"
export { default{className}Config, get{className}ConfigForEnvironment } from "./lib/config"

// Primary layers are static members of {className}Service:
// - {className}Service.Live (production)
// - {className}Service.Test (testing)
// Additional layers:
export { {className}ServiceDev } from "./lib/layers"

// Error types
export {
  {className}Error,
  {className}NotFoundError,
  {className}ValidationError,
  {className}ConflictError,
  {className}ConfigError,
  {className}ConnectionError,
  {className}TimeoutError,
  {className}InternalError
} from "./lib/errors"
export type { {className}ServiceError } from "./lib/errors"`
      }
    }
  ],
  conditionals: {
    includeClientServer: [
      // Universal Mode
      {
        title: 'Universal Mode: Export Only Types and Interfaces from Root',
        content: {
          type: 'raw',
          value: `// Service interface (universal)
export { {className}Service } from "./lib/service"
export type { {className}Config } from "./lib/config"

// Configuration (universal)
export { default{className}Config, get{className}ConfigForEnvironment } from "./lib/config"

// Error types (universal)
export {
  {className}Error,
  {className}NotFoundError,
  {className}ValidationError,
  {className}ConflictError,
  {className}ConfigError,
  {className}ConnectionError,
  {className}TimeoutError,
  {className}InternalError
} from "./lib/errors"
export type { {className}ServiceError } from "./lib/errors"

// NOTE: Layers are exported from client.ts and server.ts separately`
        }
      }
    ]
  }
}

export default infraIndexTemplate
