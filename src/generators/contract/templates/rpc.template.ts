/**
 * Contract RPC Template
 *
 * Generates rpc.ts file for contract libraries with RPC request/response
 * schemas using Schema for network serialization.
 *
 * @module monorepo-library-generator/contract/rpc-template
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { ContractTemplateOptions } from "../../../utils/shared/types"

/**
 * Generate rpc.ts file for contract library
 *
 * Creates RPC schemas with:
 * - Request/Response schemas for CRUD operations
 * - Schema.TaggedError for serializable errors
 * - Type exports for all schemas
 */
export function generateRpcFile(options: ContractTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, propertyName } = options

  // Add file header
  builder.addRaw(createFileHeader(className, fileName))
  builder.addBlankLine()

  // Add imports
  builder.addImports([{ from: "effect", imports: ["Schema"] }])

  builder.addImports([
    { from: "./entities", imports: [`${className}Id`], isTypeOnly: true }
  ])

  builder.addBlankLine()

  // ============================================================================
  // SECTION 1: Request/Response Schemas
  // ============================================================================

  builder.addSectionComment(
    "Request/Response Schemas (Serializable over network)"
  )
  builder.addBlankLine()

  // Get schemas
  builder.addRaw(createGetSchemas(className, propertyName))
  builder.addBlankLine()

  // List schemas
  builder.addRaw(createListSchemas(className))
  builder.addBlankLine()

  // Create schemas
  builder.addRaw(createCreateSchemas(className))
  builder.addBlankLine()

  // Update schemas
  builder.addRaw(createUpdateSchemas(className, propertyName))
  builder.addBlankLine()

  // Delete schemas
  builder.addRaw(createDeleteSchemas(className, propertyName))
  builder.addBlankLine()

  // ============================================================================
  // SECTION 2: RPC Errors (Schema.TaggedError for serialization)
  // ============================================================================

  builder.addSectionComment(
    "RPC Errors (Schema.TaggedError for serialization)"
  )
  builder.addBlankLine()

  builder.addRaw(createRpcErrors(className, propertyName))

  return builder.toString()
}

/**
 * Create file header
 */
function createFileHeader(
  className: string,
  fileName: string
) {
  return `/**
 * ${className} RPC Schemas
 *
 * Request/Response types for network boundaries and RPC communication.
 * Uses Schema.TaggedError for serializable errors (not Data.TaggedError).
 *
 * TODO: Customize for your domain:
 * 1. Define request/response schemas for each RPC procedure
 * 2. Add Schema.annotations() for OpenAPI/RPC documentation
 * 3. Add Schema.TaggedError types for RPC-serializable errors
 * 4. Add validation rules for inputs
 * 5. Document error codes and recovery strategies
 *
 * @module @custom-repo/contract-${fileName}/rpc
 */`
}

/**
 * Create Get schemas
 */
function createGetSchemas(className: string, propertyName: string) {
  return `/**
 * Request schema for getting a single ${className}
 */
export const Get${className}Request = Schema.Struct({
  /** ${className} ID to fetch (branded type for type safety) */
  ${propertyName}Id: ${className}Id.annotations({
    title: "${className} ID",
    description: "Branded UUID of the ${className} to retrieve"
  }),
}).pipe(
  Schema.annotations({
    identifier: "Get${className}Request",
    title: "Get ${className} Request",
    description: "RPC request to fetch a single ${className} by ID"
  })
);

export type Get${className}Request = Schema.Schema.Type<typeof Get${className}Request>;

/**
 * Response schema for getting a single ${className}
 */
export const Get${className}Response = Schema.Struct({
  /** Fetched ${className} data */
  ${propertyName}: Schema.Unknown.annotations({
    title: "${className} Data",
    description: "The fetched ${className} entity"
  }), // TODO: Define ${className} response shape

  /** Response timestamp */
  timestamp: Schema.DateTimeUtc.annotations({
    title: "Timestamp",
    description: "Response timestamp in UTC"
  }),
}).pipe(
  Schema.annotations({
    identifier: "Get${className}Response",
    title: "Get ${className} Response",
    description: "RPC response containing the requested ${className}"
  })
);

export type Get${className}Response = Schema.Schema.Type<typeof Get${className}Response>;`
}

/**
 * Create List schemas
 */
