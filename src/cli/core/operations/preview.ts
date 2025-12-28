/**
 * Preview Operations
 *
 * File preview generation for the TUI.
 *
 * @module monorepo-library-generator/cli/core/operations/preview
 */

import type { FilePreview, GeneratorOptions, LibraryType } from '../types'

/**
 * Base files generated for all library types
 */
function getBaseFiles(isNx: boolean): FilePreview[] {
  const files: FilePreview[] = [
    { path: 'package.json', description: 'Package manifest' },
    { path: 'tsconfig.json', description: 'TypeScript configuration' },
    { path: 'tsconfig.lib.json', description: 'Library TypeScript config' },
    { path: 'src/index.ts', description: 'Main entry point' },
    { path: 'CLAUDE.md', description: 'AI-optimized documentation' }
  ]

  // Only include project.json for Nx workspaces
  if (isNx) {
    files.splice(1, 0, { path: 'project.json', description: 'Nx project configuration' })
  }

  return files
}

/**
 * Get files that will be generated for a library type
 */
export function getFilePreview(
  libraryType: LibraryType,
  libraryName: string,
  options: GeneratorOptions,
  isNx = true
): readonly FilePreview[] {
  const base = getBaseFiles(isNx)

  switch (libraryType) {
    case 'contract':
      return [
        ...base,
        { path: 'src/lib/entities.ts', description: 'Domain entities (Effect Schema)' },
        { path: 'src/lib/errors.ts', description: 'Tagged error types' },
        { path: 'src/lib/events.ts', description: 'Domain events' },
        { path: 'src/lib/ports.ts', description: 'Service interfaces' },
        { path: 'src/lib/rpc.ts', description: 'RPC definitions' },
        ...(options.includeCQRS
          ? [
            { path: 'src/lib/commands.ts', description: 'CQRS commands', isOptional: true },
            { path: 'src/lib/queries.ts', description: 'CQRS queries', isOptional: true },
            { path: 'src/lib/projections.ts', description: 'CQRS projections', isOptional: true }
          ]
          : [])
      ]

    case 'data-access':
      return [
        ...base,
        { path: 'src/lib/repository.ts', description: 'Repository implementation' },
        { path: 'src/lib/repository.spec.ts', description: 'Repository tests' },
        { path: 'src/lib/types.ts', description: 'Data access types' }
      ]

    case 'feature':
      return [
        ...base,
        { path: 'src/lib/service.ts', description: 'Feature service' },
        { path: 'src/lib/service.spec.ts', description: 'Service tests' },
        { path: 'src/lib/rpc/handlers.ts', description: 'RPC handlers' },
        { path: 'src/lib/rpc/router.ts', description: 'RPC router' },
        ...(options.includeClientServer
          ? [
            { path: 'src/lib/server.ts', description: 'Server-side logic', isOptional: true },
            { path: 'src/lib/client.ts', description: 'Client-side logic', isOptional: true }
          ]
          : []),
        ...(options.includeCQRS
          ? [
            { path: 'src/lib/commands.ts', description: 'Command handlers', isOptional: true },
            { path: 'src/lib/queries.ts', description: 'Query handlers', isOptional: true }
          ]
          : [])
      ]

    case 'infra':
      return [
        ...base,
        { path: 'src/lib/service.ts', description: 'Infrastructure service' },
        { path: 'src/lib/service.spec.ts', description: 'Service tests' },
        { path: 'src/lib/layers.ts', description: 'Effect layers' },
        { path: 'src/lib/types.ts', description: 'Service types' },
        ...(options.includeClientServer
          ? [
            { path: 'src/lib/server.ts', description: 'Server implementation', isOptional: true },
            { path: 'src/lib/client.ts', description: 'Client implementation', isOptional: true }
          ]
          : [])
      ]

    case 'provider':
      return [
        ...base,
        { path: 'src/lib/service.ts', description: 'Provider service' },
        { path: 'src/lib/service.spec.ts', description: 'Service tests' },
        { path: 'src/lib/layers.ts', description: 'Effect layers (Live, Test, Dev)' },
        { path: 'src/lib/types.ts', description: 'Provider types and config' },
        { path: 'src/lib/errors.ts', description: 'Provider error types' }
      ]

    case 'domain':
      // Domain creates 3 separate libraries - use the same files as individual types
      return [
        // Contract library (same as contract type)
        { path: `contract/${libraryName}/package.json`, description: 'Package manifest' },
        ...(isNx
          ? [{ path: `contract/${libraryName}/project.json`, description: 'Nx config' }]
          : []),
        { path: `contract/${libraryName}/tsconfig.json`, description: 'TypeScript config' },
        { path: `contract/${libraryName}/tsconfig.lib.json`, description: 'Library TS config' },
        { path: `contract/${libraryName}/CLAUDE.md`, description: 'AI documentation' },
        { path: `contract/${libraryName}/src/index.ts`, description: 'Entry point' },
        { path: `contract/${libraryName}/src/lib/entities.ts`, description: 'Domain entities' },
        { path: `contract/${libraryName}/src/lib/errors.ts`, description: 'Tagged errors' },
        { path: `contract/${libraryName}/src/lib/events.ts`, description: 'Domain events' },
        { path: `contract/${libraryName}/src/lib/ports.ts`, description: 'Service interfaces' },
        { path: `contract/${libraryName}/src/lib/rpc.ts`, description: 'RPC definitions' },
        // Data-access library (same as data-access type)
        { path: `data-access/${libraryName}/package.json`, description: 'Package manifest' },
        ...(isNx
          ? [{ path: `data-access/${libraryName}/project.json`, description: 'Nx config' }]
          : []),
        { path: `data-access/${libraryName}/tsconfig.json`, description: 'TypeScript config' },
        { path: `data-access/${libraryName}/tsconfig.lib.json`, description: 'Library TS config' },
        { path: `data-access/${libraryName}/CLAUDE.md`, description: 'AI documentation' },
        { path: `data-access/${libraryName}/src/index.ts`, description: 'Entry point' },
        {
          path: `data-access/${libraryName}/src/lib/repository.ts`,
          description: 'Repository impl'
        },
        {
          path: `data-access/${libraryName}/src/lib/repository.spec.ts`,
          description: 'Repository tests'
        },
        { path: `data-access/${libraryName}/src/lib/types.ts`, description: 'Data access types' },
        // Feature library (same as feature type)
        { path: `feature/${libraryName}/package.json`, description: 'Package manifest' },
        ...(isNx
          ? [{ path: `feature/${libraryName}/project.json`, description: 'Nx config' }]
          : []),
        { path: `feature/${libraryName}/tsconfig.json`, description: 'TypeScript config' },
        { path: `feature/${libraryName}/tsconfig.lib.json`, description: 'Library TS config' },
        { path: `feature/${libraryName}/CLAUDE.md`, description: 'AI documentation' },
        { path: `feature/${libraryName}/src/index.ts`, description: 'Entry point' },
        { path: `feature/${libraryName}/src/lib/service.ts`, description: 'Feature service' },
        { path: `feature/${libraryName}/src/lib/service.spec.ts`, description: 'Service tests' },
        { path: `feature/${libraryName}/src/lib/rpc/handlers.ts`, description: 'RPC handlers' },
        { path: `feature/${libraryName}/src/lib/rpc/router.ts`, description: 'RPC router' }
      ]

    default:
      return base
  }
}

