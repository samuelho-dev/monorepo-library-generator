export interface ContractGeneratorSchema {
  readonly name: string
  readonly directory?: string
  readonly description?: string
  readonly tags?: string
  readonly modules?: ReadonlyArray<string> | string
  readonly capabilities?: ReadonlyArray<string> | string
  readonly dependencies?: ReadonlyArray<string> | string
  readonly entrypoints?: ReadonlyArray<string> | string
  readonly testMode?: "none" | "unit" | "integration"
}
