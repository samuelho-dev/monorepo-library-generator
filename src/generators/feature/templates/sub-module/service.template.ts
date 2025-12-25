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
Integrates with infrastructure services (Logging, Metrics) and data-access layer.`,
    module: `${scope}/feature-${parentFileName}/server/services/${subModuleName}`
  })
  builder.addBlankLine()

  builder.addRaw(`import { Context, Effect, Layer, type Option } from "effect"`)
  builder.addBlankLine()

  builder.addSectionComment("Contract Imports (Contract-First Architecture)")
  builder.addComment("Errors are the SINGLE SOURCE OF TRUTH from contract library")
  builder.addRaw(`import {
  ${subModuleClassName}OperationError,
  type ${subModuleClassName}Error,
} from "${scope}/contract-${parentFileName}/${subModuleName}";`)
  builder.addBlankLine()

  builder.addSectionComment("Data Access Imports")
  builder.addRaw(
    `import { ${subModuleClassName}Repository } from "${scope}/data-access-${parentFileName}/${subModuleName}";`
  )
  builder.addBlankLine()

  builder.addSectionComment("Infrastructure Imports")
  builder.addImports([
    { from: `${scope}/infra-observability`, imports: ["LoggingService", "MetricsService"] }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Re-export Errors (Contract-First)")
  builder.addComment("Re-export errors from contract for convenience")
  builder.addRaw(`export {
  ${subModuleClassName}NotFoundError,
  ${subModuleClassName}ValidationError,
  ${subModuleClassName}OperationError,
  ${subModuleClassName}ServiceError,
  type ${subModuleClassName}DomainError,
  type ${subModuleClassName}RepositoryError,
  type ${subModuleClassName}Error,
} from "${scope}/contract-${parentFileName}/${subModuleName}";`)
  builder.addBlankLine()

  builder.addSectionComment("Service Interface")
  builder.addBlankLine()

  // Generate interface based on common sub-module patterns
  const serviceInterface = getServiceInterfaceForSubModule(subModuleName, subModuleClassName)

  builder.addRaw(`/**
 * ${subModuleClassName}Service interface
 *
 * Business logic layer for ${subModuleName} within the ${parentName} feature.
 * Coordinates with repository and publishes domain events.
 */
export interface ${subModuleClassName}ServiceInterface {
${serviceInterface}
}`)
  builder.addBlankLine()

  builder.addSectionComment("Context.Tag Definition (Class Pattern)")
  builder.addBlankLine()

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
  builder.addBlankLine()

  builder.addSectionComment("Live Layer Implementation")
  builder.addBlankLine()

  const implementation = getServiceImplementationForSubModule(subModuleName, subModuleClassName)

  builder.addRaw(`/**
 * ${subModuleClassName}ServiceLive Layer
 *
 * Production implementation with full infrastructure integration:
 * - ${subModuleClassName}Repository for data access
 * - LoggingService for structured logging
 * - MetricsService for observability
 */
