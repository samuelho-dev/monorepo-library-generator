export interface ContractGeneratorSchema {
  name: string
  directory?: string
  description?: string
  dependencies?: Array<string>
  entities?: Array<string> | string // Can be array or JSON string from CLI
  includeCQRS?: boolean
  includeRPC?: boolean
  tags?: string

  // Dotfile generation options (Effect.ts code quality enforcement)
  addDotfiles?: boolean // Default: true
  includeVSCodeSettings?: boolean // Default: true
  overwriteDotfiles?: boolean // Default: false
}
