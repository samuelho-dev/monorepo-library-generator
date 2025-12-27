/**
 * Wizard Container Component
 *
 * Orchestrates the wizard flow and renders the current step.
 * Uses operations context for business logic.
 *
 * @module monorepo-library-generator/cli/ink/components/WizardContainer
 */

import { Box, useApp, useInput } from 'ink'
import type React from 'react'
import { useCallback, useEffect } from 'react'
import type { WizardOptions, WizardSelection } from '../../interactive/types'
import { useOperations } from '../bridge/operations-context'
import type { WizardAction, WizardState } from '../state/types'
import { ConfirmPrompt } from './ConfirmPrompt'
import { ExternalServiceInput } from './ExternalServiceInput'
import { FileTreePreview } from './FileTreePreview'
import { GenerationProgress } from './GenerationProgress'
import { NameInput } from './NameInput'
import { OptionsForm } from './OptionsForm'
import { StepIndicator } from './StepIndicator'
import { TypeSelect } from './TypeSelect'

interface WizardContainerProps {
  readonly state: WizardState
  readonly dispatch: React.Dispatch<WizardAction>
  readonly onGenerate: () => void
  readonly workspaceRoot: string
}

export function WizardContainer({
  state,
  dispatch,
  onGenerate,
  workspaceRoot
}: WizardContainerProps) {
  const { exit } = useApp()
  const { preview } = useOperations()

  // Handle Ctrl+C to exit
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit()
    }
  })

  // Update file preview when relevant state changes
  useEffect(() => {
    if (state.libraryType && state.libraryName && state.currentStep === 'preview') {
      const files = preview.getFilePreview(state.libraryType, state.libraryName, state.options)
      dispatch({ type: 'SET_FILES_TO_CREATE', payload: files })
    }
  }, [state.libraryType, state.libraryName, state.options, state.currentStep, dispatch, preview])

  // Handlers
  const handleTypeSelect = useCallback(
    (selection: WizardSelection) => {
      dispatch({ type: 'SET_SELECTION', payload: selection })
      dispatch({ type: 'NEXT_STEP' })
    },
    [dispatch]
  )

  const handleNameSubmit = useCallback(
    (name: string) => {
      dispatch({ type: 'SET_LIBRARY_NAME', payload: name })
      dispatch({ type: 'NEXT_STEP' })
    },
    [dispatch]
  )

  const handleExternalServiceSubmit = useCallback(
    (service: string) => {
      dispatch({ type: 'SET_EXTERNAL_SERVICE', payload: service })
      dispatch({ type: 'NEXT_STEP' })
    },
    [dispatch]
  )

  const handleOptionsChange = useCallback(
    (options: WizardOptions) => {
      dispatch({ type: 'SET_OPTIONS', payload: options })
    },
    [dispatch]
  )

  const handleOptionsSubmit = useCallback(() => {
    dispatch({ type: 'NEXT_STEP' })
  }, [dispatch])

  const handleConfirm = useCallback(() => {
    dispatch({ type: 'START_GENERATION' })
    onGenerate()
  }, [dispatch, onGenerate])

  const handleCancel = useCallback(() => {
    exit()
  }, [exit])

  // Get target directory and description using operations context
  const targetDirectory =
    state.libraryType && state.libraryName
      ? preview.getTargetDirectory(state.librariesRoot, state.libraryType, state.libraryName)
      : ''
  const creationDescription =
    state.libraryType && state.libraryName
      ? preview.getCreationDescription(state.libraryType, state.libraryName)
      : undefined // Render current step
  const renderStep = () => {
    switch (state.currentStep) {
      case 'select-type':
        return <TypeSelect librariesRoot={state.librariesRoot} onSelect={handleTypeSelect} />

      case 'enter-name':
        return (
          <NameInput
            librariesRoot={state.librariesRoot}
            libraryType={state.libraryType ?? undefined}
            onSubmit={handleNameSubmit}
          />
        )

      case 'enter-external-service':
        return <ExternalServiceInput onSubmit={handleExternalServiceSubmit} />

      case 'configure-options':
        return (
          <OptionsForm
            libraryType={state.libraryType ?? undefined}
            options={state.options}
            onOptionsChange={handleOptionsChange}
            onSubmit={handleOptionsSubmit}
            workspaceRoot={workspaceRoot}
          />
        )

      case 'preview':
        return (
          <Box flexDirection="column">
            <FileTreePreview targetDirectory={targetDirectory} files={state.filesToCreate} />
            <Box marginTop={1}>
              <ConfirmPrompt
                targetDirectory={targetDirectory}
                fileCount={state.filesToCreate.length}
                description={state.libraryType === 'domain' ? creationDescription : undefined}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
              />
            </Box>
          </Box>
        )

      case 'generating':
      case 'complete':
      case 'error':
        // At this point libraryType should always be set for library generation
        // For init action, we use 'infra' as a fallback display type
        return (
          <GenerationProgress
            libraryType={state.libraryType ?? 'infra'}
            libraryName={state.libraryName}
            generatedFiles={state.generatedFiles}
            status={state.generationStatus}
            error={state.error}
            targetDirectory={targetDirectory}
          />
        )

      default:
        return null
    }
  }

  return (
    <Box flexDirection="column">
      {/* Only show step indicator during wizard steps */}
      {!['generating', 'complete', 'error'].includes(state.currentStep) && (
        <StepIndicator state={state} />
      )}
      {renderStep()}
    </Box>
  )
}
