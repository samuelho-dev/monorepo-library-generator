/* eslint-disable no-restricted-syntax -- existing package JSON is validated while preserving unknown fields */

import { Effect } from "effect"
import * as fs from "node:fs"
import * as path from "node:path"
import { Project } from "ts-morph"
import { createBlueprint } from "../core/blueprint"
import { formatGeneratedFile } from "../core/formatter"
import { createGenerationPlan } from "../core/planner"
import { loadWorkspacePolicy } from "../core/policy"
import type {
  EntrypointName,
  GeneratedFile,
  LibraryKind,
  StandardizationDiagnostic,
  StandardizationResult,
  WorkspacePolicy
} from "../core/types"
import { createWorkspaceContext } from "../infrastructure/workspace"
import { createAdapterFromContext } from "../utils/filesystem"

const MANAGED_FILES = new Set([
  "package.json",
  "project.json",
  "tsconfig.json",
  "tsconfig.lib.json",
  "tsconfig.spec.json",
  "vitest.config.ts"
])

function readJson(filePath: string) {
  if (!fs.existsSync(filePath)) return {}
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>
}

function listFiles(root: string) {
  if (!fs.existsSync(root)) return []
  const files: Array<string> = []
  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) visit(entryPath)
      else files.push(entryPath)
    }
  }
  visit(root)
  return files
}

function packageRoot(specifier: string) {
  if (specifier.startsWith("node:") || specifier.startsWith(".")) {
    return undefined
  }
  const parts = specifier.split("/")
  return specifier.startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0]
}

function inferIdentity(projectRoot: string, projectJson: Record<string, unknown>) {
  const configured = typeof projectJson.name === "string" ? projectJson.name : path.basename(projectRoot)
  const kinds: ReadonlyArray<LibraryKind> = [
    "data-access",
    "contract",
    "feature",
    "provider",
    "infra"
  ]
  for (const kind of kinds) {
    const prefix = `${kind}-`
    if (configured.startsWith(prefix)) {
      return { kind, name: configured.slice(prefix.length) }
    }
  }
  const parent = path.basename(path.dirname(projectRoot))
  if (kinds.some((kind) => kind === parent)) {
    return { kind: parent as LibraryKind, name: path.basename(projectRoot) }
  }
  throw new Error(`Cannot infer library kind from ${projectRoot}`)
}

function inferEntrypoints(sourceRoot: string) {
  const entries: Array<EntrypointName> = []
  if (
    fs.existsSync(path.join(sourceRoot, "index.ts")) ||
    fs.existsSync(path.join(sourceRoot, "lib/service.ts"))
  ) {
    entries.push("root")
  }
  for (const entrypoint of ["client", "server", "edge"] as const) {
    if (fs.existsSync(path.join(sourceRoot, `${entrypoint}.ts`))) {
      entries.push(entrypoint)
    }
  }
  return entries.length > 0 ? entries : ["root"]
}

function inferModules(sourceRoot: string, kind: LibraryKind, name: string) {
  const libRoot = path.join(sourceRoot, "lib")
  if (!fs.existsSync(libRoot)) return [name]
  if (kind === "contract") {
    const flatRoles = ["entities.ts", "errors.ts", "events.ts", "ports.ts", "types.ts"]
    if (flatRoles.some((role) => fs.existsSync(path.join(libRoot, role)))) {
      return [name]
    }
  }
  if (kind === "data-access" && fs.existsSync(path.join(libRoot, "service.ts"))) {
    return [name]
  }
  const findNestedModules = (root: string, isModule: (directory: string) => boolean) => {
    const modules: Array<string> = []
    const visit = (directory: string) => {
      if (isModule(directory)) {
        modules.push(path.relative(root, directory).split(path.sep).join("/"))
        return
      }
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.isDirectory()) visit(path.join(directory, entry.name))
      }
    }
    visit(root)
    return modules.filter((module) => module.length > 0).sort()
  }
  if (kind === "feature") {
    const servicesRoot = path.join(libRoot, "server/services")
    if (fs.existsSync(servicesRoot)) {
      const modules = findNestedModules(servicesRoot, (directory) => fs.existsSync(path.join(directory, "service.ts")))
      if (modules.length > 0) return modules
    }
  }
  const modules = findNestedModules(libRoot, (directory) => {
    if (kind !== "contract") {
      return fs.existsSync(path.join(directory, "service.ts"))
    }
    if (directory === libRoot) return false
    return ["entities.ts", "errors.ts", "events.ts", "ports.ts", "rpc.ts", "types.ts"].some(
      (role) => fs.existsSync(path.join(directory, role))
    )
  })
  return modules.length > 0 ? modules : [name]
}

