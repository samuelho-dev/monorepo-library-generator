/**
 * Database Infrastructure Index Template
 *
 * Generates main index.ts export file for the database infrastructure.
 * The database infra delegates to the Kysely provider.
 *
 * @module monorepo-library-generator/infra-templates
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { InfraTemplateOptions } from '../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config';

/**
 * Generate index.ts file for database infrastructure service
 */
export function generateDatabaseIndexFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  // File header
  builder.addFileHeader({
    title: `${scope}/infra-${fileName}`,
    description: `${className} infrastructure service

Provides database access through the Kysely provider.
Types come from prisma-effect-kysely; Kysely provider handles SDK integration.

Architecture:
  prisma-effect-kysely -> generates DB types
  ${scope}/provider-kysely -> wraps Kysely SDK (Kysely Context.Tag)
  ${scope}/infra-database -> this library (DatabaseService)`,
    module: `${scope}/infra-${fileName}`,
  });

  builder.addSectionComment('Database Service Exports');

  builder.addRaw(`// Database service - delegates to Kysely provider
export { ${className}Service } from "./lib/service/service";

// Re-export Database type from service (which re-exports from provider)
export type { Database } from "./lib/service/service";

// Error types
export {
  ${className}ServiceError,
  ${className}InternalError,
  ${className}ConfigError,
  ${className}ConnectionError,
  ${className}TimeoutError,
} from "./lib/service/errors";

// Usage note: Layers are static members of ${className}Service
// - ${className}Service.Live (requires Kysely.makeLive)
// - ${className}Service.Test (uses Kysely.Test)
// - ${className}Service.Dev (uses Kysely.Dev with logging)`);

  return builder.toString();
}
