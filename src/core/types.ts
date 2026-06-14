export const LIBRARY_KINDS = ["contract", "data-access", "feature", "provider", "infra"] as const

export type LibraryKind = (typeof LIBRARY_KINDS)[number]

export const ENTRYPOINT_NAMES = ["root", "client", "server", "edge"] as const

export type EntrypointName = (typeof ENTRYPOINT_NAMES)[number]

export const CONTRACT_ROLES = ["entities", "errors", "events", "ports", "rpc", "types"] as const

export type ContractRole = (typeof CONTRACT_ROLES)[number]

export interface BlueprintModule {
  readonly name: string
  readonly modules?: ReadonlyArray<BlueprintModule>
  readonly roles?: ReadonlyArray<ContractRole>
  readonly testHarness?: boolean
}

export interface BlueprintDependency {
  readonly name: string
  readonly section?: "dependencies" | "devDependencies" | "peerDependencies"
  readonly version?: string
}

interface BaseLibraryBlueprint {
  readonly schemaVersion: 1
  readonly kind: LibraryKind
  readonly name: string
  readonly description?: string
  readonly directory?: string
  readonly tags?: ReadonlyArray<string>
  readonly entrypoints?: ReadonlyArray<EntrypointName>
  readonly dependencies?: ReadonlyArray<BlueprintDependency>
  readonly testMode?: "none" | "unit" | "integration"
}

export interface ContractBlueprint extends BaseLibraryBlueprint {
  readonly kind: "contract"
  readonly modules?: ReadonlyArray<BlueprintModule>
}

export interface DataAccessBlueprint extends BaseLibraryBlueprint {
  readonly kind: "data-access"
  readonly modules?: ReadonlyArray<BlueprintModule>
  readonly contract?: string
}

export interface FeatureBlueprint extends BaseLibraryBlueprint {
  readonly kind: "feature"
  readonly modules?: ReadonlyArray<BlueprintModule>
  readonly contract?: string
  readonly dataAccess?: ReadonlyArray<string>
}

export interface ProviderBlueprint extends BaseLibraryBlueprint {
  readonly kind: "provider"
  readonly modules?: never
  readonly externalService?: string
}

export interface InfraBlueprint extends BaseLibraryBlueprint {
  readonly kind: "infra"
  readonly modules?: ReadonlyArray<BlueprintModule>
}

export type LibraryBlueprint =
  | ContractBlueprint
  | DataAccessBlueprint
  | FeatureBlueprint
  | ProviderBlueprint
  | InfraBlueprint

export interface WorkspacePolicy {
  readonly schemaVersion: 1
  readonly scope?: string
  readonly librariesRoot: string
  readonly effect: {
    readonly version: string
    readonly testVersion: string
  }
  readonly commands: {
    readonly lint: string
    readonly formatter: string
    readonly typecheck: string
    readonly test: string
  }
  readonly packages: {
    readonly env?: string
    readonly contractDatabase?: string
    readonly infraDatabase?: string
    readonly infraRpc?: string
    readonly typesDatabase?: string
  }
  readonly defaults: {
    readonly contractRoles: ReadonlyArray<ContractRole>
    readonly entrypoints: Readonly<Record<LibraryKind, ReadonlyArray<EntrypointName>>>
    readonly testMode: Readonly<Record<LibraryKind, "none" | "unit" | "integration">>
  }
}

export interface GeneratedFile {
  readonly path: string
  readonly content: string
  readonly format: "typescript" | "json"
}

export interface GenerationPlan {
  readonly blueprint: LibraryBlueprint
  readonly projectName: string
  readonly projectRoot: string
  readonly sourceRoot: string
  readonly packageName: string
  readonly files: ReadonlyArray<GeneratedFile>
  readonly hash: string
}

export interface GeneratorResult {
  readonly projectName: string
  readonly projectRoot: string
  readonly packageName: string
  readonly sourceRoot: string
  readonly filesGenerated: ReadonlyArray<string>
}

export interface StandardizationDiagnostic {
  readonly code: string
  readonly message: string
  readonly path: string
}

export interface StandardizationResult {
  readonly projectRoot: string
  readonly changedFiles: ReadonlyArray<string>
  readonly diagnostics: ReadonlyArray<StandardizationDiagnostic>
  readonly check: boolean
}