function createListSchemas(className: string) {
  return `/**
 * Request schema for listing ${className}s
 */
export const List${className}sRequest = Schema.Struct({
  /** Page number (1-indexed) */
  page: Schema.Number.pipe(
    Schema.int(),
    Schema.positive()
  ).annotations({
    title: "Page Number",
    description: "Page number (1-indexed)",
    jsonSchema: { minimum: 1 }
  }),

  /** Items per page */
  limit: Schema.Number.pipe(
    Schema.int(),
    Schema.positive(),
    Schema.lessThanOrEqualTo(100)
  ).annotations({
    title: "Page Limit",
    description: "Number of items per page (max 100)",
    jsonSchema: { minimum: 1, maximum: 100 }
  }),

  // TODO: Add domain-specific filter fields with Schema.annotations()
}).pipe(
  Schema.annotations({
    identifier: "List${className}sRequest",
    title: "List ${className}s Request",
    description: "RPC request to list ${className}s with pagination"
  })
);

export type List${className}sRequest = Schema.Schema.Type<typeof List${className}sRequest>;

/**
 * Response schema for listing ${className}s
 */
export const List${className}sResponse = Schema.Struct({
  /** Array of ${className} items */
  items: Schema.Array(Schema.Unknown).annotations({
    title: "Items",
    description: "Array of ${className} items"
  }), // TODO: Define item shape

  /** Total count of items matching filters */
  total: Schema.Number.annotations({
    title: "Total Count",
    description: "Total number of items matching the query"
  }),

  /** Current page number */
  page: Schema.Number.annotations({
    title: "Current Page",
    description: "The current page number"
  }),

  /** Items per page */
  limit: Schema.Number.annotations({
    title: "Page Limit",
    description: "Number of items per page"
  }),

  /** Whether more pages exist */
  hasMore: Schema.Boolean.annotations({
    title: "Has More",
    description: "True if more pages are available"
  }),

  /** Response timestamp */
  timestamp: Schema.DateTimeUtc.annotations({
    title: "Timestamp",
    description: "Response timestamp in UTC"
  }),
}).pipe(
  Schema.annotations({
    identifier: "List${className}sResponse",
    title: "List ${className}s Response",
    description: "RPC response containing paginated list of ${className}s"
  })
);

export type List${className}sResponse = Schema.Schema.Type<typeof List${className}sResponse>;`
}

/**
 * Create Create schemas
 */
function createCreateSchemas(className: string) {
  return `/**
 * Request schema for creating a ${className}
 */
export const Create${className}Request = Schema.Struct({
  /** ${className} name */
  name: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(255)
  ).annotations({
    title: "${className} Name",
    description: "Name for the new ${className}",
    jsonSchema: { minLength: 1, maxLength: 255 }
  }),

  // TODO: Add domain-specific creation fields with Schema.annotations()
}).pipe(
  Schema.annotations({
    identifier: "Create${className}Request",
    title: "Create ${className} Request",
    description: "RPC request to create a new ${className}"
  })
);

export type Create${className}Request = Schema.Schema.Type<typeof Create${className}Request>;

/**
 * Response schema for creating a ${className}
 */
export const Create${className}Response = Schema.Struct({
  /** Created ${className} data */
  ${className.toLowerCase()}: Schema.Unknown.annotations({
    title: "Created ${className}",
    description: "The newly created ${className} entity"
  }), // TODO: Define ${className} response shape

  /** Response timestamp */
  timestamp: Schema.DateTimeUtc.annotations({
    title: "Timestamp",
    description: "Response timestamp in UTC"
  }),
}).pipe(
  Schema.annotations({
    identifier: "Create${className}Response",
    title: "Create ${className} Response",
    description: "RPC response containing the created ${className}"
  })
);

export type Create${className}Response = Schema.Schema.Type<typeof Create${className}Response>;`
}

/**
 * Create Update schemas
 */
function createUpdateSchemas(className: string, propertyName: string) {
  return `/**
 * Request schema for updating a ${className}
 */
export const Update${className}Request = Schema.Struct({
  /** ${className} ID to update (branded type for type safety) */
  ${propertyName}Id: ${className}Id.annotations({
    title: "${className} ID",
    description: "Branded UUID of the ${className} to update"
  }),

  /** Fields to update */
  updates: Schema.Record({
    key: Schema.String,
    value: Schema.Unknown,
  }).annotations({
    title: "Updates",
    description: "Key-value pairs of fields to update"
  }),

  // TODO: Add specific update fields with Schema.annotations()
}).pipe(
  Schema.annotations({
    identifier: "Update${className}Request",
    title: "Update ${className} Request",
    description: "RPC request to update an existing ${className}"
  })
);

export type Update${className}Request = Schema.Schema.Type<typeof Update${className}Request>;

/**
 * Response schema for updating a ${className}
 */
export const Update${className}Response = Schema.Struct({
  /** Updated ${className} data */
  ${propertyName}: Schema.Unknown.annotations({
    title: "Updated ${className}",
    description: "The updated ${className} entity"
  }), // TODO: Define ${className} response shape

  /** Response timestamp */
  timestamp: Schema.DateTimeUtc.annotations({
    title: "Timestamp",
    description: "Response timestamp in UTC"
  }),
}).pipe(
  Schema.annotations({
    identifier: "Update${className}Response",
    title: "Update ${className} Response",
    description: "RPC response containing the updated ${className}"
  })
);

export type Update${className}Response = Schema.Schema.Type<typeof Update${className}Response>;`
}

