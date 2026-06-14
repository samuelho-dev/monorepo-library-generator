import { IndentationText, NewLineKind, Project, QuoteKind, type SourceFile, VariableDeclarationKind } from "ts-morph"
import { namingFor } from "./blueprint"
import type {
  BlueprintModule,
  ContractRole,
  EntrypointName,
  GeneratedFile,
  LibraryBlueprint,
  WorkspacePolicy
} from "./types"
import { CONTRACT_ROLES } from "./types"

interface RenderContext {
  readonly blueprint: LibraryBlueprint
  readonly policy: WorkspacePolicy
  readonly packageName: string
  readonly sourceRoot: string
  readonly moduleTree: ReadonlyArray<BlueprintModule>
  readonly modules: ReadonlyArray<RenderModule>
  readonly entrypoints: ReadonlyArray<EntrypointName>
  readonly testMode: "none" | "unit" | "integration"
}

interface RenderModule extends Omit<BlueprintModule, "modules"> {
  readonly path: ReadonlyArray<string>
}

function createProject() {
  return new Project({
    useInMemoryFileSystem: true,
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
      newLineKind: NewLineKind.LineFeed,
      quoteKind: QuoteKind.Single,
      useTrailingCommas: false
    }
  })
}

function printSourceFile(sourceFile: SourceFile) {
  sourceFile.formatText({ indentSize: 2 })
  return sourceFile
    .getFullText()
    .replace(/;(?=\r?\n|$)/g, "")
    .trimEnd()
    .concat("\n")
}

function typescriptFile(path: string, build: (sourceFile: SourceFile) => void) {
  const project = createProject()
  const sourceFile = project.createSourceFile(path, "", { overwrite: true })
  build(sourceFile)
  return { path, content: printSourceFile(sourceFile), format: "typescript" as const }
}

function flattenModules(modules: ReadonlyArray<BlueprintModule>) {
  const leaves: Array<RenderModule> = []
  const pending: Array<{ module: BlueprintModule; parent: ReadonlyArray<string> }> = []
  for (const module of [...modules].reverse()) pending.push({ module, parent: [] })

  while (pending.length > 0) {
    const current = pending.pop()!
    const path = [...current.parent, current.module.name]
    if (current.module.modules && current.module.modules.length > 0) {
      for (const child of [...current.module.modules].reverse()) {
        pending.push({ module: child, parent: path })
      }
      continue
    }
    leaves.push({
      name: current.module.name,
      path,
      ...(current.module.roles && { roles: current.module.roles }),
      ...(current.module.testHarness !== undefined && { testHarness: current.module.testHarness })
    })
  }
  return leaves
}

function modulePath(module: RenderModule) {
  return module.path.join("/")
}

function moduleNaming(module: RenderModule) {
  return namingFor(module.path.join("-"))
}

function prefixedModuleNaming(context: RenderContext, module: RenderModule) {
  if (isFlatModule(context, module)) return namingFor(context.blueprint.name)
  const libraryName = namingFor(context.blueprint.name).className
  const moduleName = moduleNaming(module).className
  return moduleName.startsWith(libraryName)
    ? namingFor(module.path.join("-"))
    : namingFor([context.blueprint.name, ...module.path].join("-"))
}

function contractMemberNaming(context: RenderContext, module: RenderModule) {
  if (isFlatModule(context, module) || module.path.length === 1) return moduleNaming(module)
  return prefixedModuleNaming(context, module)
}

function isFlatModule(context: RenderContext, module: RenderModule) {
  return (
    context.modules.length === 1 &&
    module.path.length === 1 &&
    module.name === context.blueprint.name
  )
}

function moduleDirectory(context: RenderContext, module: RenderModule) {
  return isFlatModule(context, module)
    ? `${context.sourceRoot}/lib`
    : `${context.sourceRoot}/lib/${modulePath(module)}`
}

function rolesFor(context: RenderContext, module: RenderModule) {
  return module.roles ?? context.policy.defaults.contractRoles
}

function addEntities(sourceFile: SourceFile, naming: ReturnType<typeof namingFor>) {
  sourceFile.addVariableStatement({
    isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: `${naming.className}Id`,
        initializer: `Schema.String.pipe(Schema.brand('${naming.className}Id'))`
      }
    ]
  })
  sourceFile.addTypeAlias({
    isExported: true,
    name: `${naming.className}Id`,
    type: `typeof ${naming.className}Id.Type`
  })
  sourceFile.addClass({
    isExported: true,
    name: naming.className,
    extends:
      `Schema.Class<${naming.className}>('${naming.className}')({\n  id: ${naming.className}Id,\n  name: Schema.String\n})`
  })
}

