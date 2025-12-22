/**
 * RPC Handlers Template
 *
 * Generates rpc/handlers.ts file for feature libraries.
 *
 * Uses RpcGroup.toLayer for type-safe handler registration.
 *
 * @module monorepo-library-generator/feature/rpc-handlers-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { FeatureTemplateOptions } from '../../../utils/types';

/**
 * Generate rpc/handlers.ts file for feature library
 *
 * Creates RPC handler implementations using RpcGroup.toLayer pattern.
 * Handlers have access to middleware context from infra-rpc.
 */
export function generateRpcHandlersFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, name } = options;

  // Add file header
  builder.addFileHeader({
    title: `${className} RPC Handlers`,
    description: `Handler implementations for ${name} RPC operations.

Uses RpcGroup.toLayer for type-safe handler registration:
- Handlers are a Layer that provides implementations
- Access CurrentUser from protected routes via yield* CurrentUser
- Use getHandlerContext for better DX (single yield for all context)`,
  });

  // Add imports
  builder.addImports([
    { from: 'effect', imports: ['Effect', 'Layer', 'Option'] },
    {
      from: './rpc',
      imports: [`${className}Rpcs`],
    },
    { from: './errors', imports: [`${className}RpcError`] },
    { from: '../server/service', imports: [`${className}Service`] },
  ]);

  // Add infra-rpc middleware import comment
  builder.addRaw(`// Import middleware context from infra-rpc for protected routes:
// import { CurrentUser, getHandlerContext } from "@scope/infra-rpc/middleware";

/**
 * Entity type for mapping service results to RPC responses
 */
interface ${className}Entity {
  readonly id: string;
  readonly name?: string;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
  readonly [key: string]: unknown;
}
`);
  builder.addBlankLine();

  builder.addSectionComment('Handler Layer');

  builder.addRaw(`/**
 * ${className} RPC Handlers Layer
 *
 * Provides handler implementations for ${className}Rpcs.
 * Use RpcGroup.toLayer for type-safe registration.
 *
 * @example
 * \`\`\`typescript
 * // In app layer composition:
 * const appLayer = Layer.mergeAll(
 *   ${className}Handlers,
 *   OtherHandlers,
 *   AuthMiddlewareLive
 * );
 *
 * // Create HTTP app
 * const httpApp = RpcServer.toHttpApp(router).pipe(
 *   Effect.provide(appLayer)
 * );
 * \`\`\`
 */
export const ${className}Handlers = ${className}Rpcs.toLayer({
  /**
   * Get a single ${name} by ID
   */
  Get${className}: ({ id }) =>
    Effect.gen(function* () {
      // Access service from context
      const service = yield* ${className}Service;

      // Execute service operation
      const result = yield* service.get(id);

      // Handle not found
      if (Option.isNone(result)) {
        return yield* Effect.fail(
          new ${className}RpcError({
            message: \`${name} not found: \${id}\`,
            code: "NOT_FOUND",
          })
        );
      }

      // Map domain result to RPC response
      const entity = result.value as ${className}Entity;
      return {
        id: entity.id,
        name: entity.name ?? "${name}",
        createdAt: entity.createdAt?.toISOString() ?? new Date().toISOString(),
      };
    }),

  /**
   * List ${name}s with pagination
   */
  List${className}: ({ page, pageSize }) =>
    Effect.gen(function* () {
      const service = yield* ${className}Service;

      // Calculate offset from page
      const offset = (page - 1) * pageSize;

      // Execute service operation with pagination
      const items = yield* service.findByCriteria({}, offset, pageSize);
      const total = yield* service.count({});

      // Map domain results to RPC response
      return {
        items: items.map((item) => {
          const entity = item as ${className}Entity;
          return {
            id: entity.id,
            name: entity.name ?? "${name}",
            createdAt: entity.createdAt?.toISOString() ?? new Date().toISOString(),
          };
        }),
        total,
        page,
        pageSize,
      };
    }),

  /**
   * Create a new ${name}
   *
   * For protected routes, access CurrentUser:
   * \`\`\`typescript
   * const user = yield* CurrentUser;
   * // or use DX helper:
   * const ctx = yield* getHandlerContext;
   * ctx.user.id; // authenticated user ID
   * \`\`\`
   */
  Create${className}: ({ name }) =>
    Effect.gen(function* () {
      // For protected routes, access authenticated user:
      // const user = yield* CurrentUser;
      // or: const ctx = yield* getHandlerContext;

      const service = yield* ${className}Service;

      // Execute service operation
      const result = yield* service.create({ name });
      const created = result as ${className}Entity;

      // Map domain result to RPC response
      return {
        id: created.id,
        name: created.name ?? name,
        createdAt: created.createdAt?.toISOString() ?? new Date().toISOString(),
      };
    }),

  /**
   * Update an existing ${name}
   */
  Update${className}: ({ id, name }) =>
    Effect.gen(function* () {
      const service = yield* ${className}Service;

      // Execute service operation
      const updated = yield* service.update(id, { name });

      if (Option.isNone(updated)) {
        return yield* Effect.fail(
          new ${className}RpcError({
            message: \`${name} not found: \${id}\`,
            code: "NOT_FOUND",
          })
        );
      }

      // Map domain result to RPC response
      const entity = updated.value as ${className}Entity;
      return {
        id: entity.id,
        name: entity.name ?? name,
        createdAt: entity.createdAt?.toISOString() ?? new Date().toISOString(),
      };
    }),

  /**
   * Delete a ${name}
   */
  Delete${className}: ({ id }) =>
    Effect.gen(function* () {
      const service = yield* ${className}Service;

      // Execute service operation
      yield* service.delete(id);

      return { success: true as const };
    }),
});
`);

  builder.addSectionComment('Handler Type Export');

  builder.addRaw(`/**
 * Type for ${className} handlers layer
 *
 * Useful for testing and type inference.
 */
export type ${className}HandlersType = typeof ${className}Handlers;
`);

  return builder.toString();
}
