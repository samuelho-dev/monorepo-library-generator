/**
 * Provider Library Index Template
 *
 * Generates the main index.ts barrel export file for provider libraries.
 * Provider libraries wrap external SDKs/services in Effect-based interfaces.
 *
 * @see docs/provider.md for provider library patterns
 * @see docs/NX_STANDARDS.md for export conventions
 */

import {
  type ExportSection,
  generateExportSections,
  generateStandardErrorExports
} from "../../../utils/code-generation/barrel-exports"
import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { ProviderTemplateOptions } from "../../../utils/shared/types"

/**
 * Generate index.ts for provider library
 *
 * Provider libraries export:
 * - Service interface (Context.Tag)
 * - Type definitions
 * - Error types
 * - Layer implementations (Live, Test)
 * - Validation utilities
 *
 * This follows Effect-TS patterns for external service adapters.
 */
export function generateIndexFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, packageName } = options

  // File header
  builder.addFileHeader({
    title: `${className} Provider Library`,
    description: `External service adapter for ${className}.

This library provides an Effect-based adapter for the ${className} external service.
It wraps the external SDK in Effect types for composable error handling.

Effect 3.0+ Pattern:
  - ${className} extends Context.Tag
  - Access layers via static members: ${className}.Live, ${className}.Test

Usage:
  import { ${className} } from '${packageName}';
  const layer = ${className}.Live;`
  })

  builder.addBlankLine()

  // Error exports using standard utility
  builder.addSectionComment("Error Types")
  builder.addBlankLine()
  builder.addRaw(
    generateStandardErrorExports({
      className,
      importPath: "./lib/errors",
      unionTypeSuffix: "ServiceError"
    })
  )

  builder.addBlankLine()

  // Type exports
  const typeExports: Array<ExportSection> = [
    {
      title: "Type Definitions",
      items: [
        {
          comment: "Service types and interfaces",
          exports: "export type * from \"./lib/types\";"
        }
      ]
    }
  ]

  generateExportSections(builder, typeExports)

  builder.addBlankLine()

  // Service and layers exports
  builder.addSectionComment("Service Implementation")
  builder.addBlankLine()

  builder.addComment(`${className} - External service adapter`)
  builder.addComment("")
  builder.addComment("Effect 3.0+ Pattern: Context.Tag with static layer members")
  builder.addComment("Access layers via static members:")
  builder.addComment(`  - ${className}.Live  (production - wraps real SDK)`)
  builder.addComment(`  - ${className}.Test  (testing - mock implementation)`)
  builder.addComment("")
  builder.addComment("Migration from pre-3.0 pattern:")
  builder.addComment(`  OLD: import { ${className}Live } from '...';`)
  builder.addComment(`  NEW: import { ${className} } from '...';`)
  builder.addComment(`       const layer = ${className}.Live;`)
  builder.addBlankLine()

  builder.addRaw("export { " + className + " } from \"./lib/service\";\n")

  builder.addBlankLine()

  // Validation utilities
  builder.addSectionComment("Validation Utilities")
  builder.addBlankLine()
  builder.addComment("Input validation functions")
  builder.addRaw("export * from \"./lib/validation\";\n")

  builder.addBlankLine()

  // Layer exports
  builder.addSectionComment("Layer Compositions")
  builder.addBlankLine()
  builder.addComment("Pre-wired layer compositions with dependencies")
  builder.addComment("Use these if you want automatic dependency wiring:")
  builder.addComment(`  - ${className}Live  (production layer with dependencies)`)
  builder.addComment(`  - ${className}Test  (test layer with mocks)`)
  builder.addComment(`  - ${className}Auto  (automatic selection based on NODE_ENV)`)
  builder.addBlankLine()
  builder.addRaw("export * from \"./lib/layers\";\n")

  builder.addBlankLine()

  // Usage example
  builder.addComment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  builder.addComment("Usage Example")
  builder.addComment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  builder.addComment("")
  builder.addComment("import { Effect, Layer } from 'effect';")
  builder.addComment(`import { ${className}, ${className}Live } from '${packageName}';`)
  builder.addComment("")
  builder.addComment("const program = Effect.gen(function* () {")
  builder.addComment(`  const service = yield* ${className};`)
  builder.addComment("  // Use service methods...")
  builder.addComment("});")
  builder.addComment("")
  builder.addComment(`const runnable = program.pipe(Effect.provide(${className}Live));`)
  builder.addComment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

  return builder.toString()
}
