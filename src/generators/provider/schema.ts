/**
 * Provider Generator Schema Interface
 *
 * Defines the options interface for the provider generator
 * based on the JSON schema definition.
 */

export interface ProviderGeneratorSchema {
  name: string
  directory?: string
  externalService: string
  description?: string
  platform?: "node" | "browser" | "universal" | "edge"
  includeClientServer?: boolean

  // Provider type configuration
  providerType?: "sdk" | "cli" | "http" | "graphql"
  cliCommand?: string
  baseUrl?: string
  authType?: "bearer" | "apikey" | "oauth" | "basic" | "none"

  tags?: string

  // Dotfile generation options (Effect.ts code quality enforcement)
  addDotfiles?: boolean // Default: true
  includeVSCodeSettings?: boolean // Default: true
  overwriteDotfiles?: boolean // Default: false
}
