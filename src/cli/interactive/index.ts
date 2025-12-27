/**
 * Interactive Wizard Mode
 *
 * Entry point for the interactive TUI wizard
 *
 * @module monorepo-library-generator/cli/interactive
 */

import { Console, Effect } from 'effect'

import { createWorkspaceContext } from '../../infrastructure'
import { executeWizardResult } from './execution'
import type { WizardResult } from './types'
import { colors, status } from './ui/colors'
import { runWizard } from './wizard'

// Re-export types
export type { LibraryType, WizardOptions, WizardResult, WizardState } from './types'

/**
 * Execute library generation based on wizard result
 *
 * Wraps the shared executeWizardResult with console output.
 */
function executeGeneration(result: WizardResult) {
  return Effect.gen(function* () {
    yield* Console.log('')
    yield* Console.log(
      `${colors.info('Generating...')} ${result.libraryType} library: ${colors.cyan(result.libraryName)}`
    )

    yield* executeWizardResult(result)

    yield* Console.log('')
    yield* Console.log(`${status.completed} ${colors.success('Library generated successfully!')}`)
    yield* Console.log(`  ${colors.muted('Location:')} ${result.targetDirectory}`)
  })
}

/**
 * Run the interactive wizard mode
 *
 * This is the main entry point for `mlg -tui`
 */
export function runInteractiveMode() {
  return Effect.gen(function* () {
    // Detect workspace context
    const context = yield* createWorkspaceContext(undefined, 'cli')

    // Run the wizard
    const result = yield* runWizard(context.librariesRoot)

    // If user confirmed, execute generation
    if (result) {
      yield* executeGeneration(result)
    }
  }).pipe(
    Effect.catchAll((error) => Console.error(`${status.error} ${colors.error('Error:')} ${error}`))
  )
}
