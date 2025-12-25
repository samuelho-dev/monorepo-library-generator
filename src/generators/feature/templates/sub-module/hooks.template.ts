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
  builder.addBlankLine()

  builder.addSectionComment("RPC Client Import")

  builder.addRaw(`import { useRpcClient } from "${scope}/infra-rpc/client";
import { ${subModuleClassName}Rpcs } from "${scope}/contract-${parentName}";

/**
 * Schema for RPC error responses
 */
const RpcErrorSchema = Schema.Struct({
  _tag: Schema.String,
  message: Schema.String,
});

/**
 * RPC error type parsed from Schema
 */
interface RpcError {
  readonly _tag: string;
  readonly message: string;
}

/**
 * Parse error response using Schema
 */
function parseRpcError(error: unknown): RpcError | null {
  const result = Schema.decodeUnknownOption(RpcErrorSchema)(error);
  return Option.isSome(result) ? result.value : null;
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
 *   const { mutate, isLoading, error } = use${subModuleClassName}Rpc();
 *
 *   const handleAction = async () => {
 *     const result = await mutate.someOperation({ id: "123" });
 *   };
 * }
 * \`\`\`
 */
export function use${subModuleClassName}Rpc() {
  const client = useRpcClient(${subModuleClassName}Rpcs);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<RpcError | null>(null);

  const withLoading = useCallback(
    <T,>(fn: () => Promise<T>) => async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fn();
        return result;
      } catch (e) {
        // Parse error using Schema - returns typed RpcError or null
        const rpcError = parseRpcError(e);
        setError(rpcError ?? { _tag: "UnknownError", message: "An unexpected error occurred" });
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    client,
    isLoading,
    error,
    mutate: client,
  };
}
`)

  return builder.toString()
}
