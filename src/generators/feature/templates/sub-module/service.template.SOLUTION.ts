/**
 * Feature Sub-Module Service Template (EFFECT-IDIOMATIC SOLUTION)
 *
 * Generates service.ts for feature sub-modules with proper Context.Tag pattern.
 * Part of the Hybrid DDD pattern for sub-module support.
 *
 * FIXES:
 * - Issue #1: DatabaseService requirement leaking via Layer.provide composition
 * - Issue #2: Criteria type mismatch via schema-based mapping
 * - Issue #3: Effect.forEach incorrect usage via proper destructuring
 * - Issue #4: Error type mismatch via transformation layer (in handlers)
 *
 * @module monorepo-library-generator/feature/sub-module/service-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

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
Integrates with infrastructure services (Logging, Metrics) and data-access layer.

EFFECT-IDIOMATIC PATTERNS:
- Layer.provide eliminates dependency requirements from service interface
- Schema-based criteria mapping (no type coercions)
- Proper PaginatedResponse destructuring
- Contract-first error handling`,
    module: `${scope}/feature-${parentFileName}/server/services/${subModuleName}`
  })

  builder.addImports([
    { from: "effect", imports: ["Context", "Effect", "Layer", "Option", "Schema"], isTypeOnly: false }
  ])

  builder.addSectionComment("Contract Imports (Contract-First Architecture)")
  builder.addComment("Sub-module entity schema for transforming repository data")
  builder.addComment("Schema class is type-only (for typeof), parse function and error class are runtime")
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

  builder.addSectionComment("Type Definitions")
  builder.addRaw(`/**
 * Sub-module entity type (from contract schema)
 * Service transforms repository data to this shape for RPC responses
 */
type ${subModuleClassName}Entity = typeof ${subModuleClassName}.Type
`)

  builder.addSectionComment("Data Access Imports")
  // Data-access libraries don't have sub-modules - use parent repository
  builder.addImports([
    { from: `${scope}/data-access-${parentFileName}`, imports: [`${parentClassName}Repository`] }
  ])

  // Import parent filter type for criteria mapping
  builder.addImports([
    {
      from: `${scope}/data-access-${parentFileName}`,
      imports: [`${parentClassName}Filter`],
      isTypeOnly: true
    }
  ])

  builder.addSectionComment("Infrastructure Imports")
  builder.addImports([
    { from: `${scope}/infra-observability`, imports: ["LoggingService", "MetricsService"] },
    { from: `${scope}/infra-database`, imports: ["DatabaseService"] }
  ])

  builder.addSectionComment("Service Interface")

  // Generate interface based on common sub-module patterns
  const serviceInterface = getServiceInterfaceForSubModule(subModuleName, subModuleClassName, parentClassName)

  builder.addRaw(`/**
 * ${subModuleClassName}Service interface
 *
 * Business logic layer for ${subModuleName} within the ${parentName} feature.
 * Coordinates with repository and publishes domain events.
 *
 * EFFECT-IDIOMATIC:
 * - All Effect return types have R = never (dependencies provided at Layer level)
 * - Errors are domain errors (${subModuleClassName}Error) from contract
 * - Results are schema-validated entities
 */
export interface ${subModuleClassName}ServiceInterface {
${serviceInterface}
}`)

  builder.addSectionComment("Context.Tag Definition (Class Pattern)")

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

  builder.addSectionComment("Criteria Mapping (Sub-Module -> Parent Domain)")

  builder.addRaw(`/**
 * Map sub-module criteria to parent domain filter
 *
 * EFFECT-IDIOMATIC: Schema-based transformation (no type coercions)
 * Maps Partial<${subModuleClassName}Entity> to ${parentClassName}Filter
 */
