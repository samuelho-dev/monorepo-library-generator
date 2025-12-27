/**
 * Contract RPC Definitions Template Definition
 *
 * Declarative template for generating rpc-definitions.ts in contract libraries.
 * Contains @effect/rpc Rpc.make patterns with RouteTag for contract-first architecture.
 *
 * @module monorepo-library-generator/templates/definitions/contract/rpc-definitions
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Contract RPC Definitions Template Definition
 *
 * Generates a complete rpc-definitions.ts file with:
 * - Branded ID type ({className}Id)
 * - RouteTag system for middleware selection
 * - Entity schema wrapper
 * - Request/Response schemas (pagination, input types)
 * - CRUD RPC definitions (Get, List, Create, Update, Delete)
 * - Service-to-service RPC definitions (Validate, BulkGet)
 */
export const contractRpcDefinitionsTemplate: TemplateDefinition = {
  id: "contract/rpc-definitions",
  meta: {
    title: "{className} RPC Definitions",
    description: `Contract-first RPC definitions using @effect/rpc.
This is the single source of truth for {className} RPC operations.

Route Types:
- "public": No authentication required
- "protected": User authentication required (CurrentUser)
- "service": Service-to-service authentication (ServiceContext)

Usage in feature handlers:
\`\`\`typescript
import { {className}Rpcs, Get{className} } from "{scope}/contract-{fileName}";

export const {className}Handlers = {className}Rpcs.toLayer({
  Get{className}: (input) => Effect.flatMap({className}Service, s => s.get(input.id)),
})
\`\`\``,
    module: "{scope}/contract-{fileName}/rpc"
  },
  imports: [
    { from: "@effect/rpc", items: ["Rpc"] },
    { from: "effect", items: ["Schema"] },
    { from: "./rpc-errors", items: ["{className}RpcError"] }
  ],
  sections: [
    // Branded ID Type
    {
      title: "Branded ID Type",
      content: {
        type: "raw",
        value: `/**
 * {className} ID Schema
 *
 * Branded ID type for type-safe entity identification.
 * Uses Schema.String as base - compatible with UUID, CUID, or any string ID.
 *
 * For stricter validation (e.g., UUID format), use @customType annotation
 * in your Prisma schema:
 *
 * @example
 * \`\`\`prisma
 * model {className} {
 *   /// @customType(Schema.UUID.pipe(Schema.brand('{className}Id')))
 *   id String @id @default(uuid())
 * }
 * \`\`\`
 */
export const {className}Id = Schema.String.pipe(
  Schema.brand("{className}Id"),
  Schema.annotations({
    identifier: "{className}Id",
    title: "{className} ID",
    description: "Unique identifier for {className} entity"
  })
)

export type {className}Id = Schema.Schema.Type<typeof {className}Id>`
      }
    },
    // Route Tag System
    {
      title: "Route Tag System",
      content: {
        type: "raw",
        value: `/**
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
 * \`\`\`typescript
 * const routeType = Get{className}[RouteTag] // "public"
 * \`\`\`
 */
export const RouteTag = Symbol.for("@contract/RouteTag")`
      }
    },
    // Entity Schema
    {
      title: "Entity Schema",
      content: {
        type: "raw",
        value: `/**
 * {className} Entity Schema
 *
 * Schema wrapper for the database entity type.
 * This allows using the entity in RPC definitions.
 */
export const {className}Schema = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  name: Schema.NullOr(Schema.String),
  createdAt: Schema.DateFromSelf,
  updatedAt: Schema.DateFromSelf
}).pipe(
  Schema.annotations({
    identifier: "{className}",
    title: "{className} Entity",
    description: "A {className} entity from the database"
  })
)

export type {className}Entity = Schema.Schema.Type<typeof {className}Schema>`
      }
    },
    // Request/Response Schemas
    {
      title: "Request/Response Schemas",
      content: {
        type: "raw",
        value: `/**
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
 * Create {className} input schema
 */
export const Create{className}Input = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255))
  // TODO: Add domain-specific creation fields
}).pipe(
  Schema.annotations({
    identifier: "Create{className}Input",
    title: "Create {className} Input",
    description: "Input data for creating a new {className}"
  })
)

export type Create{className}Input = Schema.Schema.Type<typeof Create{className}Input>

/**
 * Update {className} input schema
 */
export const Update{className}Input = Schema.Struct({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)))
  // TODO: Add domain-specific update fields
}).pipe(
  Schema.annotations({
    identifier: "Update{className}Input",
    title: "Update {className} Input",
    description: "Input data for updating an existing {className}"
  })
)

export type Update{className}Input = Schema.Schema.Type<typeof Update{className}Input>

/**
 * Validation request schema (for service-to-service)
 */
export const Validate{className}Input = Schema.Struct({
  {propertyName}Id: {className}Id,
  validationType: Schema.optional(Schema.String)
}).pipe(
  Schema.annotations({
    identifier: "Validate{className}Input",
    title: "Validate {className} Input",
    description: "Input for validating a {className} entity"
  })
)

export type Validate{className}Input = Schema.Schema.Type<typeof Validate{className}Input>

/**
 * Validation response schema
 */
export const ValidationResponse = Schema.Struct({
  valid: Schema.Boolean,
  {propertyName}Id: {className}Id,
  validatedAt: Schema.DateTimeUtc,
  errors: Schema.optional(Schema.Array(Schema.String))
}).pipe(
  Schema.annotations({
    identifier: "ValidationResponse",
    title: "Validation Response",
    description: "Result of {className} validation"
  })
)

export type ValidationResponse = Schema.Schema.Type<typeof ValidationResponse>

/**
 * Bulk get request schema (for service-to-service)
 */
export const BulkGet{className}Input = Schema.Struct({
  ids: Schema.Array({className}Id).pipe(Schema.minItems(1), Schema.maxItems(100))
}).pipe(
  Schema.annotations({
    identifier: "BulkGet{className}Input",
    title: "Bulk Get {className} Input",
    description: "Input for fetching multiple {className}s by ID"
  })
)

export type BulkGet{className}Input = Schema.Schema.Type<typeof BulkGet{className}Input>`
      }
    },
    // RPC Definitions - CRUD
    {
      title: "RPC Definitions (Contract-First)",
      content: {
        type: "raw",
        value: `/**
 * Get {className} by ID
 *
 * @route public - No authentication required
 */
export class Get{className} extends Rpc.make("Get{className}", {
  payload: Schema.Struct({
    id: {className}Id
  }),
  success: {className}Schema,
  error: {className}RpcError
}) {
  static readonly [RouteTag]: RouteType = "public"
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * List {className}s with pagination
 *
 * @route public - No authentication required
 */
export class List{className}s extends Rpc.make("List{className}s", {
  payload: PaginationParams,
  success: PaginatedResponse({className}Schema),
  error: {className}RpcError
}) {
  static readonly [RouteTag]: RouteType = "public"
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Create a new {className}
 *
 * @route protected - Requires user authentication
 */
export class Create{className} extends Rpc.make("Create{className}", {
  payload: Create{className}Input,
  success: {className}Schema,
  error: {className}RpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Update an existing {className}
 *
 * @route protected - Requires user authentication
 */
export class Update{className} extends Rpc.make("Update{className}", {
  payload: Schema.Struct({
    id: {className}Id,
    data: Update{className}Input
  }),
  success: {className}Schema,
  error: {className}RpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Delete a {className}
 *
 * @route protected - Requires user authentication
 */
export class Delete{className} extends Rpc.make("Delete{className}", {
  payload: Schema.Struct({
    id: {className}Id
  }),
  success: Schema.Struct({
    success: Schema.Literal(true),
    deletedAt: Schema.DateTimeUtc
  }),
  error: {className}RpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}`
      }
    },
    // Service-to-Service RPCs
    {
      title: "Service-to-Service RPC Definitions",
      content: {
        type: "raw",
        value: `/**
 * Validate a {className} entity
 *
 * @route service - Requires service authentication
 */
export class Validate{className} extends Rpc.make("Validate{className}", {
  payload: Validate{className}Input,
  success: ValidationResponse,
  error: {className}RpcError
}) {
  static readonly [RouteTag]: RouteType = "service"
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Fetch multiple {className}s by ID (batch operation)
 *
 * @route service - Requires service authentication
 */
export class BulkGet{className}s extends Rpc.make("BulkGet{className}s", {
  payload: BulkGet{className}Input,
  success: Schema.Struct({
    items: Schema.Array({className}Schema),
    notFound: Schema.Array({className}Id)
  }),
  error: {className}RpcError
}) {
  static readonly [RouteTag]: RouteType = "service"
}`
      }
    }
  ]
}

export default contractRpcDefinitionsTemplate
