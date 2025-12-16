/**
 * Execution Types
 *
 * Shared types for generator execution
 *
 * @module monorepo-library-generator/infrastructure/execution/types
 */

import { Data, type Effect } from "effect"
import type { FileSystemAdapter } from "../adapters/filesystem"
import type { FileSystemErrors } from "../adapters/filesystem"

/**
 * Generator Result
 *
 * Standard result returned by all core generators
 */
export interface GeneratorResult {
  readonly projectName: string
  readonly projectRoot: string
  readonly packageName: string
  readonly sourceRoot: string
  readonly filesGenerated: ReadonlyArray<string>
}

/**
 * Core Generator Function Type
 *
 * All core generators follow this signature
 */
export type CoreGeneratorFn<TOptions> = (
  adapter: FileSystemAdapter,
  options: TOptions
) => Effect.Effect<GeneratorResult, FileSystemErrors>

/**
 * Generator Execution Error
 *
 * Tagged error for generator execution failures with structured error information.
 * Preserves the original error cause for debugging.
 */
export class GeneratorExecutionError extends Data.TaggedError("GeneratorExecutionError")<{
  readonly message: string
  readonly cause?: unknown
}> {}
