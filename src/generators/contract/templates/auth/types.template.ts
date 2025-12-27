/**
 * Contract Auth Types Template
 *
 * Generates types.ts for contract-auth library.
 * Type-only exports for zero runtime overhead.
 *
 * @module monorepo-library-generator/contract/auth/types
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { AuthTemplateOptions } from "./schemas.template"

/**
 * Generate types.ts for contract-auth library
 *
 * Type-only re-exports for consumers who only need types.
 */
export function generateAuthTypesFile(options: AuthTemplateOptions) {
  const builder = new TypeScriptBuilder()

  builder.addFileHeader({
    title: "Auth Contract Types",
    description: `Type-only exports for zero runtime overhead.

Import from this file when you only need types:
\`\`\`typescript
import type { CurrentUserData, AuthError } from "${options.packageName}/types"
\`\`\``,
    module: `${options.packageName}/types`
  })
  builder.addBlankLine()

  builder.addSectionComment("Schema Types")
  builder.addBlankLine()

  builder.addRaw(`export type {
  CurrentUserData,
  AuthMethod,
  AuthenticatedUserData,
  AuthSession,
  ServiceIdentity,
  KnownService,
} from "./lib/schemas"
`)
  builder.addBlankLine()

  builder.addSectionComment("Error Types")
  builder.addBlankLine()

  builder.addRaw(`export type {
  AuthErrorCode,
  ServiceAuthErrorCode,
  AuthContractError,
} from "./lib/errors"

// Note: AuthError and ServiceAuthError are classes, not just types
// Import from main entry point if you need the class
`)
  builder.addBlankLine()

  builder.addSectionComment("Port Types")
  builder.addBlankLine()

  builder.addRaw(`export type {
  AuthVerifierInterface,
  AuthProviderInterface,
  ServiceAuthVerifierInterface,
} from "./lib/ports"
`)
  builder.addBlankLine()

  builder.addSectionComment("Middleware Types")
  builder.addBlankLine()

  builder.addRaw(`export type {
  RouteType,
  RpcWithRouteTag,
  RequestMetadata,
  HandlerContext,
  ServiceHandlerContext,
} from "./lib/middleware"
`)

  return builder.toString()
}
