/**
 * Provider Service Interface Template
 *
 * Generates service/interface.ts with Context.Tag definition
 *
 * @module monorepo-library-generator/provider/service/interface-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-generation/typescript-builder"
import type { ProviderTemplateOptions } from "../../../../utils/shared/types"

/**
 * Generate service/interface.ts file
 *
 * Creates Context.Tag interface with static layers using dynamic imports
 */
export function generateProviderServiceInterfaceFile(
  options: ProviderTemplateOptions
) {
  const builder = new TypeScriptBuilder()
  const { className, externalService, fileName } = options

  builder.addFileHeader({
    title: `${className} Service Interface`,
    description: `Context.Tag definition for ${className} provider service.

External Service: ${externalService}

Operations are split into separate files for optimal tree-shaking.
Import only the operations you need for smallest bundle size.

Bundle optimization:
  - Granular import: import { createOperations } from './operations/create'
  - Full service: import { ${className} } from './interface'`,
    module: `@custom-repo/provider-${fileName}/service`
  })
  builder.addBlankLine()

  // Add imports
  builder.addImports([
    { from: "effect", imports: ["Context", "Effect", "Layer"] }
  ])
  builder.addBlankLine()

  // Import shared types and errors
  builder.addImports([
    {
      from: "../types",
      imports: [`${className}Config`, "Resource", "ListParams", "PaginatedResult", "HealthCheckResult"],
      isTypeOnly: true
    },
    {
      from: "../errors",
      imports: [`${className}ServiceError`],
      isTypeOnly: true
    }
  ])
  builder.addBlankLine()

  // Service interface
  builder.addSectionComment("Service Interface")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} Service Interface
 *
 * Provider: External service adapter for ${externalService}
 *
 * Operations:
 * - Health check and configuration
 * - CRUD operations for external service resources
 * - Pagination support for list operations
 * - Retry logic with exponential backoff
 */
export interface ${className}ServiceInterface {
  /**
   * Service configuration (read-only)
   */
  readonly config: ${className}Config;

  /**
   * Health check - verifies service connectivity
   */
  readonly healthCheck: Effect.Effect<HealthCheckResult, ${className}ServiceError>;

  /**
   * List resources with pagination support
   */
  readonly list: (
    params?: ListParams
  ) => Effect.Effect<PaginatedResult<Resource>, ${className}ServiceError>;

  /**
   * Get resource by ID
   */
  readonly get: (
    id: string
  ) => Effect.Effect<Resource, ${className}ServiceError>;

  /**
   * Create new resource
   */
  readonly create: (
    data: Omit<Resource, "id" | "createdAt" | "updatedAt">
  ) => Effect.Effect<Resource, ${className}ServiceError>;

  /**
   * Update existing resource
   */
  readonly update: (
    id: string,
    data: Partial<Omit<Resource, "id" | "createdAt" | "updatedAt">>
  ) => Effect.Effect<Resource, ${className}ServiceError>;

  /**
   * Delete resource
   */
  readonly delete: (
    id: string
  ) => Effect.Effect<void, ${className}ServiceError>;
}`)
  builder.addBlankLine()

  // Context.Tag
  builder.addSectionComment("Context.Tag")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} Service Tag
 *
 * Access via: yield* ${className}
 *
 * Static layers:
 * - ${className}.Live - Production with real ${externalService} SDK
 * - ${className}.Test - In-memory for testing
 * - ${className}.Dev - Development with logging
 *
 * Bundle optimization:
 * Operations are lazy-loaded via dynamic imports for optimal tree-shaking.
 * Only the operations you use will be included in your bundle.
 */
export class ${className} extends Context.Tag("${className}")<
  ${className},
  ${className}ServiceInterface
>() {
  /**
   * Live Layer - Production implementation
   *
   * Uses dynamic imports to load operations on-demand.
   * Each operation file is only loaded when the layer is constructed.
   *
   * TODO: Configure ${externalService} SDK client
   */
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      // TODO: Initialize ${externalService} SDK client
      // Example:
      // const client = yield* Effect.promise(() =>
      //   import("${externalService}-sdk").then(m => new m.${externalService}Client(config))
      // );

      // Lazy load operations for optimal bundle size
      const createOps = yield* Effect.promise(() =>
        import("./operations/create").then((m) => m.createOperations)
      );
      const queryOps = yield* Effect.promise(() =>
        import("./operations/query").then((m) => m.queryOperations)
      );
      const updateOps = yield* Effect.promise(() =>
        import("./operations/update").then((m) => m.updateOperations)
      );
      const deleteOps = yield* Effect.promise(() =>
        import("./operations/delete").then((m) => m.deleteOperations)
      );

      return {
        config: {}, // TODO: Provide actual ${className}Config
        healthCheck: Effect.succeed({ status: "healthy" }),
        ...createOps,
        ...queryOps,
        ...updateOps,
        ...deleteOps
      };
    })
  );

  /**
   * Test Layer - In-memory implementation
   *
   * Uses test operations from each operation file.
   * Shares a common in-memory store across all operations.
   */
  static readonly Test = Layer.effect(
    this,
    Effect.gen(function* () {
      const createOps = yield* Effect.promise(() =>
        import("./operations/create").then((m) => m.testCreateOperations)
      );
      const queryOps = yield* Effect.promise(() =>
        import("./operations/query").then((m) => m.testQueryOperations)
      );
      const updateOps = yield* Effect.promise(() =>
        import("./operations/update").then((m) => m.testUpdateOperations)
      );
      const deleteOps = yield* Effect.promise(() =>
        import("./operations/delete").then((m) => m.testDeleteOperations)
      );

      return {
        config: { apiKey: "test-key" },
        healthCheck: Effect.succeed({ status: "healthy" }),
        ...createOps,
        ...queryOps,
        ...updateOps,
        ...deleteOps
      };
    })
  );

  /**
   * Dev Layer - Development with logging
   */
  static readonly Dev = this.Live;
}`)

  return builder.toString()
}
