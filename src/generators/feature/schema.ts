export interface FeatureGeneratorSchema {
  name: string
  directory?: string
  description?: string
  scope?: string
  platform?: "node" | "universal" | "browser" | "edge"
  includeClientServer?: boolean
  includeCQRS?: boolean
  testRunner?: "vitest"
  tags?: string

  // Data access library
  dataAccessLibrary?: string

  // Client state management
  includeClientState?: boolean

  // Sub-module organization for consolidated features
  includeSubModules?: boolean
  subModules?: string // Comma-separated list

  // Dotfile generation options (Effect.ts code quality enforcement)
  // Only library-specific dotfiles (eslint.config.mjs, tsconfig.json) are added
  addDotfiles?: boolean // Default: true
  overwriteDotfiles?: boolean // Default: false
}
