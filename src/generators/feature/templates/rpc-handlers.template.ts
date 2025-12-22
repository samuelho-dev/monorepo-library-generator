/**
 * RPC Handlers Template
 *
 * Generates rpc/handlers.ts file for feature libraries.
 *
 * Uses RpcGroup.toLayer for type-safe handler registration.
 * Handler input types flow from RPC definitions - no explicit annotations.
 *
 * @module monorepo-library-generator/feature/rpc-handlers-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { FeatureTemplateOptions } from '../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config';

/**
 * Generate rpc/handlers.ts file for feature library
 *
 * Creates RPC handler implementations using RpcGroup.toLayer.
 * Types flow from RPC definitions automatically.
 */
export function generateRpcHandlersFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, name } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  // Add file header
  builder.addFileHeader({
    title: `${className} RPC Handlers`,
    description: `Handler implementations for ${name} RPC operations.

Uses RpcGroup.toLayer pattern - input types flow from RPC definitions.
No explicit type annotations needed on handler parameters.

Context Access:
- CurrentUser: Authenticated user (for protected routes)
- RequestMetaTag: Request metadata (requestId, etc.)
- AuthMethodTag: Auth method used`,
  });

  // Add imports - use unified error type from shared/errors
  builder.addImports([
    { from: 'effect', imports: ['Effect', 'Option'] },
    { from: './rpc', imports: [`${className}Rpcs`] },
    { from: '../server/service', imports: [`${className}Service`] },
    { from: '../shared/errors', imports: [`${className}Error`] },
  ]);

  // Add infra-auth context imports
  builder.addRaw(`// Context services from infra-auth
import {
  CurrentUser,
  RequestMetaTag,
  AuthMethodTag,
} from "${scope}/infra-auth";

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
 * Implements handlers for ${className}Rpcs using RpcGroup.toLayer.
 * Input types are inferred from RPC definitions - no annotations needed.
 *
 * @example
 * \`\`\`typescript
 * import { ${className}HandlersLayer } from "${scope}/feature-${name}/rpc";
 * import { Layer } from "effect";
 *
 * // Compose with service layers
 * const appLayer = Layer.mergeAll(
 *   ${className}HandlersLayer,
 *   ${className}Service.Live,
 *   AuthMiddlewareLive,
 * );
 * \`\`\`
 */
export const ${className}HandlersLayer = ${className}Rpcs.toLayer({
  /**
   * Get ${name} by ID (Public)
   */
  Get${className}: (input) =>
    Effect.gen(function* () {
      const meta = yield* RequestMetaTag;

      yield* Effect.logDebug("Get${className} request", {
        id: input.id,
        requestId: meta.requestId,
      });

      const service = yield* ${className}Service;
      const result = yield* service.get(input.id);

      if (Option.isNone(result)) {
        return yield* new ${className}Error({
          message: \`${name} not found: \${input.id}\`,
          code: "NOT_FOUND",
        });
      }

      const entity = result.value as ${className}Entity;
      return {
        id: entity.id,
        name: entity.name ?? "${name}",
        createdAt: entity.createdAt ?? new Date(),
      };
    }),

  /**
   * List ${name}s with pagination (Public)
   */
  List${className}: (input) =>
    Effect.gen(function* () {
      const meta = yield* RequestMetaTag;

      yield* Effect.logDebug("List${className} request", {
        page: input.page,
        pageSize: input.pageSize,
        requestId: meta.requestId,
      });

      const service = yield* ${className}Service;
      const offset = ((input.page ?? 1) - 1) * (input.pageSize ?? 20);
      const limit = input.pageSize ?? 20;

      const items = yield* service.findByCriteria({}, offset, limit);
      const total = yield* service.count({});

      return {
        items: items.map((item: unknown) => {
          const entity = item as ${className}Entity;
          return {
            id: entity.id,
            name: entity.name ?? "${name}",
            createdAt: entity.createdAt ?? new Date(),
          };
        }),
        total,
        page: input.page ?? 1,
        pageSize: limit,
      };
    }),

  /**
   * Create ${name} (Protected - requires CurrentUser)
   */
  Create${className}: (input) =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;
      const authMethod = yield* AuthMethodTag;

      yield* Effect.logInfo(\`Create${className} by user \${user.id} (\${user.email}) via \${authMethod}\`);

      const service = yield* ${className}Service;
      const result = yield* service.create({
        name: input.name,
        createdBy: user.id,
      });

      const created = result as ${className}Entity;
      return {
        id: created.id,
        name: created.name ?? input.name,
        createdAt: created.createdAt ?? new Date(),
      };
    }),

  /**
   * Update ${name} (Protected)
   */
  Update${className}: (input) =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;

      yield* Effect.logInfo(\`Update${className} \${input.id} by user \${user.id}\`);

      const service = yield* ${className}Service;
      const updated = yield* service.update(input.id, {
        name: input.name,
        updatedBy: user.id,
      });

      if (Option.isNone(updated)) {
        return yield* new ${className}Error({
          message: \`${name} not found: \${input.id}\`,
          code: "NOT_FOUND",
        });
      }

      const entity = updated.value as ${className}Entity;
      return {
        id: entity.id,
        name: entity.name ?? input.name,
        createdAt: entity.createdAt ?? new Date(),
      };
    }),

  /**
   * Delete ${name} (Protected)
   */
  Delete${className}: (input) =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;

      yield* Effect.logInfo(\`Delete${className} \${input.id} by user \${user.id}\`);

      const service = yield* ${className}Service;
      yield* service.delete(input.id);

      return { success: true as const };
    }),
});
`);

  builder.addSectionComment('Type Export');

  builder.addRaw(`/**
 * Type for ${className} handlers layer
 */
export type ${className}HandlersLayerType = typeof ${className}HandlersLayer;
`);

  return builder.toString();
}
