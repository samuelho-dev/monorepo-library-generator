import { Context } from 'effect'
import type { ServiceIdentity } from './entities'

export type RouteType = 'public' | 'protected' | 'admin' | 'service'

/** Metadata key attached to RPC definitions that declares their auth policy. */
export const RouteTag = Symbol.for('@samuelho-dev/contract-auth/RouteTag')

export type RpcWithRouteTag = {
  readonly [RouteTag]: RouteType
}

/**
 * Auth Contract Middleware
 *
 * Middleware context tags and route types for RPC.
 *
 * Contract-First Architecture:
 * - RPC definitions use RouteTag to specify auth requirements
 * - Middleware reads RouteTag and applies appropriate auth
 * - Handlers access context via tags defined in respective contracts
 *
 * NOTE: User context (with app-specific fields like seller_id, role)
 * is defined in @samuelho-dev/contract-user as UserContextTag.
 * This keeps auth concerns separate from app user data.
 *
 * Route Types:
 * - "public": No authentication required
 * - "protected": User authentication required (UserContextTag)
 * - "admin": User auth + admin_user table check (AdminContext)
 * - "service": Service authentication required (ServiceContext)
 *
 * @module @samuelho-dev/contract-auth
 */

// ============================================================================
// Service Authentication Context
// ============================================================================

/**
 * Service Context Tag
 *
 * Provides access to calling service identity in handlers.
 * Only available on "service" routes.
 *
 * @example
 * ```typescript
 * const handler = Effect.gen(function*() {
 *   const service = yield* ServiceContext
 *   console.log(service.serviceName, service.permissions)
 * })
 * ```
 */
export class ServiceContext extends Context.Service<ServiceContext, ServiceIdentity>()(
  '@samuelho-dev/contract-auth/ServiceContext'
) {}

// ============================================================================
// Request Metadata Context
// ============================================================================

/**
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
 * ```typescript
 * const handler = Effect.gen(function*() {
 *   const meta = yield* RequestMeta
 *   console.log(meta.requestId)
 * })
 * ```
 */
export class RequestMeta extends Context.Service<RequestMeta, RequestMetadata>()(
  '@samuelho-dev/contract-auth/RequestMeta'
) {}

// ============================================================================
// Handler Context Helpers (Optional - for convenience)
// ============================================================================

/**
 * Combined handler context for service routes
 */
export interface ServiceHandlerContext {
  readonly service: ServiceIdentity
  readonly meta: RequestMetadata
}
