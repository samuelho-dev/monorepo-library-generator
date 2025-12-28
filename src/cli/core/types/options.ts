/**
 * Generator Options Types
 *
 * Type definitions for generator options used in both CLI and TUI.
 *
 * @module monorepo-library-generator/cli/core/types/options
 */

import type { Platform } from "./library"

/**
 * All possible generator options across all library types
 */
export interface GeneratorOptions {
  // Common options (all types)
  readonly description?: string
  readonly tags?: string
  readonly selectedTags?: ReadonlyArray<string>

  // Platform options (feature, infra, provider)
  readonly platform?: Platform
  readonly scope?: string

  // Feature flags
  readonly includeCQRS?: boolean
  readonly includeClientServer?: boolean
  readonly includeCache?: boolean
  readonly includeSubModules?: boolean
  readonly subModules?: string

  // Contract specific
  readonly typesDatabasePackage?: string
  readonly entities?: ReadonlyArray<string>

  // Provider specific
  readonly externalService?: string
}

/**
 * Input component types for TUI
 */
export type InputComponentType = "boolean" | "text" | "select" | "multiselect" | "tags"

/**
 * Option field configuration for TUI rendering
 */
export interface OptionFieldConfig {
  readonly type: InputComponentType
  readonly key: keyof GeneratorOptions
  readonly label: string
  readonly description: string
  readonly placeholder?: string
  readonly options?: ReadonlyArray<string>
  readonly required?: boolean
  readonly default?: unknown
  readonly conditional?: {
    readonly dependsOn: keyof GeneratorOptions
    readonly showWhen: (value: unknown) => boolean
  }
}

/**
 * Validation result from validation functions
 */
export interface ValidationResult {
  readonly isValid: boolean
  readonly error: string | null
}

/**
 * Get effective tags from options (handles both selectedTags and legacy tags string)
 */
export function getEffectiveTags(options: GeneratorOptions): ReadonlyArray<string> {
  if (options.selectedTags && options.selectedTags.length > 0) {
    return options.selectedTags
  }
  if (options.tags) {
    return options.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
  }
  return []
}
