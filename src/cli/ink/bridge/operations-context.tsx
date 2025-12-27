/**
 * Operations Context for React Ink TUI
 *
 * Provides a thin wrapper around existing business logic for React components.
 * This context bridges the React Ink presentation layer with the core operations.
 *
 * @module monorepo-library-generator/cli/ink/bridge/operations-context
 */

import type React from 'react'
import { createContext, useContext, useMemo } from 'react'
import { getOptionsForType, type OptionConfig } from '../../interactive/config/options.config'
import {
  type ValidationResult,
  validateExternalService,
  validateName
} from '../../interactive/config/validation.config'
import { executeWizardResult } from '../../interactive/execution'
import {
  getCreationDescription,
  getFilePreview,
  getTargetDirectory
} from '../../interactive/file-preview'
import type { FilePreview, LibraryType, WizardOptions } from '../../interactive/types'

/**
 * Operations interface - thin wrapper around existing functions
 *
 * This interface provides all operations needed by React components.
 * It delegates to existing business logic, keeping components pure presentation.
 */
export interface WizardOperations {
  readonly validation: {
    /** Validate a library name */
    validateName: (name: string) => ValidationResult
    /** Validate an external service name */
    validateExternalService: (name: string) => ValidationResult
  }
  readonly preview: {
    /** Get file preview for a library configuration */
    getFilePreview: (
      type: LibraryType,
      name: string,
      options: WizardOptions
    ) => readonly FilePreview[]
    /** Get target directory for a library type */
    getTargetDirectory: (librariesRoot: string, type: LibraryType, name: string) => string
    /** Get description of what will be created */
    getCreationDescription: (type: LibraryType, name: string) => string
  }
  readonly config: {
    /** Get available options for a library type */
    getOptionsForType: (type: LibraryType) => readonly OptionConfig[]
  }
  readonly generation: {
    /** Execute library generation from wizard result */
    execute: typeof executeWizardResult
  }
}

const OperationsContext = createContext<WizardOperations | null>(null)

interface OperationsProviderProps {
  readonly children: React.ReactNode
}

/**
 * Provider component that wraps the app and provides operations to all components
 *
 * @example
 * ```tsx
 * <OperationsProvider>
 *   <App />
 * </OperationsProvider>
 * ```
 */
export function OperationsProvider({ children }: OperationsProviderProps) {
  const operations = useMemo<WizardOperations>(
    () => ({
      validation: {
        validateName,
        validateExternalService
      },
      preview: {
        getFilePreview,
        getTargetDirectory,
        getCreationDescription
      },
      config: {
        getOptionsForType
      },
      generation: {
        execute: executeWizardResult
      }
    }),
    []
  )

  return <OperationsContext.Provider value={operations}>{children}</OperationsContext.Provider>
}

/**
 * Hook to access wizard operations from any component
 *
 * @throws Error if used outside of OperationsProvider
 *
 * @example
 * ```tsx
 * function NameInput() {
 *   const { validation } = useOperations()
 *   const result = validation.validateName(name)
 *   // ...
 * }
 * ```
 */
export function useOperations(): WizardOperations {
  const ops = useContext(OperationsContext)
  if (!ops) {
    throw new Error('useOperations must be used within OperationsProvider')
  }
  return ops
}
