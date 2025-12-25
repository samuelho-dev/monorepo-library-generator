/**
 * Contract Auth Middleware Template
 *
 * Generates lib/middleware.ts for contract-auth library.
 * Defines middleware context tags and route types.
 *
 * @module monorepo-library-generator/contract/auth/middleware
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { AuthTemplateOptions } from "./schemas.template"

/**
 * Generate lib/middleware.ts for contract-auth library
 *
 * Middleware elements defined:
 * - RouteTag: Symbol for marking RPC route types
 * - RouteType: Union of route types (public, protected, service)
 * - CurrentUser: Context tag for authenticated user
 * - ServiceContext: Context tag for service identity
 * - RequestMeta: Context tag for request metadata
 */
export function generateAuthMiddlewareFile(options: AuthTemplateOptions) {
  const builder = new TypeScriptBuilder()

  builder.addFileHeader({
    title: "Auth Contract Middleware",
    description: `Middleware context tags and route types for RPC.

Contract-First Architecture:
- RPC definitions use RouteTag to specify auth requirements
- Middleware reads RouteTag and applies appropriate auth
- Handlers access user/service context via Context Tags

Route Types:
- "public": No authentication required
- "protected": User authentication required (CurrentUser available)
- "service": Service-to-service auth (ServiceContext available)`,
    module: `${options.packageName}/middleware`
  })
  builder.addBlankLine()

  builder.addImports([
    { from: "effect", imports: ["Context"] }
  ])
  builder.addBlankLine()

  builder.addImports([
    { from: "./schemas", imports: ["AuthMethod", "CurrentUserData", "ServiceIdentity"], isTypeOnly: true }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Route Types (Contract-First)")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Route type for RPC endpoints
 *
 * Determines what middleware is applied:
 * - "public": No authentication middleware
 * - "protected": User authentication middleware (CurrentUser)
 * - "service": Service authentication middleware (ServiceContext)
 */
export type RouteType = "public" | "protected" | "service"

/**
 * Symbol for marking RPC route types
 *
 * Used in contract RPC definitions to specify auth requirements.
 *
 * @example
 * \`\`\`typescript
 * export class GetUser extends Rpc.make("GetUser", { ... }) {
 *   static readonly [RouteTag]: RouteType = "protected"
 * }
 * \`\`\`
 */
export const RouteTag: unique symbol = Symbol.for("${options.packageName}/RouteTag")

/**
 * Type helper for RPC classes with RouteTag
 */
export interface RpcWithRouteTag {
  readonly [RouteTag]?: RouteType
}
`)
  builder.addBlankLine()

  builder.addSectionComment("User Authentication Context")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Current User Context Tag
 *
 * Provides access to authenticated user data in handlers.
 * Only available on "protected" routes.
 *
 * @example
 * \`\`\`typescript
 * const handler = Effect.gen(function*() {
 *   const user = yield* CurrentUser
 *   console.log(user.id, user.email)
 * })
 * \`\`\`
 */
export class CurrentUser extends Context.Tag("CurrentUser")<
  CurrentUser,
  CurrentUserData
>() {}

/**
 * Auth Method Context Tag
 *
 * Provides access to the authentication method used.
 * Available on "protected" routes alongside CurrentUser.
 *
 * @example
 * \`\`\`typescript
 * const handler = Effect.gen(function*() {
 *   const authMethod = yield* AuthMethodContext
 *   console.log(authMethod.type, authMethod.token)
 * })
 * \`\`\`
 */
export class AuthMethodContext extends Context.Tag("AuthMethodContext")<
  AuthMethodContext,
  { readonly type: AuthMethod; readonly token: string }
>() {}
`)
  builder.addBlankLine()

  builder.addSectionComment("Service Authentication Context")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Service Context Tag
 *
 * Provides access to calling service identity in handlers.
 * Only available on "service" routes.
 *
 * @example
 * \`\`\`typescript
 * const handler = Effect.gen(function*() {
 *   const service = yield* ServiceContext
 *   console.log(service.serviceName, service.permissions)
 * })
 * \`\`\`
 */
export class ServiceContext extends Context.Tag("ServiceContext")<
  ServiceContext,
  ServiceIdentity
>() {}
`)
  builder.addBlankLine()

  builder.addSectionComment("Request Metadata Context")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Request metadata available to all handlers
 */
export interface RequestMetadata {
  /** Unique request ID for tracing */
  readonly requestId: string
  /** Request timestamp */
  readonly timestamp: Date
  /** Client IP address */
  readonly ipAddress?: string
  /** User agent string */
  readonly userAgent?: string
  /** Request path */
  readonly path?: string
  /** HTTP method */
  readonly method?: string
}

/**
 * Request Meta Context Tag
 *
 * Provides access to request metadata in handlers.
 * Available on all routes (public, protected, service).
 *
 * @example
 * \`\`\`typescript
 * const handler = Effect.gen(function*() {
 *   const meta = yield* RequestMeta
 *   console.log(meta.requestId)
 * })
 * \`\`\`
 */
export class RequestMeta extends Context.Tag("RequestMeta")<
  RequestMeta,
  RequestMetadata
>() {}
`)
  builder.addBlankLine()

  builder.addSectionComment("Handler Context Helpers")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Combined handler context for protected routes
 */
export interface HandlerContext {
  readonly user: CurrentUserData
  readonly meta: RequestMetadata
}

/**
 * Combined handler context for service routes
 */
export interface ServiceHandlerContext {
  readonly service: ServiceIdentity
  readonly meta: RequestMetadata
}
`)

  return builder.toString()
}
