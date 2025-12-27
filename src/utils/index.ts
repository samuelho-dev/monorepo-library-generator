/**
 * Utils - Consolidated Exports
 *
 * Single entry point for all utility modules.
 * Each module is now a flat file at the root of utils/.
 *
 * @module monorepo-library-generator/utils
 */

// Build - Build configuration, platforms, tsconfig, exports
export * from './build'
// Code Builder - TypeScriptBuilder and Effect pattern builders
export * from './code-builder'
// File Batch - Batch file operations
export * from './file-batch'
// Filesystem - All filesystem adapters (Effect, Tree)
export * from './filesystem'
// Generators - Generator utilities
export * from './generators'
// Infra-Provider Mapping - Maps infra concerns to providers
export * from './infra-provider-mapping'
// Infrastructure - Library infrastructure generation
export * from './infrastructure'
// Library Metadata - Library metadata computation
export * from './library-metadata'
// Naming - Naming convention utilities
export * from './naming'
// Sub-modules - Sub-module parsing utilities
export * from './sub-modules'
// Template Spans - Observability for template generation
export * from './template-spans'
// Templates - Template utilities, error templates, type templates, barrel exports
export * from './templates'
// Types - All type definitions
export * from './types'
// Workspace - Workspace detection and configuration
export * from './workspace-config'
export * from './workspace-detection'
