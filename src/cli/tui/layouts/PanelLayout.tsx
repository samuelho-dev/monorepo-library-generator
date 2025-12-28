/**
 * Panel Layout Component
 *
 * Main layout orchestrating all panels in a flexible grid.
 *
 * @module monorepo-library-generator/cli/tui/layouts/PanelLayout
 */

import { Box, useApp, useInput } from 'ink'
import type React from 'react'

import { Footer, Header } from '../components'
import { canGenerate, type TUIAction, type TUIState } from '../state'

interface PanelLayoutProps {
  readonly state: TUIState
  readonly dispatch: React.Dispatch<TUIAction>
  readonly children: {
    readonly types: React.ReactNode
    readonly options: React.ReactNode
    readonly preview: React.ReactNode
  }
}

/**
 * Main panel layout with keyboard navigation
 */
export function PanelLayout({ state, dispatch, children }: PanelLayoutProps) {
  const { exit } = useApp()

  // Global keyboard shortcuts
  useInput((input, key) => {
    // Quit
    if (input === 'q') {
      exit()
      return
    }

    // Panel switching with Tab
    if (key.tab) {
      if (key.shift) {
        dispatch({ type: 'PREVIOUS_PANEL' })
      } else {
        dispatch({ type: 'NEXT_PANEL' })
      }
      return
    }

    // Direct panel access with numbers
    if (input === '1') {
      dispatch({ type: 'SET_ACTIVE_PANEL', payload: 'types' })
      return
    }
    if (input === '2') {
      dispatch({ type: 'SET_ACTIVE_PANEL', payload: 'options' })
      return
    }
    if (input === '3') {
      dispatch({ type: 'SET_ACTIVE_PANEL', payload: 'preview' })
      return
    }

    // Generate with G (capital)
    if (input === 'G' && canGenerate(state)) {
      dispatch({ type: 'START_GENERATION' })
      return
    }

    // New generation after complete
    if (input === 'n' && state.mode === 'complete') {
      dispatch({ type: 'RESET_FOR_NEW' })
      return
    }
  })

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Header workspace={state.workspace} />

      {/* Main panels - two column flex grid */}
      <Box flexDirection="row" flexGrow={1}>
        {/* Left column: Types + Options stacked */}
        <Box width={28} flexDirection="column">
          <Box flexGrow={1}>{children.types}</Box>
          <Box flexGrow={1}>{children.options}</Box>
        </Box>

        {/* Right column: Preview */}
        <Box flexGrow={1}>{children.preview}</Box>
      </Box>

      {/* Footer */}
      <Footer activePanel={state.activePanel} mode={state.mode} />
    </Box>
  )
}
