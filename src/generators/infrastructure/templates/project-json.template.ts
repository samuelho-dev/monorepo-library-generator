/**
 * Project.json Template
 *
 * Generates project.json (Nx project configuration) for libraries.
 *
 * @module monorepo-library-generator/infrastructure/project-json-template
 */

import type { TargetConfiguration } from '@nx/devkit'
import type { LibraryType } from '../../../utils/types'

export interface ProjectJsonOptions {
  readonly projectName: string
  readonly projectRoot: string
  readonly sourceRoot: string
  readonly tags: readonly string[]
  readonly libraryType: LibraryType
  readonly includeClientServer?: boolean
}

/**
 * Generate project.json content
 */
export function generateProjectJson(options: ProjectJsonOptions) {
  const targets = createTargets(options)

  return {
    name: options.projectName,
    $schema: '../../node_modules/nx/schemas/project-schema.json',
    projectType: 'library',
    sourceRoot: options.sourceRoot,
    tags: Array.from(options.tags),
    targets
  }
}

/**
 * Create Nx build targets
 */
function createTargets(options: ProjectJsonOptions) {
  const { libraryType, projectRoot, sourceRoot } = options

  const additionalEntryPoints: string[] = []
  if (options.includeClientServer) {
    additionalEntryPoints.push(`${sourceRoot}/server.ts`)
    additionalEntryPoints.push(`${sourceRoot}/client.ts`)
  }

  const targets: Record<string, TargetConfiguration> = {
    build: {
      executor: '@nx/js:tsc',
      outputs: ['{options.outputPath}'],
      options: {
        outputPath: `dist/${projectRoot}`,
        tsConfig: `${projectRoot}/tsconfig.lib.json`,
        main: `${sourceRoot}/index.ts`,
        batch: true,
        ...(additionalEntryPoints.length > 0 && { additionalEntryPoints })
      }
    },
    lint: {
      executor: '@nx/eslint:lint',
      outputs: ['{options.outputFile}'],
      options: {
        lintFilePatterns: [`${sourceRoot}/**/*.ts`]
      }
    }
  }

  // Contract libraries are types-only, no tests needed
  if (libraryType !== 'contract') {
    targets.test = {
      executor: '@nx/vite:test',
      outputs: ['{options.reportsDirectory}'],
      options: {
        reportsDirectory: `coverage/${projectRoot}`,
        config: `${projectRoot}/vitest.config.ts`
      }
    }
  }

  return targets
}

/**
 * Get default tags for a library type
 */
export function getDefaultTags(libraryType: LibraryType) {
  const tagMap: Record<LibraryType, readonly string[]> = {
    contract: ['type:contract', 'scope:shared'],
    feature: ['type:feature', 'scope:shared'],
    'data-access': ['type:data-access', 'scope:server'],
    infra: ['type:infrastructure', 'scope:shared'],
    provider: ['type:provider', 'scope:shared'],
    util: ['type:util', 'scope:shared']
  }

  return tagMap[libraryType]
}
