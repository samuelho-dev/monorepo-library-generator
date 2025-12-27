/**
 * Feature Template Definitions
 *
 * Declarative templates for feature library generation.
 * Complete set of 12 template definitions for feature libraries.
 *
 * @module monorepo-library-generator/templates/definitions/feature
 */

// Client templates
export { featureAtomsTemplate } from './atoms'
export { featureAtomsIndexTemplate } from './atoms-index'
// Shared templates
export { featureErrorsTemplate } from './errors'
export { featureHooksTemplate } from './hooks'
export { featureHooksIndexTemplate } from './hooks-index'
// Main barrel export
export { featureIndexTemplate } from './index-barrel'
// Server templates
export { featureLayersTemplate } from './layers'
export { featureRpcErrorsTemplate } from './rpc-errors'
export { featureSchemasTemplate } from './schemas'
export { featureServiceTemplate } from './service'
export { featureServiceSpecTemplate } from './service-spec'
export { featureTypesTemplate } from './types'