function addErrors(sourceFile: SourceFile, naming: ReturnType<typeof namingFor>) {
  sourceFile.addClass({
    isExported: true,
    name: `${naming.className}NotFoundError`,
    extends: `Schema.TaggedErrorClass<${naming.className}NotFoundError>()('${naming.className}NotFoundError', {\n` +
      "  message: Schema.String,\n  id: Schema.optional(Schema.String)\n})"
  })
}

function addEvents(sourceFile: SourceFile, naming: ReturnType<typeof namingFor>) {
  sourceFile.addClass({
    isExported: true,
    name: `${naming.className}CreatedEvent`,
    extends: `Schema.Class<${naming.className}CreatedEvent>('${naming.className}CreatedEvent')({\n` +
      `  _tag: Schema.Literal('${naming.className}CreatedEvent'),\n  id: Schema.String\n})`
  })
}

function addPorts(
  sourceFile: SourceFile,
  naming: ReturnType<typeof namingFor>,
  packageName: string
) {
  sourceFile.addClass({
    isExported: true,
    name: `${naming.className}DataAccess`,
    extends: `Context.Service<${naming.className}DataAccess, {\n` +
      "  readonly health: () => Effect.Effect<boolean>\n" +
      `}>()('${packageName}/${naming.className}DataAccess')`
  })
}

function addRpcSchemas(sourceFile: SourceFile, naming: ReturnType<typeof namingFor>) {
  sourceFile.addVariableStatement({
    isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: `${naming.className}RpcInput`,
        initializer: "Schema.Struct({ id: Schema.String })"
      }
    ]
  })
  sourceFile.addTypeAlias({
    isExported: true,
    name: `${naming.className}RpcInput`,
    type: `typeof ${naming.className}RpcInput.Type`
  })
  sourceFile.addVariableStatement({
    isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: `${naming.className}RpcOutput`,
        initializer: "Schema.Struct({ id: Schema.String })"
      }
    ]
  })
  sourceFile.addTypeAlias({
    isExported: true,
    name: `${naming.className}RpcOutput`,
    type: `typeof ${naming.className}RpcOutput.Type`
  })
  sourceFile.addClass({
    isExported: true,
    name: `${naming.className}NotFoundRpcError`,
    extends:
      `Schema.TaggedErrorClass<${naming.className}NotFoundRpcError>()('${naming.className}NotFoundRpcError', {\n` +
      "  message: Schema.String,\n  id: Schema.String\n})"
  })
  sourceFile.addClass({
    isExported: true,
    name: `Get${naming.className}`,
    extends: `Rpc.make('Get${naming.className}', {\n` +
      `  payload: ${naming.className}RpcInput,\n` +
      `  success: ${naming.className}RpcOutput,\n` +
      `  error: ${naming.className}NotFoundRpcError\n})`
  })
}

function renderContractRpc(context: RenderContext, modules: ReadonlyArray<RenderModule>) {
  return typescriptFile(`${context.sourceRoot}/lib/rpc.ts`, (sourceFile) => {
    sourceFile.addImportDeclaration({ moduleSpecifier: "effect", namedImports: ["Schema"] })
    sourceFile.addImportDeclaration({
      moduleSpecifier: "effect/unstable/rpc",
      namedImports: ["Rpc", "RpcGroup"]
    })

    for (const module of modules) addRpcSchemas(sourceFile, contractMemberNaming(context, module))

    sourceFile.addClass({
      isExported: true,
      name: `${namingFor(context.blueprint.name).className}Rpcs`,
      extends: `RpcGroup.make(${
        modules
          .map((module) => `Get${contractMemberNaming(context, module).className}`)
          .join(", ")
      })`
    })
  })
}

function addTypes(sourceFile: SourceFile, naming: ReturnType<typeof namingFor>) {
  sourceFile.addTypeAlias({
    isExported: true,
    name: `${naming.className}Metadata`,
    type: "Readonly<Record<string, string>>"
  })
}

function renderContractRole(
  context: RenderContext,
  path: string,
  modules: ReadonlyArray<RenderModule>,
  role: ContractRole
) {
  return typescriptFile(path, (sourceFile) => {
    if (role === "ports") {
      sourceFile.addImportDeclaration({
        moduleSpecifier: "effect",
        namedImports: ["Context", { name: "Effect", isTypeOnly: true }]
      })
    } else if (role !== "types") {
      sourceFile.addImportDeclaration({ moduleSpecifier: "effect", namedImports: ["Schema"] })
    }

    for (const module of modules) {
      const naming = contractMemberNaming(context, module)
      switch (role) {
        case "entities":
          addEntities(sourceFile, naming)
          break
        case "errors":
          addErrors(sourceFile, naming)
          break
        case "events":
          addEvents(sourceFile, naming)
          break
        case "ports":
          addPorts(sourceFile, naming, context.packageName)
          break
        case "rpc":
          throw new Error("RPC contracts are rendered through the domain-level rpc.ts entrypoint")
        case "types":
          addTypes(sourceFile, naming)
          break
      }
    }
  })
}

