export interface FeatureGeneratorSchema {
  name: string
  directory?: string
  description?: string
  scope?: string
  platform?: "node" | "universal" | "browser" | "edge"
  includeClientServer?: boolean
  includeRPC?: boolean
  includeCQRS?: boolean
  includeEdge?: boolean
  testRunner?: "vitest"
  tags?: string

  // Dotfile generation options (Effect.ts code quality enforcement)
  // Only library-specific dotfiles (eslint.config.mjs, tsconfig.json) are added
  addDotfiles?: boolean // Default: true
  overwriteDotfiles?: boolean // Default: false
}
