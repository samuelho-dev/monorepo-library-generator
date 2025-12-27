/**
 * Infrastructure Template Definitions
 *
 * Declarative templates for infrastructure library generation.
 * Complete set of 14 template definitions for infrastructure libraries.
 *
 * @module monorepo-library-generator/templates/definitions/infra
 */

// Layer templates
export { infraClientLayersTemplate } from "./client-layers"
// Core templates
export { infraConfigTemplate } from "./config"
// Database-specific template
export { infraDatabaseServiceTemplate } from "./database-service"
export { infraErrorsTemplate } from "./errors"
// Main barrel export
export { infraIndexTemplate } from "./index-barrel"
// Provider templates
export { infraMemoryProviderTemplate } from "./memory-provider"
// Provider consolidation templates
export { infraOrchestratorTemplate } from "./orchestrator"
export { infraProviderConsolidationTemplate } from "./provider-consolidation"
export { infraProviderConsolidationLayersTemplate } from "./provider-consolidation-layers"
export { infraServerLayersTemplate } from "./server-layers"
export { infraServiceTemplate } from "./service"
export { infraServiceSpecTemplate } from "./service-spec"
// Client templates
export { infraUseHookTemplate } from "./use-hook"
