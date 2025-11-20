/**
 * Infrastructure React Hook Template
 *
 * Generates React hooks for client-side usage.
 *
 * @module monorepo-library-generator/infra-templates
 */

import { TypeScriptBuilder } from '../../../utils/code-generation/typescript-builder';
import type { InfraTemplateOptions } from '../../../utils/shared/types';

/**
 * Generate React hook file for infrastructure service
 */
export function generateUseHookFile(options: InfraTemplateOptions): string {
  const builder = new TypeScriptBuilder();
  const { className, fileName, includeClientServer } = options;

  // Only generate if client/server mode is enabled
  if (!includeClientServer) {
    return '';
  }

  // File header
  builder.addFileHeader({
    title: `use${className} React Hook`,
    description: `React hook for using ${className} service in components.\nProvides client-safe interface without exposing server secrets.\n\nTODO: Customize this hook for your service:\n1. Define hook return type and state\n2. Add effect logic for data fetching/updates\n3. Add error handling and loading states\n4. Document hook usage and examples\n5. Add TypeScript generics if needed`,
    module: `@custom-repo/infra-${fileName}/client`,
  });

  // Imports
  builder.addImports([
    { from: 'react', imports: ['useEffect', 'useState', 'useCallback'] },
  ]);

  // Section: Hook State Types
  builder.addSectionComment('Hook State Types');

  builder.addRaw(`/**
 * ${className} Hook State
 *
 * Represents the state returned by use${className} hook
 */
export interface Use${className}State {
  /** Current data */
  readonly data: unknown | null;

  /** Current error */
  readonly error: Error | null;

  /** Loading state */
  readonly isLoading: boolean;

  /** Refetch function */
  readonly refetch: () => Promise<void>;
}`);
  builder.addBlankLine();

  // Section: Hook Implementation
  builder.addSectionComment('Hook Implementation');

  builder.addFunction({
    name: `use${className}`,
    params: [],
    returnType: `Use${className}State`,
    body: `const [data, setData] = useState<unknown | null>(null);
const [error, setError] = useState<Error | null>(null);
const [isLoading, setIsLoading] = useState(false);

const refetch = useCallback(async () => {
  setIsLoading(true);
  setError(null);

  try {
    // TODO: Fetch data from service
    // const result = await serviceCall();
    // setData(result);
  } catch (err) {
    setError(
      err instanceof Error ? err : new Error(String(err))
    );
  } finally {
    setIsLoading(false);
  }
}, []);

useEffect(() => {
  refetch();
}, [refetch]);

return {
  data,
  error,
  isLoading,
  refetch,
};`,
    jsdoc: `use${className} Hook\n\nTODO: Implement hook logic\n\n@returns Hook state with data, error, loading, and refetch\n\n@example\n\`\`\`typescript\nfunction MyComponent() {\n  const { data, isLoading, error, refetch } = use${className}();\n\n  if (isLoading) return <div>Loading...</div>;\n  if (error) return <div>Error: {error.message}</div>;\n\n  return (\n    <div>\n      <p>{JSON.stringify(data)}</p>\n      <button onClick={refetch}>Refresh</button>\n    </div>\n  );\n}\n\`\`\``,
  });

  builder.addRaw(`// TODO: Add additional hooks as needed
// Example:
//
// export function use${className}Mutation() {
//   const [isPending, setIsPending] = useState(false);
//   const [error, setError] = useState<Error | null>(null);
//
//   const mutate = useCallback(async (input: unknown) => {
//     setIsPending(true);
//     setError(null);
//
//     try {
//       // TODO: Call service mutation
//       // const result = await serviceMutation(input);
//       // return result;
//     } catch (err) {
//       const error = err instanceof Error ? err : new Error(String(err));
//       setError(error);
//       throw error;
//     } finally {
//       setIsPending(false);
//     }
//   }, []);
//
//   return { mutate, isPending, error };
// }`);

  return builder.toString();
}
