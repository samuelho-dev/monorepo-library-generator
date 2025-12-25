import type { PlatformType } from "../../utils/build"

export interface InfraGeneratorSchema {
  name: string
  directory?: string
  description?: string
  tags?: string
  platform?: PlatformType
  includeClientServer?: boolean
  includeClient?: boolean
  includeServer?: boolean

  // Provider consolidation options
  consolidatesProviders?: boolean
  providers?: string // Comma-separated list

  // Dotfile generation options (Effect.ts code quality enforcement)
  // Only library-specific dotfiles (eslint.config.mjs, tsconfig.json) are added
  addDotfiles?: boolean // Default: true
  overwriteDotfiles?: boolean // Default: false
}
