/* eslint-disable no-restricted-syntax -- external blueprint data is narrowed before each assertion */
import { createHash } from "node:crypto"
import { createNamingVariants } from "../utils/naming"
import {
  type BlueprintDependency,
  type BlueprintModule,
  CONTRACT_ROLES,
  type ContractRole,
  ENTRYPOINT_NAMES,
  type EntrypointName,
  type GenerationPlan,
  LIBRARY_KINDS,
  type LibraryBlueprint,
  type LibraryKind
} from "./types"

const NAME_PATTERN = /^[a-z][a-z0-9-]*[a-z0-9]$/

export class BlueprintValidationError extends Error {
  readonly _tag = "BlueprintValidationError"

  constructor(message: string) {
    super(message)
    this.name = "BlueprintValidationError"
  }
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input)
}

function requireName(input: unknown, label: string) {
  if (typeof input !== "string" || !NAME_PATTERN.test(input)) {
    throw new BlueprintValidationError(
      `${label} must be kebab-case and contain at least two characters`
    )
  }
  return input
}

function optionalString(input: unknown, label: string) {
  if (input === undefined) return undefined
  if (typeof input !== "string" || input.length === 0) {
    throw new BlueprintValidationError(`${label} must be a non-empty string`)
  }
  return input
}

function workspaceRelativePath(input: unknown, label: string) {
  const value = optionalString(input, label)
  if (value === undefined) return undefined
  const segments = value.split("/")
  if (
    value.startsWith("/") ||
    value.includes("\\") ||
    segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")
  ) {
    throw new BlueprintValidationError(`${label} must be a workspace-relative POSIX path`)
  }
  return value
}

function stringArray(input: unknown, label: string) {
  if (input === undefined) return undefined
  if (!Array.isArray(input) || input.some((item) => typeof item !== "string")) {
    throw new BlueprintValidationError(`${label} must be an array of strings`)
  }
  return input
}

function decodeEntrypoints(input: unknown) {
  const values = stringArray(input, "entrypoints")
  if (!values) return undefined
  for (const value of values) {
    if (!ENTRYPOINT_NAMES.some((entrypoint) => entrypoint === value)) {
      throw new BlueprintValidationError(`Unsupported entrypoint: ${value}`)
    }
  }
  return values as ReadonlyArray<EntrypointName>
}

function decodeRoles(input: unknown) {
  const values = stringArray(input, "module roles")
  if (!values) return undefined
  for (const value of values) {
    if (!CONTRACT_ROLES.some((role) => role === value)) {
      throw new BlueprintValidationError(`Unsupported contract role: ${value}`)
    }
  }
  return values as ReadonlyArray<ContractRole>
}

function insertModulePath(
  modules: Array<BlueprintModule>,
  segments: ReadonlyArray<string>,
  leaf: Omit<BlueprintModule, "name" | "modules">
) {
  const [name, ...rest] = segments
  if (!name) throw new BlueprintValidationError("Module path cannot be empty")
  const existingIndex = modules.findIndex((module) => module.name === name)
  const existing = existingIndex >= 0 ? modules[existingIndex] : undefined

  if (rest.length === 0) {
    if (existing?.modules && existing.modules.length > 0) {
      throw new BlueprintValidationError(
        `Module ${segments.join("/")} cannot be both a service and a group`
      )
    }
    if (existing) throw new BlueprintValidationError(`Duplicate module path: ${segments.join("/")}`)
    modules.push({ name, ...leaf })
    return
  }

  if (existing && !existing.modules) {
    throw new BlueprintValidationError(`Module ${name} cannot be both a service and a group`)
  }
  const children = existing?.modules ? [...existing.modules] : []
  insertModulePath(children, rest, leaf)
  const next = { name, modules: children }
  if (existingIndex >= 0) modules[existingIndex] = next
  else modules.push(next)
}

function decodeModulePath(input: string, label: string) {
  const segments = input.split("/")
  if (segments.some((segment) => segment.length === 0)) {
    throw new BlueprintValidationError(`${label} must not contain empty path segments`)
  }
  return segments.map((segment, index) => requireName(segment, `${label}[${index}]`))
}

