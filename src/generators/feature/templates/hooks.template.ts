/**
 * Hooks Template
 *
 * Generates client/hooks/use-{name}.ts file for feature libraries.
 *
 * @module monorepo-library-generator/feature/hooks-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { FeatureTemplateOptions } from '../../../utils/types';

/**
 * Generate client/hooks/use-{name}.ts file for feature library
 *
 * Creates React hook for client-side operations.
 */
export function generateHooksFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName, includeRPC, name, propertyName } = options;

  // Add file header
  builder.addFileHeader({
    title: `use${className} Hook`,
    description: `React hook for ${name} operations.`,
  });

  // Add imports
  builder.addImports([
    { from: '@effect-atom/atom-react', imports: ['useAtom'] },
    { from: `../atoms/${fileName}-atoms`, imports: [`${propertyName}Atom`] },
  ]);
  builder.addBlankLine();

  // Add hook function
  builder.addRaw(`export function use${className}() {
  const [state, setState] = useAtom(${propertyName}Atom);

  // TODO: Implement hook logic`);

  if (includeRPC) {
    builder.addRaw(`  // Consider using RPC client for server communication
  // import { ${className}RpcClient } from "../../rpc/client";`);
  }

  builder.addBlankLine();
  builder.addRaw(`  const exampleAction = async () => {
    setState({ ...state, isLoading: true });
    try {
      // TODO: Implement action
      setState({ ...state, isLoading: false, data: null });
    } catch (error) {
      setState({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return {
    ...state,
    exampleAction,
    // TODO: Add more methods
  };
}`);
  builder.addBlankLine();

  return builder.toString();
}