export const ${subModuleClassName}ServiceLive = Layer.effect(
  ${subModuleClassName}Service,
  Effect.gen(function*() {
    const repo = yield* ${subModuleClassName}Repository;
    const logger = yield* LoggingService;
    const metrics = yield* MetricsService;

    yield* logger.debug("${subModuleClassName}Service initialized");

${implementation}
  })
);`)
  builder.addBlankLine()

  return builder.toString()
}

/**
 * Get service interface based on common sub-module patterns
 */
function getServiceInterfaceForSubModule(
  subModuleName: string,
  subModuleClassName: string
) {
  const name = subModuleName.toLowerCase()

  // Common sub-module patterns with appropriate interface methods
  // Use ${subModuleClassName}Error which is the union of all domain and repository errors
  if (name === "cart") {
    return `  /** Get cart by ID */
  readonly getById: (id: string) => Effect.Effect<Option.Option<unknown>, ${subModuleClassName}Error>;

  /** Get cart contents with items */
  readonly getContents: (cartId: string) => Effect.Effect<unknown, ${subModuleClassName}Error>;

  /** Add item to cart */
  readonly addItem: (cartId: string, item: unknown) => Effect.Effect<unknown, ${subModuleClassName}Error>;

  /** Remove item from cart */
  readonly removeItem: (cartId: string, itemId: string) => Effect.Effect<unknown, ${subModuleClassName}Error>;

  /** Update item quantity */
  readonly updateQuantity: (cartId: string, itemId: string, quantity: number) => Effect.Effect<unknown, ${subModuleClassName}Error>;

  /** Clear all items from cart */
  readonly clear: (cartId: string) => Effect.Effect<void, ${subModuleClassName}Error>;

  /** Create new cart for user */
  readonly create: (userId: string) => Effect.Effect<unknown, ${subModuleClassName}Error>;`
  }

  if (name === "checkout") {
    return `  /** Get checkout session by ID */
  readonly getById: (id: string) => Effect.Effect<Option.Option<unknown>, ${subModuleClassName}Error>;

  /** Initiate checkout from cart */
  readonly initiate: (cartId: string) => Effect.Effect<unknown, ${subModuleClassName}Error>;

  /** Process payment for checkout */
  readonly processPayment: (checkoutId: string, paymentDetails: unknown) => Effect.Effect<unknown, ${subModuleClassName}Error>;

  /** Confirm checkout and create order */
  readonly confirm: (checkoutId: string) => Effect.Effect<unknown, ${subModuleClassName}Error>;

  /** Cancel checkout session */
  readonly cancel: (checkoutId: string, reason: string) => Effect.Effect<void, ${subModuleClassName}Error>;`
  }

  if (name === "management" || name === "order-management") {
    return `  /** Get order by ID */
  readonly getById: (id: string) => Effect.Effect<Option.Option<unknown>, ${subModuleClassName}Error>;

  /** Get order by order number */
  readonly getByOrderNumber: (orderNumber: string) => Effect.Effect<Option.Option<unknown>, ${subModuleClassName}Error>;

  /** Create order from checkout */
  readonly create: (checkoutId: string, notes?: string) => Effect.Effect<unknown, ${subModuleClassName}Error>;

  /** Update order status */
  readonly updateStatus: (id: string, status: string, reason?: string) => Effect.Effect<unknown, ${subModuleClassName}Error>;

  /** Cancel order */
  readonly cancel: (id: string, reason: string) => Effect.Effect<void, ${subModuleClassName}Error>;

  /** List orders with filters */
  readonly list: (criteria: unknown, pagination?: { page: number; pageSize: number }) => Effect.Effect<unknown, ${subModuleClassName}Error>;`
  }

  // Generic service interface
  return `  /** Get by ID */
  readonly getById: (id: string) => Effect.Effect<Option.Option<unknown>, ${subModuleClassName}Error>;

  /** List with pagination */
  readonly list: (criteria: unknown, pagination?: { page: number; pageSize: number }) => Effect.Effect<unknown, ${subModuleClassName}Error>;

  /** Create new entity */
  readonly create: (input: unknown) => Effect.Effect<unknown, ${subModuleClassName}Error>;

  /** Update existing entity */
  readonly update: (id: string, input: unknown) => Effect.Effect<unknown, ${subModuleClassName}Error>;

  /** Delete entity */
  readonly delete: (id: string) => Effect.Effect<void, ${subModuleClassName}Error>;`
}

/**
 * Get service implementation based on common sub-module patterns
 *
 * Implementation satisfies the interface by:
 * 1. Using type assertion on the return object to match interface
 * 2. Wrapping repo calls which may have different error types
 */
function getServiceImplementationForSubModule(
  subModuleName: string,
  subModuleClassName: string
) {
  return `    // Map repository errors to service errors using Effect.catchAll
    // Repository errors are Data.TaggedError - use String() to extract message
    const mapRepoError = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
      effect.pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            ${subModuleClassName}OperationError.create(
              "repository",
              String(error),
              error
            )
          )
        )
      );

    return {
      getById: (id) =>
        Effect.gen(function*() {
          const histogram = yield* metrics.histogram("${subModuleName}_get_duration_seconds");

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.debug("${subModuleClassName}Service.getById", { id });
              return yield* mapRepoError(repo.findById(id));
            })
          );
        }).pipe(Effect.withSpan("${subModuleClassName}Service.getById")),

      list: (criteria, pagination) =>
        Effect.gen(function*() {
          const histogram = yield* metrics.histogram("${subModuleName}_list_duration_seconds");

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.debug("${subModuleClassName}Service.list", { criteria, pagination });
              const skip = pagination ? (pagination.page - 1) * pagination.pageSize : 0;
              const limit = pagination?.pageSize ?? 20;
              return yield* mapRepoError(repo.findAll(criteria, { skip, limit }));
            })
          );
        }).pipe(Effect.withSpan("${subModuleClassName}Service.list")),

      create: (input) =>
        Effect.gen(function*() {
          const counter = yield* metrics.counter("${subModuleName}_created_total");
          const histogram = yield* metrics.histogram("${subModuleName}_create_duration_seconds");

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.info("${subModuleClassName}Service.create", { input });
              const result = yield* mapRepoError(repo.create(input));
              yield* counter.increment;
              return result;
            })
          );
        }).pipe(Effect.withSpan("${subModuleClassName}Service.create")),

      update: (id, input) =>
        Effect.gen(function*() {
          const counter = yield* metrics.counter("${subModuleName}_updated_total");
          const histogram = yield* metrics.histogram("${subModuleName}_update_duration_seconds");

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.info("${subModuleClassName}Service.update", { id, input });
              const result = yield* mapRepoError(repo.update(id, input));
              yield* counter.increment;
              return result;
            })
          );
        }).pipe(Effect.withSpan("${subModuleClassName}Service.update")),

      delete: (id) =>
        Effect.gen(function*() {
          const counter = yield* metrics.counter("${subModuleName}_deleted_total");
          const histogram = yield* metrics.histogram("${subModuleName}_delete_duration_seconds");

          return yield* histogram.timer(
            Effect.gen(function*() {
              yield* logger.info("${subModuleClassName}Service.delete", { id });
              yield* mapRepoError(repo.delete(id));
              yield* counter.increment;
            })
          );
        }).pipe(Effect.withSpan("${subModuleClassName}Service.delete")),
    } satisfies ${subModuleClassName}ServiceInterface`
}
