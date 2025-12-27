/**
 * Service Fragment
 *
 * Fragment renderer for Context.Tag service/repository classes.
 * Generates type-safe service definitions with methods and optional layers.
 *
 * @module monorepo-library-generator/templates/fragments/service-fragment
 */

import { Effect } from 'effect'
import type { SourceFile } from 'ts-morph'
import { interpolateSync } from '../core/resolver'
import type { TemplateContext } from '../core/types'
import type { ContextTagFragmentConfig, MethodParam, ServiceMethod, StaticLayer } from './types'

// ============================================================================
// Service Fragment Renderer
// ============================================================================

/**
 * Render a Context.Tag fragment
 *
 * Generates a Context.Tag class with inline interface definition.
 */
export function renderContextTagFragment(
  sourceFile: SourceFile,
  config: ContextTagFragmentConfig,
  context: TemplateContext
) {
  return Effect.sync(() => {
    const serviceName = interpolateSync(config.serviceName, context)
    const tagIdentifier = config.tagIdentifier
      ? interpolateSync(config.tagIdentifier, context)
      : serviceName

    // Build method definitions
    const methodDefs = buildMethodDefinitions(config.methods, context)

    // Build static layers
    const staticLayers = config.staticLayers ? buildStaticLayers(config.staticLayers, context) : []

    // Build class declaration
    const statements: Array<string> = []

    if (config.jsdoc) {
      statements.push(`/**\n * ${interpolateSync(config.jsdoc, context)}\n */`)
    }

    const exportKeyword = config.exported !== false ? 'export ' : ''
    const bodyContent = staticLayers.length > 0 ? ` {\n${staticLayers.join('\n\n')}\n}` : ' {}'

    const classDecl = `${exportKeyword}class ${serviceName} extends Context.Tag(
  "${tagIdentifier}"
)<
  ${serviceName},
  {
${methodDefs}
  }
>()${bodyContent}`

    statements.push(classDecl)

    // Add to source file
    sourceFile.addStatements(statements.join('\n'))
  })
}

/**
 * Build method definitions for the service interface
 */
function buildMethodDefinitions(methods: ReadonlyArray<ServiceMethod>, context: TemplateContext) {
  const lines: Array<string> = []

  for (const method of methods) {
    const methodName = interpolateSync(method.name, context)
    const returnType = interpolateSync(method.returnType, context)
    const params = buildParams(method.params, context)

    if (method.jsdoc) {
      lines.push(`    /**\n     * ${interpolateSync(method.jsdoc, context)}\n     */`)
    }

    lines.push(`    readonly ${methodName}: (${params}) => ${returnType}`)
  }

  return lines.join('\n\n')
}

/**
 * Build parameter list for a method
 */
function buildParams(params: ReadonlyArray<MethodParam>, context: TemplateContext) {
  return params
    .map((p) => {
      const pName = interpolateSync(p.name, context)
      const pType = interpolateSync(p.type, context)
      const optional = p.optional ? '?' : ''
      return `${pName}${optional}: ${pType}`
    })
    .join(', ')
}

/**
 * Build static layer definitions
 */
function buildStaticLayers(layers: ReadonlyArray<StaticLayer>, context: TemplateContext) {
  return layers.map((layer) => {
    const impl = interpolateSync(layer.implementation, context)
    const lines: Array<string> = []

    if (layer.jsdoc) {
      lines.push(`  /**\n   * ${interpolateSync(layer.jsdoc, context)}\n   */`)
    }

    lines.push(`  static ${layer.name} = ${impl}`)

    return lines.join('\n')
  })
}

// ============================================================================
// Fragment Presets
// ============================================================================

/**
 * Create a repository Context.Tag fragment config
 *
 * Generates a standard repository interface with CRUD operations.
 */
export function repositoryFragment(
  className: string,
  options: {
    readonly scope?: string
    readonly fileName?: string
    readonly entityType?: string
    readonly idFieldName?: string
    readonly errorType?: string
  } = {}
) {
  const {
    entityType = className,
    errorType = `${className}RepositoryError`,
    fileName = '{fileName}',
    idFieldName = 'id',
    scope = '{scope}'
  } = options

  return {
    serviceName: `${className}Repository`,
    tagIdentifier: `${scope}/contract-${fileName}/${className}Repository`,
    jsdoc: `${className}Repository Context Tag for dependency injection`,
    methods: [
      {
        name: 'findById',
        params: [{ name: idFieldName, type: 'string' }],
        returnType: `Effect.Effect<Option.Option<${entityType}>, ${errorType}>`,
        jsdoc: `Find ${className.toLowerCase()} by ID`
      },
      {
        name: 'findAll',
        params: [
          { name: 'filters', type: `${className}Filters`, optional: true },
          { name: 'pagination', type: 'OffsetPaginationParams', optional: true },
          { name: 'sort', type: 'SortOptions', optional: true }
        ],
        returnType: `Effect.Effect<PaginatedResult<${entityType}>, ${errorType}>`,
        jsdoc: `Find all ${className.toLowerCase()}s matching filters`
      },
      {
        name: 'count',
        params: [{ name: 'filters', type: `${className}Filters`, optional: true }],
        returnType: `Effect.Effect<number, ${errorType}>`,
        jsdoc: `Count ${className.toLowerCase()}s matching filters`
      },
      {
        name: 'create',
        params: [{ name: 'input', type: `Partial<${entityType}>` }],
        returnType: `Effect.Effect<${entityType}, ${errorType}>`,
        jsdoc: `Create a new ${className.toLowerCase()}`
      },
      {
        name: 'update',
        params: [
          { name: idFieldName, type: 'string' },
          { name: 'input', type: `Partial<${entityType}>` }
        ],
        returnType: `Effect.Effect<${entityType}, ${errorType}>`,
        jsdoc: `Update an existing ${className.toLowerCase()}`
      },
      {
        name: 'delete',
        params: [{ name: idFieldName, type: 'string' }],
        returnType: `Effect.Effect<void, ${errorType}>`,
        jsdoc: `Delete a ${className.toLowerCase()} permanently`
      },
      {
        name: 'exists',
        params: [{ name: idFieldName, type: 'string' }],
        returnType: `Effect.Effect<boolean, ${errorType}>`,
        jsdoc: `Check if ${className.toLowerCase()} exists by ID`
      }
    ]
  }
}