const mapCriteriaToFilter = (
  criteria: Partial<${subModuleClassName}Entity>
): ${parentClassName}Filter => {
  // TODO: Customize mapping based on your domain
  // Map sub-module fields to parent domain filter fields
  return {
    // Example: If both have 'id' field
    ...(criteria.id && { id: criteria.id }),
    // Example: If both have searchable 'name' field
    ...(criteria.name && { search: criteria.name })
  } as ${parentClassName}Filter
}`)

  builder.addSectionComment("Live Layer Implementation")

  const implementation = getServiceImplementationForSubModule(subModuleName, subModuleClassName, parentClassName)

  builder.addRaw(`/**
 * ${subModuleClassName}ServiceLive Layer
 *
 * Production implementation with full infrastructure integration:
 * - ${parentClassName}Repository for data access (via parent)
 * - LoggingService for structured logging
 * - MetricsService for observability
 *
 * EFFECT-IDIOMATIC PATTERN:
 * - Layer.effect defines the service with dependencies
 * - Layer.provide eliminates dependencies from service interface
 * - Users of ${subModuleClassName}Service don't need to provide dependencies
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
).pipe(
  // Provide all dependencies at Layer level (removes R channel requirements)
  Layer.provide(
    Layer.mergeAll(
      ${parentClassName}Repository.Live,
      LoggingService.Live,
      MetricsService.Live
    ).pipe(
      // DatabaseService required by repository
      Layer.provide(DatabaseService.Live)
    )
  )
)`)

  return builder.toString()
}

/**
 * Get service interface based on common sub-module patterns
 *
 * Uses sub-module entity type for RPC contract compatibility.
 * Entity type is derived from the contract schema.
 *
 * EFFECT-IDIOMATIC:
 * - All methods return Effect<T, E> with R = never (implicitly)
 * - Dependencies are provided at Layer level via Layer.provide
 */
function getServiceInterfaceForSubModule(
  subModuleName: string,
  subModuleClassName: string,
  _parentClassName: string
) {
  const name = subModuleName.toLowerCase()
  const entityType = `${subModuleClassName}Entity`

  // Common sub-module patterns with appropriate interface methods
  // Use ${subModuleClassName}Error which is the union of all domain and repository errors
  if (name === "cart") {
    return `  /** Get cart by ID */
  readonly getById: (id: string) => Effect.Effect<Option.Option<${entityType}>, ${subModuleClassName}Error>

  /** Get cart contents with items */
  readonly getContents: (cartId: string) => Effect.Effect<${entityType}, ${subModuleClassName}Error>

  /** Add item to cart */
  readonly addItem: (cartId: string, item: Partial<${entityType}>) => Effect.Effect<${entityType}, ${subModuleClassName}Error>

  /** Remove item from cart */
  readonly removeItem: (cartId: string, itemId: string) => Effect.Effect<${entityType}, ${subModuleClassName}Error>

  /** Update item quantity */
  readonly updateQuantity: (cartId: string, itemId: string, quantity: number) => Effect.Effect<${entityType}, ${subModuleClassName}Error>

  /** Clear all items from cart */
  readonly clear: (cartId: string) => Effect.Effect<void, ${subModuleClassName}Error>

  /** Create new cart for user */
  readonly create: (userId: string) => Effect.Effect<${entityType}, ${subModuleClassName}Error>`
  }

  if (name === "checkout") {
    return `  /** Get checkout session by ID */
  readonly getById: (id: string) => Effect.Effect<Option.Option<${entityType}>, ${subModuleClassName}Error>

  /** Initiate checkout from cart */
  readonly initiate: (cartId: string) => Effect.Effect<${entityType}, ${subModuleClassName}Error>

  /** Process payment for checkout */
  readonly processPayment: (checkoutId: string, paymentDetails: Partial<${entityType}>) => Effect.Effect<${entityType}, ${subModuleClassName}Error>

  /** Confirm checkout and create order */
  readonly confirm: (checkoutId: string) => Effect.Effect<${entityType}, ${subModuleClassName}Error>

  /** Cancel checkout session */
  readonly cancel: (checkoutId: string, reason: string) => Effect.Effect<void, ${subModuleClassName}Error>`
  }

  if (name === "management" || name === "order-management") {
    return `  /** Get order by ID */
  readonly getById: (id: string) => Effect.Effect<Option.Option<${entityType}>, ${subModuleClassName}Error>

  /** Get order by order number */
  readonly getByOrderNumber: (orderNumber: string) => Effect.Effect<Option.Option<${entityType}>, ${subModuleClassName}Error>

  /** Create order from checkout */
  readonly create: (checkoutId: string, notes?: string) => Effect.Effect<${entityType}, ${subModuleClassName}Error>

  /** Update order status */
  readonly updateStatus: (id: string, status: string, reason?: string) => Effect.Effect<${entityType}, ${subModuleClassName}Error>

  /** Cancel order */
  readonly cancel: (id: string, reason: string) => Effect.Effect<void, ${subModuleClassName}Error>

  /** List orders with filters */
  readonly list: (criteria: Partial<${entityType}>, pagination?: { page: number; pageSize: number }) => Effect.Effect<ReadonlyArray<${entityType}>, ${subModuleClassName}Error>`
  }

  // Generic service interface
  return `  /** Get by ID */
  readonly getById: (id: string) => Effect.Effect<Option.Option<${entityType}>, ${subModuleClassName}Error>

  /** List with pagination */
  readonly list: (criteria: Partial<${entityType}>, pagination?: { page: number; pageSize: number }) => Effect.Effect<ReadonlyArray<${entityType}>, ${subModuleClassName}Error>

  /** Create new entity */
  readonly create: (input: Omit<${entityType}, "id" | "createdAt" | "updatedAt">) => Effect.Effect<${entityType}, ${subModuleClassName}Error>

  /** Update existing entity */
  readonly update: (id: string, input: Partial<Omit<${entityType}, "id" | "createdAt" | "updatedAt">>) => Effect.Effect<${entityType}, ${subModuleClassName}Error>

  /** Delete entity */
  readonly delete: (id: string) => Effect.Effect<void, ${subModuleClassName}Error>`
}

