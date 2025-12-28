/**
 * Library Type Definitions
 *
 * Core type definitions for library types used throughout the TUI and CLI.
 *
 * @module monorepo-library-generator/cli/core/types/library
 */

/**
 * Single library types that can be generated
 */
export type SingleLibraryType = 'contract' | 'data-access' | 'feature' | 'infra' | 'provider'

/**
 * Special wizard actions (not single libraries)
 */
export type WizardAction = 'init' | 'domain'

/**
 * All wizard selection types (libraries + special actions)
 */
export type WizardSelection = SingleLibraryType | WizardAction

/**
 * Library type for execution (includes domain for generating 3 libraries)
 */
export type LibraryType = SingleLibraryType | 'domain'

/**
 * Library type metadata for display
 */
export interface LibraryTypeMetadata {
  readonly type: SingleLibraryType
  readonly label: string
  readonly description: string
  readonly icon: string
  readonly hasExternalService?: boolean
  readonly defaultPlatform?: Platform
  readonly generatedFiles: readonly string[]
}

/**
 * Special action metadata for display
 */
export interface WizardActionMetadata {
  readonly type: WizardAction
  readonly label: string
  readonly description: string
  readonly icon: string
  readonly generatesTo: readonly string[]
}

/**
 * Platform options for libraries
 */
export type Platform = 'node' | 'browser' | 'universal' | 'edge'

/**
 * Files that will be generated (for preview)
 */
export interface FilePreview {
  readonly path: string
  readonly description: string
  readonly isOptional?: boolean
}

/**
 * Workspace type detection
 */
export type WorkspaceType = 'nx' | 'pnpm' | 'yarn' | 'npm'

/**
 * Workspace context information
 */
export interface WorkspaceContext {
  readonly type: WorkspaceType
  readonly isNx: boolean
  readonly librariesRoot: string
  readonly scope: string
  readonly root: string
}
