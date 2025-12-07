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

  // Resource Management Documentation
  builder.addRaw("// ".repeat(38))
  builder.addRaw("// Resource Management")
  builder.addRaw("// ".repeat(38))
  builder.addRaw("//")
  builder.addRaw("// This template uses Layer.scoped + Effect.addFinalizer for cleanup.")
  builder.addRaw("//")
  builder.addRaw("// For complex resources (pools, connections), use Effect.acquireRelease:")
  builder.addRaw("//   const resource = yield* Effect.acquireRelease(")
  builder.addRaw("//     Effect.tryPromise(() => SDK.connect(config)),  // acquire")
  builder.addRaw("//     (r) => Effect.sync(() => r.close())             // release")
  builder.addRaw("//   );")
  builder.addRaw("//")
  builder.addRaw("// See EFFECT_PATTERNS.md for complete examples")
  builder.addRaw("//")
  builder.addRaw("// ".repeat(38))
  builder.addBlankLine()

  // Runtime Preservation Documentation
  builder.addRaw("// ".repeat(38))
  builder.addRaw("// Runtime Preservation (for Event-Driven SDKs)")
  builder.addRaw("// ".repeat(38))
  builder.addRaw("//")
  builder.addRaw("// If your SDK uses callbacks (EventEmitter, WebSocket, streams), you MUST")
  builder.addRaw("// preserve the Effect runtime. See EFFECT_PATTERNS.md lines 1779+ for complete guide.")
  builder.addRaw("//")
  builder.addRaw("// WHEN REQUIRED:")
  builder.addRaw("// - Event emitters: client.on('event', callback)")
  builder.addRaw("// - WebSocket handlers: ws.on('message', callback)")
  builder.addRaw("// - Stream processors: stream.on('data', callback)")
  builder.addRaw("// - Timers/intervals: setInterval(callback, ms)")
  builder.addRaw("//")
  builder.addRaw("// NOT REQUIRED:")
  builder.addRaw("// - Promise-based SDKs (use Effect.tryPromise)")
  builder.addRaw("// - Synchronous functions")
  builder.addRaw("// - SDKs with async/await APIs")
  builder.addRaw("//")
  builder.addRaw("// Example pattern:")
  builder.addRaw("//")
  builder.addRaw(`// export const ${className}Live = Layer.scoped(`)
  builder.addRaw(`//   ${className},`)
  builder.addRaw("//   Effect.gen(function* () {")
  builder.addRaw("//     const runtime = yield* Effect.runtime(); // Capture runtime")
  builder.addRaw("//     const logger = yield* LoggingService;")
  builder.addRaw("//")
  builder.addRaw("//     const client = new EventEmitterSDK();")
  builder.addRaw("//")
  builder.addRaw("//     client.on('event', (data) => {")
  builder.addRaw("//       Runtime.runFork(runtime)(")
  builder.addRaw("//         Effect.gen(function* () {")
  builder.addRaw("//           yield* logger.info('Event received', data);")
  builder.addRaw("//           // All services available here")
  builder.addRaw("//         })")
  builder.addRaw("//       );")
  builder.addRaw("//     });")
  builder.addRaw("//")
  builder.addRaw("//     yield* Effect.addFinalizer(() =>")
  builder.addRaw("//       Effect.sync(() => client.close())")
  builder.addRaw("//     );")
  builder.addRaw("//")
  builder.addRaw(`//     return ${className}.make(client, config);`)
  builder.addRaw("//   })")
  builder.addRaw("// );")
  builder.addRaw("//")
  builder.addRaw("// ".repeat(38))
  builder.addBlankLine()

  // Live Layer
  builder.addRaw("/**")
  builder.addRaw(" * Live Layer - Production environment")
  builder.addRaw(" *")
  builder.addRaw(" * Uses Layer.effect for dependency injection without cleanup.")
  builder.addRaw(" * Most SDKs (Stripe, OpenAI, Resend) don't need resource cleanup.")
  builder.addRaw(" *")
  builder.addRaw(" * WHEN TO USE Layer.scoped INSTEAD:")
  builder.addRaw(" * - Database connection pools (pg, mysql2) - needs pool.end()")
  builder.addRaw(" * - WebSocket connections - needs ws.close()")
  builder.addRaw(" * - File handles - needs fd.close()")
  builder.addRaw(" * - Long-lived connections requiring cleanup")
  builder.addRaw(" *")
  builder.addRaw(" * See commented example below for Layer.scoped pattern.")
  builder.addRaw(" * See EFFECT_PATTERNS.md lines 300-338 for decision tree.")
  builder.addRaw(" */")
  builder.addRaw(`export const ${className}Live = Layer.effect(`)
  builder.addRaw(`  ${className},`)
  builder.addRaw("  Effect.gen(function* () {")
  builder.addRaw(`    const config: ${className}Config = {`)
  builder.addRaw(`      apiKey: env.${projectConstantName}_API_KEY,`)
  builder.addRaw(`      timeout: env.${projectConstantName}_TIMEOUT || 20000,`)
  builder.addRaw("    };")
  builder.addBlankLine()
  builder.addRaw(`    const client = create${className}Client(config);`)
  builder.addBlankLine()
  builder.addRaw(`    return ${className}.make(client, config);`)
  builder.addRaw("  }),")
  builder.addRaw(");")
  builder.addBlankLine()

  // Add Layer.scoped alternative as commented example
  builder.addRaw("// ".repeat(38))
  builder.addRaw("// Alternative: Layer.scoped (for SDKs requiring cleanup)")
  builder.addRaw("// ".repeat(38))
  builder.addRaw("//")
  builder.addRaw("// Use this pattern if your SDK has cleanup methods (close, disconnect, end).")
  builder.addRaw("// Examples: Database pools, WebSocket connections, file handles")
  builder.addRaw("//")
  builder.addRaw(`// export const ${className}Live = Layer.scoped(`)
  builder.addRaw(`//   ${className},`)
  builder.addRaw("//   Effect.gen(function* () {")
  builder.addRaw(`//     const config: ${className}Config = {`)
  builder.addRaw(`//       apiKey: env.${projectConstantName}_API_KEY,`)
  builder.addRaw(`//       timeout: env.${projectConstantName}_TIMEOUT || 20000,`)
  builder.addRaw("//     };")
  builder.addRaw("//")
  builder.addRaw(`//     const client = create${className}Client(config);`)
  builder.addRaw("//")
  builder.addRaw("//     // Register cleanup function")
  builder.addRaw("//     yield* Effect.addFinalizer(() =>")
  builder.addRaw("//       Effect.sync(() => {")
  builder.addRaw("//         // Example cleanup calls:")
  builder.addRaw("//         // client.close()")
  builder.addRaw("//         // client.disconnect()")
  builder.addRaw("//         // pool.end()")
  builder.addRaw(`//         console.log(\`[${className}] Cleaning up client resources\`);`)
  builder.addRaw("//       }),")
  builder.addRaw("//     );")
  builder.addRaw("//")
  builder.addRaw(`//     return ${className}.make(client, config);`)
  builder.addRaw("//   }),")
  builder.addRaw("// );")
  builder.addRaw("//")
  builder.addRaw("// ".repeat(38))
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
  builder.addRaw(" * Same as Live but with debug logging or relaxed validation.")
  builder.addRaw(" * Uses Layer.effect (no cleanup needed for most SDKs).")
  builder.addRaw(" */")
  builder.addRaw(`export const ${className}Dev = Layer.effect(`)
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
  builder.addRaw(`    console.log(\`[${className}] [DEV] Development layer initialized\`);`)
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
  builder.addRaw(" * Uses Layer.suspend for lazy evaluation - the layer is selected at runtime")
  builder.addRaw(" * when the layer is first used, not at module import time.")
  builder.addRaw(" */")
  builder.addRaw(`export const ${className}Auto = Layer.suspend(() => {`)
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
  builder.addRaw("});")
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
