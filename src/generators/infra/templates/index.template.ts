/**
 * Infrastructure Index Template
 *
 * Generates main index.ts export file.
 *
 * @module monorepo-library-generator/infra-templates
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { InfraTemplateOptions } from "../../../utils/shared/types"

/**
 * Generate index.ts file for infrastructure service
 */
export function generateIndexFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, includeClientServer } = options

  // File header
  builder.addFileHeader({
    title: `@custom-repo/infra-${fileName}`,
    description: `${className} infrastructure service\nProvides ${className} functionality for the application.`,
    module: `@custom-repo/infra-${fileName}`
  })

  if (!includeClientServer) {
    // Server-only mode
    builder.addSectionComment("Server-Only Mode: Export Everything from Root")

    builder.addRaw(`// Service interface and layers
export { ${className}Service } from "./lib/service/service";
export type { ${className}Config } from "./lib/service/config";
export { default${className}Config, get${className}ConfigForEnvironment } from "./lib/service/config";

// Primary layers are static members of ${className}Service:
// - ${className}Service.Live (production)
// - ${className}Service.Test (testing)
// Additional layers:
export { ${className}ServiceDev } from "./lib/layers/server-layers";

// Error types
export {
  ${className}Error,
  ${className}NotFoundError,
  ${className}ValidationError,
  ${className}ConflictError,
  ${className}ConfigError,
  ${className}ConnectionError,
  ${className}TimeoutError,
  ${className}InternalError,
} from "./lib/service/errors";
export type { ${className}ServiceError } from "./lib/service/errors";`)
  } else {
    // Universal mode
    builder.addSectionComment(
      "Universal Mode: Export Only Types and Interfaces from Root"
    )

    builder.addRaw(`// Service interface (universal)
export { ${className}Service } from "./lib/service/service";
export type { ${className}Config } from "./lib/service/config";

// Configuration (universal)
export { default${className}Config, get${className}ConfigForEnvironment } from "./lib/service/config";

// Error types (universal)
export {
  ${className}Error,
  ${className}NotFoundError,
  ${className}ValidationError,
  ${className}ConflictError,
  ${className}ConfigError,
  ${className}ConnectionError,
  ${className}TimeoutError,
  ${className}InternalError,
} from "./lib/service/errors";
export type { ${className}ServiceError } from "./lib/service/errors";

// NOTE: Layers are exported from client.ts and server.ts separately`)
  }

  return builder.toString()
}
