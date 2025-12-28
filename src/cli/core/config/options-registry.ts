/**
 * Options Registry
 *
 * Single source of truth for all option configurations per library type.
 * Maps CLI flags to TUI input components ensuring feature parity.
 *
 * @module monorepo-library-generator/cli/core/config/options-registry
 */

import type { GeneratorOptions, LibraryType, OptionFieldConfig, Platform } from "../types"

/**
 * Platform options - matches CLI choices
 */
export const PLATFORM_OPTIONS: ReadonlyArray<Platform> = ["node", "browser", "universal", "edge"]

/**
 * Shared option definitions - reusable across library types
 */
const SHARED_OPTIONS: Record<string, OptionFieldConfig> = {
  platform: {
    type: "select",
    key: "platform",
    label: "Platform",
    description: "Target platform for the library",
    options: PLATFORM_OPTIONS,
    default: "universal"
  },

  scope: {
    type: "text",
    key: "scope",
    label: "Scope",
    description: "Custom scope for the library",
    placeholder: "@myorg"
  },

  includeCQRS: {
    type: "boolean",
    key: "includeCQRS",
    label: "Include CQRS",
    description: "Include CQRS pattern files (commands, queries, projections)",
    default: false
  },

  includeClientServer: {
    type: "boolean",
    key: "includeClientServer",
    label: "Client/Server",
    description: "Generate client-side hooks and state management",
    default: false
  },

  includeSubModules: {
    type: "boolean",
    key: "includeSubModules",
    label: "Sub-Modules",
    description: "Include modular sub-modules within the library",
    default: false
  },

  subModules: {
    type: "text",
    key: "subModules",
    label: "Sub-Module Names",
    description: "Comma-separated list of sub-module names",
    placeholder: "cart,checkout,management",
    conditional: {
      dependsOn: "includeSubModules",
      showWhen: (value) => value === true
    }
  },

  typesDatabasePackage: {
    type: "text",
    key: "typesDatabasePackage",
    label: "Types DB Package",
    description: "Package name for prisma-effect-kysely generated types",
    placeholder: "@scope/types-database"
  },

  externalService: {
    type: "text",
    key: "externalService",
    label: "External Service",
    description: "Name of the external service to integrate",
    placeholder: "stripe",
    required: true
  },

  description: {
    type: "text",
    key: "description",
    label: "Description",
    description: "Library description for package.json",
    placeholder: "A brief description..."
  },

  tags: {
    type: "tags",
    key: "selectedTags",
    label: "Tags",
    description: "Tags for categorization and filtering"
  }
}

/**
 * Options per library type - maps to CLI generator options
 *
 * CLI options per generator:
 * - contract: includeCQRS, typesDatabasePackage, includeSubModules, subModules
 * - data-access: includeSubModules, subModules
 * - feature: scope, platform, includeClientServer, includeCQRS, includeSubModules, subModules
 * - infra: platform, includeClientServer
 * - provider: platform, externalService (required)
 * - domain: scope, includeClientServer, includeCQRS, includeSubModules, subModules
 */
const OPTIONS_BY_TYPE: Record<LibraryType, ReadonlyArray<OptionFieldConfig>> = {
  contract: [
    SHARED_OPTIONS.includeCQRS,
    SHARED_OPTIONS.includeSubModules,
    SHARED_OPTIONS.subModules,
    SHARED_OPTIONS.typesDatabasePackage,
    SHARED_OPTIONS.description,
    SHARED_OPTIONS.tags
  ],

  "data-access": [
    SHARED_OPTIONS.includeSubModules,
    SHARED_OPTIONS.subModules,
    SHARED_OPTIONS.description,
    SHARED_OPTIONS.tags
  ],

  feature: [
    SHARED_OPTIONS.platform,
    SHARED_OPTIONS.scope,
    SHARED_OPTIONS.includeClientServer,
    SHARED_OPTIONS.includeCQRS,
    SHARED_OPTIONS.includeSubModules,
    SHARED_OPTIONS.subModules,
    SHARED_OPTIONS.description,
    SHARED_OPTIONS.tags
  ],

  infra: [
    SHARED_OPTIONS.platform,
    SHARED_OPTIONS.includeClientServer,
    SHARED_OPTIONS.description,
    SHARED_OPTIONS.tags
  ],

  provider: [
    SHARED_OPTIONS.externalService,
    SHARED_OPTIONS.platform,
    SHARED_OPTIONS.description,
    SHARED_OPTIONS.tags
  ],

  domain: [
    SHARED_OPTIONS.scope,
    SHARED_OPTIONS.includeClientServer,
    SHARED_OPTIONS.includeCQRS,
    SHARED_OPTIONS.includeSubModules,
    SHARED_OPTIONS.subModules,
    SHARED_OPTIONS.description,
    SHARED_OPTIONS.tags
  ]
}

/**
 * Get options for a specific library type
 */
export function getOptionsForType(libraryType: LibraryType): ReadonlyArray<OptionFieldConfig> {
  return OPTIONS_BY_TYPE[libraryType] ?? []
}

/**
 * Get visible options based on current option values (handles conditional display)
 */
export function getVisibleOptions(
  libraryType: LibraryType,
  currentOptions: GeneratorOptions
): ReadonlyArray<OptionFieldConfig> {
  const allOptions = getOptionsForType(libraryType)

  return allOptions.filter((opt) => {
    if (!opt.conditional) return true
    const depValue = currentOptions[opt.conditional.dependsOn]
    return opt.conditional.showWhen(depValue)
  })
}

/**
 * Get default options for a library type
 */
export function getDefaultOptions(libraryType: LibraryType): Partial<GeneratorOptions> {
  const options = getOptionsForType(libraryType)
  const defaults: Partial<GeneratorOptions> = {}

  for (const opt of options) {
    if (opt.default !== undefined) {
      // Type-safe assignment based on key
      ;(defaults as Record<string, unknown>)[opt.key] = opt.default
    }
  }

  return defaults
}

/**
 * Get required options for a library type
 */
export function getRequiredOptions(libraryType: LibraryType): ReadonlyArray<OptionFieldConfig> {
  return getOptionsForType(libraryType).filter((opt) => opt.required === true)
}

/**
 * Check if all required options are filled
 */
export function validateRequiredOptions(
  libraryType: LibraryType,
  options: GeneratorOptions
): { isValid: boolean; missing: ReadonlyArray<string> } {
  const required = getRequiredOptions(libraryType)
  const missing: string[] = []

  for (const opt of required) {
    const value = options[opt.key]
    if (value === undefined || value === null || value === "") {
      missing.push(opt.label)
    }
  }

  return {
    isValid: missing.length === 0,
    missing
  }
}