/**
 * Create Delete schemas
 */
function createDeleteSchemas(className: string, propertyName: string) {
  return `/**
 * Request schema for deleting a ${className}
 */
export const Delete${className}Request = Schema.Struct({
  /** ${className} ID to delete (branded type for type safety) */
  ${propertyName}Id: ${className}Id.annotations({
    title: "${className} ID",
    description: "Branded UUID of the ${className} to delete"
  }),

  /** Reason for deletion (optional) */
  reason: Schema.optional(Schema.String).annotations({
    title: "Deletion Reason",
    description: "Optional reason for deleting this ${className}"
  }),
}).pipe(
  Schema.annotations({
    identifier: "Delete${className}Request",
    title: "Delete ${className} Request",
    description: "RPC request to delete a ${className}"
  })
);

export type Delete${className}Request = Schema.Schema.Type<typeof Delete${className}Request>;

/**
 * Response schema for deleting a ${className}
 */
export const Delete${className}Response = Schema.Struct({
  /** Success flag */
  success: Schema.Boolean.annotations({
    title: "Success",
    description: "True if deletion was successful"
  }),

  /** Response timestamp */
  timestamp: Schema.DateTimeUtc.annotations({
    title: "Timestamp",
    description: "Response timestamp in UTC"
  }),
}).pipe(
  Schema.annotations({
    identifier: "Delete${className}Response",
    title: "Delete ${className} Response",
    description: "RPC response confirming deletion"
  })
);

export type Delete${className}Response = Schema.Schema.Type<typeof Delete${className}Response>;`
}

/**
 * Create RPC errors
 */
function createRpcErrors(className: string, propertyName: string) {
  return `/**
 * RPC error for ${className} not found
 *
 * Uses Schema.TaggedError for network serialization (unlike Data.TaggedError in errors.ts)
 */
export class ${className}NotFoundRpcError extends Schema.TaggedError<${className}NotFoundRpcError>()(
  "${className}NotFoundRpcError",
  {
    message: Schema.String.annotations({
      title: "Error Message",
      description: "Human-readable error message"
    }),
    ${propertyName}Id: Schema.String.annotations({
      title: "${className} ID",
      description: "ID of the ${className} that was not found"
    }),
  },
  Schema.annotations({
    identifier: "${className}NotFoundRpcError",
    title: "${className} Not Found Error",
    description: "RPC error thrown when a ${className} is not found"
  })
) {
  static create(${propertyName}Id: ${className}Id) {
    return new ${className}NotFoundRpcError({
      message: \`${className} not found: \${${propertyName}Id}\`,
      ${propertyName}Id,
    });
  }
}

/**
 * RPC error for ${className} validation failures
 */
export class ${className}ValidationRpcError extends Schema.TaggedError<${className}ValidationRpcError>()(
  "${className}ValidationRpcError",
  {
    message: Schema.String.annotations({
      title: "Error Message",
      description: "Human-readable validation error message"
    }),
    field: Schema.optional(Schema.String).annotations({
      title: "Field Name",
      description: "Name of the field that failed validation"
    }),
    constraint: Schema.optional(Schema.String).annotations({
      title: "Constraint",
      description: "Validation constraint that was violated"
    }),
  },
  Schema.annotations({
    identifier: "${className}ValidationRpcError",
    title: "${className} Validation Error",
    description: "RPC error thrown when ${className} validation fails"
  })
) {
  static create(params: { message: string; field?: string; constraint?: string }) {
    return new ${className}ValidationRpcError(params);
  }
}

/**
 * Union of all ${className} RPC errors (serializable)
 */
export type ${className}RpcError =
  | ${className}NotFoundRpcError
  | ${className}ValidationRpcError;

// TODO: Add more RPC-specific errors as needed`
}
