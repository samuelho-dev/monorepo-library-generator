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
  addDotfiles?: boolean // Default: true
  includeVSCodeSettings?: boolean // Default: true
  overwriteDotfiles?: boolean // Default: false
}