function modulesFromPaths(
  paths: ReadonlyArray<string>,
  leaf: Omit<BlueprintModule, "name" | "modules"> = {}
) {
  const modules: Array<BlueprintModule> = []
  for (const [index, path] of paths.entries()) {
    insertModulePath(modules, decodeModulePath(path, `modules[${index}]`), leaf)
  }
  return modules
}

function decodeModules(
  input: unknown,
  label = "modules"
): ReadonlyArray<BlueprintModule> | undefined {
  if (input === undefined) return undefined
  if (!Array.isArray(input)) {
    throw new BlueprintValidationError(`${label} must be an array`)
  }

  if (input.every((item) => typeof item === "string")) {
    return modulesFromPaths(input as ReadonlyArray<string>)
  }

  return input.map((item, index): BlueprintModule => {
    if (typeof item === "string") {
      throw new BlueprintValidationError(
        `${label} must use either path strings or module objects, not both`
      )
    }
    if (!isRecord(item)) {
      throw new BlueprintValidationError(`${label}[${index}] must be a string or object`)
    }
    const roles = decodeRoles(item.roles)
    if (item.testHarness !== undefined && typeof item.testHarness !== "boolean") {
      throw new BlueprintValidationError(`${label}[${index}].testHarness must be a boolean`)
    }
    const modules = decodeModules(item.modules, `${label}[${index}].modules`)
    if (modules && (roles || item.testHarness !== undefined)) {
      throw new BlueprintValidationError(`${label}[${index}] groups cannot declare service options`)
    }
    return {
      name: requireName(item.name, `${label}[${index}].name`),
      ...(modules && { modules }),
      ...(roles && { roles }),
      ...(typeof item.testHarness === "boolean" && { testHarness: item.testHarness })
    }
  })
}

function validateModuleIdentifiers(modules: ReadonlyArray<BlueprintModule>) {
  const paths = new Set<string>()
  const identifiers = new Map<string, string>()
  const visit = (items: ReadonlyArray<BlueprintModule>, parent: ReadonlyArray<string>) => {
    for (const module of items) {
      const modulePath = [...parent, module.name]
      const pathKey = modulePath.join("/")
      if (paths.has(pathKey)) {
        throw new BlueprintValidationError(`Duplicate module path: ${pathKey}`)
      }
      paths.add(pathKey)

      if (module.modules && module.modules.length > 0) {
        visit(module.modules, modulePath)
        continue
      }

      const identifier = namingFor(modulePath.join("-")).className
      const existing = identifiers.get(identifier)
      if (existing) {
        throw new BlueprintValidationError(
          `Module paths ${existing} and ${pathKey} generate the same TypeScript identifier ${identifier}`
        )
      }
      identifiers.set(identifier, pathKey)
    }
  }
  visit(modules, [])
}

function decodeDependencies(input: unknown) {
  if (input === undefined) return undefined
  if (!Array.isArray(input)) throw new BlueprintValidationError("dependencies must be an array")

  return input.map((item, index): BlueprintDependency => {
    if (typeof item === "string") return { name: item }
    if (!isRecord(item)) {
      throw new BlueprintValidationError(`dependencies[${index}] must be a string or object`)
    }
    const name = optionalString(item.name, `dependencies[${index}].name`)
    if (!name) throw new BlueprintValidationError(`dependencies[${index}].name is required`)
    const section = item.section
    if (
      section !== undefined &&
      section !== "dependencies" &&
      section !== "devDependencies" &&
      section !== "peerDependencies"
    ) {
      throw new BlueprintValidationError(`dependencies[${index}].section is invalid`)
    }
    return {
      name,
      ...(typeof section === "string" && { section }),
      ...(typeof item.version === "string" && { version: item.version })
    }
  })
}

