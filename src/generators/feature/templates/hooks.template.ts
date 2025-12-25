/**
 * Hooks Template
 *
 * Generates client/hooks/use-{name}.ts file for feature libraries.
 *
 * Contract-First Architecture:
 * - Uses useRpcClient from infra-rpc for type-safe RPC calls
 * - Integrates with parent module atoms for state management
 * - Provides unified hook for all feature operations
 *
 * @module monorepo-library-generator/feature/hooks-template
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import type { FeatureTemplateOptions } from "../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"

/**
 * Generate client/hooks/use-{name}.ts file for feature library
 *
 * Creates React hook with RPC integration and atom state management.
 */
export function generateHooksFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, name, propertyName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  // Add file header
  builder.addFileHeader({
    title: `use${className} Hook`,
    description: `React hook for ${name} operations.

Contract-First Architecture:
- Uses useRpcClient from infra-rpc for type-safe RPC calls
- State managed via parent module atoms (centralized state)
- Sub-modules access state through this hook

Usage:
  import { use${className} } from "${scope}/feature-${fileName}/client";

  function MyComponent() {
    const {
      data, list, isLoading, error,
      fetchById, fetchList, create, update, remove, reset
    } = use${className}();
    // ...
  }`,
    module: `${scope}/feature-${fileName}/client/hooks`
  })

  // Add imports
  builder.addImports([
    { from: "@effect-atom/atom-react", imports: ["useAtom", "useAtomValue"] },
    { from: "@effect/schema", imports: ["Schema"] },
    { from: "effect", imports: ["Option"] },
    { from: "react", imports: ["useCallback", "useMemo"] }
  ])

  // Add RPC error schema for parsing error responses
  builder.addRaw(`
/**
 * Schema for RPC error responses
 *
 * RPC errors are Schema.TaggedError types serialized as JSON.
 * This schema extracts the message field from any RPC error.
 */
const RpcErrorSchema = Schema.Struct({
  _tag: Schema.String,
  message: Schema.String
})

/**
 * Extract error message from RPC error response using Schema
 *
 * Uses Schema.decodeUnknownOption for type-safe parsing without coercion.
 */
function getErrorMessage(error: unknown, fallback: string) {
  const result = Schema.decodeUnknownOption(RpcErrorSchema)(error)
  return Option.isSome(result) ? result.value.message : fallback
}
`)
  builder.addBlankLine()

  // Add RPC and atom imports
  builder.addImports([
    {
      from: `${scope}/contract-${fileName}`,
      imports: [{ name: `${className}Select`, alias: className }, `Create${className}Input`, `Update${className}Input`],
      isTypeOnly: true
    },
    {
      from: `${scope}/env`,
      imports: ["env"]
    },
    {
      from: `../atoms/${fileName}-atoms`,
      imports: [
        `${propertyName}Atom`,
        `${propertyName}DataAtom`,
        `${propertyName}ErrorAtom`,
        `${propertyName}IsLoadingAtom`,
        `${propertyName}ListAtom`,
        `reset${className}State`,
        `update${className}Entity`,
        `update${className}List`,
        `update${className}Operation`
      ]
    },
    { from: `../atoms/${fileName}-atoms`, imports: [`${className}State`], isTypeOnly: true }
  ])

  builder.addSectionComment("Hook Return Type")

  builder.addRaw(`/**
 * Return type for use${className} hook
 */
export interface Use${className}Return {
  // State
  readonly state: ${className}State;
  readonly data: ${className} | null;
  readonly list: ReadonlyArray<${className}>;
  readonly isLoading: boolean;
  readonly error: string | null;

  // Entity operations
  readonly fetchById: (id: string) => Promise<${className} | null>;
  readonly create: (input: Create${className}Input) => Promise<${className}>;
  readonly update: (id: string, input: Update${className}Input) => Promise<${className}>;
  readonly remove: (id: string) => Promise<void>;

  // List operations
  readonly fetchList: (options?: { page?: number; pageSize?: number }) => Promise<void>;
  readonly refreshList: () => Promise<void>;

  // State management
  readonly reset: () => void;
  readonly clearError: () => void;
}`)
  builder.addBlankLine()

  builder.addSectionComment("Hook Implementation")

  builder.addRaw(`/**
 * RPC endpoint URL - configured via env library
 *
 * Uses centralized environment configuration for type-safe access.
 * Falls back to "/api/rpc" if PUBLIC_API_URL is not configured.
 */
const RPC_ENDPOINT = env.PUBLIC_API_URL ?? "/api/rpc"

/**
 * Make an RPC call to the server
 *
 * Uses typed response - caller should cast result to expected type.
 * Server-side validation ensures type safety.
 */
async function rpcCall<T>(operation: string, payload: unknown): Promise<T> {
  const response = await fetch(RPC_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ _tag: operation, payload })
  })

  const body: unknown = await response.json()

  if (!response.ok) {
    throw body
  }

  return body as T
}

/**
 * List response type from server
 */
interface ListResponse<T> {
  readonly items: ReadonlyArray<T>;
  readonly total: number;
  readonly hasMore: boolean;
}

/**
 * use${className} - Main hook for ${name} operations
 *
 * Provides:
 * - Type-safe RPC calls to server endpoints
 * - Centralized state management via atoms
 * - Loading/error state tracking
 * - CRUD operations with automatic state updates
 *
 * @example
 * \`\`\`tsx
 * function ${className}List() {
 *   const { list, isLoading, fetchList } = use${className}();
 *
 *   useEffect(() => {
 *     fetchList();
 *   }, [fetchList]);
 *
 *   if (isLoading) return <Loading />;
 *   return <ul>{list.map(item => <li key={item.id}>{item.name}</li>)}</ul>;
 * }
 * \`\`\`
 */
export function use${className}(): Use${className}Return {
  // Atom state
  const [state, setState] = useAtom(${propertyName}Atom);
  const isLoading = useAtomValue(${propertyName}IsLoadingAtom);
  const error = useAtomValue(${propertyName}ErrorAtom);
  const data = useAtomValue(${propertyName}DataAtom);
  const list = useAtomValue(${propertyName}ListAtom);

  // Fetch by ID
  const fetchById = useCallback(async (id: string) => {
    setState(update${className}Entity({ loadingState: "loading", error: null }))
    try {
      const result = await rpcCall<${className}>("Get${className}", { id })
      setState(update${className}Entity({
        data: result,
        loadingState: "idle",
        lastUpdated: Date.now()
      }))
      return result
    } catch (e) {
      const errorMessage = getErrorMessage(e, "Failed to fetch")
      setState(update${className}Entity({ loadingState: "error", error: errorMessage }))
      return null
    }
  }, [setState])

  // Fetch list
  const fetchList = useCallback(async (options?: { page?: number; pageSize?: number }) => {
    const page = options?.page ?? state.list.pagination.page
    const pageSize = options?.pageSize ?? state.list.pagination.pageSize

    setState(update${className}List({ loadingState: "loading", error: null }))
    try {
      const result = await rpcCall<ListResponse<${className}>>("List${className}s", { page, pageSize })
      setState(update${className}List({
        items: result.items,
        loadingState: "idle",
        pagination: {
          page,
          pageSize,
          totalCount: result.total,
          hasMore: result.hasMore
        },
        lastUpdated: Date.now()
      }))
    } catch (e) {
      const errorMessage = getErrorMessage(e, "Failed to fetch list")
      setState(update${className}List({ loadingState: "error", error: errorMessage }))
    }
  }, [setState, state.list.pagination.page, state.list.pagination.pageSize])

  // Refresh list (reload current page)
  const refreshList = useCallback(async () => {
    setState(update${className}List({ loadingState: "refreshing" }))
    await fetchList()
  }, [fetchList, setState])

  // Create
  const create = useCallback(async (input: Create${className}Input) => {
    setState(update${className}Operation({ isSubmitting: true, error: null, lastOperation: "create" }))
    try {
      const result = await rpcCall<${className}>("Create${className}", input)
      setState(update${className}Operation({ isSubmitting: false }))
      // Refresh list after creation
      await refreshList()
      return result
    } catch (e) {
      const errorMessage = getErrorMessage(e, "Failed to create")
      setState(update${className}Operation({ isSubmitting: false, error: errorMessage }))
      throw e
    }
  }, [setState, refreshList])

  // Update
  const update = useCallback(async (id: string, input: Update${className}Input) => {
    setState(update${className}Operation({ isSubmitting: true, error: null, lastOperation: "update" }))
    try {
      const result = await rpcCall<${className}>("Update${className}", { id, ...input })
      setState(update${className}Operation({ isSubmitting: false }))
      // Update entity if it's the current one
      if (state.entity.data?.id === id) {
        setState(update${className}Entity({ data: result, lastUpdated: Date.now() }))
      }
      // Refresh list after update
      await refreshList()
      return result
    } catch (e) {
      const errorMessage = getErrorMessage(e, "Failed to update")
      setState(update${className}Operation({ isSubmitting: false, error: errorMessage }))
      throw e
    }
  }, [setState, refreshList, state.entity.data?.id])

  // Remove
  const remove = useCallback(async (id: string) => {
    setState(update${className}Operation({ isSubmitting: true, error: null, lastOperation: "delete" }))
    try {
      await rpcCall<{ success: boolean }>("Delete${className}", { id })
      setState(update${className}Operation({ isSubmitting: false }))
      // Clear entity if it's the deleted one
      if (state.entity.data?.id === id) {
        setState(update${className}Entity({ data: null }))
      }
      // Refresh list after deletion
      await refreshList()
    } catch (e) {
      const errorMessage = getErrorMessage(e, "Failed to delete")
      setState(update${className}Operation({ isSubmitting: false, error: errorMessage }))
      throw e
    }
  }, [setState, refreshList, state.entity.data?.id])

  // Reset state
  const reset = useCallback(() => {
    setState(reset${className}State())
  }, [setState])

  // Clear error
  const clearError = useCallback(() => {
    setState((s) => ({
      ...s,
      entity: { ...s.entity, error: null },
      list: { ...s.list, error: null },
      operation: { ...s.operation, error: null }
    }))
  }, [setState])

  return useMemo(() => ({
    // State
    state,
    data,
    list,
    isLoading,
    error,

    // Entity operations
    fetchById,
    create,
    update,
    remove,

    // List operations
    fetchList,
    refreshList,

    // State management
    reset,
    clearError
  }), [
    state, data, list, isLoading, error,
    fetchById, create, update, remove,
    fetchList, refreshList, reset, clearError
  ])
}`)
  builder.addBlankLine()

  return builder.toString()
}
