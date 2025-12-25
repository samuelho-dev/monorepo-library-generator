/**
 * Contract RPC Definitions Template
 *
 * Generates RPC definitions using the Effect RPC Rpc.make pattern with RouteTag
 * for contract-first architecture. Each RPC definition includes:
 * - Payload schema
 * - Success schema
 * - Error schema
 * - Static RouteTag for middleware selection
 *
 * This is the single source of truth for RPC definitions - feature libraries
 * import from here and implement handlers.
 *
 * @module monorepo-library-generator/contract/rpc-definitions-template
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import type { ContractTemplateOptions } from "../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"

/**
 * Generate RPC definitions file for contract library
 *
 * Creates Rpc.make definitions with:
 * - RouteTag system for middleware selection
 * - CRUD operations (Get, List, Create, Update, Delete)
 * - Service-to-service operations (Validate, BulkGet)
 * - Proper Schema types for all payloads/responses
 */
export function generateRpcDefinitionsFile(options: ContractTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, propertyName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  // File header
  builder.addRaw(`/**
 * ${className} RPC Definitions
 *
 * Contract-first RPC definitions using @effect/rpc.
 * This is the single source of truth for ${className} RPC operations.
 *
 * Route Types:
 * - "public": No authentication required
 * - "protected": User authentication required (CurrentUser)
 * - "service": Service-to-service authentication (ServiceContext)
 *
 * Usage in feature handlers:
 * \`\`\`typescript
 * import { ${className}Rpcs, Get${className} } from "${scope}/contract-${fileName}";
 *
 * export const ${className}Handlers = ${className}Rpcs.toLayer({
 *   Get${className}: (input) => Effect.flatMap(${className}Service, s => s.get(input.id)),
 * });
 * \`\`\`
 *
 * @module ${scope}/contract-${fileName}/rpc
 */`)
  builder.addBlankLine()

  // Imports
  builder.addImports([
    { from: "effect", imports: ["Schema"] },
    { from: "@effect/rpc", imports: ["Rpc"] }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Local Imports")
  builder.addRaw(`import { ${className}RpcError } from "./rpc-errors";`)
  builder.addBlankLine()

  // Define branded ID type (extracted from database schema)
  builder.addSectionComment("Branded ID Type")
  builder.addBlankLine()
  builder.addRaw(`/**
 * ${className} ID Schema
 *
 * Branded ID type for type-safe entity identification.
 * Uses Schema.String as base - compatible with UUID, CUID, or any string ID.
 *
 * For stricter validation (e.g., UUID format), use @customType annotation
 * in your Prisma schema:
 *
 * @example
 * \`\`\`prisma
 * model ${className} {
 *   /// @customType(Schema.UUID.pipe(Schema.brand('${className}Id')))
 *   id String @id @default(uuid())
 * }
 * \`\`\`
 */
export const ${className}Id = Schema.String.pipe(
  Schema.brand("${className}Id"),
  Schema.annotations({
    identifier: "${className}Id",
    title: "${className} ID",
    description: "Unique identifier for ${className} entity",
  })
);
export type ${className}Id = Schema.Schema.Type<typeof ${className}Id>;`)
  builder.addBlankLine()

  // RouteTag system
  builder.addSectionComment("Route Tag System")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Route types for middleware selection
 *
 * - "public": No authentication, only RequestMetaTag provided
 * - "protected": User authentication via Bearer token, CurrentUser provided
 * - "service": Service-to-service authentication, ServiceContext provided
 */
export type RouteType = "public" | "protected" | "service";

/**
 * Symbol for accessing route type on RPC definitions
 *
 * @example
 * \`\`\`typescript
 * const routeType = Get${className}[RouteTag]; // "public"
 * \`\`\`
 */
export const RouteTag = Symbol.for("@contract/RouteTag");`)
  builder.addBlankLine()

  // Entity Schema (from imported type)
  builder.addSectionComment("Entity Schema")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} Entity Schema
 *
 * Schema wrapper for the database entity type.
 * This allows using the entity in RPC definitions.
 */
export const ${className}Schema = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  name: Schema.NullOr(Schema.String),
  createdAt: Schema.DateFromSelf,
  updatedAt: Schema.DateFromSelf,
}).pipe(
  Schema.annotations({
    identifier: "${className}",
    title: "${className} Entity",
    description: "A ${className} entity from the database",
  })
);

export type ${className}Entity = Schema.Schema.Type<typeof ${className}Schema>;`)
  builder.addBlankLine()

  // Request/Response schemas for reuse
  builder.addSectionComment("Request/Response Schemas")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Pagination parameters for list operations
 */
export const PaginationParams = Schema.Struct({
  page: Schema.optionalWith(Schema.Number.pipe(Schema.int(), Schema.positive()), {
    default: () => 1,
  }),
  pageSize: Schema.optionalWith(
    Schema.Number.pipe(Schema.int(), Schema.positive(), Schema.lessThanOrEqualTo(100)),
    { default: () => 20 }
  ),
});

/**
 * Paginated response wrapper
 */
export const PaginatedResponse = <T extends Schema.Schema.Any>(itemSchema: T) =>
  Schema.Struct({
    items: Schema.Array(itemSchema),
    total: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
    page: Schema.Number.pipe(Schema.int(), Schema.positive()),
    pageSize: Schema.Number.pipe(Schema.int(), Schema.positive()),
    hasMore: Schema.Boolean,
  });

/**
 * Create ${className} input schema
 */
export const Create${className}Input = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  // TODO: Add domain-specific creation fields
}).pipe(
  Schema.annotations({
    identifier: "Create${className}Input",
    title: "Create ${className} Input",
    description: "Input data for creating a new ${className}",
  })
);

