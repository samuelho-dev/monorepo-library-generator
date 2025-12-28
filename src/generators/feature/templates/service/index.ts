/**
 * Feature Service Templates Index
 *
 * Exports all service template generators
 *
 * Note: auto-wire.template.ts is deprecated - use withEventPublishing/withJobEnqueuing
 * from infra-pubsub/infra-queue instead (Layer factories for event/job auto-wiring)
 *
 * @module monorepo-library-generator/feature/service-templates
 */

export { generateFeatureServiceFile } from './service.template'
export { generateFeatureServiceIndexFile } from './service-index.template'
