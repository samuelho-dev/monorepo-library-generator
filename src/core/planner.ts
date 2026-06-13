import * as path from "node:path"
import { Project } from "ts-morph"
import { createRenderContext, renderTypeScriptFiles, renderVitestConfig } from "./ast"
import { hashGenerationPlan } from "./blueprint"
import { formatGeneratedFile } from "./formatter"
import type { BlueprintDependency, GeneratedFile, LibraryBlueprint, WorkspacePolicy } from "./types"

interface PackageSections {
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  peerDependencies: Record<string, string>
}

function jsonFile(path: string, value: unknown) {
  return { path, content: `${JSON.stringify(value, null, 2)}\n`, format: "json" as const }
}

function packageRoot(specifier: string) {
  if (specifier.startsWith("node:")) return undefined
  const parts = specifier.split("/")
  if (specifier.startsWith("@")) return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier
  return parts[0]
}

function isTestFile(filePath: string) {
  return /\.(spec|test)\.[cm]?[jt]sx?$/.test(filePath) || filePath.endsWith("vitest.config.ts")
}

function explicitDependencies(blueprint: LibraryBlueprint) {
  return new Map((blueprint.dependencies ?? []).map((dependency) => [dependency.name, dependency]))
}

function dependencyVersion(
  packageName: string,
  dependency: BlueprintDependency | undefined,
  policy: WorkspacePolicy,
  scope: string
) {
  if (dependency?.version) return dependency.version
  if (packageName === "effect") return policy.effect.version
  if (packageName === "@effect/vitest") return policy.effect.testVersion
  if (packageName.startsWith(`${scope}/`)) return "workspace:*"
  return "*"
}

function collectPackageSections(
  files: ReadonlyArray<GeneratedFile>,
  blueprint: LibraryBlueprint,
  policy: WorkspacePolicy,
  scope: string
) {
  const sections: PackageSections = { dependencies: {}, devDependencies: {}, peerDependencies: {} }
  const explicit = explicitDependencies(blueprint)
  const project = new Project({ useInMemoryFileSystem: true })

  for (const file of files) {
    if (file.format !== "typescript") continue
    const sourceFile = project.createSourceFile(file.path, file.content, { overwrite: true })
    const specifiers = [
      ...sourceFile
        .getImportDeclarations()
        .map((declaration) => declaration.getModuleSpecifierValue()),
      ...sourceFile
        .getExportDeclarations()
        .map((declaration) => declaration.getModuleSpecifierValue())
        .filter((value): value is string => value !== undefined)
    ]
    for (const specifier of specifiers) {
      if (specifier.startsWith(".")) continue
      const root = packageRoot(specifier)
      if (!root) continue
      const configured = explicit.get(root)
      const section = configured?.section ??
        (root === "effect"
          ? "peerDependencies"
          : isTestFile(file.path) || root === "@effect/vitest" || root === "vitest"
          ? "devDependencies"
          : "dependencies")
      sections[section][root] = dependencyVersion(root, configured, policy, scope)
    }
  }

  for (const dependency of blueprint.dependencies ?? []) {
    const section = dependency.section ?? "dependencies"
    sections[section][dependency.name] = dependencyVersion(
      dependency.name,
      dependency,
      policy,
      scope
    )
  }

  for (const section of Object.values(sections)) {
    const sorted = Object.fromEntries(
      Object.entries(section).sort(([left], [right]) => left.localeCompare(right))
    )
    for (const key of Object.keys(section)) delete section[key]
    Object.assign(section, sorted)
  }

  return sections
}

function entrypointTarget(sourceRoot: string, entrypoint: "root" | "client" | "server" | "edge") {
  if (entrypoint !== "root") return `./${sourceRoot}/${entrypoint}.ts`
  return `./${sourceRoot}/index.ts`
}

