/**
 * Output Formatter
 *
 * Universal result formatting for all interfaces (MCP, CLI, Nx)
 *
 * @module monorepo-library-generator/infrastructure/output/formatter
 */

import type { GeneratorResult } from "../execution/types"
import type { InterfaceType } from "../workspace/types"

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
export function formatOutput(
  result: GeneratorResult,
  interfaceType: InterfaceType
): McpResponse | string | NxGeneratorCallback {
  switch (interfaceType) {
    case "mcp":
      return formatMcpResponse(result)

    case "cli":
      return formatCliOutput(result)

    case "nx":
      return formatNxCallback(result)

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = interfaceType
      throw new Error(`Unknown interface type: ${_exhaustive}`)
    }
  }
}

/**
 * Format as MCP response
 *
 * Creates structured response for MCP clients
 */
function formatMcpResponse(result: GeneratorResult): McpResponse {
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
function formatCliOutput(result: GeneratorResult): string {
  const summary = createSummary(result)
  const filesList = formatFilesList(result.filesGenerated)
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
function formatNxCallback(result: GeneratorResult): NxGeneratorCallback {
  return () => {
    const summary = createSummary(result)
    console.log(summary)
  }
}

/**
 * Create summary message
 *
 * Generates a concise summary of what was created
 */
function createSummary(result: GeneratorResult): string {
  const fileCount = result.filesGenerated.length
  return `✅ Successfully generated library: ${result.projectName}

📦 Package: ${result.packageName}
📂 Location: ${result.projectRoot}
📄 Files created: ${fileCount}`
}

/**
 * Format files list for display
 *
 * Creates formatted list of generated files
 */
function formatFilesList(files: ReadonlyArray<string>): string {
  const header = "Files created:"
  const filesList = files.map((f) => `  - ${f}`).join("\n")

  return `${header}\n${filesList}`
}

/**
 * Create next steps recommendations
 *
 * Generates actionable next steps based on what was generated
 */
function createNextSteps(result: GeneratorResult): ReadonlyArray<string> {
  const steps: Array<string> = []

  // Determine library type from project name
  const libraryType = result.projectName.split("-")[0]

  switch (libraryType) {
    case "contract":
      steps.push("Update entity schemas in lib/entities.ts")
      steps.push("Define repository interfaces in lib/ports.ts")
      steps.push("Add domain-specific error types in lib/errors.ts")
      break

    case "data-access":
      steps.push("Implement repository operations in lib/repository/operations/")
      steps.push("Configure database connection in lib/server/layers.ts")
      steps.push("Add Kysely query builders in lib/queries.ts")
      break

    case "feature":
      steps.push("Implement business logic in lib/service/")
      steps.push("Add client-side state management if needed")
      steps.push("Wire up dependencies in lib/layers.ts")
      break

    case "provider":
      steps.push("Implement service operations in lib/service/operations/")
      steps.push("Configure external API client")
      steps.push("Add error handling and retry logic")
      break

    case "infra":
      steps.push("Implement client interface")
      steps.push("Add server-side implementation")
      steps.push("Configure infrastructure-specific options")
      break

    default:
      steps.push("Review generated files")
      steps.push("Customize to your needs")
  }

  // Common steps for all library types
  steps.push(`Run: pnpm install`)
  steps.push(`Build: nx build ${result.projectName}`)
  steps.push(`Test: nx test ${result.projectName}`)

  return steps
}

/**
 * Format next steps for display
 *
 * Creates formatted next steps list
 */
function formatNextSteps(steps: ReadonlyArray<string>): string {
  const header = "Next steps:"
  const stepsList = steps.map((step, i) => `  ${i + 1}. ${step}`).join("\n")

  return `${header}\n${stepsList}`
}

/**
 * Helper: Format error for MCP response
 *
 * Creates MCP error response from Error object
 */
export function formatErrorResponse(error: Error): McpResponse {
  return {
    success: false,
    message: `❌ Generation failed: ${error.message}`,
    files: []
  }
}

/**
 * Helper: Format validation error
 *
 * Creates formatted validation error message
 */
export function formatValidationError(errorMessage: string): string {
  return `❌ Validation Error:\n\n${errorMessage}\n\n💡 Check your input parameters and try again.`
}
