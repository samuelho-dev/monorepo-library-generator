import { Rpc, RpcGroup } from "@effect/rpc"
import { Schema } from "effect"
import { RouteTag } from "../lib/rpc-definitions"
import type { RouteType } from "../lib/rpc-definitions"
import { Profile, ProfileId } from "./entities"
import { ProfileRpcError } from "./rpc-errors"

/**
 * Profile RPC Definitions
 *
 * Contract-first RPC definitions for the profile sub-module.
 * All operations are prefixed with "Profile." for unified router routing.
 *
 * Route Types:
 * - "public": No authentication required
 * - "protected": User authentication required (CurrentUser)
 * - "service": Service-to-service authentication (ServiceContext)
 *
 * Usage in feature handlers:
 * ```typescript
 * import { ProfileRpcs } from "@samuelho-dev/contract-user/profile";
 * import { ProfileService } from "./service";
 *
 * export const ProfileHandlers = ProfileRpcs.toLayer({
 *   "Profile.Get": (input) =>
 *     Effect.flatMap(ProfileService, s => s.get(input.id)),
 * })
 * ```
 *
 * @module @samuelho-dev/contract-user/profile/rpc
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
export const CreateProfileInput = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255))
  // TODO: Add domain-specific fields for Profile
}).pipe(Schema.annotations({
  identifier: "CreateProfileInput",
  title: "Create Profile Input"
}))

export type CreateProfileInput = Schema.Schema.Type<typeof CreateProfileInput>

/**
 * Update input schema
 */
export const UpdateProfileInput = Schema.Struct({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)))
  // TODO: Add domain-specific update fields for Profile
}).pipe(Schema.annotations({
  identifier: "UpdateProfileInput",
  title: "Update Profile Input"
}))

export type UpdateProfileInput = Schema.Schema.Type<typeof UpdateProfileInput>

// ============================================================================
// RPC Definitions
// ============================================================================

/**
 * Get Profile by ID
 *
 * @route public - No authentication required
 */
export class ProfileGet extends Rpc.make("Profile.Get", {
  payload: Schema.Struct({
    id: ProfileId
  }),
  success: Profile,
  error: ProfileRpcError
}) {
  static readonly [RouteTag]: RouteType = "public"
}

/**
 * List Profiles with pagination
 *
 * @route public - No authentication required
 */
export class ProfileList extends Rpc.make("Profile.List", {
  payload: Schema.Struct({
    page: Schema.optionalWith(Schema.Number.pipe(Schema.int(), Schema.positive()), {
      default: () => 1
    }),
    pageSize: Schema.optionalWith(Schema.Number.pipe(Schema.int(), Schema.positive()), {
      default: () => 20
    })
  }),
  success: Schema.Struct({
    items: Schema.Array(Profile),
    total: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
    page: Schema.Number.pipe(Schema.int(), Schema.positive()),
    pageSize: Schema.Number.pipe(Schema.int(), Schema.positive())
  }),
  error: ProfileRpcError
}) {
  static readonly [RouteTag]: RouteType = "public"
}

/**
 * Create Profile
 *
 * @route protected - Requires user authentication
 */
export class ProfileCreate extends Rpc.make("Profile.Create", {
  payload: CreateProfileInput,
  success: Profile,
  error: ProfileRpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}

/**
 * Update Profile
 *
 * @route protected - Requires user authentication
 */
export class ProfileUpdate extends Rpc.make("Profile.Update", {
  payload: Schema.Struct({
    id: ProfileId,
    data: UpdateProfileInput
  }),
  success: Profile,
  error: ProfileRpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}

/**
 * Delete Profile
 *
 * @route protected - Requires user authentication
 */
export class ProfileDelete extends Rpc.make("Profile.Delete", {
  payload: Schema.Struct({
    id: ProfileId
  }),
  success: Schema.Struct({
    success: Schema.Literal(true),
    deletedAt: Schema.DateTimeUtc
  }),
  error: ProfileRpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}

// ============================================================================
// RPC Group
// ============================================================================

/**
 * Profile RPC Group
 *
 * All Profile operations for router registration.
 */
export const ProfileRpcs = RpcGroup.make(
  ProfileGet,
  ProfileList,
  ProfileCreate,
  ProfileUpdate,
  ProfileDelete
)

export type ProfileRpcs = typeof ProfileRpcs

/**
 * RPCs organized by route type
 */
export const ProfileRpcsByRoute = {
  public: [ProfileGet, ProfileList] as const,
  protected: [ProfileCreate, ProfileUpdate, ProfileDelete] as const,
  service: [] as const
}
