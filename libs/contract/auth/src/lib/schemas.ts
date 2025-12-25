import { Schema } from "effect"

/**
 * Auth Contract Schemas
 *
 * Schema definitions for authentication across the monorepo.

SINGLE SOURCE OF TRUTH:
All auth-related schemas are defined here. Other libraries
(infra-rpc, infra-auth, provider-supabase) import from this library.

Schemas:
- CurrentUserDataSchema: Authenticated user data
- AuthMethodSchema: Authentication method (jwt, session, api-key)
- AuthSessionSchema: Session information
- ServiceIdentitySchema: Service-to-service auth identity
 *
 * @module @samuelho-dev/contract-auth/schemas
 */

// ============================================================================
// User Authentication Schemas
// ============================================================================

/**
 * Authentication method used for the request
 */
export const AuthMethodSchema = Schema.Union(
  Schema.Literal("jwt"),
  Schema.Literal("session"),
  Schema.Literal("api-key"),
  Schema.Literal("service-token")
)
export type AuthMethod = Schema.Schema.Type<typeof AuthMethodSchema>

/**
 * Core authenticated user data
 *
 * This is the canonical user data structure used across the monorepo.
 * All auth providers must map to this schema at boundaries.
 */
export const CurrentUserDataSchema = Schema.Struct({
  /** Unique user identifier */
  id: Schema.String,
  /** User's email address */
  email: Schema.String,
  /** User's display name */
  name: Schema.optional(Schema.String),
  /** User's roles for authorization */
  roles: Schema.optional(Schema.Array(Schema.String)),
  /** Additional metadata */
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown }))
})
export type CurrentUserData = Schema.Schema.Type<typeof CurrentUserDataSchema>

/**
 * Extended user data with authentication context
 */
export const AuthenticatedUserDataSchema = Schema.Struct({
  ...CurrentUserDataSchema.fields,
  /** How the user was authenticated */
  authMethod: AuthMethodSchema,
  /** When the session was created */
  authenticatedAt: Schema.Date,
  /** Session expiration time */
  expiresAt: Schema.optional(Schema.Date)
})
export type AuthenticatedUserData = Schema.Schema.Type<typeof AuthenticatedUserDataSchema>

/**
 * Auth session information
 */
export const AuthSessionSchema = Schema.Struct({
  /** Session ID */
  sessionId: Schema.String,
  /** User ID */
  userId: Schema.String,
  /** Session creation time */
  createdAt: Schema.Date,
  /** Session expiration time */
  expiresAt: Schema.Date,
  /** Last activity time */
  lastActivityAt: Schema.optional(Schema.Date),
  /** Device/client info */
  userAgent: Schema.optional(Schema.String),
  /** IP address */
  ipAddress: Schema.optional(Schema.String)
})
export type AuthSession = Schema.Schema.Type<typeof AuthSessionSchema>

// ============================================================================
// Service-to-Service Authentication Schemas
// ============================================================================

/**
 * Service identity for service-to-service authentication
 */
export const ServiceIdentitySchema = Schema.Struct({
  /** Service name (e.g., "user-service", "payment-service") */
  serviceName: Schema.String,
  /** Service version */
  version: Schema.optional(Schema.String),
  /** Service instance ID */
  instanceId: Schema.optional(Schema.String),
  /** Allowed permissions/scopes */
  permissions: Schema.optional(Schema.Array(Schema.String)),
  /** Service environment */
  environment: Schema.optional(
    Schema.Union(Schema.Literal("development"), Schema.Literal("staging"), Schema.Literal("production"))
  )
})
export type ServiceIdentity = Schema.Schema.Type<typeof ServiceIdentitySchema>

/**
 * Known services for service-to-service auth
 */
export const KnownServicesSchema = Schema.Union(
  Schema.Literal("user-service"),
  Schema.Literal("payment-service"),
  Schema.Literal("notification-service"),
  Schema.Literal("analytics-service"),
  Schema.Literal("internal-tools")
)
export type KnownService = Schema.Schema.Type<typeof KnownServicesSchema>
