/**
 * Interactive Wizard Types
 *
 * Type definitions for the interactive TUI wizard
 *
 * @module monorepo-library-generator/cli/interactive/types
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
 * Library type for backwards compatibility (includes domain for execution)
 */
export type LibraryType = SingleLibraryType | 'domain'

/**
 * Library type metadata for display in wizard
 */
export interface LibraryTypeInfo {
  readonly type: SingleLibraryType
  readonly label: string
  readonly description: string
  readonly hasExternalService?: boolean
}

/**
 * Special action metadata for display in wizard
 */
export interface WizardActionInfo {
  readonly type: WizardAction
  readonly label: string
  readonly description: string
  readonly generatesTo?: ReadonlyArray<string>
}

/**
 * Available single library types with descriptions
 */
export const LIBRARY_TYPES: ReadonlyArray<LibraryTypeInfo> = Object.freeze([
  Object.freeze({
    type: 'contract',
    label: 'Contract',
    description: 'Domain types, schemas, and interfaces'
  }),
  Object.freeze({
    type: 'data-access',
    label: 'Data-Access',
    description: 'Repository with database operations'
  }),
  Object.freeze({
    type: 'feature',
    label: 'Feature',
    description: 'Business logic with server/client support'
  }),
  Object.freeze({
    type: 'infra',
    label: 'Infra',
    description: 'Infrastructure services and implementations'
  }),
  Object.freeze({
    type: 'provider',
    label: 'Provider',
    description: 'External service integrations',
    hasExternalService: true
  })
])

/**
 * Special wizard actions (shown separately from library types)
 */
export const WIZARD_ACTIONS: ReadonlyArray<WizardActionInfo> = Object.freeze([
  Object.freeze({
    type: 'init',
    label: 'Init',
    description: 'Generate all built-in provider and infra libraries',
    generatesTo: [
      'libs/provider/kysely/',
      'libs/provider/supabase/',
      'libs/env/',
      'libs/infra/cache/',
      'libs/infra/database/',
      'libs/infra/logging/',
      'libs/infra/metrics/',
      'libs/infra/queue/',
      'libs/infra/pubsub/',
      'libs/infra/auth/',
      'libs/infra/storage/',
      'libs/infra/rpc/'
    ]
  }),
  Object.freeze({
    type: 'domain',
    label: 'Domain',
    description: 'Complete domain with contract, data-access, and feature',
    generatesTo: ['libs/contract/<name>/', 'libs/data-access/<name>/', 'libs/feature/<name>/']
  })
])

/**
 * Wizard step identifiers
 */
export type WizardStep =
  | 'select-type'
  | 'enter-name'
  | 'enter-external-service'
  | 'configure-options'
  | 'review-confirm'

/**
 * Wizard state at any point during flow
 */
export interface WizardState {
  readonly currentStep: WizardStep
  readonly librariesRoot: string
  readonly workspaceRoot: string
  readonly libraryType?: LibraryType
  readonly libraryName?: string
  readonly externalService?: string
  readonly options: WizardOptions
}

/**
 * Boolean option keys in WizardOptions
 */
export type WizardBooleanKey = 'includeCQRS' | 'includeClientServer' | 'includeCache'

/**
 * Configuration options gathered during wizard
 */
export interface WizardOptions {
  description?: string
  tags?: string
  /** Array-based tag selection (preferred over comma-separated tags string) */
  selectedTags?: ReadonlyArray<string>
  scope?: string
  platform?: 'node' | 'browser' | 'universal' | 'edge'
  includeCQRS?: boolean
  includeClientServer?: boolean
  includeCache?: boolean
}

/**
 * Get effective tags from WizardOptions (handles both selectedTags and legacy tags string)
 */
export function getEffectiveTags(options: WizardOptions) {
  if (options.selectedTags && options.selectedTags.length > 0) {
    return options.selectedTags
  }
  if (options.tags) {
    return options.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
  }
  return []
}

/**
 * Files that will be generated (for preview)
 */
export interface FilePreview {
  readonly path: string
  readonly description: string
  readonly isOptional?: boolean
}

/**
 * Completed wizard result ready for generation
 */
export interface WizardResult {
  readonly libraryType: LibraryType
  readonly libraryName: string
  readonly externalService?: string
  readonly targetDirectory: string
  readonly options: WizardOptions
  readonly filesToCreate: ReadonlyArray<FilePreview>
}
