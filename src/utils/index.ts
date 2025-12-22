/**
 * Utils - Consolidated Exports
 *
 * Single entry point for all utility modules.
 * Each module is now a flat file at the root of utils/.
 *
 * @module monorepo-library-generator/utils
 */

// Types - All type definitions
export * from './types';

// Build - Build configuration, platforms, tsconfig, exports
export * from './build';

// Filesystem - All filesystem adapters (Effect, Tree, dotfile generation)
export * from './filesystem';

// Templates - Template utilities, error templates, type templates, barrel exports
export * from './templates';

// Code Builder - TypeScriptBuilder and EffectPatterns
export * from './code-builder';

// Dotfiles - Dotfile management and file splitter utilities
export * from './dotfiles';

// Naming - Naming convention utilities
export * from './naming';

// Workspace - Workspace detection and configuration
export * from './workspace-config';
export * from './workspace-detection';

// Generators - Generator utilities
export * from './generators';

// Infrastructure - Library infrastructure generation
export * from './infrastructure';

// Library Metadata - Library metadata computation
export * from './library-metadata';

// Infra-Provider Mapping - Maps infra concerns to providers
export * from './infra-provider-mapping';
