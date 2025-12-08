import type { PlatformType } from "../../utils/platforms"

export interface InfraGeneratorSchema {
  name: string
  directory?: string
  description?: string
  tags?: string
  platform?: PlatformType
  includeClientServer?: boolean
  includeEdge?: boolean

  // Dotfile generation options (Effect.ts code quality enforcement)
  // Only library-specific dotfiles (eslint.config.mjs, tsconfig.json) are added
  addDotfiles?: boolean // Default: true
  overwriteDotfiles?: boolean // Default: false
}
