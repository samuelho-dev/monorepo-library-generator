import { Schema } from "effect"

/**
 * User Profile Domain Events
 *
 * Domain events for the profile sub-module.

Events are prefixed with "Profile." for routing in the parent domain's event bus.
These events can be published via PubsubService and consumed by other features.
 *
 * @module @samuelho-dev/contract-user/profile/events
 */
// ============================================================================
// Event Base Schema
// ============================================================================
/**
 * Base event metadata for profile events
 */
const ProfileEventBase = Schema.Struct({
  /** Event timestamp */
  timestamp: Schema.DateTimeUtc,
  /** Correlation ID for tracing */
  correlationId: Schema.UUID,
  /** User who triggered the event (if applicable) */
  userId: Schema.optional(Schema.UUID),
  /** Additional metadata */
  metadata: Schema.optional(Schema.Record({
    key: Schema.String,
    value: Schema.Unknown
  }))
})
// ============================================================================
// Profile Domain Events
// ============================================================================
/**
 * Profile created event
 */
export const ProfileCreated = Schema.Struct({
  _tag: Schema.Literal("Profile.Created"),
  profileId: Schema.UUID,
  parentUserId: Schema.optional(Schema.UUID),
  ...ProfileEventBase.fields
}).pipe(Schema.annotations({
  identifier: "Profile.Created",
  title: "Profile Created",
  description: "Emitted when a profile is created"
}))
/**
 * Profile updated event
 */
export const ProfileUpdated = Schema.Struct({
  _tag: Schema.Literal("Profile.Updated"),
  profileId: Schema.UUID,
  changes: Schema.Record({
    key: Schema.String,
    value: Schema.Unknown
  }),
  ...ProfileEventBase.fields
}).pipe(Schema.annotations({
  identifier: "Profile.Updated",
  title: "Profile Updated",
  description: "Emitted when a profile is updated"
}))
/**
 * Profile deleted event
 */
export const ProfileDeleted = Schema.Struct({
  _tag: Schema.Literal("Profile.Deleted"),
  profileId: Schema.UUID,
  ...ProfileEventBase.fields
}).pipe(Schema.annotations({
  identifier: "Profile.Deleted",
  title: "Profile Deleted",
  description: "Emitted when a profile is deleted"
}))
// ============================================================================
// Event Union Type
// ============================================================================
/**
 * Union of all profile domain events
 *
 * Use this for type-safe event handling:
 * ```typescript
 * const handle = (event: ProfileEvent) => {
 *   switch (event._tag) {
 *     case "Profile.Created": ...
 *     case "Profile.Updated": ...
 *   }
 * }
 * ```
 */
export type ProfileEvent =
  | Schema.Schema.Type<typeof ProfileCreated>
  | Schema.Schema.Type<typeof ProfileUpdated>
  | Schema.Schema.Type<typeof ProfileDeleted>

/**
 * All profile event schemas for registration
 */
export const ProfileEvents = {
  ProfileCreated,
  ProfileUpdated,
  ProfileDeleted
}