function renderContract(context: RenderContext) {
  const files: Array<GeneratedFile> = []
  const isFlat = context.moduleTree.length === 1 &&
    !context.moduleTree[0]?.modules &&
    context.moduleTree[0]?.name === context.blueprint.name

  const groups = isFlat
    ? [
      {
        name: context.blueprint.name,
        modules: context.modules,
        directory: `${context.sourceRoot}/lib`
      }
    ]
    : context.moduleTree.map((module) => ({
      name: module.name,
      modules: context.modules.filter((leaf) => leaf.path[0] === module.name),
      directory: `${context.sourceRoot}/lib/${module.name}`
    }))

  const rpcModules = context.modules.filter((module) => rolesFor(context, module).includes("rpc"))

  for (const group of groups) {
    const roles = CONTRACT_ROLES.filter(
      (role) => role !== "rpc" && group.modules.some((module) => rolesFor(context, module).includes(role))
    )
    for (const role of roles) {
      const members = group.modules.filter((module) => rolesFor(context, module).includes(role))
      files.push(renderContractRole(context, `${group.directory}/${role}.ts`, members, role))
    }
    if (!isFlat && roles.length > 0) {
      files.push(
        typescriptFile(`${group.directory}/index.ts`, (sourceFile) => {
          for (const role of roles) {
            sourceFile.addExportDeclaration({ moduleSpecifier: `./${role}` })
          }
        })
      )
    }
  }

  if (rpcModules.length > 0) files.push(renderContractRpc(context, rpcModules))

  files.push(
    typescriptFile(`${context.sourceRoot}/index.ts`, (sourceFile) => {
      if (isFlat) {
        for (
          const role of rolesFor(context, context.modules[0]!).filter(
            (role) => role !== "rpc"
          )
        ) {
          sourceFile.addExportDeclaration({ moduleSpecifier: `./lib/${role}` })
        }
        return
      }
      for (
        const group of groups.filter((candidate) =>
          candidate.modules.some((module) => rolesFor(context, module).some((role) => role !== "rpc"))
        )
      ) {
        sourceFile.addExportDeclaration({ moduleSpecifier: `./lib/${group.name}` })
      }
    })
  )

  return files
}

function normalizePackage(scope: string, kind: "contract" | "data-access", name: string) {
  return name.startsWith("@") ? name : `${scope}/${kind}-${name}`
}

function renderDataAccessService(
  context: RenderContext,
  module: RenderModule,
  contractPackage: string
) {
  const naming = prefixedModuleNaming(context, module)
  const contractNaming = contractMemberNaming(context, module)
  const path = `${moduleDirectory(context, module)}/service.ts`
  const harnessName = `${naming.className}TestHarness`
  const contractSpecifier = isFlatModule(context, module)
    ? contractPackage
    : `${contractPackage}/${module.path[0]}`

  return typescriptFile(path, (sourceFile) => {
    sourceFile.addImportDeclaration({
      moduleSpecifier: contractSpecifier,
      namedImports: [`${contractNaming.className}DataAccess`]
    })
    sourceFile.addImportDeclaration({
      moduleSpecifier: "effect",
      namedImports: module.testHarness === false
        ? ["Config", "Effect", "Layer"]
        : ["Config", "Context", "Effect", "Layer"]
    })
    sourceFile.addExportDeclaration({
      namedExports: [`${contractNaming.className}DataAccess`],
      moduleSpecifier: contractSpecifier
    })
    sourceFile.addVariableStatement({
      isExported: true,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: `${naming.className}Live`,
          initializer: `Layer.succeed(${contractNaming.className}DataAccess, { health: () => Effect.succeed(true) })`
        }
      ]
    })

    if (module.testHarness !== false) {
      sourceFile.addClass({
        isExported: true,
        name: harnessName,
        extends: `Context.Service<${harnessName}, {\n` +
          "  readonly reset: () => void\n  readonly snapshot: () => readonly string[]\n" +
          `}>()('${context.packageName}/${harnessName}')`
      })
      sourceFile.addVariableStatement({
        declarationKind: VariableDeclarationKind.Const,
        declarations: [
          {
            name: `make${naming.className}TestLayer`,
            initializer: "() => {\n" +
              "  const records: string[] = []\n" +
              `  return Layer.mergeAll(\n    Layer.succeed(${contractNaming.className}DataAccess, { health: () => Effect.succeed(true) }),\n` +
              `    Layer.succeed(${harnessName}, { reset: () => { records.length = 0 }, snapshot: () => records })\n  )\n}`
          }
        ]
      })
      sourceFile.addVariableStatement({
        isExported: true,
        declarationKind: VariableDeclarationKind.Const,
        declarations: [
          {
            name: `${naming.className}Test`,
            initializer: `Layer.suspend(() => make${naming.className}TestLayer())`
          }
        ]
      })
    } else {
      sourceFile.addVariableStatement({
        isExported: true,
        declarationKind: VariableDeclarationKind.Const,
        declarations: [
          {
            name: `${naming.className}Test`,
            initializer:
              `Layer.suspend(() => Layer.succeed(${contractNaming.className}DataAccess, { health: () => Effect.succeed(true) }))`
          }
        ]
      })
    }

    sourceFile.addVariableStatement({
      isExported: true,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: `${naming.className}Auto`,
          initializer:
            `Layer.unwrap(Effect.map(Config.string('NODE_ENV').pipe(Config.withDefault('development')), (environment) =>\n` +
            `  environment === 'test' ? ${naming.className}Test : ${naming.className}Live\n))`
        }
      ]
    })
  })
}

