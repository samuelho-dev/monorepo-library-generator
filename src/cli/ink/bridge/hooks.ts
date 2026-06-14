/**
 * Effect Hooks for React Ink
 *
 * Custom hooks for executing Effect operations from React components.
 *
 * @module monorepo-library-generator/cli/ink/bridge/hooks
 */

import type { Effect } from "effect"
import { Cause, Chunk, Exit, Option, Runtime } from "effect"
import { useCallback, useState } from "react"

import { useRuntime } from "./context"

/**
 * State for Effect operation hook
 *
 * Note: error can be E (expected errors from Effect) or Error (unexpected runtime errors)
 */
interface EffectOperationState<A, E> {
  readonly result: A | null
  readonly error: E | Error | null
  readonly isLoading: boolean
}

/**
 * Return type for useEffectOperation hook
 */
export interface UseEffectOperationResult<A, E> extends EffectOperationState<A, E> {
  readonly execute: () => Promise<A | undefined>
  readonly reset: () => void
}

/**
 * Hook to execute an Effect operation from a React component
 *
 * Uses proper Cause handling for type-safe error extraction.
 *
 * @example
 * ```tsx
 * function GenerateButton({ name }: { name: string }) {
 *   const { execute, isLoading, error, result } = useEffectOperation(
 *     () => generateContract({ name, tags: '' })
 *   )
 *
 *   return (
 *     <Box>
 *       {isLoading && <Spinner />}
 *       {error && <Text color="red">{String(error)}</Text>}
 *       {result && <Text color="green">Generated!</Text>}
 *       <Button onPress={execute}>Generate</Button>
 *     </Box>
 *   )
 * }
 * ```
 */
export function useEffectOperation<A, E>(effectFn: () => Effect.Effect<A, E>) {
  const runtime = useRuntime()

  const [state, setState] = useState<EffectOperationState<A, E>>({
    result: null,
    error: null,
    isLoading: false
  })

  const execute = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }))

    try {
      const exit = await Runtime.runPromiseExit(runtime)(effectFn())

      // Use Exit.match for proper type-safe value extraction
      return Exit.match(exit, {
        onSuccess: (value) => {
          setState({ result: value, error: null, isLoading: false })
          return value
        },
        onFailure: (cause) => {
          // Extract typed error from Cause using Option
          const failure = Cause.failureOption(cause)

          if (Option.isSome(failure)) {
            setState({ result: null, error: failure.value, isLoading: false })
          } else {
            // Handle defects/interruptions
            const defects = Cause.defects(cause)
            const defectChunk = Chunk.toReadonlyArray(defects)

            if (defectChunk.length > 0) {
              // Re-throw defects as they represent bugs
              throw defectChunk[0]
            }

            // Check for interruption
            if (Cause.isInterrupted(cause)) {
              setState({ result: null, error: null, isLoading: false })
            } else {
              throw new Error("Unknown Effect failure")
            }
          }
          return undefined
        }
      })
    } catch (err) {
      // Handle unexpected errors during execution
      const error = err instanceof Error ? err : new Error(String(err))
      setState({ result: null, error, isLoading: false })
    }

    return undefined
  }, [runtime, effectFn])

  const reset = useCallback(() => {
    setState({ result: null, error: null, isLoading: false })
  }, [])

  return { ...state, execute, reset }
}

/**
 * Hook for Effect operations that run immediately on mount
 *
 * @example
 * ```tsx
 * function WorkspaceInfo() {
 *   const { result, isLoading, error } = useEffectOnMount(
 *     () => createWorkspaceContext(undefined, 'cli')
 *   )
 *
 *   if (isLoading) return <Spinner />
 *   if (error) return <Text color="red">Error: {String(error)}</Text>
 *   return <Text>Workspace: {result?.librariesRoot}</Text>
 * }
 * ```
 */
export function useEffectOnMount<A, E>(effectFn: () => Effect.Effect<A, E>) {
  const { execute, ...rest } = useEffectOperation(effectFn)

  // Execute on mount
  useState(() => {
    execute()
  })

  return rest
}

export function useEffectWithProgress<A, E>(
  effectFn: (onProgress: (message: string) => void) => Effect.Effect<A, E>
) {
  const runtime = useRuntime()

  const [state, setState] = useState<EffectOperationState<A, E>>({
    result: null,
    error: null,
    isLoading: false
  })

  const [progress, setProgress] = useState<ReadonlyArray<string>>([])

  const execute = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    setProgress([])

    const onProgress = (message: string) => {
      setProgress((prev) => [...prev, message])
    }

    try {
      const exit = await Runtime.runPromiseExit(runtime)(effectFn(onProgress))

      // Use Exit.match for proper type-safe value extraction
      return Exit.match(exit, {
        onSuccess: (value) => {
          setState({ result: value, error: null, isLoading: false })
          return value
        },
        onFailure: (cause) => {
          const failure = Cause.failureOption(cause)

          if (Option.isSome(failure)) {
            setState({ result: null, error: failure.value, isLoading: false })
          } else {
            const defects = Cause.defects(cause)
            const defectChunk = Chunk.toReadonlyArray(defects)
            if (defectChunk.length > 0) throw defectChunk[0]
          }
          return undefined
        }
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setState({ result: null, error, isLoading: false })
    }

    return undefined
  }, [runtime, effectFn])

  const reset = useCallback(() => {
    setState({ result: null, error: null, isLoading: false })
    setProgress([])
  }, [])

  return { ...state, execute, reset, progress }
}
