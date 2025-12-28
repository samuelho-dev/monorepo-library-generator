/**
 * Feature Sub-Module Service Template
 *
 * Generates service.ts for feature sub-modules with proper Context.Tag pattern.
 * Part of the Hybrid DDD pattern for sub-module support.
 *
 * Fixes Gap #4: Uses class-based Context.Tag instead of GenericTag
 * Fixes Gap #7: Includes proper DI pattern examples
 *
 * @module monorepo-library-generator/feature/sub-module/service-template
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder'
import { WORKSPACE_CONFIG } from '../../../../utils/workspace-config'

export interface SubModuleServiceOptions {
  /** Parent domain name (e.g., 'order') */
  parentName: string
  /** Parent class name (e.g., 'Order') */
  parentClassName: string
  /** Parent file name (e.g., 'order') */
  parentFileName: string
  /** Sub-module name (e.g., 'cart') */
  subModuleName: string
  /** Sub-module class name (e.g., 'Cart') */
  subModuleClassName: string
}

/**
 * Generate service.ts for a feature sub-module
 *
 * Creates Context.Tag-based service with class pattern (not GenericTag)
 */
export function generateSubModuleServiceFile(options: SubModuleServiceOptions) {
  const builder = new TypeScriptBuilder()
  const { parentClassName, parentFileName, parentName, subModuleClassName, subModuleName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${parentClassName} ${subModuleClassName} Service`,
    description: `Service implementation for ${subModuleName} operations within the ${parentName} feature.

Uses Effect Context.Tag class pattern for proper dependency injection.
Integrates with infrastructure services (Logging, Metrics) and data-access layer.`,
    module: `${scope}/feature-${parentFileName}/server/services/${subModuleName}`
  })

  builder.addImports([
    { from: 'effect', imports: ['Context', 'Effect', 'Layer', 'Option'], isTypeOnly: false }
  ])

  builder.addSectionComment('Contract Imports (Contract-First Architecture)')
  builder.addComment('Sub-module entity schema for transforming repository data')
  builder.addComment(
    'Schema class is type-only (for typeof), parse function and error class are runtime'
  )
  builder.addImports([
    {
      from: `${scope}/contract-${parentFileName}/${subModuleName}`,
      imports: [`${subModuleClassName}`],
      isTypeOnly: true
    }
  ])
  builder.addImports([
    {
      from: `${scope}/contract-${parentFileName}/${subModuleName}`,
      imports: [`parse${subModuleClassName}`, `${subModuleClassName}OperationError`]
    },
    {
      from: `${scope}/contract-${parentFileName}/${subModuleName}`,
      imports: [`${subModuleClassName}Error`],
      isTypeOnly: true
    }
  ])

  builder.addSectionComment('Type Definitions')
  builder.addRaw(`/**
 * Sub-module entity type (from contract schema)
 * Service transforms repository data to this shape for RPC responses
 */
type ${subModuleClassName}Entity = typeof ${subModuleClassName}.Type
`)

  builder.addSectionComment('Data Access Imports')
  // Data-access libraries don't have sub-modules - use parent repository
  // Import filter type for type-safe query parameters
  builder.addImports([
    { from: `${scope}/data-access-${parentFileName}`, imports: [`${parentClassName}Repository`] },
    {
      from: `${scope}/data-access-${parentFileName}`,
      imports: [`${parentClassName}Filter`],
      isTypeOnly: true
    }
  ])

  builder.addSectionComment('Infrastructure Imports')
  builder.addImports([
    { from: `${scope}/infra-observability`, imports: ['LoggingService', 'MetricsService'] }
  ])
  builder.addComment('DatabaseService requirement flows from repository operations')
  builder.addImports([
    { from: `${scope}/infra-database`, imports: ['DatabaseService'], isTypeOnly: true }
  ])

  builder.addSectionComment('Service Interface')

  // Generate interface based on common sub-module patterns
  const serviceInterface = getServiceInterfaceForSubModule(
    subModuleName,
    subModuleClassName,
    parentClassName
  )

  builder.addRaw(`/**
 * ${subModuleClassName}Service interface
 *
 * Business logic layer for ${subModuleName} within the ${parentName} feature.
 * Coordinates with repository and publishes domain events.
 */
export interface ${subModuleClassName}ServiceInterface {
${serviceInterface}
}`)

  builder.addSectionComment('Context.Tag Definition (Class Pattern)')

  builder.addRaw(`/**
 * ${subModuleClassName}Service Context.Tag
 *
 * Uses class-based Context.Tag for proper DI pattern.
 * Access via: \`const service = yield* ${subModuleClassName}Service;\`
 */
export class ${subModuleClassName}Service extends Context.Tag("${subModuleClassName}Service")<
  ${subModuleClassName}Service,
  ${subModuleClassName}ServiceInterface
>() {}`)

  builder.addSectionComment('Live Layer Implementation')

  const implementation = getServiceImplementationForSubModule(subModuleName, subModuleClassName)

  builder.addRaw(`/**
 * ${subModuleClassName}ServiceLive Layer
 *
 * Production implementation with full infrastructure integration:
 * - ${parentClassName}Repository for data access (via parent)
 * - LoggingService for structured logging
 * - MetricsService for observability
 */
export const ${subModuleClassName}ServiceLive = Layer.effect(
  ${subModuleClassName}Service,
  Effect.gen(function*() {
    const repo = yield* ${parentClassName}Repository
    const logger = yield* LoggingService
    const metrics = yield* MetricsService

    yield* logger.debug("${subModuleClassName}Service initialized")

${implementation}
  })
)`)

  return builder.toString()
}

/**
 * Get service interface based on common sub-module patterns
 *
 * Uses sub-module entity type for RPC contract compatibility.
 * Entity type is derived from the contract schema.
 */
function getServiceInterfaceForSubModule(
  subModuleName: string,
  subModuleClassName: string,
  parentClassName: string
) {
  const name = subModuleName.toLowerCase()
  const entityType = `${subModuleClassName}Entity`
  const filterType = `${parentClassName}Filter`

  // Paginated response type for list operations (matches RPC contract)
  const paginatedResponse = `{
    readonly items: readonly ${entityType}[]
    readonly total: number
    readonly page: number
    readonly pageSize: number
  }`

  // Common sub-module patterns with appropriate interface methods
  // Use ${subModuleClassName}Error which is the union of all domain and repository errors
  // Include DatabaseService in R channel - flows from repository operations
  if (name === 'cart') {
    return `  /** Get cart by ID */
  readonly getById: (id: string) => Effect.Effect<Option.Option<${entityType}>, ${subModuleClassName}Error, DatabaseService>

  /** Get cart contents with items */
  readonly getContents: (cartId: string) => Effect.Effect<${entityType}, ${subModuleClassName}Error, DatabaseService>

  /** Add item to cart */
  readonly addItem: (cartId: string, item: { readonly productId: string; readonly quantity: number }) => Effect.Effect<${entityType}, ${subModuleClassName}Error, DatabaseService>

  /** Remove item from cart */
  readonly removeItem: (cartId: string, itemId: string) => Effect.Effect<${entityType}, ${subModuleClassName}Error, DatabaseService>

  /** Update item quantity */
  readonly updateQuantity: (cartId: string, itemId: string, quantity: number) => Effect.Effect<${entityType}, ${subModuleClassName}Error, DatabaseService>

  /** Clear all items from cart */
  readonly clear: (cartId: string) => Effect.Effect<void, ${subModuleClassName}Error, DatabaseService>

  /** Create new cart for user */
  readonly create: (userId: string) => Effect.Effect<${entityType}, ${subModuleClassName}Error, DatabaseService>`
  }

  if (name === 'checkout') {
    return `  /** Get checkout session by ID */
  readonly getById: (id: string) => Effect.Effect<Option.Option<${entityType}>, ${subModuleClassName}Error, DatabaseService>

  /** Initiate checkout from cart */
  readonly initiate: (cartId: string) => Effect.Effect<${entityType}, ${subModuleClassName}Error, DatabaseService>

  /** Process payment for checkout */
  readonly processPayment: (checkoutId: string, paymentDetails: { readonly method: string; readonly token?: string }) => Effect.Effect<${entityType}, ${subModuleClassName}Error, DatabaseService>

  /** Confirm checkout and create order */
  readonly confirm: (checkoutId: string) => Effect.Effect<${entityType}, ${subModuleClassName}Error, DatabaseService>

  /** Cancel checkout session */
  readonly cancel: (checkoutId: string, reason: string) => Effect.Effect<void, ${subModuleClassName}Error, DatabaseService>`
  }

  if (name === 'management' || name === 'order-management') {
    return `  /** Get order by ID */
  readonly getById: (id: string) => Effect.Effect<Option.Option<${entityType}>, ${subModuleClassName}Error, DatabaseService>

  /** Get order by order number */
  readonly getByOrderNumber: (orderNumber: string) => Effect.Effect<Option.Option<${entityType}>, ${subModuleClassName}Error, DatabaseService>

  /** Create order from checkout */
  readonly create: (checkoutId: string, notes?: string) => Effect.Effect<${entityType}, ${subModuleClassName}Error, DatabaseService>

  /** Update order status */
  readonly updateStatus: (id: string, status: string, reason?: string) => Effect.Effect<${entityType}, ${subModuleClassName}Error, DatabaseService>

  /** Cancel order */
  readonly cancel: (id: string, reason: string) => Effect.Effect<void, ${subModuleClassName}Error, DatabaseService>

  /** List orders with filters - returns paginated response matching RPC contract */
  readonly list: (filter: ${filterType} | undefined, pagination?: { readonly page: number; readonly pageSize: number }) => Effect.Effect<${paginatedResponse}, ${subModuleClassName}Error, DatabaseService>`
  }

  // Generic service interface
  // Uses parent filter type for type-safe repository queries
  // Returns paginated response matching RPC contract shape
  // Include DatabaseService in R channel - flows from repository operations
  // Create/Update accept Record to allow RPC inputs with fewer fields than entity
  return `  /** Get by ID */
  readonly getById: (id: string) => Effect.Effect<Option.Option<${entityType}>, ${subModuleClassName}Error, DatabaseService>

  /** List with pagination - returns paginated response matching RPC contract */
  readonly list: (filter: ${filterType} | undefined, pagination?: { readonly page: number; readonly pageSize: number }) => Effect.Effect<${paginatedResponse}, ${subModuleClassName}Error, DatabaseService>

  /** Create new entity - accepts partial input, service adds defaults */
  readonly create: (input: Record<string, unknown>) => Effect.Effect<${entityType}, ${subModuleClassName}Error, DatabaseService>

  /** Update existing entity - partial input for selective updates */
  readonly update: (id: string, input: Record<string, unknown>) => Effect.Effect<${entityType}, ${subModuleClassName}Error, DatabaseService>

  /** Delete entity */
  readonly delete: (id: string) => Effect.Effect<void, ${subModuleClassName}Error, DatabaseService>`
}

/**
 * Get service implementation based on common sub-module patterns
 *
 * Business logic layer transforms repository data to sub-module
 * entity type for RPC responses.
 *
 * Type-Safety Patterns:
 * - Uses contract-exported parse function for schema-validated transformation
 * - Repository filter type used for type-safe queries
 * - Paginated response matches RPC contract shape
 * - Error mapping wraps repository errors in domain operation errors
 */
function getServiceImplementationForSubModule(subModuleName: string, subModuleClassName: string) {
  return `    // Transform repository entity to sub-module entity using Effect-based parsing
    // The parse function validates and applies schema defaults
    // Using 'unknown' input allows the schema to validate the shape
    const toEntity = (data: unknown): Effect.Effect<${subModuleClassName}Entity, ${subModuleClassName}Error> =>
      parse${subModuleClassName}(data).pipe(
        Effect.mapError((parseError) =>
          ${subModuleClassName}OperationError.create("validation", String(parseError), parseError)
        )
      )

    // Map sub-module input to parent repository input
    // TODO: Customize this mapping based on your domain
    // The parent repository expects parent entity fields (e.g., User fields)
    // Extract and transform sub-module fields to parent-compatible shape
    const toRepoCreateInput = (input: Record<string, unknown>) => ({
      // Extract fields compatible with parent repository
      // Add required parent fields with defaults if not in sub-module input
      name: typeof input.name === "string" ? input.name : "",
      email: typeof input.email === "string" ? input.email : \`\${Date.now()}@generated.local\`,
      updatedAt: new Date()
    })

    const toRepoUpdateInput = (input: Record<string, unknown>) => {
      const result: Record<string, unknown> = {}
      if (typeof input.name === "string") result.name = input.name
      if (typeof input.email === "string") result.email = input.email
      return result
    }

    return {
      getById: (id) =>
        Effect.gen(function*() {
          const histogram = yield* metrics.histogram("${subModuleName}_get_duration_seconds")

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.debug("${subModuleClassName}Service.getById", { id })
              const result = yield* repo.findById(id).pipe(
                Effect.catchAll((error) =>
                  Effect.fail(${subModuleClassName}OperationError.create("repository", String(error), error))
                )
              )
              if (Option.isNone(result)) {
                return Option.none()
              }
              const entity = yield* toEntity(result.value)
              return Option.some(entity)
            })
          )
        }).pipe(Effect.withSpan("${subModuleClassName}Service.getById")),

      list: (filter, pagination) =>
        Effect.gen(function*() {
          const histogram = yield* metrics.histogram("${subModuleName}_list_duration_seconds")

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.debug("${subModuleClassName}Service.list", { filter, pagination })
              const page = pagination?.page ?? 1
              const pageSize = pagination?.pageSize ?? 20
              const skip = (page - 1) * pageSize

              // Repository returns { items, total, hasMore }
              const result = yield* repo.findAll(filter, { skip, limit: pageSize }).pipe(
                Effect.catchAll((error) =>
                  Effect.fail(${subModuleClassName}OperationError.create("repository", String(error), error))
                )
              )

              // Transform each item using Effect.forEach on the items array
              const items = yield* Effect.forEach(result.items, toEntity)

              // Return paginated response matching RPC contract shape
              return {
                items,
                total: result.total,
                page,
                pageSize
              }
            })
          )
        }).pipe(Effect.withSpan("${subModuleClassName}Service.list")),

      create: (input) =>
        Effect.gen(function*() {
          const counter = yield* metrics.counter("${subModuleName}_created_total")
          const histogram = yield* metrics.histogram("${subModuleName}_create_duration_seconds")

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.info("${subModuleClassName}Service.create", { input })
              // Map sub-module input to parent repository input
              const repoInput = toRepoCreateInput(input)
              const result = yield* repo.create(repoInput).pipe(
                Effect.catchAll((error) =>
                  Effect.fail(${subModuleClassName}OperationError.create("repository", String(error), error))
                )
              )
              yield* counter.increment
              return yield* toEntity(result)
            })
          )
        }).pipe(Effect.withSpan("${subModuleClassName}Service.create")),

      update: (id, input) =>
        Effect.gen(function*() {
          const counter = yield* metrics.counter("${subModuleName}_updated_total")
          const histogram = yield* metrics.histogram("${subModuleName}_update_duration_seconds")

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.info("${subModuleClassName}Service.update", { id, input })
              // Map sub-module input to parent repository input
              const repoInput = toRepoUpdateInput(input)
              const result = yield* repo.update(id, repoInput).pipe(
                Effect.catchAll((error) =>
                  Effect.fail(${subModuleClassName}OperationError.create("repository", String(error), error))
                )
              )
              yield* counter.increment
              return yield* toEntity(result)
            })
          )
        }).pipe(Effect.withSpan("${subModuleClassName}Service.update")),

      delete: (id) =>
        Effect.gen(function*() {
          const counter = yield* metrics.counter("${subModuleName}_deleted_total")
          const histogram = yield* metrics.histogram("${subModuleName}_delete_duration_seconds")

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.info("${subModuleClassName}Service.delete", { id })
              yield* repo.delete(id).pipe(
                Effect.catchAll((error) =>
                  Effect.fail(${subModuleClassName}OperationError.create("repository", String(error), error))
                )
              )
              yield* counter.increment
            })
          )
        }).pipe(Effect.withSpan("${subModuleClassName}Service.delete"))
    }`
}