function renderDataAccessTest(context: RenderContext, module: RenderModule) {
  const naming = prefixedModuleNaming(context, module)
  const contractNaming = contractMemberNaming(context, module)
  return typescriptFile(`${moduleDirectory(context, module)}/service.spec.ts`, (sourceFile) => {
    sourceFile.addImportDeclaration({
      moduleSpecifier: "@effect/vitest",
      namedImports: ["describe", "expect", "it"]
    })
    sourceFile.addImportDeclaration({ moduleSpecifier: "effect", namedImports: ["Effect"] })
    sourceFile.addImportDeclaration({
      moduleSpecifier: "./service",
      namedImports: [`${contractNaming.className}DataAccess`, `${naming.className}Test`]
    })
    sourceFile.addStatements((writer) =>
      writer
        .writeLine(`describe('${contractNaming.className}DataAccess', () => {`)
        .indent(() =>
          writer
            .writeLine(`it.effect('reports a healthy test implementation', () =>`)
            .indent(() =>
              writer
                .writeLine("Effect.gen(function* () {")
                .indent(() =>
                  writer
                    .writeLine(`const service = yield* ${contractNaming.className}DataAccess`)
                    .writeLine("expect(yield* service.health()).toBe(true)")
                )
                .writeLine(`}).pipe(Effect.provide(${naming.className}Test))`)
            )
            .writeLine(")")
        )
        .writeLine("})")
    )
  })
}

function renderDataAccess(context: RenderContext) {
  const files: Array<GeneratedFile> = []
  const scope = context.policy.scope ?? "@myorg"
  const contractName = context.blueprint.kind === "data-access"
    ? (context.blueprint.contract ?? context.blueprint.name)
    : context.blueprint.name
  const contractPackage = normalizePackage(scope, "contract", contractName)
  const flat = context.modules.length === 1 && isFlatModule(context, context.modules[0]!)

  for (const module of context.modules) {
    files.push(renderDataAccessService(context, module, contractPackage))
    if (context.testMode !== "none") files.push(renderDataAccessTest(context, module))
    if (!flat) {
      files.push(
        typescriptFile(`${moduleDirectory(context, module)}/index.ts`, (sourceFile) => {
          sourceFile.addExportDeclaration({ moduleSpecifier: "./service" })
        })
      )
    }
  }

  files.push(
    typescriptFile(`${context.sourceRoot}/index.ts`, (sourceFile) => {
      if (flat) {
        sourceFile.addExportDeclaration({ moduleSpecifier: "./lib/service" })
        return
      }
      for (const module of context.modules) {
        sourceFile.addExportDeclaration({ moduleSpecifier: `./lib/${modulePath(module)}` })
      }
    })
  )

  return files
}

function featureDependencyNames(context: RenderContext) {
  if (context.blueprint.kind !== "feature") return []
  return context.blueprint.dataAccess ?? []
}

function featureDependencyBinding(
  context: RenderContext,
  module: RenderModule,
  dependency: string
) {
  const usesMatchingModule = context.blueprint.name === dependency && !isFlatModule(context, module)
  if (!usesMatchingModule) {
    const naming = namingFor(dependency)
    return {
      dataAccess: `${naming.className}DataAccess`,
      live: `${naming.className}Live`,
      test: `${naming.className}Test`
    }
  }

  const contractNaming = module.path.length === 1
    ? moduleNaming(module)
    : namingFor([dependency, ...module.path].join("-"))
  const implementationNaming = namingFor([dependency, ...module.path].join("-"))
  return {
    dataAccess: `${contractNaming.className}DataAccess`,
    live: `${implementationNaming.className}Live`,
    test: `${implementationNaming.className}Test`
  }
}

