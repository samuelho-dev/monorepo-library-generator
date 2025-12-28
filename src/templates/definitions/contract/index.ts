/**
 * Contract Template Definitions
 *
 * Declarative templates for contract library generation.
 * Complete set of 15 template definitions for contract libraries.
 *
 * @module monorepo-library-generator/templates/definitions/contract
 */

// CQRS templates
export { contractCommandsTemplate } from './commands'
// Core templates (already wired)
export { contractErrorsTemplate } from './errors'
export { contractEventsTemplate } from './events'
// Barrel/export templates
export { contractIndexTemplate } from './index-barrel'
export { contractPortsTemplate } from './ports'
export { contractProjectionsTemplate } from './projections'
export { contractQueriesTemplate } from './queries'
// RPC templates
export { contractRpcDefinitionsTemplate } from './rpc-definitions'
export { contractRpcGroupTemplate } from './rpc-group'
// Sub-module templates
export { contractSubmoduleEntitiesTemplate } from './submodule-entities'
export { contractSubmoduleErrorsTemplate } from './submodule-errors'
export { contractSubmoduleEventsTemplate } from './submodule-events'
export { contractSubmoduleIndexTemplate } from './submodule-index'
export { contractSubmoduleRpcDefinitionsTemplate } from './submodule-rpc-definitions'
export { contractTypesOnlyTemplate } from './types-only'
