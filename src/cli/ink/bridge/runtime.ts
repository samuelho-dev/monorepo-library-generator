/**
 * Effect Runtime for Ink TUI
 *
 * Creates and manages the Effect runtime for React Ink components.
 * Uses Layer.toRuntime pattern for proper resource management.
 *
 * @module monorepo-library-generator/cli/ink/bridge/runtime
 */

import { NodeContext } from '@effect/platform-node'
import type { Runtime } from 'effect'
import { Effect, Layer } from 'effect'

/**
 * Application layer combining all required services
 *
 * For the TUI, we only need NodeContext which provides:
 * - FileSystem
 * - Path
 * - Terminal
 * - CommandExecutor
 */
export const AppLayer = NodeContext.layer

export type AppLayerContext = Layer.Layer.Success<typeof AppLayer>

/**
 * Create a scoped runtime for use within React components
 *
 * This returns an Effect that creates the runtime, uses it,
 * and properly cleans up when done.
 */
export function withRuntime<A, E>(
  f: (runtime: Runtime.Runtime<AppLayerContext>) => Effect.Effect<A, E, never>
) {
  return Effect.scoped(
    Effect.gen(function* () {
      const runtime = yield* Layer.toRuntime(AppLayer)
      return yield* f(runtime)
    })
  )
}

/**
 * Create a runtime synchronously for the React context provider
 *
 * Note: This creates a runtime without proper scoping.
 * Use `withRuntime` for proper resource management when possible.
 */
export function createRuntime() {
  return Effect.scoped(Layer.toRuntime(AppLayer)).pipe(Effect.orDie)
}
