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

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { ProviderTemplateOptions } from "../../../utils/shared/types"

/**
 * Generate layers.ts file for provider library
 *
 * Creates Layer implementations for different environments.
 *
 * @param options - Provider template options
 * @returns Generated TypeScript code
 */
export function generateLayersFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const {
    className,
    constantName: projectConstantName,
    name: projectClassName
  } = options

  // File header
  builder.addRaw("/**")
  builder.addRaw(` * ${projectClassName} - Layer Implementations`)
  builder.addRaw(" *")
  builder.addRaw(" * CRITICAL: Choose correct Layer type")
  builder.addRaw(" * Reference: provider.md lines 1548-1587")
  builder.addRaw(" *")
  builder.addRaw(" * Layer Selection Guide:")
  builder.addRaw(" * 1. Layer.succeed - Test/mock data (immediate value)")
  builder.addRaw(" * 2. Layer.sync - Pure sync functions (no async, no deps)")
  builder.addRaw(" * 3. Layer.effect - Async with dependencies")
  builder.addRaw(" * 4. Layer.scoped - Needs cleanup/release")
  builder.addRaw(" */")
  builder.addBlankLine()

  // Imports
  builder.addImport("effect", "Layer")
  builder.addImport("effect", "Effect")
  builder.addImport("@custom-repo/infra-env", "env")
  builder.addImport("./service", className)
  builder.addImport("./service", `create${className}Client`)
  builder.addImport("./service", `${className}Config`, true)
  builder.addBlankLine()

  // Live Layer
  builder.addRaw("/**")
  builder.addRaw(" * Live Layer - Production environment")
  builder.addRaw(" *")
  builder.addRaw(" * Uses Layer.scoped for proper resource management:")
  builder.addRaw(" * - Ensures client cleanup on scope exit")
  builder.addRaw(" * - Prevents resource leaks (connections, file handles, etc.)")
  builder.addRaw(" * - Handles graceful shutdown")
  builder.addRaw(" *")
  builder.addRaw(
    " * Configuration: Uses @custom-repo/infra-env for environment variable access"
  )
  builder.addRaw(" *")
  builder.addRaw(
    " * TODO: Implement release function if your SDK has cleanup methods (e.g., client.close(), client.disconnect())"
  )
  builder.addRaw(
    " * TODO: If your SDK has truly no resources to clean up, you can simplify to Layer.sync"
  )
  builder.addRaw(" */")
  builder.addRaw(`export const ${className}Live = Layer.scoped(`)
  builder.addRaw(`  ${className},`)
  builder.addRaw("  Effect.gen(function* () {")
  builder.addRaw(`    const config: ${className}Config = {`)
  builder.addRaw(`      apiKey: env.${projectConstantName}_API_KEY,`)
  builder.addRaw(`      timeout: env.${projectConstantName}_TIMEOUT || 20000,`)
  builder.addRaw("    };")
  builder.addBlankLine()
  builder.addRaw(`    const client = create${className}Client(config);`)
  builder.addBlankLine()
  builder.addRaw("    // Register cleanup function")
  builder.addRaw("    yield* Effect.addFinalizer(() =>")
  builder.addRaw("      Effect.sync(() => {")
  builder.addRaw("        // TODO: Add cleanup logic here if your SDK provides it")
  builder.addRaw("        // Example: client.close(), client.disconnect(), etc.")
  builder.addRaw(`        console.log(\`[${className}] Cleaning up client resources\`);`)
  builder.addRaw("      }),")
  builder.addRaw("    );")
  builder.addBlankLine()
  builder.addRaw(`    return ${className}.make(client, config);`)
  builder.addRaw("  }),")
  builder.addRaw(");")
  builder.addBlankLine()

  // Test Layer
  builder.addRaw("/**")
  builder.addRaw(" * Test Layer - Testing environment")
  builder.addRaw(" *")
  builder.addRaw(" * Uses Layer.succeed for mock data")
  builder.addRaw(" */")
  builder.addRaw(`export const ${className}Test = Layer.succeed(`)
  builder.addRaw(`  ${className},`)
  builder.addRaw(`  ${className}.make(`)
  builder.addRaw("    // Mock client")
  builder.addRaw("    {")
  builder.addRaw(
    "      healthCheck: () => Promise.resolve({ status: \"healthy\" }),"
  )
  builder.addRaw("    },")
  builder.addRaw("    {")
  builder.addRaw("      apiKey: \"test_key\",")
  builder.addRaw("      timeout: 1000,")
  builder.addRaw("    },")
  builder.addRaw("  ),")
  builder.addRaw(");")
  builder.addBlankLine()

  // Dev Layer
  builder.addRaw("/**")
  builder.addRaw(" * Dev Layer - Development environment")
  builder.addRaw(" *")
  builder.addRaw(
    " * Same as Live but with debug logging or relaxed validation"
  )
  builder.addRaw(" */")
  builder.addRaw(`export const ${className}Dev = Layer.scoped(`)
  builder.addRaw(`  ${className},`)
  builder.addRaw("  Effect.gen(function* () {")
  builder.addRaw(`    const config: ${className}Config = {`)
  builder.addRaw(
    `      apiKey: env.${projectConstantName}_API_KEY || "dev_key",`
  )
  builder.addRaw("      timeout: 30000, // Longer timeout for dev")
  builder.addRaw("    };")
  builder.addBlankLine()
  builder.addRaw(`    const client = create${className}Client(config);`)
  builder.addBlankLine()
  builder.addRaw("    // Register cleanup function")
  builder.addRaw("    yield* Effect.addFinalizer(() =>")
  builder.addRaw("      Effect.sync(() => {")
  builder.addRaw(`        console.log(\`[${className}] [DEV] Cleaning up client resources\`);`)
  builder.addRaw("        // TODO: Add cleanup logic")
  builder.addRaw("      }),")
  builder.addRaw("    );")
  builder.addBlankLine()
  builder.addRaw(`    return ${className}.make(client, config);`)
  builder.addRaw("  }),")
  builder.addRaw(");")
  builder.addBlankLine()

  // Auto Layer
  builder.addRaw("/**")
  builder.addRaw(" * Auto Layer - Automatic environment detection")
  builder.addRaw(" *")
  builder.addRaw(" * Selects appropriate layer based on NODE_ENV.")
  builder.addRaw(" * Uses IIFE for immediate evaluation (not Layer.suspend).")
  builder.addRaw(" */")
  builder.addRaw(`export const ${className}Auto = (() => {`)
  builder.addRaw("  const nodeEnv = env.NODE_ENV;")
  builder.addBlankLine()
  builder.addRaw("  switch (nodeEnv) {")
  builder.addRaw("    case \"production\":")
  builder.addRaw(`      return ${className}Live;`)
  builder.addRaw("    case \"development\":")
  builder.addRaw(`      return ${className}Dev;`)
  builder.addRaw("    case \"test\":")
  builder.addRaw(`      return ${className}Test;`)
  builder.addRaw("    default:")
  builder.addRaw(`      return ${className}Dev;`)
  builder.addRaw("  }")
  builder.addRaw("})();")
  builder.addBlankLine()

  // Custom layer factory
  builder.addFunction({
    name: `make${className}Layer`,
    exported: true,
    jsdoc:
      `make${className}Layer - Custom layer factory\n\nUse this to create a layer with custom configuration\n\nExample:\n\`\`\`typescript\nconst customLayer = make${className}Layer({\n  apiKey: "custom_key",\n  timeout: 5000,\n});\n\`\`\``,
    params: [{ name: "config", type: `${className}Config` }],
    body: `return Layer.scoped(
  ${className},
  Effect.gen(function* () {
    const client = create${className}Client(config);

    // Register cleanup function
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        console.log(\`[${className}] [CUSTOM] Cleaning up client resources\`);
        // TODO: Add cleanup logic
      }),
    );

    return ${className}.make(client, config);
  }),
);`
  })

  return builder.toString()
}