function inferFeatureContract(sourceRoot: string) {
  const rpcPath = path.join(sourceRoot, "lib/client/rpc.ts")
  if (!fs.existsSync(rpcPath)) return undefined
  const project = new Project({ useInMemoryFileSystem: true })
  const sourceFile = project.createSourceFile(rpcPath, fs.readFileSync(rpcPath, "utf8"))
  for (const declaration of sourceFile.getImportDeclarations()) {
    const specifier = declaration.getModuleSpecifierValue()
    if (!specifier.endsWith("/rpc")) continue
    const root = packageRoot(specifier)
    if (root?.includes("/contract-")) return root
  }
  return undefined
}

function sourceDiagnostics(
  workspaceRoot: string,
  projectRoot: string,
  kind: LibraryKind,
  sourceFiles: ReadonlyArray<string>
) {
  const diagnostics: Array<StandardizationDiagnostic> = []
  const project = new Project({ useInMemoryFileSystem: true })
  const forbiddenImports: Partial<Record<LibraryKind, ReadonlyArray<string>>> = {
    contract: ["/data-access-", "/feature-", "/infra-", "/provider-"],
    "data-access": ["/feature-"],
    provider: ["/infra-", "/data-access-", "/feature-"],
    infra: ["/data-access-", "/feature-"]
  }

  for (const absolutePath of sourceFiles) {
    const relative = path.relative(workspaceRoot, absolutePath).split(path.sep).join("/")
    if (kind === "contract" && /\/(rpc-definitions|rpc-errors|rpc-group)\.ts$/.test(relative)) {
      diagnostics.push({
        code: "consolidate-contract-rpc",
        message: "Consolidate RPC schemas, errors, definitions, and the RpcGroup in src/lib/rpc.ts",
        path: relative
      })
    }
    if (relative.includes("/__tests__/")) {
      diagnostics.push({
        code: "no-test-directory",
        message: "Specs must be colocated with source files",
        path: relative
      })
    }
    if (relative.includes("/operations/")) {
      diagnostics.push({
        code: "no-operation-directory",
        message: "Data-access operations belong in service.ts",
        path: relative
      })
    }
    if (relative.endsWith("/layers.ts")) {
      diagnostics.push({
        code: "no-public-layers-file",
        message: "Compose feature layers in router.ts",
        path: relative
      })
    }
    if (!/\.[cm]?[jt]sx?$/.test(absolutePath)) continue
    const content = fs.readFileSync(absolutePath, "utf8")
    const sourceFile = project.createSourceFile(relative, content, {
      overwrite: true
    })
    if (/extends\s+Context\.(Tag|GenericTag)/.test(content)) {
      diagnostics.push({
        code: "effect-v4-context-service",
        message: "Use Context.Service for service tags",
        path: relative
      })
    }
    if (/static\s+readonly\s+Dev\b/.test(content)) {
      diagnostics.push({
        code: "no-dev-layer",
        message: "Public layers are Live, Test, and Auto only",
        path: relative
      })
    }
    if (/extends\s+Effect\.Service/.test(content)) {
      diagnostics.push({
        code: "effect-v4-context-service",
        message: "Use Context.Service for Effect v4 services",
        path: relative
      })
    }
    for (const declaration of sourceFile.getImportDeclarations()) {
      const specifier = declaration.getModuleSpecifierValue()
      if ((forbiddenImports[kind] ?? []).some((fragment) => specifier.includes(fragment))) {
        diagnostics.push({
          code: "dependency-direction",
          message: `${kind} libraries cannot import ${specifier}`,
          path: relative
        })
      }
    }
  }

  if (projectRoot.includes("\\")) {
    diagnostics.push({
      code: "portable-paths",
      message: "Project paths must use POSIX separators",
      path: projectRoot
    })
  }
  return diagnostics
}

function existingSections(packageJson: Record<string, unknown>) {
  const section = (name: string) => {
    const value = packageJson[name]
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, string>)
      : {}
  }
  return {
    dependencies: section("dependencies"),
    devDependencies: section("devDependencies"),
    peerDependencies: section("peerDependencies")
  }
}

