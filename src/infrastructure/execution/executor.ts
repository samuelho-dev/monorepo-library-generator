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
 * Encapsulates the complete generator execution pipeline
 */
export interface GeneratorExecutor<TInput, TResult> {
  readonly execute: (input: TInput) => Effect.Effect<TResult, GeneratorExecutionError>
}

/**
 * Extended input with interface metadata
 *
 * Internal type that adds __interfaceType and __nxTree to user input
 */
interface ExtendedInput {
  readonly __interfaceType?: InterfaceType
  readonly __nxTree?: Tree
  readonly workspaceRoot?: string | undefined
  readonly name: string
  readonly directory?: string | undefined
  readonly description?: string | undefined
  readonly tags?: string | undefined
  readonly [key: string]: unknown
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
 * @param libraryType - Type of library being generated (contract, data-access, etc.)
 * @param coreGenerator - Core generator function to invoke
 * @param inputToOptions - Function to convert input + metadata to core generator options
 * @returns GeneratorExecutor that can be called with user input
 *
 * @example
 * ```typescript
 * // Create contract executor
 * const contractExecutor = createExecutor(
 *   "contract",
 *   generateContractCore,
 *   (input, metadata) => ({
 *     ...metadata,
 *     includeCQRS: input.includeCQRS,
 *     includeRPC: input.includeRPC,
 *     entities: input.entities
 *   })
 * )
 *
 * // Use in MCP handler
 * const result = yield* contractExecutor.execute({
 *   name: "user",
 *   includeCQRS: true,
 *   __interfaceType: "mcp"
 * })
 *
 * // Use in CLI command
 * const result = yield* contractExecutor.execute({
 *   name: "user",
 *   includeCQRS: true,
 *   __interfaceType: "cli"
 * })
 *
 * // Use in Nx generator
 * const result = yield* contractExecutor.execute({
 *   name: schema.name,
 *   includeCQRS: schema.includeCQRS,
 *   __interfaceType: "nx",
 *   __nxTree: tree
 * })
 * ```
 */
export function createExecutor<
  TValidated extends ExtendedInput,
  TOptions
>(
  libraryType: LibraryType,
  coreGenerator: CoreGeneratorFn<TOptions>,
  inputToOptions: (validated: TValidated, metadata: LibraryMetadata) => TOptions
): GeneratorExecutor<TValidated, GeneratorResult> {
  return {
    execute: (validated: TValidated) =>
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
