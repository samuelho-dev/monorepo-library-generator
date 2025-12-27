/**
 * Feature Hooks Template Definition
 *
 * Declarative template for generating client/hooks/use-{fileName}.ts in feature libraries.
 * Creates React hooks with RPC integration.
 *
 * @module monorepo-library-generator/templates/definitions/feature/hooks
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Feature Hooks Template Definition
 *
 * Generates a React hook file with:
 * - RPC client integration
 * - State management via atoms
 * - CRUD operations
 * - Loading/error state handling
 */
export const featureHooksTemplate: TemplateDefinition = {
  id: "feature/hooks",
  meta: {
    title: "use{className} Hook",
    description: `React hook for {propertyName} operations with RPC integration.

Features:
- Automatic loading and error state management
- CRUD operations via RPC client
- Integration with atom-based state
- Optimistic updates support`,
    module: "{scope}/feature-{fileName}/client/hooks"
  },
  imports: [
    { from: "react", items: ["useCallback", "useEffect"], isTypeOnly: false },
    { from: "effect", items: ["Effect", "Schema", "Option"] },
    { from: "@effect/rpc", items: ["RpcClient"] },
    { from: "@effect-atom/atom/react", items: ["useAtom", "useAtomValue"] },
    { from: "{scope}/contract-{fileName}", items: ["{className}Rpc"] },
    {
      from: "{scope}/contract-{fileName}",
      items: ["{className}", "{className}Id", "{className}CreateInput", "{className}UpdateInput"],
      isTypeOnly: true
    },
    {
      from: "../atoms/{fileName}-atoms",
      items: [
        "{propertyName}Atom",
        "{propertyName}EntityFamily",
        "update{className}Entity",
        "update{className}List",
        "update{className}Operation",
        "reset{className}State"
      ]
    }
  ],
  sections: [
    // Hook Return Type
    {
      title: "Hook Return Type",
      content: {
        type: "raw",
        value: `/**
 * Return type for use{className} hook
 */
export interface Use{className}Return {
  // State
  readonly isLoading: boolean
  readonly error: string | null
  readonly data: {className} | null
  readonly list: readonly {className}[]

  // Operations
  readonly fetch: (id: {className}Id) => Promise<{className} | null>
  readonly fetchList: (filter?: Record<string, unknown>) => Promise<readonly {className}[]>
  readonly create: (input: {className}CreateInput) => Promise<{className}>
  readonly update: (id: {className}Id, input: {className}UpdateInput) => Promise<{className}>
  readonly remove: (id: {className}Id) => Promise<void>
  readonly reset: () => void
}`
      }
    },
    // Hook Implementation
    {
      title: "Hook Implementation",
      content: {
        type: "raw",
        value: `/**
 * use{className} Hook
 *
 * React hook for {propertyName} CRUD operations.
 * Uses RPC client for server communication and atoms for state.
 *
 * @param rpcClient - RPC client for server communication
 * @returns Hook state and operations
 *
 * @example
 * \`\`\`tsx
 * function {className}List() {
 *   const rpcClient = useRpcClient()
 *   const { list, isLoading, fetchList } = use{className}(rpcClient)
 *
 *   useEffect(() => {
 *     fetchList()
 *   }, [fetchList])
 *
 *   if (isLoading) return <Loading />
 *   return <ul>{list.map(item => <li key={item.id}>{item.name}</li>)}</ul>
 * }
 * \`\`\`
 */
export function use{className}(
  rpcClient: RpcClient.RpcClient<typeof {className}Rpc>
): Use{className}Return {
  const [state, setState] = useAtom({propertyName}Atom)

  // Fetch single entity
  const fetch = useCallback(async (id: {className}Id): Promise<{className} | null> => {
    update{className}Operation(setState, { loading: true, error: null })

    try {
      const result = await Effect.runPromise(
        rpcClient.get({ id }).pipe(
          Effect.map((opt) => Option.getOrNull(opt))
        )
      )

      if (result) {
        update{className}Entity(setState, id, result)
      }

      update{className}Operation(setState, { loading: false })
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch {propertyName}"
      update{className}Operation(setState, { loading: false, error: message })
      return null
    }
  }, [rpcClient, setState])

  // Fetch list
  const fetchList = useCallback(async (
    filter?: Record<string, unknown>
  ): Promise<readonly {className}[]> => {
    update{className}Operation(setState, { loading: true, error: null })

    try {
      const result = await Effect.runPromise(
        rpcClient.list({
          filter: filter ?? {},
          pagination: { offset: 0, limit: 50 }
        })
      )

      update{className}List(setState, result.items)
      update{className}Operation(setState, { loading: false })
      return result.items
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch {propertyName} list"
      update{className}Operation(setState, { loading: false, error: message })
      return []
    }
  }, [rpcClient, setState])

  // Create
  const create = useCallback(async (input: {className}CreateInput): Promise<{className}> => {
    update{className}Operation(setState, { loading: true, error: null })

    try {
      const result = await Effect.runPromise(
        rpcClient.create({ input })
      )

      update{className}Entity(setState, result.id as {className}Id, result)
      update{className}Operation(setState, { loading: false })
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create {propertyName}"
      update{className}Operation(setState, { loading: false, error: message })
      throw error
    }
  }, [rpcClient, setState])

  // Update
  const update = useCallback(async (
    id: {className}Id,
    input: {className}UpdateInput
  ): Promise<{className}> => {
    update{className}Operation(setState, { loading: true, error: null })

    try {
      const result = await Effect.runPromise(
        rpcClient.update({ id, input })
      )

      update{className}Entity(setState, id, result)
      update{className}Operation(setState, { loading: false })
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update {propertyName}"
      update{className}Operation(setState, { loading: false, error: message })
      throw error
    }
  }, [rpcClient, setState])

  // Delete
  const remove = useCallback(async (id: {className}Id): Promise<void> => {
    update{className}Operation(setState, { loading: true, error: null })

    try {
      await Effect.runPromise(
        rpcClient.delete({ id })
      )

      // Remove from cache
      update{className}Entity(setState, id, null)
      update{className}Operation(setState, { loading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete {propertyName}"
      update{className}Operation(setState, { loading: false, error: message })
      throw error
    }
  }, [rpcClient, setState])

  // Reset
  const reset = useCallback(() => {
    reset{className}State(setState)
  }, [setState])

  return {
    isLoading: state.operation.loading,
    error: state.operation.error,
    data: state.entity.data,
    list: state.list.items,
    fetch,
    fetchList,
    create,
    update,
    remove,
    reset
  }
}`
      }
    }
  ]
}

export default featureHooksTemplate
