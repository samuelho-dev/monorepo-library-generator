/**
 * Feature Service Interface Template
 *
 * Generates server/service/interface.ts with Context.Tag definition
 *
 * @module monorepo-library-generator/feature/service/interface-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-generation/typescript-builder"
import type { FeatureTemplateOptions } from "../../../../utils/shared/types"

/**
 * Generate server/service/interface.ts file
 *
 * Creates Context.Tag interface with static layers
 */
export function generateFeatureServiceInterfaceFile(
  options: FeatureTemplateOptions
) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options

  builder.addFileHeader({
    title: `${className} Service Interface`,
    description: `Context.Tag definition for ${className}Service.

Operations are split into separate files for optimal tree-shaking.
Import only the operations you need for smallest bundle size.

Bundle optimization:
  - Granular import: import { createOperations } from './operations/create-${fileName}'
  - Full service: import { ${className}Service } from './interface'`,
    module: `@custom-repo/feature-${fileName}/server/service`
  })
  builder.addBlankLine()

  // Add imports
  builder.addImports([
    { from: "effect", imports: ["Effect", "Layer", "Context"] }
  ])
  builder.addBlankLine()

  // Import shared types and errors
  builder.addImports([
    {
      from: "../../shared/types",
      imports: [`${className}Result`],
      isTypeOnly: true
    },
    {
      from: "../../shared/errors",
      imports: [`${className}Error`],
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
 * Business logic and orchestration for ${fileName} domain.
 * TODO: Customize operations based on your domain requirements
 */
export interface ${className}ServiceInterface {
  /**
   * Example operation - Replace with your actual operations
   */
  readonly exampleOperation: () => Effect.Effect<${className}Result, ${className}Error>;
}`)
  builder.addBlankLine()

  // Context.Tag
  builder.addSectionComment("Context.Tag")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} Service Tag
 *
 * Access via: yield* ${className}Service
 *
 * Static layers:
 * - ${className}Service.Live - Production with real dependencies
 * - ${className}Service.Test - In-memory for testing
 * - ${className}Service.Dev - Development with logging
 */
export class ${className}Service extends Context.Tag("${className}Service")<
  ${className}Service,
  ${className}ServiceInterface
>() {
  /**
   * Live Layer - Production implementation
   *
   * TODO: Add actual dependencies
   * Example:
   *   const repo = yield* UserRepository;
   *   const logger = yield* LoggingService;
   */
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function () {
      // TODO: Inject dependencies
      // const repo = yield* UserRepository;

      return {
        exampleOperation: () =>
          Effect.gen(function () {
            // TODO: Implement business logic
            // const data = yield* repo.findAll();
            // return { success: true, data };

            return {
              success: true
            };
          })
      };
    })
  );

  /**
   * Test Layer - In-memory implementation
   */
  static readonly Test = Layer.succeed(
    this,
    {
      exampleOperation: () =>
        Effect.succeed({
          success: true
        })
    }
  );

  /**
   * Dev Layer - Development with logging
   */
  static readonly Dev = this.Live;
}`)

  return builder.toString()
}