function renderFeatureService(context: RenderContext, module: RenderModule) {
  const naming = moduleNaming(module)
  const scope = context.policy.scope ?? "@myorg"
  const dependencies = featureDependencyNames(context)
  return typescriptFile(
    `${context.sourceRoot}/lib/server/services/${modulePath(module)}/service.ts`,
    (sourceFile) => {
      const liveLayers: Array<string> = []
      for (const dependency of dependencies) {
        const binding = featureDependencyBinding(context, module, dependency)
        sourceFile.addImportDeclaration({
          moduleSpecifier: `${scope}/contract-${dependency}`,
          namedImports: [binding.dataAccess]
        })
        sourceFile.addImportDeclaration({
          moduleSpecifier: `${scope}/data-access-${dependency}`,
          namedImports: [binding.live]
        })
        liveLayers.push(binding.live)
      }
      sourceFile.addImportDeclaration({
        moduleSpecifier: "effect",
        namedImports: ["Context", "Effect", "Layer"]
      })

      const yields = dependencies.map((dependency) => {
        const binding = featureDependencyBinding(context, module, dependency)
        return `      yield* ${binding.dataAccess}`
      })
      const makeBody = [
        "Effect.gen(function* () {",
        ...yields,
        `      return { run: () => Effect.succeed('${module.name}') }`,
        "    })"
      ].join("\n")
      const defaultExpression = liveLayers.length > 0
        ? `this.DefaultWithoutDependencies.pipe(Layer.provide([${liveLayers.join(", ")}]))`
        : "this.DefaultWithoutDependencies"

      sourceFile.addClass({
        isExported: true,
        name: `${naming.className}Feature`,
        extends:
          `Context.Service<${naming.className}Feature>()('${context.packageName}/${naming.className}Feature', {\n` +
          `    make: ${makeBody}\n  })`,
        properties: [
          {
            isStatic: true,
            isReadonly: true,
            name: "DefaultWithoutDependencies",
            initializer: "Layer.effect(this, this.make)"
          },
          { isStatic: true, isReadonly: true, name: "Default", initializer: defaultExpression }
        ]
      })
    }
  )
}

function renderFeatureRouter(context: RenderContext) {
  const libraryNaming = namingFor(context.blueprint.name)
  const dependencies = featureDependencyNames(context)
  return typescriptFile(`${context.sourceRoot}/lib/server/router.ts`, (sourceFile) => {
    sourceFile.addImportDeclaration({
      moduleSpecifier: "effect",
      namedImports: ["Config", "Effect", "Layer"]
    })
    for (const module of context.modules) {
      const naming = moduleNaming(module)
      sourceFile.addImportDeclaration({
        moduleSpecifier: `./services/${modulePath(module)}/service`,
        namedImports: [`${naming.className}Feature`]
      })
    }
    const testLayers = new Map<string, ReadonlyArray<string>>()
    for (const dependency of dependencies) {
      const names = Array.from(
        new Set(
          context.modules.map(
            (module) => featureDependencyBinding(context, module, dependency).test
          )
        )
      )
      sourceFile.addImportDeclaration({
        moduleSpecifier: `${context.policy.scope ?? "@myorg"}/data-access-${dependency}`,
        namedImports: names
      })
      for (const module of context.modules) {
        const path = modulePath(module)
        testLayers.set(path, [
          ...(testLayers.get(path) ?? []),
          featureDependencyBinding(context, module, dependency).test
        ])
      }
    }

    const live = context.modules.map((module) => `${moduleNaming(module).className}Feature.Default`)
    const test = context.modules.map((module) => {
      const name = `${moduleNaming(module).className}Feature.DefaultWithoutDependencies`
      const layers = testLayers.get(modulePath(module)) ?? []
      return layers.length > 0 ? `${name}.pipe(Layer.provide([${layers.join(", ")}]))` : name
    })
    sourceFile.addVariableStatement({
      isExported: true,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: `${libraryNaming.className}FeatureLive`,
          initializer: `Layer.mergeAll(${live.join(", ")})`
        }
      ]
    })
    sourceFile.addVariableStatement({
      isExported: true,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: `${libraryNaming.className}FeatureTest`,
          initializer: `Layer.mergeAll(${test.join(", ")})`
        }
      ]
    })
    sourceFile.addVariableStatement({
      isExported: true,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: `${libraryNaming.className}FeatureAuto`,
          initializer:
            `Layer.unwrap(Effect.map(Config.string('NODE_ENV').pipe(Config.withDefault('development')), (environment) =>\n` +
            `  environment === 'test' ? ${libraryNaming.className}FeatureTest : ${libraryNaming.className}FeatureLive\n))`
        }
      ]
    })
  })
}

