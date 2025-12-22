/**
 * RPC Template
 *
 * Generates rpc/rpc.ts file for feature libraries.
 *
 * Uses native @effect/rpc with RpcMiddleware.Tag for per-RPC auth.
 *
 * RPC Definition Pattern:
 * - Rpc.make() for defining request/response schemas
 * - .middleware(AuthMiddleware) for protected routes (optional)
 * - RpcGroup.make() to group related operations
 *
 * @module monorepo-library-generator/feature/rpc-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { FeatureTemplateOptions } from '../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config';

/**
 * Generate rpc/rpc.ts file for feature library
 *
 * Creates RPC group definition with request/response schemas.
 * Uses native @effect/rpc patterns with per-RPC middleware.
 */
export function generateRpcFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName, name } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  // Add file header
  builder.addFileHeader({
    title: `${className} RPC Group`,
    description: `RPC interface for ${name} operations.

Uses native @effect/rpc patterns:
- Rpc.make() for RPC definitions with typed payloads
- .middleware(AuthMiddleware) for protected routes
- RpcGroup.make() to group related operations

Protected vs Public Routes:
- Protected: Uses protectedHandler in handlers.ts - requires auth
- Public: Uses publicHandler in handlers.ts - no auth required

Note: Middleware is applied at the handler level via handler factories,
not at the RPC definition level. This gives more flexibility.`,
  });

  // Add imports
  builder.addImports([
    { from: '@effect/rpc', imports: ['Rpc', 'RpcGroup'] },
    { from: 'effect', imports: ['Schema'] },
    { from: './errors', imports: [`${className}Error`] },
  ]);

  // Add AuthError import for error union types
  builder.addRaw(`// Import auth errors for protected routes
import { AuthError } from "${scope}/infra-auth";
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
 * Each operation is defined with Rpc.make().
 * Handler factories (protectedHandler/publicHandler) determine auth.
 *
 * Error Types:
 * - Public routes: Only ${className}Error
 * - Protected routes: Schema.Union(${className}Error, AuthError)
 *   (AuthError can occur if auth middleware fails)
 *
 * @example
 * \`\`\`typescript
 * // Handler for public route (no auth required)
 * Get${className}: publicHandler(({ ctx, input }) =>
 *   Effect.gen(function* () {
 *     const { id } = input;
 *     // ctx.user is null for public routes
 *     return yield* fetchById(id);
 *   })
 * )
 *
 * // Handler for protected route (auth required)
 * Create${className}: protectedHandler(({ ctx, input }) =>
 *   Effect.gen(function* () {
 *     const { name } = input;
 *     const userId = ctx.user.id; // Guaranteed to exist
 *     return yield* createWithOwner(name, userId);
 *   })
 * )
 * \`\`\`
 */

/**
 * Get ${name} by ID (Public)
 *
 * No authentication required.
 */
export class Get${className} extends Rpc.make("Get${className}", {
  payload: Get${className}Request,
  success: ${className}Response,
  error: ${className}Error,
}) {}

/**
 * List ${name}s with pagination (Public)
 *
 * No authentication required.
 */
export class List${className} extends Rpc.make("List${className}", {
  payload: List${className}Request,
  success: List${className}Response,
  error: ${className}Error,
}) {}

/**
 * Create new ${name} (Protected)
 *
 * Requires authentication. Can return AuthError.
 */
export class Create${className} extends Rpc.make("Create${className}", {
  payload: Create${className}Request,
  success: ${className}Response,
  error: Schema.Union(${className}Error, AuthError),
}) {}

/**
 * Update ${name} (Protected)
 *
 * Requires authentication. Can return AuthError.
 */
export class Update${className} extends Rpc.make("Update${className}", {
  payload: Update${className}Request,
  success: ${className}Response,
  error: Schema.Union(${className}Error, AuthError),
}) {}

/**
 * Delete ${name} (Protected)
 *
 * Requires authentication. Can return AuthError.
 */
export class Delete${className} extends Rpc.make("Delete${className}", {
  payload: Delete${className}Request,
  success: SuccessResponse,
  error: Schema.Union(${className}Error, AuthError),
}) {}
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
 * import { createNextHandler } from "${scope}/infra-rpc/transport";
 * import { ${className}Rpcs } from "${scope}/feature-${fileName}/rpc";
 * import { ${className}Handlers } from "${scope}/feature-${fileName}/rpc/handlers";
 *
 * // Create Next.js handler
 * export const { POST } = createNextHandler({
 *   groups: [${className}Rpcs],
 *   handlers: ${className}Handlers,
 *   layers: Layer.mergeAll(
 *     AuthMiddlewareLive,
 *     ${className}Service.Live
 *   )
 * });
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
