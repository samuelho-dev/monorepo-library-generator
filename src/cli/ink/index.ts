/**
 * React Ink TUI Entry Point
 *
 * Provides the main entry point for running the interactive TUI
 * with proper Effect resource management using acquireUseRelease.
 *
 * @module monorepo-library-generator/cli/ink
 */

import { Console, Data, Effect } from 'effect'
import { render } from 'ink'
import React from 'react'

import { createWorkspaceContext } from '../../infrastructure'
import { executeWizardResult } from '../interactive/execution'
import type { WizardResult } from '../interactive/types'
import { App } from './App'

/**
 * Error type for Ink rendering failures
 */
export class InkRenderError extends Data.TaggedError('InkRenderError')<{
  readonly cause: unknown
}> {}

/**
 * Run the React Ink TUI with proper resource management
 *
 * Uses Effect.acquireUseRelease pattern to ensure proper cleanup:
 * - acquire: render the Ink app
 * - use: wait for user interaction to complete
 * - release: unmount the Ink instance
 */
export function runInkTUI() {
  return Effect.gen(function* () {
    // Get workspace context
    const context = yield* createWorkspaceContext(undefined, 'cli')

    // Create a deferred to track completion
    let resolveResult: (result: WizardResult | null) => void
    const resultPromise = new Promise<WizardResult | null>((resolve) => {
      resolveResult = resolve
    })

    // Use acquireUseRelease for proper resource management
    const result = yield* Effect.acquireUseRelease(
      // Acquire: render the Ink app
      Effect.sync(() =>
        render(
          React.createElement(App, {
            librariesRoot: context.librariesRoot,
            workspaceRoot: context.root,
            onComplete: (wizardResult) => resolveResult(wizardResult)
          })
        )
      ),
      // Use: wait for the user to complete the wizard
      (inkInstance) =>
        Effect.tryPromise({
          try: async () => {
            // Wait for user to complete the wizard
            const wizardResult = await resultPromise

            // Wait for Ink to finish rendering
            await inkInstance.waitUntilExit()

            return wizardResult
          },
          catch: (error) => new InkRenderError({ cause: error })
        }),
      // Release: clean up the Ink instance
      (inkInstance) => Effect.sync(() => inkInstance.unmount())
    )

    // If user completed the wizard with a result, execute generation
    if (result) {
      yield* Console.log('')
      yield* executeWizardResult(result)
      yield* Console.log('')
      yield* Console.log('Library generated successfully!')
      yield* Console.log(`  Location: ${result.targetDirectory}`)
    }
  }).pipe(
    Effect.catchAll((error) =>
      Console.error(
        `Error in TUI: ${error instanceof InkRenderError ? String(error.cause) : error}`
      )
    )
  )
}

// Re-export types
export type { WizardResult } from '../interactive/types'