export type Create${className}Input = Schema.Schema.Type<typeof Create${className}Input>;

/**
 * Update ${className} input schema
 */
export const Update${className}Input = Schema.Struct({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255))),
  // TODO: Add domain-specific update fields
}).pipe(
  Schema.annotations({
    identifier: "Update${className}Input",
    title: "Update ${className} Input",
    description: "Input data for updating an existing ${className}",
  })
);

export type Update${className}Input = Schema.Schema.Type<typeof Update${className}Input>;

/**
 * Validation request schema (for service-to-service)
 */
export const Validate${className}Input = Schema.Struct({
  ${propertyName}Id: ${className}Id,
  validationType: Schema.optional(Schema.String),
}).pipe(
  Schema.annotations({
    identifier: "Validate${className}Input",
    title: "Validate ${className} Input",
    description: "Input for validating a ${className} entity",
  })
);

export type Validate${className}Input = Schema.Schema.Type<typeof Validate${className}Input>;

/**
 * Validation response schema
 */
export const ValidationResponse = Schema.Struct({
  valid: Schema.Boolean,
  ${propertyName}Id: ${className}Id,
  validatedAt: Schema.DateTimeUtc,
  errors: Schema.optional(Schema.Array(Schema.String)),
}).pipe(
  Schema.annotations({
    identifier: "ValidationResponse",
    title: "Validation Response",
    description: "Result of ${className} validation",
  })
);

export type ValidationResponse = Schema.Schema.Type<typeof ValidationResponse>;

/**
 * Bulk get request schema (for service-to-service)
 */
export const BulkGet${className}Input = Schema.Struct({
  ids: Schema.Array(${className}Id).pipe(Schema.minItems(1), Schema.maxItems(100)),
}).pipe(
  Schema.annotations({
    identifier: "BulkGet${className}Input",
    title: "Bulk Get ${className} Input",
    description: "Input for fetching multiple ${className}s by ID",
  })
);

export type BulkGet${className}Input = Schema.Schema.Type<typeof BulkGet${className}Input>;`)
  builder.addBlankLine()

  // RPC Definitions
  builder.addSectionComment("RPC Definitions (Contract-First)")
  builder.addBlankLine()

  // Get RPC (public)
  builder.addRaw(`/**
 * Get ${className} by ID
 *
 * @route public - No authentication required
 */
