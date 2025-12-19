/**
 * Provider Query Operation Template
 *
 * Generates service/operations/query.ts with query/read operations
 *
 * @module monorepo-library-generator/provider/service/query-operation-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-generation/typescript-builder";
import type { ProviderTemplateOptions } from "../../../../utils/shared/types";

/**
 * Generate service/operations/query.ts file
 *
 * Creates the query operations for provider service
 */
export function generateProviderQueryOperationFile(
  options: ProviderTemplateOptions
) {
  const builder = new TypeScriptBuilder();
  const { className, externalService, fileName } = options;

  builder.addFileHeader({
    title: `${className} Query Operations`,
    description: `Query/read operations for ${externalService} provider service.

Bundle optimization: Import only this file for query operations (~4-5 KB vs ~18 KB full barrel).

Example:
  import { queryOperations } from '@scope/provider-${fileName}/service/operations/query';`,
    module: `@custom-repo/provider-${fileName}/service/operations`,
  });
  builder.addBlankLine();

  // Add imports
  builder.addImports([
    { from: "effect", imports: ["Effect", "Schedule", "Duration"] },
  ]);
  builder.addBlankLine();

  builder.addImports([
    {
      from: "../../types",
      imports: ["Resource", "ListParams", "PaginatedResult"],
      isTypeOnly: true,
    },
    {
      from: "../../errors",
      imports: [`${className}ServiceError`],
      isTypeOnly: true,
    },
    {
      from: "../../errors",
      imports: [
        `${className}NotFoundError`,
        `${className}InternalError`,
        `${className}TimeoutError`,
      ],
    },
  ]);
  builder.addBlankLine();

  // Import test store from create.ts
  builder.addImport("./create", "testStore");
  builder.addBlankLine();

  // Operation interface
  builder.addSectionComment("Query Operations Interface");
  builder.addBlankLine();

  builder.addRaw(`/**
 * Query Operations Interface
 */
export interface Query${className}Operations {
  /**
   * List resources with pagination support
   *
   * @param params - Query parameters including pagination
   * @returns Effect with paginated results
   */
  readonly list: (
    params?: ListParams
  ) => Effect.Effect<PaginatedResult<Resource>, ${className}ServiceError>;

  /**
   * Get resource by ID
   *
   * @param id - Resource identifier
   * @returns Effect with resource data
   */
  readonly get: (
    id: string
  ) => Effect.Effect<Resource, ${className}ServiceError>;
}`);
  builder.addBlankLine();

  // Live implementation
  builder.addSectionComment("Live Implementation");
  builder.addBlankLine();

  builder.addRaw(`/**
 * Query Operations - Live Implementation
 *
 * TODO: Implement with actual ${externalService} SDK
 */
export const queryOperations: Query${className}Operations = {
  list: (params) =>
    Effect.gen(function* () {
      // TODO: Replace with actual ${externalService} SDK call
      // Example:
      // const client = yield* ${externalService}Client;
      // const result = yield* Effect.tryPromise({
      //   try: () => client.list(params),
      //   catch: (error) => map${className}Error(error)
      // });
      // return result;

      yield* Effect.logWarning(\`List operation called but not implemented\`);
      yield* Effect.logDebug(\`Params: \${JSON.stringify(params)}\`);
      return yield* Effect.fail(
        new ${className}InternalError({
          message: "List operation not implemented - replace with ${externalService} SDK call"
        })
      );
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () =>
          new ${className}TimeoutError({
            message: "List operation timed out",
            timeout: 30000,
          }),
      }),
      Effect.retry(
        Schedule.exponential(Duration.millis(100)).pipe(
          Schedule.compose(Schedule.recurs(3))
        )
      )
    ),

  get: (id) =>
    Effect.gen(function* () {
      // TODO: Replace with actual ${externalService} SDK call
      // Example:
      // const client = yield* ${externalService}Client;
      // const result = yield* Effect.tryPromise({
      //   try: () => client.get(id),
      //   catch: (error) => map${className}Error(error)
      // });
      // return result;

      yield* Effect.logWarning(\`Get operation called for id \${id} but not implemented\`);
      return yield* Effect.fail(
        new ${className}InternalError({
          message: "Get operation not implemented - replace with ${externalService} SDK call"
        })
      );
    }).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(30),
        onTimeout: () =>
          new ${className}TimeoutError({
            message: "Get operation timed out",
            timeout: 30000,
          }),
      }),
      Effect.retry(
        Schedule.exponential(Duration.millis(100)).pipe(
          Schedule.compose(Schedule.recurs(3))
        )
      )
    )
};`);
  builder.addBlankLine();

  // Test implementation
  builder.addSectionComment("Test Implementation");
  builder.addBlankLine();

  builder.addRaw(`/**
 * Query Operations - Test Implementation
 *
 * In-memory implementation for testing
 * Uses shared testStore from create.ts
 */
export const testQueryOperations: Query${className}Operations = {
  list: (params) =>
    Effect.sync(() => {
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 10;
      const items = Array.from(testStore.values());
      const start = (page - 1) * limit;
      const end = start + limit;
      const data = items.slice(start, end);

      return {
        data,
        page,
        limit,
        total: items.length
      };
    }),

  get: (id) =>
    Effect.gen(function* () {
      const resource = testStore.get(id);
      if (!resource) {
        return yield* Effect.fail(
          new ${className}NotFoundError({
            message: \`Resource \${id} not found\`,
            resourceId: id,
            resourceType: "Resource",
          })
        );
      }
      return resource;
    })
};`);

  return builder.toString();
}
