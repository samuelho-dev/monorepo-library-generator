import { Schema } from "effect"

/**
 * User Authentication Domain Events
 *
 * Domain events for the authentication sub-module.

Events are prefixed with "Authentication." for routing in the parent domain's event bus.
These events can be published via PubsubService and consumed by other features.
 *
 * @module @samuelho-dev/contract-user/authentication/events
 */
// ============================================================================
// Event Base Schema
// ============================================================================
/**
 * Base event metadata for authentication events
 */
const AuthenticationEventBase = Schema.Struct({
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
// Authentication Domain Events
// ============================================================================
/**
 * Authentication created event
 */
export const AuthenticationCreated = Schema.Struct({
  _tag: Schema.Literal("Authentication.Created"),
  authenticationId: Schema.UUID,
  parentUserId: Schema.optional(Schema.UUID),
  ...AuthenticationEventBase.fields
}).pipe(Schema.annotations({
  identifier: "Authentication.Created",
  title: "Authentication Created",
  description: "Emitted when a authentication is created"
}))
/**
 * Authentication updated event
 */
export const AuthenticationUpdated = Schema.Struct({
  _tag: Schema.Literal("Authentication.Updated"),
  authenticationId: Schema.UUID,
  changes: Schema.Record({
    key: Schema.String,
    value: Schema.Unknown
  }),
  ...AuthenticationEventBase.fields
}).pipe(Schema.annotations({
  identifier: "Authentication.Updated",
  title: "Authentication Updated",
  description: "Emitted when a authentication is updated"
}))
/**
 * Authentication deleted event
 */
export const AuthenticationDeleted = Schema.Struct({
  _tag: Schema.Literal("Authentication.Deleted"),
  authenticationId: Schema.UUID,
  ...AuthenticationEventBase.fields
}).pipe(Schema.annotations({
  identifier: "Authentication.Deleted",
  title: "Authentication Deleted",
  description: "Emitted when a authentication is deleted"
}))
// ============================================================================
// Event Union Type
// ============================================================================
/**
 * Union of all authentication domain events
 *
 * Use this for type-safe event handling:
 * ```typescript
 * const handle = (event: AuthenticationEvent) => {
 *   switch (event._tag) {
 *     case "Authentication.Created": ...
 *     case "Authentication.Updated": ...
 *   }
 * }
 * ```
 */
export type AuthenticationEvent =
  | Schema.Schema.Type<typeof AuthenticationCreated>
  | Schema.Schema.Type<typeof AuthenticationUpdated>
  | Schema.Schema.Type<typeof AuthenticationDeleted>

/**
 * All authentication event schemas for registration
 */
export const AuthenticationEvents = {
  AuthenticationCreated,
  AuthenticationUpdated,
  AuthenticationDeleted
}