/**
 * Get target directory for a library type
 */
export function getTargetDirectory(
  librariesRoot: string,
  libraryType: LibraryType,
  libraryName: string
): string {
  if (libraryType === 'domain') {
    // Domain creates 3 separate libraries under libs/
    return librariesRoot
  }
  return `${librariesRoot}/${libraryType}/${libraryName}`
}

/**
 * Get description of what will be created
 */
export function getCreationDescription(libraryType: LibraryType, libraryName: string): string {
  if (libraryType === 'domain') {
    return `Creating 3 libraries: contract/${libraryName}, data-access/${libraryName}, feature/${libraryName}`
  }
  return `Creating ${libraryType}/${libraryName}`
}

/**
 * Count files to be created
 */
export function countFiles(files: readonly FilePreview[]): {
  total: number
  required: number
  optional: number
} {
  const optional = files.filter((f) => f.isOptional).length
  const required = files.length - optional
  return { total: files.length, required, optional }
}

/**
 * Build file tree structure from flat file list
 * Returns lines for display with tree characters
 */
export function buildFileTree(files: readonly FilePreview[], rootPath: string): readonly string[] {
  // Sort files by path for consistent display
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path))

  const lines: string[] = [rootPath]

  for (let i = 0; i < sorted.length; i++) {
    const file = sorted[i]
    const isLast = i === sorted.length - 1
    const prefix = isLast ? '└─' : '├─'
    const indicator = file.isOptional ? ' (opt)' : ''
    lines.push(`${prefix} ${file.path}${indicator}`)
  }

  return lines
}
