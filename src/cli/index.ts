import { Args, Command, Options } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect, Option } from "effect"
import * as fs from "node:fs"
import * as path from "node:path"
import { decodeLibraryBlueprint, executeBlueprint } from "../core"
import { formatOutput } from "../infrastructure"
import { standardizeProject } from "../standardize"
import { VERSION } from "../version"
import { init } from "./commands/init"
import { generateContract } from "./generators/contract"
import { generateDataAccess } from "./generators/data-access"
import { generateDomain } from "./generators/domain"
import { generateFeature } from "./generators/feature"
import { generateInfra } from "./generators/infra"
import { generateProvider } from "./generators/provider"
import { runInkTUI } from "./ink"

const nameArg = Args.text({ name: "name" }).pipe(Args.withDescription("Kebab-case library name"))
const descriptionOption = Options.text("description").pipe(
  Options.withDescription("Library description"),
  Options.optional
)
const tagsOption = Options.text("tags").pipe(
  Options.withDescription("Comma-separated Nx tags"),
  Options.optional
)
const modulesOption = Options.text("modules").pipe(
  Options.withDescription("Comma-separated module paths, such as form-state,marketing/campaign"),
  Options.optional
)
const entrypointsOption = Options.text("entrypoints").pipe(
  Options.withDescription("Comma-separated root,client,server,edge entrypoints"),
  Options.optional
)
const dependenciesOption = Options.text("dependencies").pipe(
  Options.withDescription("Comma-separated package dependencies"),
  Options.optional
)
const workspaceRootOption = Options.text("workspace-root").pipe(
  Options.withDescription("Workspace root; defaults to auto-detection"),
  Options.optional
)
const testModeOption = Options.choice("test-mode", ["none", "unit", "integration"]).pipe(
  Options.withDescription("Generated test support"),
  Options.optional
)
const dryRunOption = Options.boolean("dry-run").pipe(
  Options.withDescription("Create and print the plan without writing files"),
  Options.withDefault(false)
)

function value<A>(option: Option.Option<A>) {
  return Option.getOrUndefined(option)
}

function common(input: {
  readonly description: Option.Option<string>
  readonly tags: Option.Option<string>
  readonly modules: Option.Option<string>
  readonly entrypoints: Option.Option<string>
  readonly dependencies: Option.Option<string>
  readonly workspaceRoot: Option.Option<string>
  readonly testMode: Option.Option<"none" | "unit" | "integration">
  readonly dryRun: boolean
}) {
  return {
    description: value(input.description),
    tags: value(input.tags),
    modules: value(input.modules),
    entrypoints: value(input.entrypoints),
    dependencies: value(input.dependencies),
    workspaceRoot: value(input.workspaceRoot),
    testMode: value(input.testMode),
    dryRun: input.dryRun
  }
}

const commonOptions = {
  description: descriptionOption,
  tags: tagsOption,
  modules: modulesOption,
  entrypoints: entrypointsOption,
  dependencies: dependenciesOption,
  workspaceRoot: workspaceRootOption,
  testMode: testModeOption,
  dryRun: dryRunOption
}

const providerOptions = {
  description: descriptionOption,
  tags: tagsOption,
  entrypoints: entrypointsOption,
  dependencies: dependenciesOption,
  workspaceRoot: workspaceRootOption,
  testMode: testModeOption,
  dryRun: dryRunOption
}

const contractCommand = Command.make(
  "contract",
  {
    name: nameArg,
    ...commonOptions,
    capabilities: Options.text("capabilities").pipe(
      Options.withDescription("Comma-separated entities,errors,events,ports,rpc,types roles"),
      Options.optional
    )
  },
  (input) =>
    generateContract({
      name: input.name,
      ...common(input),
      capabilities: value(input.capabilities)
    })
).pipe(Command.withDescription("Generate a capability-driven contract library"))

const dataAccessCommand = Command.make(
  "data-access",
  {
    name: nameArg,
    ...commonOptions,
    contract: Options.text("contract").pipe(
      Options.withDescription("Contract domain or full package name"),
      Options.optional
    )
  },
  (input) => generateDataAccess({ name: input.name, ...common(input), contract: value(input.contract) })
).pipe(
  Command.withDescription(
    "Generate data access services with Live, Test, Auto, and test harness layers"
  )
)

const featureCommand = Command.make(
  "feature",
  {
    name: nameArg,
    ...commonOptions,
    contract: Options.text("contract").pipe(
      Options.withDescription("Contract domain or full package name used by the client RPC entrypoint"),
      Options.optional
    ),
    dataAccess: Options.text("data-access").pipe(
      Options.withDescription("Comma-separated data-access domains consumed by this feature"),
      Options.optional
    )
  },
  (input) =>
    generateFeature({
      name: input.name,
      ...common(input),
      contract: value(input.contract),
      dataAccess: value(input.dataAccess)
    })
).pipe(Command.withDescription("Generate Pattern A feature services and router-owned composition"))

