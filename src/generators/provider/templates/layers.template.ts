/**
 * Provider Generator - Layers Template
 *
 * Generates Layer implementations for provider libraries.
 * Provides Live, Dev, Test, and Auto layers for different environments.
 *
 * Layer Selection Guide:
 * 1. Layer.succeed - Test/mock data (immediate value)
 * 2. Layer.sync - Pure sync functions (no async, no deps)
 * 3. Layer.effect - Async with dependencies
 * 4. Layer.scoped - Needs cleanup/release
 *
 * @module monorepo-library-generator/provider/templates/layers
 */

import { TypeScriptBuilder } from '../../../utils/code-generation/typescript-builder';
import type { ProviderTemplateOptions } from '../../../utils/shared/types';

/**
 * Generate layers.ts file for provider library
 *
 * Creates Layer implementations for different environments.
 *
 * @param options - Provider template options
 * @returns Generated TypeScript code
 */
export function generateLayersFile(options: ProviderTemplateOptions): string {
  const builder = new TypeScriptBuilder();
  const {
    className,
    constantName: projectConstantName,
    name: projectClassName,
  } = options;

  // File header
  builder.addRaw('/**');
  builder.addRaw(` * ${projectClassName} - Layer Implementations`);
  builder.addRaw(' *');
  builder.addRaw(' * CRITICAL: Choose correct Layer type');
  builder.addRaw(' * Reference: provider.md lines 1548-1587');
  builder.addRaw(' *');
  builder.addRaw(' * Layer Selection Guide:');
  builder.addRaw(' * 1. Layer.succeed - Test/mock data (immediate value)');
  builder.addRaw(' * 2. Layer.sync - Pure sync functions (no async, no deps)');
  builder.addRaw(' * 3. Layer.effect - Async with dependencies');
  builder.addRaw(' * 4. Layer.scoped - Needs cleanup/release');
  builder.addRaw(' */');
  builder.addBlankLine();

  // Imports
  builder.addImport('effect', 'Layer');
  builder.addImport('effect', 'Effect');
  builder.addImport('@custom-repo/infra-env', 'env');
  builder.addImport('./service', className);
  builder.addImport('./service', `create${className}Client`);
  builder.addImport('./service', `${className}Config`, true);
  builder.addBlankLine();

  // Live Layer
  builder.addRaw('/**');
  builder.addRaw(' * Live Layer - Production environment');
  builder.addRaw(' *');
  builder.addRaw(' * Uses Layer.sync because:');
  builder.addRaw(' * - Client creation is synchronous');
  builder.addRaw(' * - No cleanup needed');
  builder.addRaw(' * - No async initialization');
  builder.addRaw(' *');
  builder.addRaw(
    ' * Configuration: Uses @custom-repo/infra-env for environment variable access',
  );
  builder.addRaw(' *');
  builder.addRaw(
    ' * TODO: If your SDK requires async initialization, use Layer.effect instead',
  );
  builder.addRaw(
    ' * TODO: If your SDK needs cleanup (e.g., connection pooling), use Layer.scoped with Effect.acquireRelease',
  );
  builder.addRaw(' */');
  builder.addRaw(`export const ${className}Live = Layer.sync(`);
  builder.addRaw(`  ${className},`);
  builder.addRaw('  () => {');
  builder.addRaw(`    const config: ${className}Config = {`);
  builder.addRaw(`      apiKey: env.${projectConstantName}_API_KEY,`);
  builder.addRaw(`      timeout: env.${projectConstantName}_TIMEOUT || 20000,`);
  builder.addRaw('    };');
  builder.addBlankLine();
  builder.addRaw(`    const client = create${className}Client(config);`);
  builder.addRaw(`    return ${className}.make(client, config);`);
  builder.addRaw('  },');
  builder.addRaw(');');
  builder.addBlankLine();

  // Dev Layer
  builder.addRaw('/**');
  builder.addRaw(' * Dev Layer - Development environment');
  builder.addRaw(' *');
  builder.addRaw(
    ' * Same as Live but with debug logging or relaxed validation',
  );
  builder.addRaw(' */');
  builder.addRaw(`export const ${className}Dev = Layer.sync(`);
  builder.addRaw(`  ${className},`);
  builder.addRaw('  () => {');
  builder.addRaw(`    const config: ${className}Config = {`);
  builder.addRaw(
    `      apiKey: env.${projectConstantName}_API_KEY || "dev_key",`,
  );
  builder.addRaw('      timeout: 30000, // Longer timeout for dev');
  builder.addRaw('    };');
  builder.addBlankLine();
  builder.addRaw(`    const client = create${className}Client(config);`);
  builder.addRaw(`    return ${className}.make(client, config);`);
  builder.addRaw('  },');
  builder.addRaw(');');
  builder.addBlankLine();

  // Test Layer
  builder.addRaw('/**');
  builder.addRaw(' * Test Layer - Testing environment');
  builder.addRaw(' *');
  builder.addRaw(' * Uses Layer.succeed for mock data');
  builder.addRaw(' */');
  builder.addRaw(`export const ${className}Test = Layer.succeed(`);
  builder.addRaw(`  ${className},`);
  builder.addRaw(`  ${className}.make(`);
  builder.addRaw('    // Mock client');
  builder.addRaw('    {');
  builder.addRaw(
    '      healthCheck: () => Promise.resolve({ status: "healthy" as const }),',
  );
  builder.addRaw('    },');
  builder.addRaw('    {');
  builder.addRaw('      apiKey: "test_key",');
  builder.addRaw('      timeout: 1000,');
  builder.addRaw('    },');
  builder.addRaw('  ),');
  builder.addRaw(');');
  builder.addBlankLine();

  // Auto Layer
  builder.addRaw('/**');
  builder.addRaw(' * Auto Layer - Automatic environment detection');
  builder.addRaw(' *');
  builder.addRaw(' * Selects appropriate layer based on NODE_ENV');
  builder.addRaw(' */');
  builder.addRaw(`export const ${className}Auto = Layer.suspend(() => {`);
  builder.addRaw('  const nodeEnv = env.NODE_ENV;');
  builder.addBlankLine();
  builder.addRaw('  switch (nodeEnv) {');
  builder.addRaw('    case "production":');
  builder.addRaw(`      return ${className}Live;`);
  builder.addRaw('    case "development":');
  builder.addRaw(`      return ${className}Dev;`);
  builder.addRaw('    case "test":');
  builder.addRaw(`      return ${className}Test;`);
  builder.addRaw('    default:');
  builder.addRaw(`      return ${className}Dev;`);
  builder.addRaw('  }');
  builder.addRaw('});');
  builder.addBlankLine();

  // Custom layer factory
  builder.addFunction({
    name: `make${className}Layer`,
    exported: true,
    jsdoc: `make${className}Layer - Custom layer factory\n\nUse this to create a layer with custom configuration\n\nExample:\n\`\`\`typescript\nconst customLayer = make${className}Layer({\n  apiKey: "custom_key",\n  timeout: 5000,\n});\n\`\`\``,
    params: [{ name: 'config', type: `${className}Config` }],
    returnType: `Layer.Layer<${className}>`,
    body: `return Layer.sync(${className}, () => {
  const client = create${className}Client(config);
  return ${className}.make(client, config);
});`,
  });

  return builder.toString();
}
