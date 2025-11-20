/**
 * Contract Generator Configuration
 *
 * Defines the configuration and template mappings for contract library generation.
 * Contract libraries contain domain interfaces, ports, entities, errors, and events.
 *
 * @module monorepo-library-generator/contract-config
 */

import type {
  GeneratorConfig,
  ContractTemplateOptions,
} from '../../utils/shared/types';
import {
  PLATFORM_EXPORTS,
  DEFAULT_LIBRARY_TAGS,
} from '../../utils/shared/base-config';

/**
 * Contract generator configuration
 *
 * Defines which files are generated and under what conditions
 */
export const ContractGeneratorConfig: GeneratorConfig<ContractTemplateOptions> =
  {
    libraryType: 'contract',

    /**
     * Files always generated for every contract library
     */
    defaultFiles: [
      'errors.ts',
      'entities.ts',
      'ports.ts',
      'events.ts',
      'index.ts',
    ],

    /**
     * Files generated based on feature flags
     */
    conditionalFiles: {
      includeCQRS: ['commands.ts', 'queries.ts', 'projections.ts'],
      includeRPC: ['rpc.ts'],
    },

    /**
     * Template functions are imported directly in the orchestrator
     * This field is kept for documentation purposes
     */
    templates: {} as any,

    /**
     * Contract libraries are universal - no platform-specific exports
     * They define interfaces/types that can be used anywhere
     */
    platformExports: PLATFORM_EXPORTS.universal,

    /**
     * Default tags for contract libraries
     */
    defaultTags: DEFAULT_LIBRARY_TAGS.contract,
  };

/**
 * Get list of files to generate based on options
 */
export function getFilesToGenerate(options: ContractTemplateOptions): string[] {
  const files = [...ContractGeneratorConfig.defaultFiles];

  // Add CQRS files if requested
  if (
    options.includeCQRS &&
    ContractGeneratorConfig.conditionalFiles?.includeCQRS
  ) {
    files.push(...ContractGeneratorConfig.conditionalFiles.includeCQRS);
  }

  // Add RPC file if requested
  if (
    options.includeRPC &&
    ContractGeneratorConfig.conditionalFiles?.includeRPC
  ) {
    files.push(...ContractGeneratorConfig.conditionalFiles.includeRPC);
  }

  return files;
}

/**
 * Validate contract generator options
 */
export function validateContractOptions(
  options: ContractTemplateOptions,
): void {
  if (!options.className || options.className.length === 0) {
    throw new Error('className is required');
  }

  if (!/^[A-Z][a-zA-Z0-9]*$/.test(options.className)) {
    throw new Error(`className must be PascalCase, got: ${options.className}`);
  }

  if (!options.propertyName || options.propertyName.length === 0) {
    throw new Error('propertyName is required');
  }

  if (!/^[a-z][a-zA-Z0-9]*$/.test(options.propertyName)) {
    throw new Error(
      `propertyName must be camelCase, got: ${options.propertyName}`,
    );
  }

  if (!options.fileName || options.fileName.length === 0) {
    throw new Error('fileName is required');
  }

  if (!/^[a-z][a-z0-9-]*$/.test(options.fileName)) {
    throw new Error(`fileName must be kebab-case, got: ${options.fileName}`);
  }
}
