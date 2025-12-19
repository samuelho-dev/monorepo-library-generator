/**
 * Unified Generator Executor
 *
 * Single execution layer for all three interfaces (MCP, CLI, Nx)
 *
 * This module provides the createExecutor factory that unifies:
 * - Workspace context creation
 * - Adapter selection
 * - Metadata computation
 * - Infrastructure generation
 * - Core generator invocation
 *
 * @module monorepo-library-generator/infrastructure/execution/executor
 */

import type { Tree } from "@nx/devkit"
import { Effect } from "effect"
import { generateLibraryInfrastructure, type InfrastructureOptions } from "../../utils/infrastructure"
import { createAdapterFromContext } from "../adapters/factory"
import type { FileSystemAdapter } from "../adapters/filesystem"
import { computeMetadata } from "../metadata/computation"
import type { LibraryMetadata, LibraryType } from "../metadata/types"
import { createWorkspaceContext } from "../workspace/context"
import type { InterfaceType } from "../workspace/types"
import type { CoreGeneratorFn, GeneratorResult } from "./types"
import { GeneratorExecutionError } from "./types"

/**
 * Generator Executor Interface
 *
 * Encapsulates the complete generator execution pipeline.
 *
 * Generic over both input and result types to maintain type safety throughout
 * the execution flow.
 */
export interface GeneratorExecutor<TInput, TResult> {
  readonly execute: (input: TInput) => Effect.Effect<TResult, GeneratorExecutionError>
}

/**
 * Base fields that all validated inputs must have
 *
 * These fields are present in all Schema-validated inputs and are used
 * by the executor for workspace context creation and metadata computation.
 */
interface BaseValidatedInput {
  readonly name: string
  readonly workspaceRoot?: string | undefined
  readonly directory?: string | undefined
  readonly description?: string | undefined
  readonly tags?: string | undefined
}

/**
 * Extended input with interface metadata
 *
 * Generic type that preserves the specific validated input type while adding
 * internal metadata fields (__interfaceType, __nxTree).
 *
 * This allows the executor to receive properly typed inputs from Schema validation
 * without losing type information through index signatures.
 */
type ExtendedInput<TInput extends BaseValidatedInput> = TInput & {
  readonly __interfaceType?: InterfaceType
  readonly __nxTree?: Tree
}

/**
 * Create unified executor for any generator
 *
 * This is the core abstraction that allows MCP, CLI, and Nx to use identical execution logic.
 *
 * The executor handles the complete generation pipeline:
 * 1. Creates workspace context (auto-detects workspace properties)
 * 2. Creates appropriate adapter (based on interface type)
 * 3. Computes library metadata (paths, names, etc.)
 * 4. Generates infrastructure files (package.json, tsconfig, etc.)
 * 5. Invokes core generator (domain-specific files)
 *
 * Type Parameters:
 * - TInput: The validated input type from Effect Schema (e.g., ProviderInput, ContractInput)
 * - TCoreOptions: The core generator options type (e.g., ProviderCoreOptions, ContractCoreOptions)
 *
 * The generic types are properly constrained to preserve type information from Schema validation
 * through to the core generator, eliminating the need for type assertions.
 *
 * @param libraryType - Type of library being generated (contract, data-access, etc.)
 * @param coreGenerator - Core generator function to invoke
 * @param inputToOptions - Function to convert validated input + metadata to core generator options
 * @returns GeneratorExecutor that can be called with user input
 *
 * @example
 * ```typescript
 * // Create provider executor with proper types
 * const providerExecutor = createExecutor<ProviderInput, ProviderCoreOptions>(
 *   "provider",
 *   generateProviderCore,
 *   (validated, metadata) => ({
 *     ...metadata,
 *     externalService: validated.externalService,  // TypeScript knows this exists!
 *     platform: validated.platform ?? "node",       // No type assertion needed!
 *     operations: validated.operations
 *   })
 * )
 *
 * // Use in MCP handler
 * const result = yield* providerExecutor.execute({
 *   name: "stripe",
 *   externalService: "stripe",
 *   platform: "node",
 *   __interfaceType: "mcp"
 * })
 *
 * // Use in CLI command
 * const result = yield* providerExecutor.execute({
 *   ...validated,  // Already validated by Schema
 *   __interfaceType: "cli"
 * })
 *
 * // Use in Nx generator
 * const result = yield* providerExecutor.execute({
 *   name: schema.name,
 *   externalService: schema.externalService,
 *   __interfaceType: "nx",
 *   __nxTree: tree
 * })
 * ```
 */
export function createExecutor<
  TInput extends BaseValidatedInput,
  TCoreOptions