function packageExports(
  blueprint: LibraryBlueprint,
  sourceRoot: string,
  context: ReturnType<typeof createRenderContext>
) {
  const exports: Record<string, { import: string; types: string }> = {}
  for (const entrypoint of context.entrypoints) {
    const key = entrypoint === "root" ? "." : `./${entrypoint}`
    const target = entrypointTarget(sourceRoot, entrypoint)
    exports[key] = { import: target, types: target }
  }

  if (blueprint.kind === "contract") {
    const flat = context.moduleTree.length === 1 &&
      !context.moduleTree[0]?.modules &&
      context.moduleTree[0]?.name === blueprint.name
    if (flat) {
      for (const role of context.modules[0]?.roles ?? context.policy.defaults.contractRoles) {
        if (role === "rpc") continue
        const target = `./${sourceRoot}/lib/${role}.ts`
        exports[`./${role}`] = { import: target, types: target }
      }
    } else {
      for (const module of context.moduleTree) {
        const exposesSubdomain = context.modules.some(
          (leaf) =>
            leaf.path[0] === module.name &&
            (leaf.roles ?? context.policy.defaults.contractRoles).some((role) => role !== "rpc")
        )
        if (!exposesSubdomain) continue
        const target = `./${sourceRoot}/lib/${module.name}/index.ts`
        exports[`./${module.name}`] = { import: target, types: target }
      }
    }
    const hasRpc = context.modules.some((module) =>
      (module.roles ?? context.policy.defaults.contractRoles).includes("rpc")
    )
    if (hasRpc) {
      const target = `./${sourceRoot}/lib/rpc.ts`
      exports["./rpc"] = { import: target, types: target }
    }
  }

  return exports
}

function workspaceProjectPath(packageName: string, scope: string, librariesRoot: string) {
  if (!packageName.startsWith(`${scope}/`)) return undefined
  const shortName = packageName.slice(scope.length + 1)
  if (shortName === "env") return `${librariesRoot}/env/tsconfig.lib.json`
  for (const kind of ["contract", "data-access", "feature", "provider", "infra"] as const) {
    const prefix = `${kind}-`
    if (shortName.startsWith(prefix)) {
      return `${librariesRoot}/${kind}/${shortName.slice(prefix.length)}/tsconfig.lib.json`
    }
  }
  const separator = shortName.indexOf("-")
  if (separator > 0) {
    return `${librariesRoot}/${shortName.slice(0, separator)}/${shortName.slice(separator + 1)}/tsconfig.lib.json`
  }
  return `${librariesRoot}/${shortName}/tsconfig.lib.json`
}

function projectReferences(
  sections: PackageSections,
  projectRoot: string,
  scope: string,
  librariesRoot: string
) {
  const references: Array<{ path: string }> = []
  for (const packageName of Object.keys(sections.dependencies)) {
    const target = workspaceProjectPath(packageName, scope, librariesRoot)
    if (!target) continue
    const relative = path.posix.relative(projectRoot, target)
    references.push({ path: relative.startsWith(".") ? relative : `./${relative}` })
  }
  return references.sort((left, right) => left.path.localeCompare(right.path))
}

function replaceProjectRoot(command: string, projectRoot: string) {
  return command.replaceAll("{projectRoot}", projectRoot)
}

function packageDescription(blueprint: LibraryBlueprint) {
  if (blueprint.description) return blueprint.description
  if (blueprint.kind === "provider" && blueprint.externalService) {
    return `${blueprint.externalService} provider`
  }
  return `${blueprint.name} ${blueprint.kind} library`
}