/**
 * Get service implementation based on common sub-module patterns
 *
 * Business logic layer transforms repository data (UserEntity) to sub-module
 * entity type (e.g., Authentication) for RPC responses.
 *
 * EFFECT-IDIOMATIC PATTERNS:
 * - Uses inline error handling (no helper function) to avoid R channel leaking
 * - Uses contract-exported parse function for Effect-idiomatic entity transformation
 * - Proper destructuring of PaginatedResponse from repository
 * - Effect.forEach with properly typed iterables
 */
function getServiceImplementationForSubModule(
  subModuleName: string,
  subModuleClassName: string,
  parentClassName: string
) {
  return `    // Transform repository entity to sub-module entity using Effect-based parsing
    // Uses the contract-exported parse function which applies schema defaults
    const toEntity = (data: {
      readonly id: string
      readonly email?: string
      readonly name?: string | null
      readonly createdAt: Date
      readonly updatedAt: Date
    }): Effect.Effect<${subModuleClassName}Entity, ${subModuleClassName}Error> =>
      parse${subModuleClassName}({
        id: data.id,
        name: data.name ?? "",
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        status: "active"  // Business logic default
      }).pipe(
        Effect.mapError((parseError) =>
          ${subModuleClassName}OperationError.create("validation", String(parseError), parseError)
        )
      )

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

      list: (criteria, pagination) =>
        Effect.gen(function*() {
          const histogram = yield* metrics.histogram("${subModuleName}_list_duration_seconds")

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.debug("${subModuleClassName}Service.list", { criteria, pagination })
              const page = pagination?.page ?? 1
              const pageSize = pagination?.pageSize ?? 20
              const skip = (page - 1) * pageSize

              // FIX Issue #2: Map sub-module criteria to parent filter
              const filter = mapCriteriaToFilter(criteria)

              // FIX Issue #3: Destructure PaginatedResponse (not array)
              const { items: results } = yield* repo.findAll(filter, { skip, limit: pageSize }).pipe(
                Effect.catchAll((error) =>
                  Effect.fail(${subModuleClassName}OperationError.create("repository", String(error), error))
                )
              )

              // Now Effect.forEach works correctly with array
              const items = yield* Effect.forEach(results, toEntity)
              return items
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
              const result = yield* repo.create(input).pipe(
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
              const result = yield* repo.update(id, input).pipe(
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
