/**
 * RPC Template
 *
 * Generates rpc/rpc.ts file for feature libraries.
 *
 * Uses native @effect/rpc with RpcMiddleware.Tag for per-RPC auth.
 *
 * @module monorepo-library-generator/feature/rpc-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { FeatureTemplateOptions } from '../../../utils/types';

/**
 * Generate rpc/rpc.ts file for feature library
 *
 * Creates RPC group definition with request/response schemas.
 * Uses native @effect/rpc patterns with per-RPC middleware.
 */
export function generateRpcFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, name, fileName } = options;

  // Add file header
  builder.addFileHeader({
    title: `${className} RPC Group`,
    description: `RPC interface for ${name} operations.

Uses native @effect/rpc patterns:
- Rpc.make() for RPC definitions
- .middleware(AuthMiddleware) for protected routes
- RpcGroup.make() to group related operations

Protected vs Public Routes:
- Protected: Add .middleware(AuthMiddleware) after Rpc.make()
- Public: No middleware - public by default`,
  });

  // Add imports
  builder.addImports([
    { from: '@effect/rpc', imports: ['Rpc', 'RpcGroup'] },
    { from: 'effect', imports: ['Schema'] },
    { from: './errors', imports: [`${className}RpcError`] },
  ]);

  // Add infra-rpc middleware import comment
  builder.addRaw(`// Import AuthMiddleware for protected routes:
// import { AuthMiddleware, AuthError } from "@scope/infra-rpc/middleware";
`);
  builder.addBlankLine();

  builder.addSectionComment('Request/Response Schemas');

  builder.addRaw(`/**
 * Get request - fetch by ID
 */
export const Get${className}Request = Schema.Struct({
  id: Schema.String,
})

/**
 * Response schema for ${name}
 */
export const ${className}Response = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  createdAt: Schema.DateFromString,
})

/**
 * List request with pagination
 */
export const List${className}Request = Schema.Struct({
  page: Schema.optionalWith(Schema.Number.pipe(Schema.int(), Schema.positive()), {
    default: () => 1,
  }),
  pageSize: Schema.optionalWith(Schema.Number.pipe(Schema.int(), Schema.positive()), {
    default: () => 20,
  }),
})

/**
 * List response with pagination metadata
 */
export const List${className}Response = Schema.Struct({
  items: Schema.Array(${className}Response),
  total: Schema.Number,
  page: Schema.Number,
  pageSize: Schema.Number,
})

/**
 * Create request
 */
export const Create${className}Request = Schema.Struct({
  name: Schema.String,
})

/**
 * Update request
 */
export const Update${className}Request = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
})

/**
 * Delete request
 */
export const Delete${className}Request = Schema.Struct({
  id: Schema.String,
})

/**
 * Standard success response for mutations
 */
export const SuccessResponse = Schema.Struct({
  success: Schema.Literal(true),
})
`);

  builder.addSectionComment('RPC Definitions');

  builder.addRaw(`/**
 * RPC operations for ${name}
 *
 * Each operation is defined with Rpc.make() and can have middleware attached.
 *
 * Protected Routes (require auth):
 * - Add .middleware(AuthMiddleware) to require authentication
 * - Handler will have access to CurrentUser via yield* CurrentUser
 *
 * Public Routes (no auth required):
 * - Don't add middleware - it's public by default
 *
 * @example
 * \`\`\`typescript
 * // Protected route
 * class Create${className} extends Rpc.make("Create${className}", {
 *   payload: Create${className}Request,
 *   success: ${className}Response,
 *   error: Schema.Union(${className}RpcError, AuthError),
 * }).middleware(AuthMiddleware) {}
 *
 * // Public route
 * class Get${className} extends Rpc.make("Get${className}", {
 *   payload: Get${className}Request,
 *   success: ${className}Response,
 *   error: ${className}RpcError,
 * }) {}
 * \`\`\`
 */

/**
 * Get ${name} by ID (Public)
 */
export class Get${className} extends Rpc.make("Get${className}", {
  payload: Get${className}Request,
  success: ${className}Response,
  error: ${className}RpcError,
}) {}

/**
 * List ${name}s with pagination (Public)
 */
export class List${className} extends Rpc.make("List${className}", {
  payload: List${className}Request,
  success: List${className}Response,
  error: ${className}RpcError,
}) {}

/**
 * Create new ${name} (Protected - uncomment .middleware to enable auth)
 *
 * @example To make protected, import AuthMiddleware and add:
 * \`\`\`typescript
 * export class Create${className} extends Rpc.make(...).middleware(AuthMiddleware) {}
 * \`\`\`
 */
export class Create${className} extends Rpc.make("Create${className}", {
  payload: Create${className}Request,
  success: ${className}Response,
  error: ${className}RpcError,
}) {}
// To protect: .middleware(AuthMiddleware)

/**
 * Update ${name} (Protected - uncomment .middleware to enable auth)
 */
export class Update${className} extends Rpc.make("Update${className}", {
  payload: Update${className}Request,
  success: ${className}Response,
  error: ${className}RpcError,
}) {}
// To protect: .middleware(AuthMiddleware)

/**
 * Delete ${name} (Protected - uncomment .middleware to enable auth)
 */
export class Delete${className} extends Rpc.make("Delete${className}", {
  payload: Delete${className}Request,
  success: SuccessResponse,
  error: ${className}RpcError,
}) {}
// To protect: .middleware(AuthMiddleware)
`);

  builder.addSectionComment('RPC Group');

  builder.addRaw(`/**
 * ${className} RPC Group
 *
 * Groups all ${name} RPC operations for registration with the router.
 *
 * @example
 * \`\`\`typescript
 * import { RpcRouter } from "@effect/rpc";
 * import { ${className}Rpcs } from "@scope/contract-${fileName}/rpc";
 *
 * // Create router with multiple groups
 * const router = RpcRouter.make(${className}Rpcs, OtherRpcs);
 * \`\`\`
 */
export const ${className}Rpcs = RpcGroup.make(
  Get${className},
  List${className},
  Create${className},
  Update${className},
  Delete${className}
)
`);

  builder.addSectionComment('Type Exports');

  builder.addRaw(`// Type exports for consumers
export type Get${className}RequestType = typeof Get${className}Request.Type
export type ${className}ResponseType = typeof ${className}Response.Type
export type List${className}RequestType = typeof List${className}Request.Type
export type List${className}ResponseType = typeof List${className}Response.Type
export type Create${className}RequestType = typeof Create${className}Request.Type
export type Update${className}RequestType = typeof Update${className}Request.Type
export type Delete${className}RequestType = typeof Delete${className}Request.Type
`);

  return builder.toString();
}
