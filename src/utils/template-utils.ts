import type { Tree } from "@nx/devkit"
import { generateFiles } from "@nx/devkit"
import * as path from "path"
import { createNamingVariants } from "./naming-utils"
import type { NamingVariants } from "./shared/types"

/**
 * Base template substitutions that all generators should include
 * Following Nx EJS template best practices
 */
export interface BaseTemplateSubstitutions extends NamingVariants {
  tmpl: "" // Standard Nx pattern for __tmpl__ removal
  name: string
  projectName: string
  projectRoot: string
  offsetFromRoot: string
  tags: string
}

/**
 * Generate template files with substitutions following Nx patterns
 * Uses EJS templating for variable substitution
 */
export function generateTemplateFiles<T extends BaseTemplateSubstitutions>(
  tree: Tree,
  templatePath: string,
  targetPath: string,
  substitutions: T
) {
  // Ensure tmpl is always empty string for __tmpl__ removal
  const finalSubstitutions: T & { tmpl: "" } = {
    ...substitutions,
    tmpl: ""
  }

  generateFiles(tree, templatePath, targetPath, finalSubstitutions)
}

/**
 * Create base substitutions object with common values
 */
export function createBaseSubstitutions(
  name: string,
  projectName: string,
  projectRoot: string,
  offsetFromRoot: string,
  tags: Array<string>
) {
  const nameVariations = createNamingVariants(name)

  const result: BaseTemplateSubstitutions = {
    ...nameVariations,
    tmpl: "",
    name,
    projectName,
    projectRoot,
    offsetFromRoot,
    tags: JSON.stringify(tags)
  }

  return result
}

/**
 * Clean up conditional template files based on options
 */
export function cleanupConditionalFiles(
  tree: Tree,
  projectRoot: string,
  filesToRemove: Array<string>
) {
  filesToRemove.forEach((file) => {
    const filePath = path.join(projectRoot, file)
    if (tree.exists(filePath)) {
      tree.delete(filePath)
    }
  })
}

/**
 * Get list of files to remove based on generator options
 */
export function getConditionalFilesToRemove(options: {
  includeClientServer?: boolean
  platform?: "node" | "browser" | "universal" | "edge"
  includePooling?: boolean
  [key: string]: unknown
}) {
  const filesToRemove = []

  // Only remove server.ts if not needed based on platform
  const shouldGenerateServer = options.includeClientServer ||
    options.platform === "node" ||
    options.platform === "universal"
  const shouldGenerateClient = options.includeClientServer ||
    options.platform === "browser" ||
    options.platform === "universal"

  if (!shouldGenerateServer) {
    filesToRemove.push("src/server.ts")
  }

  if (!shouldGenerateClient) {
    filesToRemove.push("src/client.ts")
  }

  // Remove pool-related files when pooling is disabled
  if (options.includePooling === false) {
    filesToRemove.push("src/lib/__tests__/pool.test.ts")
  }

  return filesToRemove
}

// Re-export TypeScriptBuilder from code-generation for convenience
export { TypeScriptBuilder } from "./code-generation/typescript-builder"
