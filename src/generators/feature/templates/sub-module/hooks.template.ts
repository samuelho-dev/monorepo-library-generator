/**
 * Sub-Module Hooks Template
 *
 * Generates hooks.ts for feature sub-module RPC access.
 * Provides React hooks that call sub-module RPCs.
 *
 * NOTE: State management is centralized in the parent module's atoms.
 * Sub-module hooks only provide RPC mutation/query access.
 *
 * @module monorepo-library-generator/feature/templates/sub-module/hooks
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

export interface SubModuleHooksOptions {
  readonly parentName: string
  readonly parentClassName: string
  readonly parentFileName: string
  readonly subModuleName: string
  readonly subModuleClassName: string
}

/**
 * Generate hooks.ts file for sub-module
 *
 * Creates React hooks for RPC operations only.
 * State is managed by parent module atoms.
 */
export function generateSubModuleHooksFile(options: SubModuleHooksOptions) {
  const builder = new TypeScriptBuilder()
  const { parentClassName, parentName, subModuleClassName, subModuleName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${subModuleClassName} RPC Hooks`,
    description: `React hooks for ${subModuleName} RPC operations.

NOTE: These hooks provide RPC access only.
State management is centralized in the parent ${parentClassName} atoms.

Usage:
  import { use${subModuleClassName}Rpc } from "${scope}/feature-${parentName}/client";

  const { mutate, isLoading } = use${subModuleClassName}Rpc();
  await mutate.create(data);`
  })

  builder.addImports([
    { from: "react", imports: ["useCallback", "useState"] },
    { from: "@effect/schema", imports: ["Schema"] },
    { from: "effect", imports: ["Option"] }
  ])

  builder.addSectionComment("RPC Utilities")

  builder.addRaw(`/**
 * Schema for RPC error responses
 */
const RpcErrorSchema = Schema.Struct({
  _tag: Schema.String,
  message: Schema.String
})

/**
 * RPC error type parsed from Schema
 */
interface RpcError {
  readonly _tag: string
  readonly message: string
}

/**
 * Parse error response using Schema
 */
function parseRpcError(error: unknown): RpcError {
  const result = Schema.decodeUnknownOption(RpcErrorSchema)(error)
  return Option.isSome(result)
    ? result.value
    : { _tag: "UnknownError", message: "An unexpected error occurred" }
}

/**
 * RPC endpoint URL - configure via environment
 */
const RPC_ENDPOINT = process.env["NEXT_PUBLIC_RPC_ENDPOINT"] ?? "/api/rpc"

/**
 * Make an RPC call to the server
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
`)

  builder.addSectionComment("RPC Hook")

  builder.addRaw(`/**
 * ${subModuleClassName} RPC hook
 *
 * Provides access to ${subModuleName} RPC operations.
 * Returns mutation functions and loading state.
 *
 * @example
 * \`\`\`tsx
 * function MyComponent() {
 *   const { call, isLoading, error } = use${subModuleClassName}Rpc();
 *
 *   const handleAction = async () => {
 *     const result = await call<SomeType>("Get${subModuleClassName}", { id: "123" });
 *   };
 * }
 * \`\`\`
 */
export function use${subModuleClassName}Rpc() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<RpcError | null>(null)

  /**
   * Make an RPC call
   *
   * @param operation - The RPC operation name (e.g., "Get${subModuleClassName}")
   * @param payload - The request payload
   */
  const call = useCallback(
    async <T>(operation: string, payload: unknown): Promise<T> => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await rpcCall<T>(operation, payload)
        return result
      } catch (e) {
        const rpcError = parseRpcError(e)
        setError(rpcError)
        throw e
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    call,
    isLoading,
    error,
    clearError
  }
}
`)

  return builder.toString()
}
