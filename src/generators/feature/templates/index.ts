/**
 * Feature Templates Index
 *
 * Exports all template functions for the feature generator.
 *
 * @module monorepo-library-generator/feature/templates
 */

import type {
  FeatureTemplateOptions,
  TemplateFunction,
} from '../../../utils/shared/types';

// Shared layer templates
import { generateErrorsFile } from './errors.template';
import { generateTypesFile } from './types.template';
import { generateSchemasFile } from './schemas.template';

// Server layer templates
import { generateServiceFile } from './service.template';
import { generateLayersFile } from './layers.template';
import { generateServiceSpecFile } from './service-spec.template';

// RPC layer templates
import { generateRpcFile } from './rpc.template';
import { generateRpcHandlersFile } from './rpc-handlers.template';
import { generateRpcErrorsFile } from './rpc-errors.template';

// Client layer templates
import { generateHooksFile } from './hooks.template';
import { generateHooksIndexFile } from './hooks-index.template';
import { generateAtomsFile } from './atoms.template';
import { generateAtomsIndexFile } from './atoms-index.template';

// Edge layer templates
import { generateMiddlewareFile } from './middleware.template';

// Re-export all template functions
export {
  generateErrorsFile,
  generateTypesFile,
  generateSchemasFile,
  generateServiceFile,
  generateLayersFile,
  generateServiceSpecFile,
  generateRpcFile,
  generateRpcHandlersFile,
  generateRpcErrorsFile,
  generateHooksFile,
  generateHooksIndexFile,
  generateAtomsFile,
  generateAtomsIndexFile,
  generateMiddlewareFile,
};

/**
 * Template registry for feature generator
 *
 * Maps file identifiers to their template functions.
 * Used by the file generation system to create files conditionally.
 */

export const featureTemplates: Record<
  string,
  TemplateFunction<FeatureTemplateOptions>
> = {
  // Shared layer (always generated)
  'shared/errors': generateErrorsFile,
  'shared/types': generateTypesFile,
  'shared/schemas': generateSchemasFile,

  // Server layer (conditional on includeServer)
  'server/service': generateServiceFile,
  'server/layers': generateLayersFile,
  'server/service.spec': generateServiceSpecFile,

  // RPC layer (conditional on includeRPC)
  'rpc/rpc': generateRpcFile,
  'rpc/handlers': generateRpcHandlersFile,
  'rpc/errors': generateRpcErrorsFile,

  // Client layer (conditional on includeClient)
  'client/hooks/use-feature': generateHooksFile,
  'client/hooks/index': generateHooksIndexFile,
  'client/atoms/feature-atoms': generateAtomsFile,
  'client/atoms/index': generateAtomsIndexFile,

  // Edge layer (conditional on includeEdge)
  'edge/middleware': generateMiddlewareFile,
};

/**
 * Get list of files to generate based on feature flags
 */
export function getFeatureFiles(options: FeatureTemplateOptions): string[] {
  const files: string[] = [
    // Shared layer (always included)
    'shared/errors',
    'shared/types',
    'shared/schemas',
  ];

  // Server layer
  if (options.includeServer) {
    files.push('server/service', 'server/layers', 'server/service.spec');
  }

  // RPC layer
  if (options.includeRPC) {
    files.push('rpc/rpc', 'rpc/handlers', 'rpc/errors');
  }

  // Client layer
  if (options.includeClient) {
    files.push(
      'client/hooks/use-feature',
      'client/hooks/index',
      'client/atoms/feature-atoms',
      'client/atoms/index',
    );
  }

  // Edge layer
  if (options.includeEdge) {
    files.push('edge/middleware');
  }

  return files;
}

/**
 * Directory placeholders for CQRS operations
 * These directories are created with .gitkeep files when includeCQRS is true
 */
export const cqrsDirectories = [
  'server/commands',
  'server/queries',
  'server/operations',
  'server/projections',
] as const;

/**
 * Directory placeholders for client components
 * These directories are created with .gitkeep files when includeClient is true
 */
export const clientDirectories = ['client/components'] as const;
