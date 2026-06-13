export interface FeatureGeneratorSchema {
  readonly name: string
  readonly directory?: string
  readonly description?: string
  readonly tags?: string
  readonly modules?: ReadonlyArray<string> | string
  readonly dependencies?: ReadonlyArray<string> | string
  readonly entrypoints?: ReadonlyArray<string> | string
  readonly contract?: string
  readonly dataAccess?: ReadonlyArray<string> | string
  readonly testMode?: "none" | "unit" | "integration"
}
