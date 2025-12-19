/**
 * Generator Progress Wrapper
 *
 * Wraps generator functions with progress feedback
 *
 * @module monorepo-library-generator/cli/progress/generator-progress
 */

import { Console, Effect } from "effect"
import { createWorkspaceContext } from "../../infrastructure/workspace/context"
import { formatPathDisplay, logFileCreation, showError, showSuccess, type Verbosity } from "./index"

/**
 * ANSI escape codes
 */
const ANSI: Readonly<{
  cyan: string
  green: string
  dim: string
  reset: string
}> = Object.freeze({
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  dim: "\x1b[2m",
  reset: "\x1b[0m"
})

/**
 * Common generator options with verbosity
 */
export interface GeneratorOptionsWithVerbosity {
  readonly name: string
  readonly verbose?: boolean
  readonly quiet?: boolean
}

/**
 * Get verbosity level from options
 */
export function getVerbosity(options: {
  verbose?: boolean
  quiet?: boolean
}) {
  if (options.quiet) return "quiet"
  if (options.verbose) return "verbose"
  return "normal"
}

/**
 * Wrap a generator with progress feedback
 */
export function withGeneratorProgress<A, E, R>(
  libraryType: string,
  libraryName: string,
  generator: Effect.Effect<A, E, R>,
  verbosity: Verbosity
) {
  return Effect.gen(function*() {
    const startTime = Date.now()

    // Get workspace context to display paths
    const contextResult = yield* createWorkspaceContext(undefined, "cli").pipe(
      Effect.either
    )

    let relativePath = `libs/${libraryType}/${libraryName}`
    let absolutePath = `${process.cwd()}/${relativePath}`

    if (contextResult._tag === "Right") {
      const ctx = contextResult.right
      relativePath = `${ctx.librariesRoot}/${libraryType}/${libraryName}`
      absolutePath = `${ctx.root}/${relativePath}`
    }

    // Show start message
    if (verbosity !== "quiet") {
      yield* Console.log(formatPathDisplay(absolutePath, relativePath))
      yield* Console.log("")
      yield* Console.log(
        `${ANSI.cyan}⠋${ANSI.reset} Creating ${libraryType} library: ${libraryName}...`
      )
    }

    // Run generator
    const result = yield* generator.pipe(
      Effect.tapError((error) => showError(String(error), verbosity))
    )

    // Show success
    const elapsed = Date.now() - startTime
    yield* showSuccess(
      `${libraryType}-${libraryName}`,
      12, // Approximate file count
      elapsed,
      verbosity
    )

    return result
  })
}

/**
 * Log individual file creation in verbose mode
 */
export function logFile(
  filePath: string,
  verbosity: Verbosity
) {
  return logFileCreation(filePath, verbosity)
}
