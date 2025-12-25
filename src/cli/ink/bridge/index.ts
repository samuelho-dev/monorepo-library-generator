/**
 * Effect-Ink Bridge
 *
 * Exports for bridging Effect operations with React Ink components.
 *
 * @module monorepo-library-generator/cli/ink/bridge
 */

export { EffectRuntimeProvider, useRuntime } from "./context"
export { useEffectOnMount, useEffectOperation, useEffectWithProgress } from "./hooks"
export { AppLayer, type AppLayerContext, createRuntime, withRuntime } from "./runtime"
