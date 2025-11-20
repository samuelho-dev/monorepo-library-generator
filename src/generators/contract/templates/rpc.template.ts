/**
 * Contract RPC Template
 *
 * Generates rpc.ts file for contract libraries with RPC request/response
 * schemas using Schema for network serialization.
 *
 * @module monorepo-library-generator/contract/rpc-template
 */

import { TypeScriptBuilder } from '../../../utils/code-generation/typescript-builder';
import type { ContractTemplateOptions } from '../../../utils/shared/types';

/**
 * Generate rpc.ts file for contract library
 *
 * Creates RPC schemas with:
 * - Request/Response schemas for CRUD operations
 * - Schema.TaggedError for serializable errors
 * - Type exports for all schemas
 */
export function generateRpcFile(options: ContractTemplateOptions): string {
  const builder = new TypeScriptBuilder();
  const { className, fileName, propertyName } = options;
  const domainName = propertyName;

  // Add file header
  builder.addRaw(createFileHeader(className, domainName, fileName));
  builder.addBlankLine();

  // Add imports
  builder.addImports([{ from: 'effect', imports: ['Schema'] }]);

  builder.addImports([
    { from: './entities', imports: [`${className}Id`], isTypeOnly: true },
  ]);

  builder.addBlankLine();

  // ============================================================================
  // SECTION 1: Request/Response Schemas
  // ============================================================================

  builder.addSectionComment(
    'Request/Response Schemas (Serializable over network)',
  );
  builder.addBlankLine();

  // Get schemas
  builder.addRaw(createGetSchemas(className, propertyName));
  builder.addBlankLine();

  // List schemas
  builder.addRaw(createListSchemas(className));
  builder.addBlankLine();

  // Create schemas
  builder.addRaw(createCreateSchemas(className));
  builder.addBlankLine();

  // Update schemas
  builder.addRaw(createUpdateSchemas(className, propertyName));
  builder.addBlankLine();

  // Delete schemas
  builder.addRaw(createDeleteSchemas(className, propertyName));
  builder.addBlankLine();

  // ============================================================================
  // SECTION 2: RPC Errors (Schema.TaggedError for serialization)
  // ============================================================================

  builder.addSectionComment(
    'RPC Errors (Schema.TaggedError for serialization)',
  );
  builder.addBlankLine();

  builder.addRaw(createRpcErrors(className, propertyName));

  return builder.toString();
}

/**
 * Create file header
 */
function createFileHeader(
  className: string,
  domainName: string,
  fileName: string,
): string {
  return `/**
 * ${className} RPC Schemas
 *
 * Request/Response types for network boundaries and RPC communication.
 * Uses Schema.TaggedError for serializable errors (not Data.TaggedError).
 *
 * TODO: Customize for your domain:
 * 1. Define request/response schemas for each RPC procedure
 * 2. Add Schema.TaggedError types for RPC-serializable errors
 * 3. Add validation rules for inputs
 * 4. Document error codes and recovery strategies
 *
 * @module @custom-repo/contract-${fileName}/rpc
 */`;
}

/**
 * Create Get schemas
 */
function createGetSchemas(className: string, propertyName: string): string {
  return `/**
 * Request schema for getting a single ${className}
 */
export const Get${className}Request = Schema.Struct({
  /** ${className} ID to fetch */
  ${propertyName}Id: Schema.UUID,
});

export type Get${className}Request = Schema.Schema.Type<typeof Get${className}Request>;

/**
 * Response schema for getting a single ${className}
 */
export const Get${className}Response = Schema.Struct({
  /** Fetched ${className} data */
  ${propertyName}: Schema.Unknown, // TODO: Define ${className} response shape

  /** Response timestamp */
  timestamp: Schema.DateTimeUtc,
});

export type Get${className}Response = Schema.Schema.Type<typeof Get${className}Response>;`;
}

/**
 * Create List schemas
 */
