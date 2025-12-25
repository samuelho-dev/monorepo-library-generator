/**
 * Effect Runtime React Context
 *
 * Provides the Effect runtime to React Ink components via context.
 *
 * @module monorepo-library-generator/cli/ink/bridge/context
 */

import { Effect, Layer, type Runtime } from 'effect';
import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react'
import { AppLayer, type AppLayerContext } from './runtime'

/**
 * Context for the Effect runtime
 */
const RuntimeContext = createContext<Runtime.Runtime<AppLayerContext> | null>(null)

interface EffectRuntimeProviderProps {
  readonly children: React.ReactNode;
}

/**
 * Provider component that creates and provides the Effect runtime
 */
export function EffectRuntimeProvider({ children }: EffectRuntimeProviderProps) {
  const [runtime, setRuntime] = useState<Runtime.Runtime<AppLayerContext> | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let disposed = false    // Create the runtime using AppLayer for proper type inference
    const createRuntimeEffect = Effect.scoped(Layer.toRuntime(AppLayer))

    Effect.runPromise(createRuntimeEffect)
      .then((rt) => {
        if (!disposed) {
          setRuntime(rt)
        }
      })
      .catch((err) => {
        if (!disposed) {
          setError(err instanceof Error ? err : new Error(String(err)))
        }
      })

    return () => {
      disposed = true;
    }
  }, [])

  if (error) {
    throw error
  }

  if (!runtime) {
    return null; // Loading state
  }

  return <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>
}

/**
 * Hook to access the Effect runtime
 *
 * @throws Error if used outside of EffectRuntimeProvider
 */
export function useRuntime(): Runtime.Runtime<AppLayerContext> {
  const runtime = useContext(RuntimeContext)

  if (!runtime) {
    throw new Error('useRuntime must be used within an EffectRuntimeProvider')
  }

  return runtime;
}
