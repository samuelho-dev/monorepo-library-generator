/**
 * File Preview Utilities
 *
 * Generate file previews for wizard confirmation step
 *
 * @module monorepo-library-generator/cli/interactive/file-preview
 */

import type { FilePreview, LibraryType, WizardOptions } from './types';
import { colors, status } from './ui/colors';

/**
 * Get files that will be generated for a library type
 */
export function getFilePreview(
  libraryType: LibraryType,
  libraryName: string,
  options: WizardOptions,
) {
  const base: Array<FilePreview> = [
    { path: 'package.json', description: 'Package manifest' },
    { path: 'project.json', description: 'Nx project configuration' },
    { path: 'tsconfig.json', description: 'TypeScript configuration' },
    { path: 'tsconfig.lib.json', description: 'Library TypeScript config' },
    { path: 'src/index.ts', description: 'Main entry point' },
    { path: 'CLAUDE.md', description: 'AI-optimized documentation' },
  ];

  switch (libraryType) {
    case 'contract':
      return [
        ...base,
        { path: 'src/lib/entities.ts', description: 'Domain entities (Effect Schema)' },
        { path: 'src/lib/errors.ts', description: 'Tagged error types' },
        { path: 'src/lib/events.ts', description: 'Domain events' },
        { path: 'src/lib/ports.ts', description: 'Service interfaces' },
        ...(options.includeCQRS
          ? [
              { path: 'src/lib/commands.ts', description: 'CQRS commands', isOptional: true },
              { path: 'src/lib/queries.ts', description: 'CQRS queries', isOptional: true },
              { path: 'src/lib/projections.ts', description: 'CQRS projections', isOptional: true },
            ]
          : []),
        ...(options.includeRPC
          ? [{ path: 'src/lib/rpc.ts', description: 'RPC definitions', isOptional: true }]
          : []),
      ];

    case 'data-access':
      return [
        ...base,
        { path: 'src/lib/repository.ts', description: 'Repository implementation' },
        { path: 'src/lib/repository.spec.ts', description: 'Repository tests' },
        { path: 'src/lib/types.ts', description: 'Data access types' },
      ];

    case 'feature':
      return [
        ...base,
        { path: 'src/lib/service.ts', description: 'Feature service' },
        { path: 'src/lib/service.spec.ts', description: 'Service tests' },
        ...(options.includeClientServer
          ? [
              { path: 'src/lib/server.ts', description: 'Server-side logic', isOptional: true },
              { path: 'src/lib/client.ts', description: 'Client-side logic', isOptional: true },
            ]
          : []),
        ...(options.includeEdge
          ? [{ path: 'src/lib/edge.ts', description: 'Edge runtime support', isOptional: true }]
          : []),
        ...(options.includeCQRS
          ? [
              { path: 'src/lib/commands.ts', description: 'Command handlers', isOptional: true },
              { path: 'src/lib/queries.ts', description: 'Query handlers', isOptional: true },
            ]
          : []),
        ...(options.includeRPC
          ? [{ path: 'src/lib/rpc.ts', description: 'RPC handlers', isOptional: true }]
          : []),
      ];

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
              { path: 'src/lib/client.ts', description: 'Client implementation', isOptional: true },
            ]
          : []),
      ];

    case 'provider':
      return [
        ...base,
        { path: 'src/lib/service.ts', description: 'Provider service' },
        { path: 'src/lib/service.spec.ts', description: 'Service tests' },
        { path: 'src/lib/layers.ts', description: 'Effect layers (Live, Test, Dev)' },
        { path: 'src/lib/types.ts', description: 'Provider types and config' },
        { path: 'src/lib/errors.ts', description: 'Provider error types' },
      ];

    case 'domain':
      return [
        // Contract library
        { path: `../contract/${libraryName}/package.json`, description: 'Contract package' },
        { path: `../contract/${libraryName}/src/lib/entities.ts`, description: 'Domain entities' },
        { path: `../contract/${libraryName}/src/lib/errors.ts`, description: 'Domain errors' },
        // Data-access library
        { path: `../data-access/${libraryName}/package.json`, description: 'Data-access package' },
        { path: `../data-access/${libraryName}/src/lib/repository.ts`, description: 'Repository' },
        // Feature library
        { path: `../feature/${libraryName}/package.json`, description: 'Feature package' },
        { path: `../feature/${libraryName}/src/lib/service.ts`, description: 'Feature service' },
      ];

    default:
      return base;
  }
}

/**
 * Format file preview list for display
 */
export function formatFilePreview(files: ReadonlyArray<FilePreview>) {
  const lines = files.map((file) => {
    const icon = file.isOptional ? status.bullet : status.arrow;
    const path = file.isOptional ? colors.muted(file.path) : colors.white(file.path);
    const desc = colors.muted(`- ${file.description}`);
    const optional = file.isOptional ? colors.muted(' (optional)') : '';
    return `  ${icon} ${path} ${desc}${optional}`;
  });

  return lines.join('\n');
}

/**
 * Count files to be created
 */
export function countFiles(files: ReadonlyArray<FilePreview>) {
  const optional = files.filter((f) => f.isOptional).length;
  const required = files.length - optional;
  return { total: files.length, required, optional };
}
