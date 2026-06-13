export interface ProviderGeneratorSchema {
  readonly name: string
  readonly directory?: string
  readonly externalService?: string
  readonly description?: string
  readonly tags?: string
  readonly dependencies?: ReadonlyArray<string> | string
  readonly entrypoints?: ReadonlyArray<string> | string
  readonly testMode?: "none" | "unit" | "integration"
}
