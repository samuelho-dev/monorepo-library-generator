import { Effect, Schema } from 'effect'

/**
 * Auth Contract Schemas
 *
 * Schema definitions for authentication across the monorepo.
 *
 * SINGLE SOURCE OF TRUTH:
 * This library contains ONLY SDK types - types that map directly to the
 * authentication provider (Supabase). Application-specific user data
 * lives in @samuelho-dev/contract-user (UserContext).
 *
 * Schemas:
 * - AuthMethod: Authentication method (jwt, session, api-key)
 * - AuthSession: Session information from auth provider
 * - ServiceIdentity: Service-to-service auth identity
 *
 * @module @samuelho-dev/contract-auth
 */

// ============================================================================
// User Authentication Schemas (SDK-Level)
// ============================================================================

/** Provider user identifier shared by auth contracts and infrastructure. */
export const UserId = Schema.String.check(Schema.isUUID()).pipe(Schema.brand('UserId'))
export type UserId = Schema.Schema.Type<typeof UserId>

/**
 * Authentication method used for the request
 */
export const AuthMethod = Schema.Union([
  Schema.Literal('jwt'),
  Schema.Literal('session'),
  Schema.Literal('api-key'),
  Schema.Literal('service-token')
])
export type AuthMethod = Schema.Schema.Type<typeof AuthMethod>

/**
 * SDK-Level User Data from Auth Provider
 *
 * This is the minimal user data returned by the auth provider (Supabase).
 * The infra-rpc middleware transforms this to UserContext (app-level schema).
 *
 * Fields:
 * - id: User ID from auth provider
 * - email: User's email
 * - name: Display name (optional)
 * - metadata: Raw metadata from auth provider
 */
export const AuthUserData = Schema.Struct({
  /** Unique user identifier from auth provider */
  id: UserId,
  /** User's email address */
  email: Schema.String,
  /** User's display name */
  name: Schema.optional(Schema.String),
  /** Raw metadata from auth provider */
  metadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown))
})
export type AuthUserData = Schema.Schema.Type<typeof AuthUserData>

/**
 * Auth session information from the auth provider
 *
 * This is SDK-level data - application extensions (seller_id, etc.)
 * are handled by transforming to UserContext in infra-rpc middleware.
 */
export const AuthSession = Schema.Struct({
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
export type AuthSession = Schema.Schema.Type<typeof AuthSession>

// ============================================================================
// Service-to-Service Authentication Schemas
// ============================================================================

/**
 * Service identity for service-to-service authentication
 */
export const ServiceIdentity = Schema.Struct({
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
    Schema.Union([
      Schema.Literal('development'),
      Schema.Literal('staging'),
      Schema.Literal('production')
    ])
  )
})
export type ServiceIdentity = Schema.Schema.Type<typeof ServiceIdentity>

/**
 * Known services for service-to-service auth
 */
export const KnownServices = Schema.Union([
  Schema.Literal('user-service'),
  Schema.Literal('payment-service'),
  Schema.Literal('notification-service'),
  Schema.Literal('analytics-service'),
  Schema.Literal('internal-tools')
])
export type KnownService = Schema.Schema.Type<typeof KnownServices>

// ============================================================================
// Service Token Request Schema (for JWT generation)
// ============================================================================

/**
 * Request payload for generating a service JWT token
 *
 * Used by services to request a JWT token for service-to-service communication.
 */
export const ServiceTokenRequest = Schema.Struct({
  /** Service name requesting the token */
  serviceName: Schema.String,
  /** Permissions/scopes for this token */
  permissions: Schema.Array(Schema.String),
  /** Token TTL in seconds (default: 3600 = 1 hour) */
  ttlSeconds: Schema.Number.pipe(Schema.withDecodingDefaultType(Effect.succeed(3600))),
  /** Audience (default: 'creativetoolkits-api') */
  audience: Schema.String.pipe(
    Schema.withDecodingDefaultType(Effect.succeed('creativetoolkits-api'))
  )
})
export type ServiceTokenRequest = Schema.Schema.Type<typeof ServiceTokenRequest>
/** Encoded shape — what callers construct before defaults are filled in. */
export type ServiceTokenRequestInput = Schema.Codec.Encoded<typeof ServiceTokenRequest>
