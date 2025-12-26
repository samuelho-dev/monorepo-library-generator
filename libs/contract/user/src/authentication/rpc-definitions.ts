import { Rpc, RpcGroup } from "@effect/rpc"
import { Schema } from "effect"
import { RouteTag } from "../lib/rpc-definitions"
import type { RouteType } from "../lib/rpc-definitions"
import { Authentication, AuthenticationId } from "./entities"
import { AuthenticationRpcError } from "./rpc-errors"

/**
 * Authentication RPC Definitions
 *
 * Contract-first RPC definitions for the authentication sub-module.
 * All operations are prefixed with "Authentication." for unified router routing.
 *
 * Route Types:
 * - "public": No authentication required
 * - "protected": User authentication required (CurrentUser)
 * - "service": Service-to-service authentication (ServiceContext)
 *
 * Usage in feature handlers:
 * ```typescript
 * import { AuthenticationRpcs } from "@samuelho-dev/contract-user/authentication";
 * import { AuthenticationService } from "./service";
 *
 * export const AuthenticationHandlers = AuthenticationRpcs.toLayer({
 *   "Authentication.Get": (input) =>
 *     Effect.flatMap(AuthenticationService, s => s.get(input.id)),
 * })
 * ```
 *
 * @module @samuelho-dev/contract-user/authentication/rpc
 */

// ============================================================================
// Local Imports
// ============================================================================
// ============================================================================
// Request/Response Schemas
// ============================================================================

/**
 * Create input schema
 */
export const CreateAuthenticationInput = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255))
  // TODO: Add domain-specific fields for Authentication
}).pipe(Schema.annotations({
  identifier: "CreateAuthenticationInput",
  title: "Create Authentication Input"
}))

export type CreateAuthenticationInput = Schema.Schema.Type<typeof CreateAuthenticationInput>

/**
 * Update input schema
 */
export const UpdateAuthenticationInput = Schema.Struct({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)))
  // TODO: Add domain-specific update fields for Authentication
}).pipe(Schema.annotations({
  identifier: "UpdateAuthenticationInput",
  title: "Update Authentication Input"
}))

export type UpdateAuthenticationInput = Schema.Schema.Type<typeof UpdateAuthenticationInput>

// ============================================================================
// RPC Definitions
// ============================================================================

/**
 * Get Authentication by ID
 *
 * @route public - No authentication required
 */
export class AuthenticationGet extends Rpc.make("Authentication.Get", {
  payload: Schema.Struct({
    id: AuthenticationId
  }),
  success: Authentication,
  error: AuthenticationRpcError
}) {
  static readonly [RouteTag]: RouteType = "public"
}

/**
 * List Authentications with pagination
 *
 * @route public - No authentication required
 */
export class AuthenticationList extends Rpc.make("Authentication.List", {
  payload: Schema.Struct({
    page: Schema.optionalWith(Schema.Number.pipe(Schema.int(), Schema.positive()), {
      default: () => 1
    }),
    pageSize: Schema.optionalWith(Schema.Number.pipe(Schema.int(), Schema.positive()), {
      default: () => 20
    })
  }),
  success: Schema.Struct({
    items: Schema.Array(Authentication),
    total: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
    page: Schema.Number.pipe(Schema.int(), Schema.positive()),
    pageSize: Schema.Number.pipe(Schema.int(), Schema.positive())
  }),
  error: AuthenticationRpcError
}) {
  static readonly [RouteTag]: RouteType = "public"
}

/**
 * Create Authentication
 *
 * @route protected - Requires user authentication
 */
export class AuthenticationCreate extends Rpc.make("Authentication.Create", {
  payload: CreateAuthenticationInput,
  success: Authentication,
  error: AuthenticationRpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}

/**
 * Update Authentication
 *
 * @route protected - Requires user authentication
 */
export class AuthenticationUpdate extends Rpc.make("Authentication.Update", {
  payload: Schema.Struct({
    id: AuthenticationId,
    data: UpdateAuthenticationInput
  }),
  success: Authentication,
  error: AuthenticationRpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}

/**
 * Delete Authentication
 *
 * @route protected - Requires user authentication
 */
export class AuthenticationDelete extends Rpc.make("Authentication.Delete", {
  payload: Schema.Struct({
    id: AuthenticationId
  }),
  success: Schema.Struct({
    success: Schema.Literal(true),
    deletedAt: Schema.DateTimeUtc
  }),
  error: AuthenticationRpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}

// ============================================================================
// RPC Group
// ============================================================================

/**
 * Authentication RPC Group
 *
 * All Authentication operations for router registration.
 */
export const AuthenticationRpcs = RpcGroup.make(
  AuthenticationGet,
  AuthenticationList,
  AuthenticationCreate,
  AuthenticationUpdate,
  AuthenticationDelete
)

export type AuthenticationRpcs = typeof AuthenticationRpcs

/**
 * RPCs organized by route type
 */
export const AuthenticationRpcsByRoute = {
  public: [AuthenticationGet, AuthenticationList] as const,
  protected: [AuthenticationCreate, AuthenticationUpdate, AuthenticationDelete] as const,
  service: [] as const
}