function classifyDependencies(
  files: ReadonlyArray<string>,
  packageJson: Record<string, unknown>,
  policy: WorkspacePolicy,
  scope: string
) {
  const previous = existingSections(packageJson)
  const next = {
    dependencies: {},
    devDependencies: {},
    peerDependencies: {}
  } as {
    dependencies: Record<string, string>
    devDependencies: Record<string, string>
    peerDependencies: Record<string, string>
  }
  const project = new Project({ useInMemoryFileSystem: true })
  const usage = new Map<string, { runtime: boolean; test: boolean }>()
  for (const absolutePath of files) {
    if (!/\.[cm]?[jt]sx?$/.test(absolutePath)) continue
    const sourceFile = project.createSourceFile(
      absolutePath,
      fs.readFileSync(absolutePath, "utf8"),
      {
        overwrite: true
      }
    )
    const isTest = /\.(spec|test)\.[cm]?[jt]sx?$/.test(absolutePath) || absolutePath.endsWith("vitest.config.ts")
    const specifiers = [
      ...sourceFile
        .getImportDeclarations()
        .map((declaration) => declaration.getModuleSpecifierValue()),
      ...sourceFile
        .getExportDeclarations()
        .map((declaration) => declaration.getModuleSpecifierValue())
        .filter((specifier): specifier is string => specifier !== undefined)
    ]
    for (const specifier of specifiers) {
      const root = packageRoot(specifier)
      if (!root) continue
      const current = usage.get(root) ?? { runtime: false, test: false }
      usage.set(root, {
        runtime: current.runtime || !isTest,
        test: current.test || isTest
      })
    }
  }

  for (const [root, imported] of usage) {
    const section = root === "effect" || previous.peerDependencies[root]
      ? "peerDependencies"
      : root === "@effect/vitest" || root === "vitest" || !imported.runtime
      ? "devDependencies"
      : "dependencies"
    const version = previous[section][root] ??
      previous.dependencies[root] ??
      previous.devDependencies[root] ??
      previous.peerDependencies[root] ??
      (root === "effect"
        ? policy.effect.version
        : root === "@effect/vitest"
        ? policy.effect.testVersion
        : root.startsWith(`${scope}/`)
        ? "workspace:*"
        : "*")
    next[section][root] = version
  }
  for (const section of Object.values(next)) {
    const sorted = Object.fromEntries(
      Object.entries(section).sort(([left], [right]) => left.localeCompare(right))
    )
    for (const key of Object.keys(section)) delete section[key]
    Object.assign(section, sorted)
  }
  return next
}

