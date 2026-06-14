import { Effect } from "effect"
import { createBlueprint, executeBlueprint, type LibraryKind } from "../../core"

function record(input: unknown) {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("Generator input must be an object")
  }
  const values: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) values[key] = value
  return values
}

function optionalString(input: unknown) {
  return typeof input === "string" ? input : undefined
}

function optionalStringList(input: unknown) {
  if (typeof input === "string") return input
  if (Array.isArray(input) && input.every((item) => typeof item === "string")) return input
  return undefined
}

export function handleBlueprintGeneration(kind: LibraryKind, input: unknown) {
  return Effect.gen(function*() {
    const values = yield* Effect.try({
      try: () => record(input),
      catch: (cause) => new Error(String(cause))
    })
    const name = optionalString(values.name)
    if (!name) return yield* Effect.fail(new Error("name is required"))
    const testMode = values.testMode === "none" || values.testMode === "unit" || values.testMode === "integration"
      ? values.testMode
      : undefined
    const blueprint = createBlueprint({
      kind,
      name,
      description: optionalString(values.description),
      directory: optionalString(values.directory),
      tags: optionalStringList(values.tags),
      modules: optionalStringList(values.modules),
      capabilities: optionalStringList(values.capabilities),
      dependencies: optionalStringList(values.dependencies),
      entrypoints: optionalStringList(values.entrypoints),
      contract: optionalString(values.contract),
      dataAccess: optionalStringList(values.dataAccess),
      externalService: optionalString(values.externalService),
      testMode
    })
    const result = yield* executeBlueprint({
      blueprint,
      workspaceRoot: optionalString(values.workspaceRoot),
      interfaceType: "mcp",
      dryRun: values.dryRun === true
    })
    return {
      success: true,
      message: `Generated ${result.projectName} at ${result.projectRoot}\n` +
        `Files: ${result.filesGenerated.length}\nPlan hash: ${result.planHash}`,
      files: result.filesGenerated
    }
  }).pipe(
    Effect.catchAll((error) =>
      Effect.succeed({
        success: false,
        message: error instanceof Error ? error.message : String(error),
        files: []
      })
    )
  )
}