function relatedLibraryName(value: string, kind: "contract") {
  const packageName = value.split("/").at(-1) ?? value
  const prefix = `${kind}-`
  return packageName.startsWith(prefix) ? packageName.slice(prefix.length) : packageName
}

function featureClientContext(context: RenderContext) {
  if (context.blueprint.kind !== "feature" || !context.blueprint.contract) {
    throw new Error("feature client entrypoints require a contract")
  }
  const scope = context.policy.scope ?? "@myorg"
  const contractPackage = normalizePackage(scope, "contract", context.blueprint.contract)
  const contractName = relatedLibraryName(context.blueprint.contract, "contract")
  return {
    contractPackage,
    infraRpcPackage: context.policy.packages.infraRpc ?? `${scope}/infra-rpc`,
    rpcClassName: `${namingFor(context.blueprint.name).className}Rpc`,
    rpcGroupName: `${namingFor(contractName).className}Rpcs`
  }
}

function renderFeatureClientRpc(context: RenderContext) {
  const client = featureClientContext(context)
  return typescriptFile(`${context.sourceRoot}/lib/client/rpc.ts`, (sourceFile) => {
    sourceFile.addImportDeclaration({
      moduleSpecifier: `${client.contractPackage}/rpc`,
      namedImports: [client.rpcGroupName]
    })
    sourceFile.addImportDeclaration({
      moduleSpecifier: `${client.infraRpcPackage}/client`,
      namedImports: ["AtomRpc", "createProtocolLayer"]
    })
    sourceFile.addImportDeclaration({ moduleSpecifier: "effect", namedImports: ["Layer"] })
    sourceFile.addClass({
      isExported: true,
      name: client.rpcClassName,
      extends: `AtomRpc.Service<${client.rpcClassName}>()('${client.rpcClassName}', {\n` +
        `  group: ${client.rpcGroupName},\n` +
        "  protocol: Layer.suspend(() => createProtocolLayer({ url: '/api/rpc' }))\n" +
        "})"
    })
    sourceFile.insertStatements(0, "'use client'")
  })
}

function renderFeatureClientHook(context: RenderContext, module: RenderModule) {
  const client = featureClientContext(context)
  const naming = moduleNaming(module)
  const contractNaming = contractMemberNaming(context, module)
  return typescriptFile(
    `${context.sourceRoot}/lib/client/hooks/use-${naming.fileName}.ts`,
    (sourceFile) => {
      sourceFile.addImportDeclaration({
        moduleSpecifier: `${client.infraRpcPackage}/client`,
        namedImports: ["useAtomQuery"]
      })
      sourceFile.addImportDeclaration({
        moduleSpecifier: "../rpc",
        namedImports: [client.rpcClassName]
      })
      sourceFile.addFunction({
        isExported: true,
        name: `use${naming.className}`,
        parameters: [{ name: "id", type: "string" }],
        statements: `return useAtomQuery(${client.rpcClassName}.query('Get${contractNaming.className}', { id }))`
      })
      sourceFile.insertStatements(0, "'use client'")
    }
  )
}

function renderFeatureClientHooksIndex(context: RenderContext) {
  return typescriptFile(`${context.sourceRoot}/lib/client/hooks/index.ts`, (sourceFile) => {
    for (const module of context.modules) {
      const naming = moduleNaming(module)
      sourceFile.addExportDeclaration({
        namedExports: [`use${naming.className}`],
        moduleSpecifier: `./use-${naming.fileName}`
      })
    }
  })
}

function renderFeatureTest(context: RenderContext, module: RenderModule) {
  const naming = moduleNaming(module)
  return typescriptFile(
    `${context.sourceRoot}/lib/server/services/${modulePath(module)}/service.spec.ts`,
    (sourceFile) => {
      sourceFile.addImportDeclaration({
        moduleSpecifier: "@effect/vitest",
        namedImports: ["describe", "expect", "it"]
      })
      sourceFile.addImportDeclaration({ moduleSpecifier: "effect", namedImports: ["Effect"] })
      sourceFile.addImportDeclaration({
        moduleSpecifier: "./service",
        namedImports: [`${naming.className}Feature`]
      })
      sourceFile.addStatements((writer) =>
        writer
          .writeLine(`describe('${naming.className}Feature', () => {`)
          .indent(() =>
            writer
              .writeLine(`it.effect('runs the ${module.name} capability', () =>`)
              .indent(() =>
                writer
                  .writeLine("Effect.gen(function* () {")
                  .indent(() =>
                    writer
                      .writeLine(`const feature = yield* ${naming.className}Feature`)
                      .writeLine(`expect(yield* feature.run()).toBe('${module.name}')`)
                  )
                  .writeLine(`}).pipe(Effect.provide(${naming.className}Feature.Default))`)
              )
              .writeLine(")")
          )
          .writeLine("})")
      )
    }
  )
}