function validExports(
  projectRoot: string,
  packageJson: Record<string, unknown>,
  sourceRoot: string
) {
  const configured = packageJson.exports
  if (typeof configured === "object" && configured !== null && !Array.isArray(configured)) {
    const entries = Object.entries(configured as Record<string, unknown>).filter(([, value]) => {
      if (typeof value === "string") {
        return fs.existsSync(path.join(projectRoot, value.replace(/^\.\//, "")))
      }
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false
      }
      const target = (value as Record<string, unknown>).import ?? (value as Record<string, unknown>).types
      return (
        typeof target === "string" &&
        fs.existsSync(path.join(projectRoot, target.replace(/^\.\//, "")))
      )
    })
    if (entries.length > 0) return Object.fromEntries(entries)
  }
  const indexTarget = fs.existsSync(path.join(projectRoot, sourceRoot, "index.ts"))
    ? `./${sourceRoot}/index.ts`
    : `./${sourceRoot}/lib/service.ts`
  return { ".": { import: indexTarget, types: indexTarget } }
}

function workspaceReference(packageName: string, scope: string, librariesRoot: string) {
  if (!packageName.startsWith(`${scope}/`)) return undefined
  const name = packageName.slice(scope.length + 1)
  for (const kind of ["contract", "data-access", "feature", "provider", "infra"] as const) {
    if (name.startsWith(`${kind}-`)) {
      return `${librariesRoot}/${kind}/${name.slice(kind.length + 1)}/tsconfig.lib.json`
    }
  }
  if (name === "env") return `${librariesRoot}/env/tsconfig.lib.json`
  const separator = name.indexOf("-")
  return separator > 0
    ? `${librariesRoot}/${name.slice(0, separator)}/${name.slice(separator + 1)}/tsconfig.lib.json`
    : `${librariesRoot}/${name}/tsconfig.lib.json`
}

function normalizeManagedFiles(
  workspaceRoot: string,
  projectRoot: string,
  planFiles: ReadonlyArray<GeneratedFile>,
  sourceFiles: ReadonlyArray<string>,
  policy: WorkspacePolicy
) {
  const relativeRoot = path.relative(workspaceRoot, projectRoot).split(path.sep).join("/")
  const formatJson = (name: string, value: unknown) =>
    formatGeneratedFile({
      path: `${relativeRoot}/${name}`,
      content: `${JSON.stringify(value, null, 2)}\n`,
      format: "json"
    }).content
  const packagePath = path.join(projectRoot, "package.json")
  const existingPackage = readJson(packagePath)
  const sections = classifyDependencies(
    sourceFiles,
    existingPackage,
    policy,
    policy.scope ?? "@myorg"
  )
  const generated = new Map(
    planFiles
      .filter((file) => MANAGED_FILES.has(path.basename(file.path)))
      .map((file) => [path.basename(file.path), file.content])
  )
  const plannedPackage = JSON.parse(generated.get("package.json") ?? "{}") as Record<
    string,
    unknown
  >
  const withoutDependencySections = (value: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(value).filter(
        ([key]) => key !== "dependencies" && key !== "devDependencies" && key !== "peerDependencies"
      )
    )
  const sourceRoot = "src"
  const packageJson = {
    ...withoutDependencySections(plannedPackage),
    ...withoutDependencySections(existingPackage),
    name: plannedPackage.name,
    version: typeof existingPackage.version === "string" ? existingPackage.version : "0.0.1",
    type: "module",
    sideEffects: false,
    exports: validExports(projectRoot, existingPackage, sourceRoot),
    ...(Object.keys(sections.dependencies).length > 0
      ? { dependencies: sections.dependencies }
      : { dependencies: undefined }),
    ...(Object.keys(sections.devDependencies).length > 0
      ? { devDependencies: sections.devDependencies }
      : { devDependencies: undefined }),
    ...(Object.keys(sections.peerDependencies).length > 0
      ? { peerDependencies: sections.peerDependencies }
      : { peerDependencies: undefined })
  }
  generated.set("package.json", formatJson("package.json", packageJson))

  const references = Object.keys(sections.dependencies)
    .map((packageName) => workspaceReference(packageName, policy.scope ?? "@myorg", policy.librariesRoot))
    .filter((value): value is string => value !== undefined)
    .map((target) => {
      const relative = path.posix.relative(relativeRoot, target)
      return { path: relative.startsWith(".") ? relative : `./${relative}` }
    })
    .sort((left, right) => left.path.localeCompare(right.path))
  const libConfig = JSON.parse(generated.get("tsconfig.lib.json") ?? "{}") as Record<
    string,
    unknown
  >
  if (references.length > 0) libConfig.references = references
  else delete libConfig.references
  generated.set("tsconfig.lib.json", formatJson("tsconfig.lib.json", libConfig))
  return generated
}

export function standardizeProject(options: {
  readonly project: string
  readonly workspaceRoot?: string
  readonly check?: boolean
}) {
  return Effect.gen(function*() {
    const context = yield* createWorkspaceContext(options.workspaceRoot, "cli")
    const adapter = yield* createAdapterFromContext(context)
    const policy = yield* loadWorkspacePolicy(adapter, context)
    const absoluteProjectRoot = path.isAbsolute(options.project)
      ? options.project
      : path.join(context.root, options.project)
    const relativeProjectRoot = path
      .relative(context.root, absoluteProjectRoot)
      .split(path.sep)
      .join("/")
    const projectJson = readJson(path.join(absoluteProjectRoot, "project.json"))
    const identity = inferIdentity(absoluteProjectRoot, projectJson)
    const sourceRoot = path.join(absoluteProjectRoot, "src")
    const sourceFiles = listFiles(sourceRoot)
    const testMode = sourceFiles.some((file) => /\.(spec|test)\.[cm]?[jt]sx?$/.test(file))
      ? "unit"
      : "none"
    const modules = identity.kind === "provider"
      ? undefined
      : inferModules(sourceRoot, identity.kind, identity.name)
    const blueprint = createBlueprint({
      kind: identity.kind,
      name: identity.name,
      directory: path.posix.dirname(relativeProjectRoot),
      entrypoints: inferEntrypoints(sourceRoot),
      modules,
      contract: identity.kind === "feature" ? inferFeatureContract(sourceRoot) : undefined,
      testMode
    })
    const plan = createGenerationPlan(blueprint, policy)
    const managed = normalizeManagedFiles(
      context.root,
      absoluteProjectRoot,
      plan.files,
      sourceFiles,
      policy
    )
    const changedFiles: Array<string> = []
    for (const [name, content] of managed) {
      const filePath = path.join(absoluteProjectRoot, name)
      const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : undefined
      if (current === content) continue
      changedFiles.push(`${relativeProjectRoot}/${name}`)
      if (!options.check) fs.writeFileSync(filePath, content)
    }
    const diagnostics = sourceDiagnostics(
      context.root,
      relativeProjectRoot,
      identity.kind,
      sourceFiles
    )
    return {
      projectRoot: relativeProjectRoot,
      changedFiles,
      diagnostics,
      check: options.check ?? false
    } satisfies StandardizationResult
  })
}
