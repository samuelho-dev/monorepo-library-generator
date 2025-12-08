export const generateProviderConsolidationLayersTemplate = (options: {
  providers: string[]
  packageName: string
}) => {
  const workspaceName = options.packageName.split("/")[0]
  const imports = options.providers
    .map(p => {
      const className = toClassName(p)
      return `import { ${className}Live } from "${workspaceName}/provider-${p}"`
    })
    .join("\n")

  const layerMerge = options.providers
    .map(p => `  ${toClassName(p)}Live`)
    .join(",\n")

  return `/**
 * Consolidated Infrastructure Layers
 *
 * Combines all cluster providers into unified layer
 */

import { Layer } from "effect"
${imports}

/**
 * Cluster infrastructure live layer
 *
 * Provides all cluster-related providers in a single layer
 *
 * Usage:
 * \`\`\`typescript
 * const program = Effect.gen(function* () {
 *   const kubectl = yield* Kubectl
 *   const talos = yield* Talos
 *   // ... use providers
 * }).pipe(Effect.provide(ClusterInfrastructureLive))
 * \`\`\`
 */
export const ClusterInfrastructureLive = Layer.mergeAll(
${layerMerge}
)
`
}

const toClassName = (name: string): string => {
  return name
    .split("-")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
}
