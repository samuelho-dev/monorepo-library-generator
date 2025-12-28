/**
 * TUI Entry Point
 *
 * Launches the interactive TUI application.
 *
 * @module monorepo-library-generator/cli/tui
 */

import { render } from 'ink'
import React from 'react'

import { App } from './App'

/**
 * Launch the TUI application
 */
export function launchTUI() {
  const { waitUntilExit } = render(React.createElement(App))
  return waitUntilExit()
}

// Re-exports for external use
export { App } from './App'
export type { GenerationStatus, TUIAction, TUIMode, TUIState } from './state'
