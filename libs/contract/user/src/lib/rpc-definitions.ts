import { Rpc } from "@effect/rpc"
import { Schema } from "effect"
import { UserRpcError } from "./rpc-errors"

/**
 * User RPC Definitions
 *
 * Contract-first RPC definitions using @effect/rpc.
 * This is the single source of truth for User RPC operations.
 *
 * Route Types:
 * - "public": No authentication required
 * - "protected": User authentication required (CurrentUser)
 * - "service": Service-to-service authentication (ServiceContext)
 *
 * Usage in feature handlers:
 * ```typescript
 * import { UserRpcs, GetUser } from "@samuelho-dev/contract-user";
 *
 * export const UserHandlers = UserRpcs.toLayer({
 *   GetUser: (input) => Effect.flatMap(UserService, s => s.get(input.id)),
 * })
 * ```
 *
 * @module @samuelho-dev/contract-user/rpc
 */

// ============================================================================
// Local Imports
// ============================================================================
// ============================================================================
// Branded ID Type
// ============================================================================
/**
 * User ID Schema
 *
 * Branded ID type for type-safe entity identification.
 * Uses Schema.String as base - compatible with UUID, CUID, or any string ID.
 *
 * For stricter validation (e.g., UUID format), use @customType annotation
 * in your Prisma schema:
 *
 * @example
 * ```prisma
 * model User {
 *   /// @customType(Schema.UUID.pipe(Schema.brand('UserId')))
 *   id String @id @default(uuid())
 * }
 * ```
 */
export const UserId = Schema.String.pipe(
  Schema.brand("UserId"),
  Schema.annotations({
    identifier: "UserId",
    title: "User ID",
    description: "Unique identifier for User entity"
  })
)

export type UserId = Schema.Schema.Type<typeof UserId>

// ============================================================================
// Route Tag System
// ============================================================================
/**
 * Route types for middleware selection
 *
 * - "public": No authentication, only RequestMetaTag provided
 * - "protected": User authentication via Bearer token, CurrentUser provided
 * - "service": Service-to-service authentication, ServiceContext provided
 */
export type RouteType = "public" | "protected" | "service"

/**
 * Symbol for accessing route type on RPC definitions
 *
 * @example
 * ```typescript
 * const routeType = GetUser[RouteTag] // "public"
 * ```
 */
export const RouteTag = Symbol.for("@contract/RouteTag")

// ============================================================================
// Entity Schema
// ============================================================================
/**
 * User Entity Schema
 *
 * Schema wrapper for the database entity type.
 * This allows using the entity in RPC definitions.
 */
export const UserSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  name: Schema.NullOr(Schema.String),
  createdAt: Schema.DateFromSelf,
  updatedAt: Schema.DateFromSelf
}).pipe(
  Schema.annotations({
    identifier: "User",
    title: "User Entity",
    description: "A User entity from the database"
  })
)

export type UserEntity = Schema.Schema.Type<typeof UserSchema>

// ============================================================================
// Request/Response Schemas
// ============================================================================
/**
 * Pagination parameters for list operations
 */
export const PaginationParams = Schema.Struct({
  page: Schema.optionalWith(Schema.Number.pipe(Schema.int(), Schema.positive()), {
    default: () => 1
  }),
  pageSize: Schema.optionalWith(
    Schema.Number.pipe(Schema.int(), Schema.positive(), Schema.lessThanOrEqualTo(100)),
    { default: () => 20 }
  )
})

/**
 * Paginated response wrapper
 */
export const PaginatedResponse = <T extends Schema.Schema.Any>(itemSchema: T) =>
  Schema.Struct({
    items: Schema.Array(itemSchema),
    total: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
    page: Schema.Number.pipe(Schema.int(), Schema.positive()),
    pageSize: Schema.Number.pipe(Schema.int(), Schema.positive()),
    hasMore: Schema.Boolean
  })

/**
 * Create User input schema
 */
export const CreateUserInput = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255))
  // TODO: Add domain-specific creation fields
}).pipe(
  Schema.annotations({
    identifier: "CreateUserInput",
    title: "Create User Input",
    description: "Input data for creating a new User"
  })
)

export type CreateUserInput = Schema.Schema.Type<typeof CreateUserInput>

