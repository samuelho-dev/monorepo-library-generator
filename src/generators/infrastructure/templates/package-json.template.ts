/**
 * Package.json Template
 *
 * Generates package.json for library packages with proper exports
 * and dependency configuration.
 *
 * @module monorepo-library-generator/infrastructure/package-json-template
 */

import type { ExportConfig, ExportMap } from '../../../utils/build'
import { generateGranularExports } from '../../../utils/build'
import { getPackageName } from '../../../utils/workspace-config'
import { getProviderForInfra, hasProviderMapping } from '../../../utils/infra-provider-mapping'
import type { LibraryType } from '../../../utils/types'

export interface PackageJsonOptions {
  readonly packageName: string
  readonly projectName: string
  readonly description: string
  readonly libraryType: LibraryType
  readonly platform: 'node' | 'browser' | 'edge' | 'universal'
  readonly includeClientServer?: boolean
  readonly entities?: readonly string[]
  readonly subModules?: readonly string[]
}

/**
 * Generate package.json content
 */
export function generatePackageJson(options: PackageJsonOptions) {
  const exportConfig: ExportConfig = {
    libraryType: options.libraryType,
    platform: options.platform,
    ...(options.includeClientServer !== undefined && {
      includeClientServer: options.includeClientServer
    }),
    hasEntities: Boolean(options.entities && options.entities.length > 0),
    ...(options.entities &&
      options.entities.length > 0 && {
        entityNames: Array.from(options.entities)
      }),
    ...(options.subModules &&
      options.subModules.length > 0 && {
        subModuleNames: Array.from(options.subModules)
      })
  }

  const exports = generateGranularExports(exportConfig)
  const dependencies = computeDependencies(options)
  const peerDependencies = computePeerDependencies(options)

  return {
    name: options.packageName,
    version: '0.0.1',
    type: 'module',
    sideEffects: false,
    description: options.description,
    exports,
    dependencies,
    peerDependencies
  }
}

/**
 * Compute workspace dependencies based on library type
 */
function computeDependencies(options: PackageJsonOptions) {
  if (options.libraryType === 'infra') {
    const infraName = options.projectName.startsWith('infra-')
      ? options.projectName.substring(6)
      : options.projectName

    if (hasProviderMapping(infraName)) {
      const providerName = getProviderForInfra(infraName)
      if (providerName) {
        return {
          [getPackageName('provider', providerName)]: 'workspace:*'
        }
      }
    }
  }

  return undefined
}

/**
 * Compute peer dependencies based on library type
 */
function computePeerDependencies(options: PackageJsonOptions) {
  const base = { effect: '*' }

  if (options.libraryType === 'provider' && options.projectName.includes('kysely')) {
    return { ...base, kysely: '*', pg: '*' }
  }

  if (options.libraryType === 'provider' && options.projectName.includes('supabase')) {
    return { ...base, '@supabase/supabase-js': '^2' }
  }

  if (options.libraryType === 'data-access') {
    return { ...base, kysely: '*' }
  }

  if (options.libraryType === 'feature') {
    return {
      ...base,
      '@effect-atom/atom': '*',
      '@effect-atom/atom-react': '*'
    }
  }

  return base
}
