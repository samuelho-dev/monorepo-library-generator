/**
 * Shared Execution Logic
 *
 * Consolidated execution logic for wizard results.
 * Called by both text-based interactive mode and React Ink TUI.
 * Uses existing CLI generators which call the unified executor.
 *
 * @module monorepo-library-generator/cli/interactive/execution
 */

import { Data, Effect } from 'effect'

import type { WizardResult } from './types'

/**
 * Error type for generation failures
 */
export class GenerationError extends Data.TaggedError('GenerationError')<{
  readonly cause: unknown
  readonly message: string
}> {}

/**
 * Execute library generation based on wizard result
 *
 * This is the single source of truth for executing wizard results.
 * Both the interactive CLI and the React Ink TUI use this function.
 *
 * @param result - The completed wizard result
 * @returns Effect that generates the library
 */
export function executeWizardResult(result: WizardResult) {
  return Effect.gen(function* () {
    // Import generators dynamically to avoid circular dependencies
    const { generateContract } = yield* Effect.tryPromise({
      try: () => import('../generators/contract'),
      catch: (error) =>
        new GenerationError({ cause: error, message: 'Failed to load contract generator' })
    })
    const { generateDataAccess } = yield* Effect.tryPromise({
      try: () => import('../generators/data-access'),
      catch: (error) =>
        new GenerationError({ cause: error, message: 'Failed to load data-access generator' })
    })
    const { generateFeature } = yield* Effect.tryPromise({
      try: () => import('../generators/feature'),
      catch: (error) =>
        new GenerationError({ cause: error, message: 'Failed to load feature generator' })
    })
    const { generateInfra } = yield* Effect.tryPromise({
      try: () => import('../generators/infra'),
      catch: (error) =>
        new GenerationError({ cause: error, message: 'Failed to load infra generator' })
    })
    const { generateProvider } = yield* Effect.tryPromise({
      try: () => import('../generators/provider'),
      catch: (error) =>
        new GenerationError({ cause: error, message: 'Failed to load provider generator' })
    })
    const { generateDomain } = yield* Effect.tryPromise({
      try: () => import('../generators/domain'),
      catch: (error) =>
        new GenerationError({ cause: error, message: 'Failed to load domain generator' })
    })

    const baseArgs = {
      name: result.libraryName,
      description: result.options.description,
      tags: result.options.tags ?? ''
    }

    switch (result.libraryType) {
      case 'contract':
        yield* generateContract({
          ...baseArgs,
          includeCQRS: result.options.includeCQRS ?? false
        })
        break

      case 'data-access':
        yield* generateDataAccess(baseArgs)
        break

      case 'feature':
        yield* generateFeature({
          ...baseArgs,
          scope: result.options.scope,
          platform: result.options.platform,
          includeClientServer: result.options.includeClientServer,
          includeCQRS: result.options.includeCQRS
        })
        break

      case 'infra':
        yield* generateInfra({
          ...baseArgs,
          platform: result.options.platform,
          includeClientServer: result.options.includeClientServer
        })
        break

      case 'provider':
        yield* generateProvider({
          ...baseArgs,
          externalService: result.externalService ?? result.libraryName,
          platform: result.options.platform
        })
        break

      case 'domain':
        yield* generateDomain({
          name: result.libraryName,
          ...(result.options.description && { description: result.options.description }),
          tags: result.options.tags ?? '',
          ...(result.options.scope !== undefined && { scope: result.options.scope }),
          ...(result.options.includeClientServer !== undefined && {
            includeClientServer: result.options.includeClientServer
          }),
          ...(result.options.includeCQRS !== undefined && {
            includeCQRS: result.options.includeCQRS
          })
        })
        break
    }

    return result
  })
}