export function decodeLibraryBlueprint(input: unknown): LibraryBlueprint {
  if (!isRecord(input)) throw new BlueprintValidationError("Blueprint must be an object")
  if (input.schemaVersion !== 1) {
    throw new BlueprintValidationError("Blueprint schemaVersion must be 1")
  }
  if (typeof input.kind !== "string" || !LIBRARY_KINDS.some((kind) => kind === input.kind)) {
    throw new BlueprintValidationError("Blueprint kind is invalid")
  }

  const kind = input.kind as LibraryKind
  const name = requireName(input.name, "name")
  const description = optionalString(input.description, "description")
  const directory = workspaceRelativePath(input.directory, "directory")
  const tags = stringArray(input.tags, "tags")
  const entrypoints = decodeEntrypoints(input.entrypoints)
  if (
    (kind === "contract" || kind === "data-access") &&
    entrypoints?.some((entrypoint) => entrypoint !== "root")
  ) {
    throw new BlueprintValidationError(`${kind} libraries support only the root entrypoint`)
  }
  const modules = decodeModules(input.modules)
  if (modules) validateModuleIdentifiers(modules)
  if (kind === "provider" && modules) {
    throw new BlueprintValidationError(
      "provider libraries expose one root service and do not support modules"
    )
  }
  const dependencies = decodeDependencies(input.dependencies)
  const contract = optionalString(input.contract, "contract")
  if (kind === "feature" && entrypoints?.includes("client") && !contract) {
    throw new BlueprintValidationError("feature client entrypoints require a contract")
  }
  const rawTestMode = input.testMode
  if (
    rawTestMode !== undefined &&
    rawTestMode !== "none" &&
    rawTestMode !== "unit" &&
    rawTestMode !== "integration"
  ) {
    throw new BlueprintValidationError("testMode must be none, unit, or integration")
  }
  const testMode: "none" | "unit" | "integration" | undefined =
    rawTestMode === "none" || rawTestMode === "unit" || rawTestMode === "integration"
      ? rawTestMode
      : undefined

  const base = {
    schemaVersion: 1 as const,
    kind,
    name,
    ...(description && { description }),
    ...(directory && { directory }),
    ...(tags && { tags }),
    ...(entrypoints && { entrypoints }),
    ...(dependencies && { dependencies }),
    ...(typeof testMode === "string" && { testMode })
  }

  switch (kind) {
    case "contract":
      return { ...base, kind, ...(modules && { modules }) }
    case "data-access":
      return {
        ...base,
        kind,
        ...(modules && { modules }),
        ...(contract && { contract })
      }
    case "feature":
      return {
        ...base,
        kind,
        ...(modules && { modules }),
        ...(contract && { contract }),
        ...(Array.isArray(input.dataAccess) && {
          dataAccess: stringArray(input.dataAccess, "dataAccess")
        })
      }
    case "provider":
      return {
        ...base,
        kind,
        ...(typeof input.externalService === "string" && { externalService: input.externalService })
      }
    case "infra":
      return { ...base, kind, ...(modules && { modules }) }
  }
}

export function parseCommaSeparated(input: string | undefined) {
  if (!input) return undefined
  const values = input
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
  return values.length > 0 ? values : undefined
}

export function createBlueprint(input: {
  readonly kind: LibraryKind
  readonly name: string
  readonly description?: string
  readonly directory?: string
  readonly tags?: string | ReadonlyArray<string>
  readonly entrypoints?: string | ReadonlyArray<string>
  readonly modules?: string | ReadonlyArray<string>
  readonly capabilities?: string | ReadonlyArray<string>
  readonly dependencies?: string | ReadonlyArray<string>
  readonly contract?: string
  readonly dataAccess?: string | ReadonlyArray<string>
  readonly externalService?: string
  readonly testMode?: "none" | "unit" | "integration"
}) {
  const toValues = (value: string | ReadonlyArray<string> | undefined) =>
    typeof value === "string" ? parseCommaSeparated(value) : value
  const roles = toValues(input.capabilities)
  const moduleNames = toValues(input.modules)
  const modules = moduleNames
    ? modulesFromPaths(moduleNames, roles ? { roles: roles as ReadonlyArray<ContractRole> } : {})
    : roles
    ? [{ name: input.name, roles }]
    : undefined

  return decodeLibraryBlueprint({
    schemaVersion: 1,
    kind: input.kind,
    name: input.name,
    description: input.description,
    directory: input.directory,
    tags: toValues(input.tags),
    entrypoints: toValues(input.entrypoints),
    modules,
    dependencies: toValues(input.dependencies),
    contract: input.contract,
    dataAccess: toValues(input.dataAccess),
    externalService: input.externalService,
    testMode: input.testMode
  })
}

export function namingFor(name: string) {
  return createNamingVariants(name)
}

export function hashGenerationPlan(plan: Omit<GenerationPlan, "hash">) {
  return createHash("sha256").update(JSON.stringify(plan)).digest("hex")
}