function infrastructureFiles(
  blueprint: LibraryBlueprint,
  policy: WorkspacePolicy,
  projectName: string,
  projectRoot: string,
  sourceRoot: string,
  packageName: string,
  codeFiles: ReadonlyArray<GeneratedFile>,
  context: ReturnType<typeof createRenderContext>
) {
  const scope = policy.scope ?? "@myorg"
  const sections = collectPackageSections(codeFiles, blueprint, policy, scope)
  const references = projectReferences(sections, projectRoot, scope, policy.librariesRoot)
  const depth = projectRoot.split("/").filter((segment) => segment.length > 0).length
  const offset = "../".repeat(depth)
  const hasTests = context.testMode !== "none"
  const tags = Array.from(
    new Set([`type:${blueprint.kind}`, `scope:${blueprint.name}`, ...(blueprint.tags ?? [])])
  )
  const packageJson = {
    name: packageName,
    version: "0.0.1",
    type: "module",
    sideEffects: false,
    description: packageDescription(blueprint),
    exports: packageExports(blueprint, path.posix.relative(projectRoot, sourceRoot), context),
    ...(Object.keys(sections.dependencies).length > 0 && { dependencies: sections.dependencies }),
    ...(Object.keys(sections.devDependencies).length > 0 && {
      devDependencies: sections.devDependencies
    }),
    ...(Object.keys(sections.peerDependencies).length > 0 && {
      peerDependencies: sections.peerDependencies
    })
  }
  const targets: Record<string, unknown> = {
    lint: {
      executor: "nx:run-commands",
      options: { command: replaceProjectRoot(policy.commands.lint, projectRoot) }
    },
    format: {
      executor: "nx:run-commands",
      options: { command: replaceProjectRoot(policy.commands.formatter, projectRoot) }
    },
    typecheck: {
      executor: "nx:run-commands",
      options: { command: replaceProjectRoot(policy.commands.typecheck, projectRoot) },
      cache: true,
      outputs: ["{projectRoot}/dist"]
    }
  }
  if (hasTests) {
    targets.test = {
      executor: "nx:run-commands",
      outputs: ["{projectRoot}/coverage"],
      options: {
        command: replaceProjectRoot(policy.commands.test, projectRoot),
        cwd: "{workspaceRoot}"
      }
    }
  }
  const projectJson = {
    name: projectName,
    $schema: `${offset}node_modules/nx/schemas/project-schema.json`,
    projectType: "library",
    sourceRoot,
    tags,
    targets
  }
  const tsconfig = {
    extends: `${offset}tsconfig.base.json`,
    compilerOptions: {
      outDir: "./dist",
      module: "ESNext",
      moduleResolution: "bundler",
      verbatimModuleSyntax: true,
      types: ["node"]
    },
    files: [],
    include: [],
    references: [
      { path: "./tsconfig.lib.json" },
      ...(hasTests ? [{ path: "./tsconfig.spec.json" }] : [])
    ]
  }
  const tsconfigLib = {
    extends: "./tsconfig.json",
    compilerOptions: {
      outDir: "./dist",
      declaration: true,
      declarationMap: true,
      noEmit: false,
      composite: true,
      emitDeclarationOnly: true,
      rootDir: "src",
      tsBuildInfoFile: "./dist/tsconfig.lib.tsbuildinfo"
    },
    include: ["src/**/*.ts", "src/**/*.tsx"],
    exclude: ["src/**/*.spec.ts", "src/**/*.test.ts", "src/**/*.spec.tsx", "src/**/*.test.tsx"],
    ...(references.length > 0 && { references })
  }
  const files: Array<GeneratedFile> = [
    jsonFile(`${projectRoot}/package.json`, packageJson),
    jsonFile(`${projectRoot}/project.json`, projectJson),
    jsonFile(`${projectRoot}/tsconfig.json`, tsconfig),
    jsonFile(`${projectRoot}/tsconfig.lib.json`, tsconfigLib)
  ]
  if (hasTests) {
    files.push(
      jsonFile(`${projectRoot}/tsconfig.spec.json`, {
        extends: "./tsconfig.json",
        compilerOptions: { module: "ESNext", types: ["node", "vitest"], noEmit: true },
        include: ["vitest.config.ts", "src/**/*.test.ts", "src/**/*.spec.ts", "src/**/*.d.ts"],
        references: [{ path: "./tsconfig.lib.json" }]
      })
    )
    files.push(renderVitestConfig(projectRoot, projectName))
  }
  return files
}

export function createGenerationPlan(blueprint: LibraryBlueprint, policy: WorkspacePolicy) {
  const scope = policy.scope ?? "@myorg"
  const projectName = `${blueprint.kind}-${blueprint.name}`
  const parent = blueprint.directory ?? `${policy.librariesRoot}/${blueprint.kind}`
  const projectRoot = `${parent}/${blueprint.name}`
  const sourceRoot = `${projectRoot}/src`
  const packageName = `${scope}/${projectName}`
  const context = createRenderContext(blueprint, policy, packageName, sourceRoot)
  const codeFiles = renderTypeScriptFiles(context)
  const files = [
    ...codeFiles,
    ...infrastructureFiles(
      blueprint,
      policy,
      projectName,
      projectRoot,
      sourceRoot,
      packageName,
      codeFiles,
      context
    )
  ].map(formatGeneratedFile).sort((left, right) => left.path.localeCompare(right.path))
  const withoutHash = { blueprint, projectName, projectRoot, sourceRoot, packageName, files }
  return { ...withoutHash, hash: hashGenerationPlan(withoutHash) }
}
