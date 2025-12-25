/**
 * Feature Library Index Template
 *
 * Generates the main index.ts barrel export file for feature libraries.
 * This template follows TypeScript monorepo best practices (2025):
 * - Minimal barrel exports at library boundaries only
 * - Platform-specific code delegated to server.ts/client.ts/edge.ts
 * - Type-only exports for universal types
 *
 * @see docs/feature.md for feature library patterns
 * @see docs/NX_STANDARDS.md for export conventions
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import type { ExportSection } from "../../../utils/templates"
import { generateExportSections } from "../../../utils/templates"
import type { FeatureTemplateOptions } from "../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"

/**
 * Generate index.ts for feature library
 *
 * The main index.ts exports only universal types and errors.
 * Platform-specific implementations are exported from:
 * - server.ts (service, layers, RPC handlers)
 * - client.ts (hooks, atoms)
 * - edge.ts (middleware)
 *
 * This follows the principle: "Barrel files ONLY for library public APIs"
 * @see https://tkdodo.eu/blog/please-stop-using-barrel-files
 */
export function generateIndexFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className } = options
  const scope = WORKSPACE_CONFIG.getScope()

  // File header
  builder.addFileHeader({
    title: `${className} Feature Library`,
    description: `Public API for ${className} feature.

This is the main entry point for the feature library.
It exports only universal types and errors that are safe for all platforms.

Platform-specific exports:
  - import { ... } from '${scope}/feature-{name}/server'  # Server-side service
  - import { ... } from '${scope}/feature-{name}/client'  # Client-side hooks/atoms
  - import { ... } from '${scope}/feature-{name}/edge'    # Edge middleware

Best Practice: Use explicit platform imports to ensure proper tree-shaking
and avoid bundling server code in client bundles.`
  })

  builder.addBlankLine()

  // Core exports
  const coreExports: Array<ExportSection> = [
    {
      title: "Shared Types",
      items: [
        {
          comment: "Domain types (universal)",
          exports: "export type * from \"./lib/shared/types\";"
        }
      ]
    },
    {
      title: "Error Types",
      items: [
        {
          comment: "Error definitions (universal)",
          exports: "export type * from \"./lib/shared/errors\";"
        }
      ]
    }
  ]

  generateExportSections(builder, coreExports)

  // RPC exports (always prewired)
  builder.addBlankLine()
  builder.addSectionComment("RPC Definitions (Universal)")
  builder.addBlankLine()
  builder.addComment("RPC schemas are universal and can be used on any platform")
  builder.addRaw("export type * from \"./lib/rpc\";\n")

  // Platform export guidance
  builder.addBlankLine()
  builder.addComment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  builder.addComment("Platform-Specific Imports")
  builder.addComment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  builder.addComment("")
  builder.addComment("For platform-specific code, use explicit imports:")
  builder.addComment("")
  builder.addComment("SERVER (Node.js):")
  builder.addComment(
    `  import { ${className}Service } from '${scope}/feature-${toKebabCase(className)}/server';`
  )
  builder.addComment("")
  builder.addComment("CLIENT (Browser):")
  builder.addComment(
    `  import { use${className} } from '${scope}/feature-${toKebabCase(className)}/client';`
  )
  builder.addComment("")
  builder.addComment("EDGE (Cloudflare Workers, Vercel Edge):")
  builder.addComment(
    `  import { ${toLowerFirst(className)}Middleware } from '${scope}/feature-${toKebabCase(className)}/edge';`
  )
  builder.addComment("")
  builder.addComment("This pattern ensures:")
  builder.addComment("  ✓ No server code in client bundles")
  builder.addComment("  ✓ Optimal tree-shaking")
  builder.addComment("  ✓ Clear platform boundaries")
  builder.addComment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

  return builder.toString()
}

/**
 * Convert PascalCase to kebab-case
 */
function toKebabCase(str: string) {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
}

/**
 * Convert PascalCase to camelCase
 */
function toLowerFirst(str: string) {
  return str.charAt(0).toLowerCase() + str.slice(1)
}
