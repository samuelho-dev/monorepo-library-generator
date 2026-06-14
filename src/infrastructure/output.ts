/**
 * Output Formatter
 *
 * Universal result formatting for all interfaces (MCP, CLI, Nx)
 *
 * @module monorepo-library-generator/infrastructure/output
 */

import type { GeneratorResult } from "../core/types"
import type { InterfaceType } from "./workspace"

type OutputResult = GeneratorResult & { readonly dryRun?: boolean }

// ============================================================================
// Types
// ============================================================================

/**
 * MCP Response Format
 *
 * Response format expected by MCP clients
 */
export interface McpResponse {
  readonly success: boolean
  readonly message: string
  readonly files?: ReadonlyArray<string>
  readonly nextSteps?: ReadonlyArray<string>
}

/**
 * Nx Generator Callback
 *
 * Nx generators return a callback function that runs after generation
 */
export type NxGeneratorCallback = () => void

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * Create summary message
 *
 * Generates a concise summary of what was created
 */
function createSummary(result: OutputResult) {
  const fileCount = result.filesGenerated.length
  const action = result.dryRun ? "Planned library" : "Successfully generated library"
  const filesLabel = result.dryRun ? "Files planned" : "Files created"
  return `${action}: ${result.projectName}

Package: ${result.packageName}
Location: ${result.projectRoot}
${filesLabel}: ${fileCount}`
}

/**
 * Format files list for display
 *
 * Creates formatted list of generated files
 */
function formatFilesList(files: ReadonlyArray<string>, dryRun: boolean) {
  const header = dryRun ? "Files planned:" : "Files created:"
  const filesList = files.map((f) => `  - ${f}`).join("\n")

  return `${header}\n${filesList}`
}

/**
 * Create next steps recommendations
 *
 * Generates actionable next steps based on what was generated
 */
function createNextSteps(result: OutputResult) {
  const steps: Array<string> = []

  // Determine library type from project name
  const libraryType = result.projectName.startsWith("data-access-")
    ? "data-access"
    : result.projectName.split("-")[0]

  switch (libraryType) {
    case "contract":
      steps.push("Implement the declared contract roles under src/lib")
      break

    case "data-access":
      steps.push("Implement domain operations in the generated services under src/lib")
      steps.push("Extend the colocated test harness with realistic state")
      break

    case "feature":
      steps.push("Implement each capability service under src/lib/server/services")
      steps.push("Compose library layers in src/lib/server/router.ts")
      break

    case "provider":
      steps.push("Implement external clients in the generated services under src/lib")
      steps.push("Replace the baseline Test layer with a domain-specific fake")
      break

    case "infra":
      steps.push("Implement infrastructure capabilities in the generated services under src/lib")
      steps.push("Configure production resources in the Live layer")
      break

    default:
      steps.push("Review generated files")
      steps.push("Customize to your needs")
  }

  // Common steps for all library types
  steps.push("Run: pnpm install")
  steps.push(`Typecheck: pnpm nx typecheck ${result.projectName}`)
  steps.push(`Test: nx test ${result.projectName}`)

  return steps
}

/**
 * Format next steps for display
 *
 * Creates formatted next steps list
 */
function formatNextSteps(steps: ReadonlyArray<string>) {
  const header = "Next steps:"
  const stepsList = steps.map((step, i) => `  ${i + 1}. ${step}`).join("\n")

  return `${header}\n${stepsList}`
}

/**
 * Format as MCP response
 *
 * Creates structured response for MCP clients
 */
function formatMcpResponse(result: OutputResult) {
  const summary = createSummary(result)
  const nextSteps = createNextSteps(result)

  return {
    success: true,
    message: `${summary}\n\n${formatNextSteps(nextSteps)}`,
    files: result.filesGenerated,
    nextSteps
  }
}

/**
 * Format as CLI output
 *
 * Creates human-readable output for command-line interface
 */
function formatCliOutput(result: OutputResult) {
  const summary = createSummary(result)
  const filesList = formatFilesList(result.filesGenerated, result.dryRun ?? false)
  const nextSteps = formatNextSteps(createNextSteps(result))

  return `
${summary}

${filesList}

${nextSteps}
  `.trim()
}

/**
 * Format as Nx generator callback
 *
 * Creates callback function that Nx executes after generation
 */
function formatNxCallback() {
  return () => {
    // Callback for Nx post-generation
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Format generator result for specific interface
 *
 * Takes a GeneratorResult and formats it appropriately for the calling interface:
 * - MCP: Returns McpResponse with success/message/files
 * - CLI: Returns formatted string with file list and next steps
 * - Nx: Returns callback function that logs summary
 *
 * @param result - Generator result from core generator
 * @param interfaceType - Which interface is requesting the format
 * @returns Formatted output appropriate for the interface
 *
 * @example
 * ```typescript
 * // MCP handler
 * const mcpResponse = formatOutput(result, "mcp")
 * // => { success: true, message: "...", files: [...] }
 *
 * // CLI command
 * const cliOutput = formatOutput(result, "cli")
 * // => "✅ Successfully generated contract library: contract-user\n\n..."
 *
 * // Nx generator
 * const nxCallback = formatOutput(result, "nx")
 * // => () => console.log("...")
 * ```
 */
export function formatOutput(result: OutputResult, interfaceType: InterfaceType) {
  switch (interfaceType) {
    case "mcp":
      return formatMcpResponse(result)

    case "cli":
      return formatCliOutput(result)

    case "nx":
      return formatNxCallback()

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = interfaceType
      throw new Error(`Unknown interface type: ${_exhaustive}`)
    }
  }
}

/**
 * Helper: Format error for MCP response
 *
 * Creates MCP error response from Error object
 */
export function formatErrorResponse(error: Error) {
  return {
    success: false,
    message: `Generation failed: ${error.message}`,
    files: []
  }
}

/**
 * Helper: Format validation error
 *
 * Creates formatted validation error message
 */
export function formatValidationError(errorMessage: string) {
  return `Validation error:\n\n${errorMessage}`
}