/**
 * Create a service Context.Tag fragment config
 *
 * Generates a standard service interface with business operations.
 */
export function serviceFragment(
  className: string,
  options: {
    readonly scope?: string
    readonly fileName?: string
    readonly entityType?: string
    readonly errorType?: string
  } = {}
) {
  const {
    entityType = className,
    errorType = `${className}RepositoryError`,
    fileName = '{fileName}',
    scope = '{scope}'
  } = options

  return {
    serviceName: `${className}Service`,
    tagIdentifier: `${scope}/contract-${fileName}/${className}Service`,
    jsdoc: `${className}Service Context Tag for dependency injection`,
    methods: [
      {
        name: 'get',
        params: [{ name: 'id', type: 'string' }],
        returnType: `Effect.Effect<${entityType}, ${errorType}>`,
        jsdoc: `Get ${className.toLowerCase()} by ID`
      },
      {
        name: 'list',
        params: [
          { name: 'filters', type: `${className}Filters`, optional: true },
          { name: 'pagination', type: 'OffsetPaginationParams', optional: true },
          { name: 'sort', type: 'SortOptions', optional: true }
        ],
        returnType: `Effect.Effect<PaginatedResult<${entityType}>, ${errorType}>`,
        jsdoc: `List ${className.toLowerCase()}s with filters and pagination`
      },
      {
        name: 'create',
        params: [{ name: 'input', type: `Partial<${entityType}>` }],
        returnType: `Effect.Effect<${entityType}, ${errorType}>`,
        jsdoc: `Create a new ${className.toLowerCase()}`
      },
      {
        name: 'update',
        params: [
          { name: 'id', type: 'string' },
          { name: 'input', type: `Partial<${entityType}>` }
        ],
        returnType: `Effect.Effect<${entityType}, ${errorType}>`,
        jsdoc: `Update an existing ${className.toLowerCase()}`
      },
      {
        name: 'delete',
        params: [{ name: 'id', type: 'string' }],
        returnType: `Effect.Effect<void, ${errorType}>`,
        jsdoc: `Delete a ${className.toLowerCase()}`
      }
    ]
  }
}

/**
 * Create a projection repository Context.Tag fragment config (CQRS)
 */
export function projectionRepositoryFragment(
  className: string,
  options: {
    readonly scope?: string
    readonly fileName?: string
    readonly errorType?: string
  } = {}
) {
  const {
    errorType = `${className}RepositoryError`,
    fileName = '{fileName}',
    scope = '{scope}'
  } = options

  return {
    serviceName: `${className}ProjectionRepository`,
    tagIdentifier: `${scope}/contract-${fileName}/${className}ProjectionRepository`,
    jsdoc: `${className}ProjectionRepository Context Tag for CQRS read models`,
    methods: [
      {
        name: 'findProjection',
        params: [{ name: 'id', type: 'string' }],
        returnType: `Effect.Effect<Option.Option<unknown>, ${errorType}>`,
        jsdoc: 'Find projection by ID'
      },
      {
        name: 'listProjections',
        params: [
          { name: 'filters', type: 'Record<string, unknown>', optional: true },
          { name: 'pagination', type: 'PaginationParams', optional: true }
        ],
        returnType: `Effect.Effect<PaginatedResult<unknown>, ${errorType}>`,
        jsdoc: 'List projections with filters'
      },
      {
        name: 'updateProjection',
        params: [
          { name: 'id', type: 'string' },
          { name: 'data', type: 'unknown' }
        ],
        returnType: `Effect.Effect<void, ${errorType}>`,
        jsdoc: 'Update projection (called by event handlers)'
      },
      {
        name: 'rebuildProjection',
        params: [{ name: 'id', type: 'string' }],
        returnType: `Effect.Effect<void, ${errorType}>`,
        jsdoc: 'Rebuild projection from event stream'
      }
    ]
  }
}
