/**
 * Infrastructure React Hook Template Definition
 *
 * Declarative template for generating lib/use-hook.ts in infrastructure libraries.
 * Contains React hooks for client-side usage.
 *
 * @module monorepo-library-generator/templates/definitions/infra/use-hook
 */

import type { TemplateDefinition } from '../../core/types'

/**
 * Infrastructure React Hook Template Definition
 *
 * Generates a React hook file with:
 * - RPC error parsing schema
 * - Hook state types
 * - Hook implementation with loading/error states
 */
export const infraUseHookTemplate: TemplateDefinition = {
  id: 'infra/use-hook',
  meta: {
    title: 'use{className} React Hook',
    description: `React hook for using {className} service in components.
Provides client-safe interface without exposing server secrets.

TODO: Customize this hook for your service:
1. Define hook return type and state
2. Add effect logic for data fetching/updates
3. Add error handling and loading states
4. Document hook usage and examples
5. Add TypeScript generics if needed`,
    module: '{scope}/infra-{fileName}/client'
  },
  imports: [
    { from: 'react', items: ['useEffect', 'useState', 'useCallback'] },
    { from: 'effect', items: ['Option', 'Schema'] }
  ],
  sections: [
    // Error Types
    {
      title: 'Error Types',
      content: {
        type: 'raw',
        value: `/**
 * Schema for parsing RPC error responses
 *
 * RPC errors are Schema.TaggedError types serialized as JSON.
 */
const RpcErrorSchema = Schema.Struct({
  _tag: Schema.String,
  message: Schema.String
})

/**
 * RPC error structure from Schema parsing
 */
export interface RpcError {
  readonly _tag: string
  readonly message: string
}

/**
 * Parse error response using Schema
 */
function parseRpcError(error: unknown): RpcError | null {
  const result = Schema.decodeUnknownOption(RpcErrorSchema)(error)
  return Option.isSome(result) ? result.value : null
}`
      }
    },
    // Hook State Types
    {
      title: 'Hook State Types',
      content: {
        type: 'raw',
        value: `/**
 * {className} Hook State
 *
 * Represents the state returned by use{className} hook
 */
export interface Use{className}State {
  /** Current data */
  readonly data: unknown | null

  /** Current error (parsed RPC error or fallback) */
  readonly error: RpcError | null

  /** Loading state */
  readonly isLoading: boolean

  /** Refetch function */
  readonly refetch: () => Promise<void>
}`
      }
    },
    // Hook Implementation
    {
      title: 'Hook Implementation',
      content: {
        type: 'raw',
        value: `/**
 * use{className} Hook
 *
 * TODO: Implement hook logic
 *
 * @returns Hook state with data, error, loading, and refetch
 *
 * @example
 * \`\`\`typescript
 * function MyComponent() {
 *   const { data, isLoading, error, refetch } = use{className}()
 *
 *   if (isLoading) return <div>Loading...</div>
 *   if (error) return <div>Error: {error.message}</div>
 *
 *   return (
 *     <div>
 *       <p>{JSON.stringify(data)}</p>
 *       <button onClick={refetch}>Refresh</button>
 *     </div>
 *   )
 * }
 * \`\`\`
 */
export function use{className}() {
  const [data, setData] = useState<unknown | null>(null)
  const [error, setError] = useState<RpcError | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // BASELINE: Set placeholder data
      // TODO: Replace with actual service call
      // const result = await serviceCall()
      setData({ status: "baseline", timestamp: new Date().toISOString() })
    } catch (err) {
      // Parse error using Schema - returns typed RpcError or null
      const rpcError = parseRpcError(err)
      setError(rpcError ?? { _tag: "UnknownError", message: "An unexpected error occurred" })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return {
    data,
    error,
    isLoading,
    refetch
  }
}

// TODO: Add additional hooks as needed
// Example:
//
// export function use{className}Mutation() {
//   const [isPending, setIsPending] = useState(false)
//   const [error, setError] = useState<RpcError | null>(null)
//
//   const mutate = useCallback(async (input: unknown) => {
//     setIsPending(true)
//     setError(null)
//
//     try {
//       // TODO: Call service mutation
//       // const result = await serviceMutation(input)
//       // return result;
//     } catch (err) {
//       const rpcError = parseRpcError(err)
//       setError(rpcError ?? { _tag: "UnknownError", message: "An unexpected error occurred" })
//       throw err
//     } finally {
//       setIsPending(false)
//     }
//   }, [])
//
//   return { mutate, isPending, error }
// }`
      }
    }
  ]
}

export default infraUseHookTemplate
