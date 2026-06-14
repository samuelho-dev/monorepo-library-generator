import type { Tree } from "@nx/devkit"
import { Data, Effect } from "effect"
import { createHash } from "node:crypto"
import { createWorkspaceContext, type InterfaceType } from "../infrastructure/workspace"
import { createAdapterFromContext } from "../utils/filesystem"
import { decodeLibraryBlueprint } from "./blueprint"
import { createGenerationPlan } from "./planner"
import { loadWorkspacePolicy } from "./policy"
import type { GenerationPlan, GeneratorResult, LibraryBlueprint } from "./types"

export class BlueprintExecutionError extends Data.TaggedError("BlueprintExecutionError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

export interface BlueprintGenerationResult extends GeneratorResult {
  readonly planHash: string
  readonly plan: GenerationPlan
  readonly dryRun: boolean
}

export interface ExecuteBlueprintOptions {
  readonly blueprint: LibraryBlueprint | unknown
  readonly workspaceRoot?: string
  readonly interfaceType: InterfaceType
  readonly tree?: Tree
  readonly dryRun?: boolean
}

interface GenerationState {
  readonly schemaVersion: 1
  readonly planHash: string
  readonly files: Readonly<Record<string, string>>
}

const STATE_FILE = ".mlg-manifest.json"

function contentHash(content: string) {
  return createHash("sha256").update(content).digest("hex")
}

function statePath(plan: GenerationPlan) {
  return `${plan.projectRoot}/${STATE_FILE}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function decodeGenerationState(input: string, projectRoot: string) {
  const value: unknown = JSON.parse(input)
  if (!isRecord(value)) {
    throw new Error(`${STATE_FILE} must contain an object`)
  }
  const record = value
  if (record.schemaVersion !== 1 || typeof record.planHash !== "string") {
    throw new Error(`${STATE_FILE} is not a supported generation manifest`)
  }
  if (!isRecord(record.files)) {
    throw new Error(`${STATE_FILE} files must be an object`)
  }
  const files: Record<string, string> = {}
  for (const [filePath, hash] of Object.entries(record.files)) {
    if (
      typeof hash !== "string" ||
      !filePath.startsWith(`${projectRoot}/`) ||
      filePath.includes("\\") ||
      filePath.split("/").some((segment) => segment === "." || segment === "..")
    ) {
      throw new Error(`${STATE_FILE} contains an invalid generated file entry`)
    }
    files[filePath] = hash
  }
  return { schemaVersion: 1 as const, planHash: record.planHash, files }
}

function encodeGenerationState(plan: GenerationPlan) {
  const state: GenerationState = {
    schemaVersion: 1,
    planHash: plan.hash,
    files: Object.fromEntries(plan.files.map((file) => [file.path, contentHash(file.content)]))
  }
  return `${JSON.stringify(state, null, 2)}\n`
}

function toExecutionError(message: string) {
  return Effect.mapError((cause: unknown) => new BlueprintExecutionError({ message, cause }))
}

export function executeBlueprint(options: ExecuteBlueprintOptions) {
  return Effect.gen(function*() {
    const blueprint = yield* Effect.try({
      try: () => decodeLibraryBlueprint(options.blueprint),
      catch: (cause) => new BlueprintExecutionError({ message: "Invalid library blueprint", cause })
    })
    const context = yield* createWorkspaceContext(
      options.workspaceRoot,
      options.interfaceType
    ).pipe(toExecutionError("Failed to detect workspace"))
    const adapter = yield* createAdapterFromContext(context, options.tree).pipe(
      toExecutionError("Failed to create filesystem adapter")
    )
    const policy = yield* loadWorkspacePolicy(adapter, context).pipe(
      toExecutionError("Failed to load workspace policy")
    )
    const plan = yield* Effect.try({
      try: () => createGenerationPlan(blueprint, policy),
      catch: (cause) => new BlueprintExecutionError({ message: "Failed to create generation plan", cause })
    })

    if (!options.dryRun) {
      const manifestPath = statePath(plan)
      const manifestTarget = options.tree ? manifestPath : `${context.root}/${manifestPath}`
      const manifestExists = yield* adapter
        .exists(manifestTarget)
        .pipe(toExecutionError(`Failed to inspect ${manifestPath}`))
      const previousState = manifestExists
        ? yield* adapter.readFile(manifestTarget).pipe(
          toExecutionError(`Failed to read ${manifestPath}`),
          Effect.flatMap((content) =>
            Effect.try({
              try: () => decodeGenerationState(content, plan.projectRoot),
              catch: (cause) => new BlueprintExecutionError({ message: `Invalid ${manifestPath}`, cause })
            })
          )
        )
        : undefined
      const nextPaths = new Set(plan.files.map((file) => file.path))
      const stalePaths = Object.keys(previousState?.files ?? {}).filter(
        (filePath) => !nextPaths.has(filePath)
      )
      const conflicts: Array<string> = []

      for (const file of plan.files) {
        const target = options.tree ? file.path : `${context.root}/${file.path}`
        const exists = yield* adapter
          .exists(target)
          .pipe(toExecutionError(`Failed to inspect ${file.path}`))
        if (!exists) continue
        const current = yield* adapter
          .readFile(target)
          .pipe(toExecutionError(`Failed to read ${file.path}`))
        if (current === file.content) continue
        const previousHash = previousState?.files[file.path]
        if (!previousHash || contentHash(current) !== previousHash) conflicts.push(file.path)
      }

      for (const filePath of stalePaths) {
        const target = options.tree ? filePath : `${context.root}/${filePath}`
        const exists = yield* adapter
          .exists(target)
          .pipe(toExecutionError(`Failed to inspect ${filePath}`))
        if (!exists) continue
        const current = yield* adapter
          .readFile(target)
          .pipe(toExecutionError(`Failed to read ${filePath}`))
        if (contentHash(current) !== previousState?.files[filePath]) conflicts.push(filePath)
      }

      if (conflicts.length > 0) {
        return yield* Effect.fail(
          new BlueprintExecutionError({
            message: `Refusing to overwrite modified generated files:\n${
              conflicts.map((file) => `  - ${file}`).join("\n")
            }`
          })
        )
      }

      for (const file of plan.files) {
        const target = options.tree ? file.path : `${context.root}/${file.path}`
        yield* adapter
          .writeFile(target, file.content)
          .pipe(toExecutionError(`Failed to write ${file.path}`))
      }
      for (const filePath of stalePaths) {
        const target = options.tree ? filePath : `${context.root}/${filePath}`
        const exists = yield* adapter
          .exists(target)
          .pipe(toExecutionError(`Failed to inspect ${filePath}`))
        if (exists) {
          yield* adapter.remove(target).pipe(toExecutionError(`Failed to remove ${filePath}`))
        }
      }
      yield* adapter
        .writeFile(manifestTarget, encodeGenerationState(plan))
        .pipe(toExecutionError(`Failed to write ${manifestPath}`))
    }

    return {
      projectName: plan.projectName,
      projectRoot: plan.projectRoot,
      packageName: plan.packageName,
      sourceRoot: plan.sourceRoot,
      filesGenerated: plan.files.map((file) => file.path),
      planHash: plan.hash,
      plan,
      dryRun: options.dryRun ?? false
    } satisfies BlueprintGenerationResult
  })
}
