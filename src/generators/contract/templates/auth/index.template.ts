/**
 * Contract Auth Index Template
 *
 * Generates index.ts (barrel) for contract-auth library.
 *
 * @module monorepo-library-generator/contract/auth/index
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder'
import type { AuthTemplateOptions } from './schemas.template'

/**
 * Generate index.ts for contract-auth library
 */
export function generateAuthIndexFile(options: AuthTemplateOptions) {
  const builder = new TypeScriptBuilder()

  builder.addFileHeader({
    title: 'Auth Contract Library',
    description: `Single source of truth for auth types across the monorepo.

This library defines all auth-related types:
- Schemas (CurrentUserData, AuthMethod, ServiceIdentity)
- Errors (AuthError, ServiceAuthError)
- Ports (AuthVerifier, AuthProvider, ServiceAuthVerifier)
- Middleware (RouteTag, CurrentUser, ServiceContext, RequestMeta)

Other libraries import from here:
- infra-rpc: Uses middleware and errors
- infra-auth: Implements ports
- provider-supabase: Maps to schemas`,
    module: options.packageName
  })
  builder.addBlankLine()

  builder.addSectionComment('Schemas')
  builder.addBlankLine()

  builder.addRaw(`export {
  // User authentication
  CurrentUserDataSchema,
  type CurrentUserData,
  AuthMethodSchema,
  type AuthMethod,
  AuthenticatedUserDataSchema,
  type AuthenticatedUserData,
  AuthSessionSchema,
  type AuthSession,

  // Service authentication
  ServiceIdentitySchema,
  type ServiceIdentity,
  KnownServicesSchema,
  type KnownService,
} from "./lib/schemas"
`)
  builder.addBlankLine()

  builder.addSectionComment('Errors')
  builder.addBlankLine()

  builder.addRaw(`export {
  // User auth errors
  AuthError,
  AuthErrorCodeSchema,
  type AuthErrorCode,

  // Service auth errors
  ServiceAuthError,
  ServiceAuthErrorCodeSchema,
  type ServiceAuthErrorCode,

  // Combined
  type AuthContractError,
} from "./lib/errors"
`)
  builder.addBlankLine()

  builder.addSectionComment('Ports (Service Interfaces)')
  builder.addBlankLine()

  builder.addRaw(`export {
  // User authentication
  AuthVerifier,
  type AuthVerifierInterface,
  AuthProvider,
  type AuthProviderInterface,

  // Service authentication
  ServiceAuthVerifier,
  type ServiceAuthVerifierInterface,
} from "./lib/ports"
`)
  builder.addBlankLine()

  builder.addSectionComment('Middleware Context')
  builder.addBlankLine()

  builder.addRaw(`export {
  // Route types
  RouteTag,
  type RouteType,
  type RpcWithRouteTag,

  // User context
  CurrentUser,
  AuthMethodContext,

  // Service context
  ServiceContext,

  // Request metadata
  RequestMeta,
  type RequestMetadata,

  // Handler context helpers
  type HandlerContext,
  type ServiceHandlerContext,
} from "./lib/middleware"
`)

  return builder.toString()
}