function renderFeature(context: RenderContext) {
  const files = context.modules.map((module) => renderFeatureService(context, module))
  if (context.testMode !== "none") {
    for (const module of context.modules) files.push(renderFeatureTest(context, module))
  }
  files.push(renderFeatureRouter(context))

  const libraryNaming = namingFor(context.blueprint.name)
  files.push(
    typescriptFile(`${context.sourceRoot}/index.ts`, (sourceFile) => {
      for (const module of context.modules) {
        const naming = moduleNaming(module)
        sourceFile.addExportDeclaration({
          isTypeOnly: true,
          namedExports: [`${naming.className}Feature`],
          moduleSpecifier: `./lib/server/services/${modulePath(module)}/service`
        })
      }
    })
  )

  if (context.entrypoints.includes("server")) {
    files.push(
      typescriptFile(`${context.sourceRoot}/server.ts`, (sourceFile) => {
        sourceFile.addExportDeclaration({ moduleSpecifier: "./lib/server/router" })
        for (const module of context.modules) {
          sourceFile.addExportDeclaration({
            moduleSpecifier: `./lib/server/services/${modulePath(module)}/service`
          })
        }
      })
    )
  }
  if (context.entrypoints.includes("client")) {
    files.push(renderFeatureClientRpc(context))
    for (const module of context.modules) files.push(renderFeatureClientHook(context, module))
    files.push(renderFeatureClientHooksIndex(context))
    files.push(
      typescriptFile(`${context.sourceRoot}/client.ts`, (sourceFile) => {
        sourceFile.addExportDeclaration({ moduleSpecifier: "./lib/client/hooks" })
        sourceFile.addExportDeclaration({ moduleSpecifier: "./lib/client/rpc" })
      })
    )
  }
  if (context.entrypoints.includes("edge")) {
    files.push(
      renderMarkerEntrypoint(`${context.sourceRoot}/edge.ts`, `${libraryNaming.className}Edge`)
    )
  }
  return files
}

function renderMarkerEntrypoint(path: string, name: string) {
  return typescriptFile(path, (sourceFile) => {
    sourceFile.addTypeAlias({ isExported: true, name, type: "Readonly<Record<string, never>>" })
  })
}

function patternBClassName(context: RenderContext, module: RenderModule) {
  const naming = moduleNaming(module)
  return context.blueprint.kind === "provider" ? naming.className : `${naming.className}Service`
}

function renderPatternBService(context: RenderContext, module: RenderModule) {
  const className = patternBClassName(context, module)
  return typescriptFile(`${moduleDirectory(context, module)}/service.ts`, (sourceFile) => {
    sourceFile.addImportDeclaration({
      moduleSpecifier: "effect",
      namedImports: ["Config", "Context", "Effect", "Layer"]
    })
    sourceFile.addClass({
      isExported: true,
      name: className,
      extends: `Context.Service<${className}, {\n  readonly health: () => Effect.Effect<boolean>\n` +
        `}>()('${context.packageName}/${className}')`,
      properties: [
        {
          isStatic: true,
          isReadonly: true,
          name: "Live",
          initializer: `Layer.succeed(${className}, { health: () => Effect.succeed(true) })`
        },
        {
          isStatic: true,
          isReadonly: true,
          name: "Test",
          initializer: `Layer.succeed(${className}, { health: () => Effect.succeed(true) })`
        },
        {
          isStatic: true,
          isReadonly: true,
          name: "Auto",
          initializer: "Layer.unwrap(Effect.map(Config.string('NODE_ENV').pipe(Config.withDefault('development')), " +
            `(environment) => environment === 'test' ? ${className}.Test : ${className}.Live))`
        }
      ]
    })
  })
}

function renderPatternBTest(context: RenderContext, module: RenderModule) {
  const className = patternBClassName(context, module)
  return typescriptFile(`${moduleDirectory(context, module)}/service.spec.ts`, (sourceFile) => {
    sourceFile.addImportDeclaration({
      moduleSpecifier: "@effect/vitest",
      namedImports: ["describe", "expect", "it"]
    })
    sourceFile.addImportDeclaration({ moduleSpecifier: "effect", namedImports: ["Effect"] })
    sourceFile.addImportDeclaration({ moduleSpecifier: "./service", namedImports: [className] })
    sourceFile.addStatements((writer) =>
      writer
        .writeLine(`describe('${className}', () => {`)
        .indent(() =>
          writer
            .writeLine("it.effect('reports healthy', () =>")
            .indent(() =>
              writer
                .writeLine("Effect.gen(function* () {")
                .indent(() =>
                  writer
                    .writeLine(`const service = yield* ${className}`)
                    .writeLine("expect(yield* service.health()).toBe(true)")
                )
                .writeLine(`}).pipe(Effect.provide(${className}.Test))`)
            )
            .writeLine(")")
        )
        .writeLine("})")
    )
  })
}

