import type { LibraryType, WizardOptions } from "../types"

export interface TextOptionConfig {
  readonly type: "text"
  readonly key: keyof WizardOptions
  readonly label: string
  readonly description: string
  readonly placeholder?: string
}

export interface SelectOptionConfig {
  readonly type: "select"
  readonly key: keyof WizardOptions
  readonly label: string
  readonly description: string
  readonly options: ReadonlyArray<string>
}

export type OptionConfig = TextOptionConfig | SelectOptionConfig

const text = (key: keyof WizardOptions, label: string, description: string, placeholder: string) =>
  ({
    type: "text",
    key,
    label,
    description,
    placeholder
  }) satisfies TextOptionConfig

const modules = text(
  "modules",
  "Modules",
  "Comma-separated module paths; slash separates nested modules",
  "form-state,marketing/campaign"
)
const entrypoints = text(
  "entrypoints",
  "Entrypoints",
  "Any of root, client, server, edge",
  "root,server"
)
const domainEntrypoints = text(
  "entrypoints",
  "Entrypoints",
  "Any of root, client, server, edge",
  "root,client,server"
)
const dependencies = text(
  "dependencies",
  "Dependencies",
  "Comma-separated package names",
  "@myorg/env"
)
const testMode: SelectOptionConfig = {
  type: "select",
  key: "testMode",
  label: "Tests",
  description: "Generated test support",
  options: ["none", "unit", "integration"]
}
const OPTIONS_BY_TYPE: Record<LibraryType, ReadonlyArray<OptionConfig>> = {
  contract: [
    modules,
    text(
      "capabilities",
      "Capabilities",
      "Contract roles to generate",
      "entities,errors,events,ports"
    ),
    dependencies,
    testMode
  ],
  "data-access": [
    modules,
    text("contract", "Contract", "Contract domain or package", "order"),
    dependencies,
    testMode
  ],
  feature: [
    modules,
    entrypoints,
    text("contract", "Contract", "Contract domain used by the client RPC entrypoint", "order"),
    text("dataAccess", "Data access", "Consumed data-access domains", "order"),
    dependencies,
    testMode
  ],
  provider: [entrypoints, dependencies, testMode],
  infra: [modules, entrypoints, dependencies, testMode],
  domain: [modules, domainEntrypoints, testMode]
}

export function getOptionsForType(libraryType: LibraryType) {
  return OPTIONS_BY_TYPE[libraryType]
}