>(
  libraryType: LibraryType,
  coreGenerator: CoreGeneratorFn<TCoreOptions>,
  inputToOptions: (validated: TInput, metadata: LibraryMetadata) => TCoreOptions
): GeneratorExecutor<ExtendedInput<TInput>, GeneratorResult> {
  return {
    execute: (validated: ExtendedInput<TInput>) =>
      Effect.gen(function* () {
        // 1. Create workspace context
        const interfaceType = validated.__interfaceType ?? "cli"
        const context = yield* createWorkspaceContext(
          validated.workspaceRoot,
          interfaceType
        ).pipe(
          Effect.mapError(
            (error) =>
              new GeneratorExecutionError({
                message: `Failed to detect workspace context: ${error.message}`,
                cause: error
              })
          )
        )

        // 2. Create appropriate adapter
        const adapter = yield* createAdapterFromContext(
          context,
          validated.__nxTree
        ).pipe(
          Effect.mapError(
            (error) =>
              new GeneratorExecutionError({
                message: `Failed to create filesystem adapter: ${error.message}`,
                cause: error
              })
          )
        )

        // 3. Compute library metadata
        interface MetadataInput {
          name: string
          libraryType: LibraryType
          directory?: string
          description?: string
          additionalTags?: ReadonlyArray<string>
        }

        const metadataInput: MetadataInput = {
          name: validated.name,
          libraryType
        }
        if (validated.directory !== undefined) {
          metadataInput.directory = validated.directory
        }
        if (validated.description !== undefined) {
          metadataInput.description = validated.description
        }
        if (validated.tags !== undefined) {
          metadataInput.additionalTags = validated.tags.split(",").map((t) => t.trim())
        }

        const metadata = computeMetadata(metadataInput, context)

        // 4. Generate infrastructure files
        const infraOptions: InfrastructureOptions = {
          projectRoot: metadata.projectRoot,
          sourceRoot: metadata.sourceRoot,
          projectName: metadata.projectName,
          packageName: metadata.packageName,
          libraryType,
          description: metadata.description,
          platform: "node" as const,
          offsetFromRoot: metadata.offsetFromRoot,
          tags: metadata.tags.split(",").map((t) => t.trim())
        }

        yield* generateLibraryInfrastructure(
          adapter,
          infraOptions
        ).pipe(
          Effect.mapError(
            (error) =>
              new GeneratorExecutionError({
                message: `Failed to generate infrastructure files: ${String(error)}`,
                cause: error
              })
          )
        )

        // 5. Generate domain-specific files using core generator
        // TypeScript now knows the exact type of validated (TInput)
        // No type assertion needed - the generic preserves the specific type!
        const coreOptions = inputToOptions(validated, metadata)
        const result = yield* coreGenerator(adapter, coreOptions).pipe(
          Effect.mapError(
            (error) =>
              new GeneratorExecutionError({
                message: `Failed to generate domain files: ${String(error)}`,
                cause: error
              })
          )
        )

        return result
      })
  }
}

/**
 * Helper: Execute generator directly with workspace context
 *
 * Lower-level API that requires pre-created workspace context and adapter.
 * Useful for testing or advanced use cases.
 */
export function executeGenerator<TOptions>(
  adapter: FileSystemAdapter,
  metadata: LibraryMetadata,
  coreGenerator: CoreGeneratorFn<TOptions>,
  coreOptions: TOptions,
  infrastructureOptions?: Partial<InfrastructureOptions>
): Effect.Effect<GeneratorResult, GeneratorExecutionError> {
  return Effect.gen(function* () {
    // Generate infrastructure files
    const infraOptions: InfrastructureOptions = {
      projectRoot: metadata.projectRoot,
      sourceRoot: metadata.sourceRoot,
      projectName: metadata.projectName,
      packageName: metadata.packageName,
      libraryType: metadata.libraryType,
      description: metadata.description,
      platform: "node" as const,
      offsetFromRoot: metadata.offsetFromRoot,
      tags: metadata.tags.split(",").map((t) => t.trim()),
      ...infrastructureOptions
    }

    yield* generateLibraryInfrastructure(
      adapter,
      infraOptions
    ).pipe(
      Effect.mapError(
        (error) =>
          new GeneratorExecutionError({
            message: `Failed to generate infrastructure: ${String(error)}`,
            cause: error
          })
      )
    )

    // Generate domain files
    const result = yield* coreGenerator(adapter, coreOptions).pipe(
      Effect.mapError(
        (error) =>
          new GeneratorExecutionError({
            message: `Failed to generate domain files: ${String(error)}`,
            cause: error
          })
      )
    )

    return result
  })
}