export class Get${className} extends Rpc.make("Get${className}", {
  payload: Schema.Struct({
    id: ${className}Id,
  }),
  success: ${className}Schema,
  error: ${className}RpcError,
}) {
  static readonly [RouteTag]: RouteType = "public";
}`)
  builder.addBlankLine()

  // List RPC (public)
  builder.addRaw(`/**
 * List ${className}s with pagination
 *
 * @route public - No authentication required
 */
export class List${className}s extends Rpc.make("List${className}s", {
  payload: PaginationParams,
  success: PaginatedResponse(${className}Schema),
  error: ${className}RpcError,
}) {
  static readonly [RouteTag]: RouteType = "public";
}`)
  builder.addBlankLine()

  // Create RPC (protected)
  builder.addRaw(`/**
 * Create a new ${className}
 *
 * @route protected - Requires user authentication
 */
export class Create${className} extends Rpc.make("Create${className}", {
  payload: Create${className}Input,
  success: ${className}Schema,
  error: ${className}RpcError,
}) {
  static readonly [RouteTag]: RouteType = "protected";
}`)
  builder.addBlankLine()

  // Update RPC (protected)
  builder.addRaw(`/**
 * Update an existing ${className}
 *
 * @route protected - Requires user authentication
 */
export class Update${className} extends Rpc.make("Update${className}", {
  payload: Schema.Struct({
    id: ${className}Id,
    data: Update${className}Input,
  }),
  success: ${className}Schema,
  error: ${className}RpcError,
}) {
  static readonly [RouteTag]: RouteType = "protected";
}`)
  builder.addBlankLine()

  // Delete RPC (protected)
  builder.addRaw(`/**
 * Delete a ${className}
 *
 * @route protected - Requires user authentication
 */
export class Delete${className} extends Rpc.make("Delete${className}", {
  payload: Schema.Struct({
    id: ${className}Id,
  }),
  success: Schema.Struct({
    success: Schema.Literal(true),
    deletedAt: Schema.DateTimeUtc,
  }),
  error: ${className}RpcError,
}) {
  static readonly [RouteTag]: RouteType = "protected";
}`)
  builder.addBlankLine()

  // Service-to-service RPCs
  builder.addSectionComment("Service-to-Service RPC Definitions")
  builder.addBlankLine()

  // Validate RPC (service)
  builder.addRaw(`/**
 * Validate a ${className} entity
 *
 * @route service - Requires service authentication
 */
export class Validate${className} extends Rpc.make("Validate${className}", {
  payload: Validate${className}Input,
  success: ValidationResponse,
  error: ${className}RpcError,
}) {
  static readonly [RouteTag]: RouteType = "service";
}`)
  builder.addBlankLine()

  // BulkGet RPC (service)
  builder.addRaw(`/**
 * Fetch multiple ${className}s by ID (batch operation)
 *
 * @route service - Requires service authentication
 */
export class BulkGet${className}s extends Rpc.make("BulkGet${className}s", {
  payload: BulkGet${className}Input,
  success: Schema.Struct({
    items: Schema.Array(${className}Schema),
    notFound: Schema.Array(${className}Id),
  }),
  error: ${className}RpcError,
}) {
  static readonly [RouteTag]: RouteType = "service";
}`)
  builder.addBlankLine()

  // Type exports
  builder.addSectionComment("RPC Type Exports")
  builder.addBlankLine()

  builder.addRaw(`/**
 * All ${className} RPC definitions
 *
 * Use these types for handler implementation type-safety.
 */
export type Get${className}Rpc = typeof Get${className};
export type List${className}sRpc = typeof List${className}s;
export type Create${className}Rpc = typeof Create${className};
export type Update${className}Rpc = typeof Update${className};
export type Delete${className}Rpc = typeof Delete${className};
export type Validate${className}Rpc = typeof Validate${className};
export type BulkGet${className}sRpc = typeof BulkGet${className}s;`)
  builder.addBlankLine()

  return builder.toString()
}
