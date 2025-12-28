/**
 * TUI Application Root
 *
 * Main application component that orchestrates all panels and manages state.
 *
 * @module monorepo-library-generator/cli/tui/App
 */

import { NodeContext } from '@effect/platform-node'
import { Effect, Exit, Runtime } from 'effect'
import { Box, Text } from 'ink'
import { useCallback, useEffect, useReducer, useState } from 'react'
import type { LibraryType } from '../core'
import { detectWorkspaceSync, executeGeneration, getTargetDirectory } from '../core'
import { PanelLayout } from './layouts'
import { OptionsPanel, PreviewPanel, TypesPanel } from './panels'
import { initialState, tuiReducer, type TUIState } from './state'
import { colors } from './theme/colors'

/**
 * Main TUI Application
 */
export function App() {
  const [state, dispatch] = useReducer(tuiReducer, initialState)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize workspace detection on mount
  useEffect(() => {
    const workspace = detectWorkspaceSync(process.cwd())
    dispatch({ type: 'SET_WORKSPACE', payload: workspace })
    setIsInitialized(true)
  }, [])

  // Handle generation execution
  useEffect(() => {
    if (state.generationStatus !== 'generating') return
    if (!(state.selectedType && state.libraryName && state.workspace)) return

    // Skip wizard actions like 'init'
    if (state.selectedType === 'init' || state.selectedType === 'domain') {
      // Domain slice generation handled separately
      if (state.selectedType === 'domain') {
        runGeneration(state)
      }
      return
    }

    runGeneration(state)
  }, [state.generationStatus])

  const runGeneration = useCallback(
    async (currentState: TUIState) => {
      if (!(currentState.selectedType && currentState.libraryName && currentState.workspace)) {
        return
      }

      const libraryType = currentState.selectedType as LibraryType
      const targetDirectory = getTargetDirectory(
        currentState.workspace.librariesRoot,
        libraryType,
        currentState.libraryName
      )

      // For provider libraries, the library name IS the service name
      const externalService = libraryType === 'provider'
        ? currentState.libraryName
        : currentState.externalService || undefined

      const input = {
        libraryType,
        libraryName: currentState.libraryName,
        externalService,
        targetDirectory,
        options: currentState.options,
        filesToCreate: currentState.filesToCreate
      }

      const program = executeGeneration(input).pipe(Effect.provide(NodeContext.layer))

      const result = await Runtime.runPromiseExit(Runtime.defaultRuntime)(program)

      if (Exit.isSuccess(result)) {
        dispatch({ type: 'GENERATION_SUCCESS' })
      } else {
        const error = result.cause
        dispatch({
          type: 'GENERATION_ERROR',
          payload: error._tag === 'Fail' ? String(error.error) : 'Generation failed'
        })
      }
    },
    [dispatch]
  )

  if (!isInitialized) {
    return (
      <Box flexDirection='column' alignItems='center' justifyContent='center' height={10}>
        <Text color={colors.info}>Detecting workspace...</Text>
      </Box>
    )
  }

  return (
    <PanelLayout
      state={state}
      dispatch={dispatch}
      children={{
        types: <TypesPanel state={state} dispatch={dispatch} />,
        options: <OptionsPanel state={state} dispatch={dispatch} />,
        preview: <PreviewPanel state={state} dispatch={dispatch} />
      }}
    />
  )
}
