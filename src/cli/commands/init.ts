import { Console, Effect } from "effect"
import { initializeWorkspacePolicy } from "../../core"

export interface InitOptions {
  readonly workspaceRoot?: string
}

export function init(options: InitOptions = {}) {
  return Effect.gen(function*() {
    const result = yield* initializeWorkspacePolicy(options.workspaceRoot)
    yield* Console.log(result.created ? `Created ${result.path}` : `${result.path} already exists`)
    return result
  })
}
