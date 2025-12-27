/**
 * Options Configuration
 *
 * UI presentation config for wizard options.
 * Keys and types must match the validation registry schemas.
 *
 * The validation registry (src/infrastructure/validation/registry.ts) is the
 * single source of truth for field names, types, and validation rules.
 * This file only adds UI-specific presentation metadata.
 *
 * @module monorepo-library-generator/cli/interactive/config/options
 */

import type { LibraryType, WizardOptions } from '../types'

/**
 * Platform options - must match Schema.Literal in validation registry
 */
export const PLATFORM_OPTIONS = ['node', 'browser', 'universal', 'edge'] as const
export type PlatformOption = (typeof PLATFORM_OPTIONS)[number]

/**
 * Option types for UI rendering
 */
export interface BooleanOptionConfig {
  readonly type: 'boolean'
  readonly key: keyof WizardOptions
  readonly label: string
  readonly description: string
}

export interface TextOptionConfig {
  readonly type: 'text'
  readonly key: keyof WizardOptions
  readonly label: string
  readonly description: string
  readonly placeholder?: string
}

export interface SelectOptionConfig {
  readonly type: 'select'
  readonly key: keyof WizardOptions
  readonly label: string
  readonly description: string
  readonly options: ReadonlyArray<string>
}

export type OptionConfig = BooleanOptionConfig | TextOptionConfig | SelectOptionConfig

/**
 * Shared option definitions - reusable across library types
 * Labels/descriptions should match schema annotations in validation/registry.ts
 */
const SHARED_OPTIONS = {
  platform: {
    type: 'select',
    key: 'platform',
    label: 'Platform',
    description: 'Target platform for the library',
    options: PLATFORM_OPTIONS
  },

  scope: {
    type: 'text',
    key: 'scope',
    label: 'Scope',
    description: 'Custom scope for the library',
    placeholder: '@myorg'
  },

  includeCQRS: {
    type: 'boolean',
    key: 'includeCQRS',
    label: 'Include CQRS',
    description: 'Include CQRS pattern files (commands, queries, projections)'
  },

  includeClientServer: {
    type: 'boolean',
    key: 'includeClientServer',
    label: 'Include Client/Server',
    description: 'Generate client-side hooks and state management'
  }
} as const

/**
 * Options per library type
 *
 * IMPORTANT: These must match the CLI generator options!
 * See: src/cli/generators/*.ts and src/infrastructure/validation/registry.ts
 *
 * CLI options per generator (from help output):
 * - contract: includeCQRS
 * - feature: scope, platform, includeClientServer, includeCQRS
 * - domain: scope, includeClientServer, includeCQRS
 * - infra: platform, includeClientServer
 * - provider: platform
 * - data-access: (none)
 */
const OPTIONS_BY_TYPE: Record<LibraryType, ReadonlyArray<OptionConfig>> = {
  contract: [SHARED_OPTIONS.includeCQRS],

  feature: [
    SHARED_OPTIONS.platform,
    SHARED_OPTIONS.scope,
    SHARED_OPTIONS.includeClientServer,
    SHARED_OPTIONS.includeCQRS
  ],

  infra: [SHARED_OPTIONS.platform, SHARED_OPTIONS.includeClientServer],

  domain: [SHARED_OPTIONS.scope, SHARED_OPTIONS.includeClientServer, SHARED_OPTIONS.includeCQRS],

  'data-access': [],

  provider: [SHARED_OPTIONS.platform]
}

/**
 * Get options for a specific library type
 */
export function getOptionsForType(libraryType: LibraryType) {
  return OPTIONS_BY_TYPE[libraryType]
}