/**
 * Update User input schema
 */
export const UpdateUserInput = Schema.Struct({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)))
  // TODO: Add domain-specific update fields
}).pipe(
  Schema.annotations({
    identifier: "UpdateUserInput",
    title: "Update User Input",
    description: "Input data for updating an existing User"
  })
)

export type UpdateUserInput = Schema.Schema.Type<typeof UpdateUserInput>

/**
 * Validation request schema (for service-to-service)
 */
export const ValidateUserInput = Schema.Struct({
  userId: UserId,
  validationType: Schema.optional(Schema.String)
}).pipe(
  Schema.annotations({
    identifier: "ValidateUserInput",
    title: "Validate User Input",
    description: "Input for validating a User entity"
  })
)

export type ValidateUserInput = Schema.Schema.Type<typeof ValidateUserInput>

/**
 * Validation response schema
 */
export const ValidationResponse = Schema.Struct({
  valid: Schema.Boolean,
  userId: UserId,
  validatedAt: Schema.DateTimeUtc,
  errors: Schema.optional(Schema.Array(Schema.String))
}).pipe(
  Schema.annotations({
    identifier: "ValidationResponse",
    title: "Validation Response",
    description: "Result of User validation"
  })
)

export type ValidationResponse = Schema.Schema.Type<typeof ValidationResponse>

/**
 * Bulk get request schema (for service-to-service)
 */
export const BulkGetUserInput = Schema.Struct({
  ids: Schema.Array(UserId).pipe(Schema.minItems(1), Schema.maxItems(100))
}).pipe(
  Schema.annotations({
    identifier: "BulkGetUserInput",
    title: "Bulk Get User Input",
    description: "Input for fetching multiple Users by ID"
  })
)

export type BulkGetUserInput = Schema.Schema.Type<typeof BulkGetUserInput>

// ============================================================================
// RPC Definitions (Contract-First)
// ============================================================================
/**
 * Get User by ID
 *
 * @route public - No authentication required
 */
export class GetUser extends Rpc.make("GetUser", {
  payload: Schema.Struct({
    id: UserId
  }),
  success: UserSchema,
  error: UserRpcError
}) {
  static readonly [RouteTag]: RouteType = "public"
}

/**
 * List Users with pagination
 *
 * @route public - No authentication required
 */
export class ListUsers extends Rpc.make("ListUsers", {
  payload: PaginationParams,
  success: PaginatedResponse(UserSchema),
  error: UserRpcError
}) {
  static readonly [RouteTag]: RouteType = "public"
}

/**
 * Create a new User
 *
 * @route protected - Requires user authentication
 */
export class CreateUser extends Rpc.make("CreateUser", {
  payload: CreateUserInput,
  success: UserSchema,
  error: UserRpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}

/**
 * Update an existing User
 *
 * @route protected - Requires user authentication
 */
export class UpdateUser extends Rpc.make("UpdateUser", {
  payload: Schema.Struct({
    id: UserId,
    data: UpdateUserInput
  }),
  success: UserSchema,
  error: UserRpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}

/**
 * Delete a User
 *
 * @route protected - Requires user authentication
 */
export class DeleteUser extends Rpc.make("DeleteUser", {
  payload: Schema.Struct({
    id: UserId
  }),
  success: Schema.Struct({
    success: Schema.Literal(true),
    deletedAt: Schema.DateTimeUtc
  }),
  error: UserRpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}

// ============================================================================
// Service-to-Service RPC Definitions
// ============================================================================
/**
 * Validate a User entity
 *
 * @route service - Requires service authentication
 */
export class ValidateUser extends Rpc.make("ValidateUser", {
  payload: ValidateUserInput,
  success: ValidationResponse,
  error: UserRpcError
}) {
  static readonly [RouteTag]: RouteType = "service"
}

/**
 * Fetch multiple Users by ID (batch operation)
 *
 * @route service - Requires service authentication
 */
export class BulkGetUsers extends Rpc.make("BulkGetUsers", {
  payload: BulkGetUserInput,
  success: Schema.Struct({
    items: Schema.Array(UserSchema),
    notFound: Schema.Array(UserId)
  }),
  error: UserRpcError
}) {
  static readonly [RouteTag]: RouteType = "service"
}