function renderPatternB(context: RenderContext) {
  const files: Array<GeneratedFile> = []
  const flat = context.modules.length === 1 && isFlatModule(context, context.modules[0]!)
  for (const module of context.modules) {
    files.push(renderPatternBService(context, module))
    if (context.testMode !== "none") files.push(renderPatternBTest(context, module))
    if (!flat) {
      files.push(
        typescriptFile(`${moduleDirectory(context, module)}/index.ts`, (sourceFile) => {
          sourceFile.addExportDeclaration({ moduleSpecifier: "./service" })
        })
      )
    }
  }
  files.push(
    typescriptFile(`${context.sourceRoot}/index.ts`, (sourceFile) => {
      if (flat) {
        sourceFile.addExportDeclaration({ moduleSpecifier: "./lib/service" })
        return
      }
      for (const module of context.modules) {
        sourceFile.addExportDeclaration({ moduleSpecifier: `./lib/${modulePath(module)}` })
      }
    })
  )
  const naming = namingFor(context.blueprint.name)
  const className = context.blueprint.kind === "provider" ? naming.className : `${naming.className}Service`
  if (context.entrypoints.includes("client")) {
    files.push(renderMarkerEntrypoint(`${context.sourceRoot}/client.ts`, `${className}Client`))
  }
  if (context.entrypoints.includes("server")) {
    files.push(
      typescriptFile(`${context.sourceRoot}/server.ts`, (sourceFile) => {
        if (flat) {
          sourceFile.addExportDeclaration({ moduleSpecifier: "./lib/service" })
          return
        }
        for (const module of context.modules) {
          sourceFile.addExportDeclaration({ moduleSpecifier: `./lib/${modulePath(module)}` })
        }
      })
    )
  }
  if (context.entrypoints.includes("edge")) {
    files.push(renderMarkerEntrypoint(`${context.sourceRoot}/edge.ts`, `${className}Edge`))
  }
  return files
}

export function renderTypeScriptFiles(context: RenderContext) {
  switch (context.blueprint.kind) {
    case "contract":
      return renderContract(context)
    case "data-access":
      return renderDataAccess(context)
    case "feature":
      return renderFeature(context)
    case "provider":
    case "infra":
      return renderPatternB(context)
  }
}

export function createRenderContext(
  blueprint: LibraryBlueprint,
  policy: WorkspacePolicy,
  packageName: string,
  sourceRoot: string
) {
  const moduleTree = blueprint.modules && blueprint.modules.length > 0
    ? blueprint.modules
    : [{ name: blueprint.name }]
  const modules = flattenModules(moduleTree)
  const entrypoints = blueprint.entrypoints && blueprint.entrypoints.length > 0
    ? blueprint.entrypoints
    : policy.defaults.entrypoints[blueprint.kind]
  if (
    (blueprint.kind === "contract" || blueprint.kind === "data-access") &&
    entrypoints.some((entrypoint) => entrypoint !== "root")
  ) {
    throw new Error(`${blueprint.kind} libraries support only the root entrypoint`)
  }
  return {
    blueprint,
    policy,
    packageName,
    sourceRoot,
    moduleTree,
    modules,
    entrypoints,
    testMode: blueprint.testMode ?? policy.defaults.testMode[blueprint.kind]
  }
}

export function renderVitestConfig(projectRoot: string, projectName: string) {
  const depth = projectRoot.split("/").filter((segment) => segment.length > 0).length
  const offset = "../".repeat(depth)
  return typescriptFile(`${projectRoot}/vitest.config.ts`, (sourceFile) => {
    sourceFile.addImportDeclaration({
      moduleSpecifier: "vitest/config",
      namedImports: ["defineConfig"]
    })
    sourceFile.addExportAssignment({
      isExportEquals: false,
      expression: "defineConfig({\n" +
        "  root: __dirname,\n" +
        `  cacheDir: '${offset}node_modules/.vite/${projectName}',\n` +
        "  test: {\n" +
        "    watch: false,\n" +
        "    globals: true,\n" +
        "    environment: 'node',\n" +
        "    pool: 'forks',\n" +
        "    include: ['src/**/*.{test,spec}.{ts,mts,cts,tsx}'],\n" +
        "    reporters: ['default'],\n" +
        `    coverage: { reportsDirectory: '${offset}coverage/${projectRoot}', provider: 'v8' }\n` +
        "  }\n" +
        "})"
    })
  })
}