function createListSchemas(className: string): string {
  return `/**
 * Request schema for listing ${className}s
 */
export const List${className}sRequest = Schema.Struct({
  /** Page number (1-indexed) */
  page: Schema.Number.pipe(Schema.int(), Schema.positive()),

  /** Items per page */
  limit: Schema.Number.pipe(
    Schema.int(),
    Schema.positive(),
    Schema.lessThanOrEqualTo(100)
  ),

  // TODO: Add domain-specific filter fields
});

export type List${className}sRequest = Schema.Schema.Type<typeof List${className}sRequest>;

/**
 * Response schema for listing ${className}s
 */
export const List${className}sResponse = Schema.Struct({
  /** Array of ${className} items */
  items: Schema.Array(Schema.Unknown), // TODO: Define item shape

  /** Total count of items matching filters */
  total: Schema.Number,

  /** Current page number */
  page: Schema.Number,

  /** Items per page */
  limit: Schema.Number,

  /** Whether more pages exist */
  hasMore: Schema.Boolean,

  /** Response timestamp */
  timestamp: Schema.DateTimeUtc,
});

export type List${className}sResponse = Schema.Schema.Type<typeof List${className}sResponse>;`;
}

/**
 * Create Create schemas
 */
function createCreateSchemas(className: string): string {
  return `/**
 * Request schema for creating a ${className}
 */
export const Create${className}Request = Schema.Struct({
  /** ${className} name */
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),

  // TODO: Add domain-specific creation fields
});

export type Create${className}Request = Schema.Schema.Type<typeof Create${className}Request>;

/**
 * Response schema for creating a ${className}
 */
export const Create${className}Response = Schema.Struct({
  /** Created ${className} data */
  ${className.toLowerCase()}: Schema.Unknown, // TODO: Define ${className} response shape

  /** Response timestamp */
  timestamp: Schema.DateTimeUtc,
});

export type Create${className}Response = Schema.Schema.Type<typeof Create${className}Response>;`;
}

/**
 * Create Update schemas
 */
function createUpdateSchemas(className: string, propertyName: string): string {
  return `/**
 * Request schema for updating a ${className}
 */
export const Update${className}Request = Schema.Struct({
  /** ${className} ID to update */
  ${propertyName}Id: Schema.UUID,

  /** Fields to update */
  updates: Schema.Record({
    key: Schema.String,
    value: Schema.Unknown,
  }),

  // TODO: Add specific update fields
});

export type Update${className}Request = Schema.Schema.Type<typeof Update${className}Request>;

/**
 * Response schema for updating a ${className}
 */
export const Update${className}Response = Schema.Struct({
  /** Updated ${className} data */
  ${propertyName}: Schema.Unknown, // TODO: Define ${className} response shape

  /** Response timestamp */
  timestamp: Schema.DateTimeUtc,
});

export type Update${className}Response = Schema.Schema.Type<typeof Update${className}Response>;`;
}

/**
 * Create Delete schemas
 */
function createDeleteSchemas(className: string, propertyName: string): string {
  return `/**
 * Request schema for deleting a ${className}
 */
export const Delete${className}Request = Schema.Struct({
  /** ${className} ID to delete */
  ${propertyName}Id: Schema.UUID,

  /** Reason for deletion (optional) */
  reason: Schema.optional(Schema.String),
});

export type Delete${className}Request = Schema.Schema.Type<typeof Delete${className}Request>;

/**
 * Response schema for deleting a ${className}
 */
export const Delete${className}Response = Schema.Struct({
  /** Success flag */
  success: Schema.Boolean,

  /** Response timestamp */
  timestamp: Schema.DateTimeUtc,
});

export type Delete${className}Response = Schema.Schema.Type<typeof Delete${className}Response>;`;
}

/**
 * Create RPC errors
 */
function createRpcErrors(className: string, propertyName: string): string {
  return `/**
 * RPC error for ${className} not found
 *
 * Uses Schema.TaggedError for network serialization (unlike Data.TaggedError in errors.ts)
 */
export class ${className}NotFoundRpcError extends Schema.TaggedError<${className}NotFoundRpcError>()(
  "${className}NotFoundRpcError",
  {
    message: Schema.String,
    ${propertyName}Id: Schema.String,
  }
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
    message: Schema.String,
    field: Schema.optional(Schema.String),
    constraint: Schema.optional(Schema.String),
  }
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

// TODO: Add more RPC-specific errors as needed`;
}
