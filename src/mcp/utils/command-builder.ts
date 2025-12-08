/**
 * Command Builder Utility
 *
 * Builds appropriate generator command based on workspace type:
 * - Nx workspaces: Use `npx nx g`
 * - Other workspaces: Use CLI binary `mlg generate`
 */

import type { WorkspaceContext } from "./workspace-detector"

export type GeneratorType = "contract" | "data-access" | "feature" | "infra" | "provider"

/**
 * Build generator command based on workspace type
 *
 * @param workspace - Detected workspace context
 * @param generatorType - Type of generator to run
 * @param args - CLI arguments
 * @returns Command string to execute
 */
export const buildGeneratorCommand = (
  workspace: WorkspaceContext,
  generatorType: GeneratorType,
  args: Array<string>
) => {
  const isNx = workspace.type === "nx"

  if (isNx) {
    // Nx mode: Use nx generator
    return `npx nx g @samuelho-dev/monorepo-library-generator:${generatorType} ${args.join(" ")}`
  } else {
    // CLI mode: Use bundled CLI
    return `npx mlg generate ${generatorType} ${args.join(" ")}`
  }
}

/**
 * Get execution mode description for user feedback
 */
export const getExecutionMode = (workspace: WorkspaceContext) => {
  return workspace.type === "nx" ? "Nx Generator" : "CLI (Agnostic)"
}