const providerCommand = Command.make(
  "provider",
  {
    name: nameArg,
    ...providerOptions,
    externalService: Options.text("external-service").pipe(
      Options.withDescription("External service represented by the provider"),
      Options.optional
    )
  },
  (input) =>
    generateProvider({
      name: input.name,
      description: value(input.description),
      tags: value(input.tags),
      entrypoints: value(input.entrypoints),
      dependencies: value(input.dependencies),
      workspaceRoot: value(input.workspaceRoot),
      testMode: value(input.testMode),
      dryRun: input.dryRun,
      externalService: value(input.externalService)
    })
).pipe(Command.withDescription("Generate a Pattern B provider with Live, Test, and Auto layers"))

const infraCommand = Command.make(
  "infra",
  { name: nameArg, ...commonOptions },
  (input) => generateInfra({ name: input.name, ...common(input) })
).pipe(Command.withDescription("Generate a capability-driven infrastructure service"))

const domainCommand = Command.make(
  "domain",
  {
    name: nameArg,
    ...commonOptions,
    contractCapabilities: Options.text("contract-capabilities").pipe(Options.optional)
  },
  (input) =>
    generateDomain({
      name: input.name,
      ...common(input),
      contractCapabilities: value(input.contractCapabilities),
      featureEntrypoints: value(input.entrypoints),
      dependencies: value(input.dependencies),
      testMode: value(input.testMode)
    })
).pipe(
  Command.withDescription(
    "Generate a contract, data-access, and feature slice without implicit infrastructure"
  )
)

const specArg = Args.text({ name: "spec" }).pipe(
  Args.withDescription("Path to a LibraryBlueprint JSON file")
)
const blueprintCommand = Command.make(
  "blueprint",
  { spec: specArg, workspaceRoot: workspaceRootOption, dryRun: dryRunOption },
  ({ dryRun, spec, workspaceRoot }) =>
    Effect.gen(function*() {
      const absolute = path.resolve(spec)
      const blueprint = yield* Effect.try({
        try: () => decodeLibraryBlueprint(JSON.parse(fs.readFileSync(absolute, "utf8"))),
        catch: (cause) => new Error(`Failed to read blueprint ${absolute}: ${String(cause)}`)
      })
      const result = yield* executeBlueprint({
        blueprint,
        workspaceRoot: value(workspaceRoot),
        interfaceType: "cli",
        dryRun
      })
      yield* Console.log(formatOutput(result, "cli"))
      yield* Console.log(`Plan hash: ${result.planHash}`)
      return result
    })
).pipe(Command.withDescription("Generate exactly the library described by a versioned blueprint"))

const generateCommand = Command.make("generate").pipe(
  Command.withDescription("Generate standardized libraries"),
  Command.withSubcommands([
    contractCommand,
    dataAccessCommand,
    featureCommand,
    providerCommand,
    infraCommand,
    domainCommand,
    blueprintCommand
  ])
)

const initCommand = Command.make(
  "init",
  { workspaceRoot: workspaceRootOption },
  ({ workspaceRoot }) => init({ workspaceRoot: value(workspaceRoot) })
).pipe(Command.withDescription("Create mlg.config.json without generating libraries"))

const projectArg = Args.text({ name: "project" }).pipe(
  Args.withDescription("Library project root, for example libs/feature/order")
)
const standardizeCommand = Command.make(
  "standardize",
  {
    project: projectArg,
    workspaceRoot: workspaceRootOption,
    check: Options.boolean("check").pipe(
      Options.withDescription("Report drift without writing managed files"),
      Options.withDefault(false)
    )
  },
  ({ check, project, workspaceRoot }) =>
    Effect.gen(function*() {
      const result = yield* standardizeProject({
        project,
        workspaceRoot: value(workspaceRoot),
        check
      })
      if (result.changedFiles.length > 0) {
        yield* Console.log(
          `${check ? "Drift" : "Updated"}:\n${result.changedFiles.map((file) => `  - ${file}`).join("\n")}`
        )
      } else {
        yield* Console.log(`${result.projectRoot} is standardized`)
      }
      if (result.diagnostics.length > 0) {
        yield* Console.log(
          `Source diagnostics:\n${result.diagnostics.map((item) => `  - ${item.path}: ${item.message}`).join("\n")}`
        )
      }
      if (check && result.changedFiles.length > 0) {
        return yield* Effect.fail(new Error("Standardization drift detected"))
      }
      return result
    })
).pipe(Command.withDescription("Normalize managed library files and audit architecture policy"))

const tuiOption = Options.boolean("tui").pipe(
  Options.withAlias("i"),
  Options.withDescription("Launch the Ink wizard"),
  Options.withDefault(false)
)
const mainCommand = Command.make("mlg", { tui: tuiOption }, ({ tui }) =>
  tui
    ? runInkTUI()
    : Console.log("Use 'mlg --help', 'mlg generate --help', or 'mlg standardize --help'.")).pipe(
    Command.withSubcommands([generateCommand, initCommand, standardizeCommand])
  )

const cli = Command.run(mainCommand, {
  name: "Monorepo Library Generator",
  version: `v${VERSION}`
})

export function main(args: ReadonlyArray<string>) {
  return cli(args)
}

export function libraryKind(value: string) {
  if (
    value === "contract" ||
    value === "data-access" ||
    value === "feature" ||
    value === "provider" ||
    value === "infra"
  ) {
    return value
  }
  throw new Error(`Unsupported library kind: ${value}`)
}

NodeRuntime.runMain(main(process.argv).pipe(Effect.provide(NodeContext.layer)))
