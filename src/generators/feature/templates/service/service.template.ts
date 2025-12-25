/**
 * Feature Service Template
 *
 * Generates server/services/service.ts with Context.Tag definition
 *
 * @module monorepo-library-generator/feature/service/service-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import { createNamingVariants } from "../../../../utils/naming"
import type { FeatureTemplateOptions } from "../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

/**
 * Generate server/services/service.ts file
 *
 * Creates Context.Tag interface with static layers
 * Includes LoggingService and MetricsService integration
 */
export function generateFeatureServiceFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, name } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Service Interface`,
    description: `Context.Tag definition for ${className}Service.

Includes:
- LoggingService for structured logging
- MetricsService for observability
- Distributed tracing via Effect.withSpan()

Operations are split into separate files for optimal tree-shaking.
Import only the operations you need for smallest bundle size.`,
    module: `${scope}/feature-${fileName}/server/services`
  })
  builder.addBlankLine()

  builder.addImports([
    { from: "effect", imports: ["Effect", "Layer", "Context", "Option", "Schema"] }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Error Imports (Contract-First)")
  builder.addComment("Domain errors pass through unchanged")
  builder.addComment("Infrastructure errors are caught and mapped to ServiceError")

  // Domain errors from shared/errors (pass through unchanged)
  // Note: PermissionError is handled at handler/middleware layer, not service layer
  builder.addImports([
    {
      from: "../../shared/errors",
      imports: [
        `${className}NotFoundError`,
        `${className}ValidationError`,
        `${className}AlreadyExistsError`,
        `${className}ServiceError`
      ]
    },
    {
      from: "../../shared/errors",
      imports: [`${className}FeatureError`],
      isTypeOnly: true
    }
  ])
  builder.addBlankLine()

  // Repository errors from contract (need to be mapped to domain errors)
  // Note: Import individual error types, NOT the union type (UserRepositoryError)
  // because Effect.catchTags requires specific tagged error types
  builder.addImports([
    {
      from: `${scope}/contract-${fileName}`,
      imports: [
        `${className}NotFoundRepositoryError`,
        `${className}ValidationRepositoryError`,
        `${className}ConflictRepositoryError`,
        `${className}DatabaseRepositoryError`
      ],
      isTypeOnly: true
    }
  ])
  builder.addBlankLine()

  // Infrastructure errors from data-access
  builder.addImports([
    {
      from: `${scope}/data-access-${fileName}`,
      imports: [
        `${className}TimeoutError`,
        `${className}ConnectionError`,
        `${className}TransactionError`
      ],
      isTypeOnly: true
    }
  ])
  builder.addBlankLine()

  // Database service errors from infra-database
  builder.addImports([
    {
      from: `${scope}/infra-database`,
      imports: [
        "DatabaseError",
        "DatabaseInternalError",
        "DatabaseConfigError",
        "DatabaseConnectionError",
        "DatabaseTimeoutError"
      ],
      isTypeOnly: true
    }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Repository Integration")
  builder.addImports([
    { from: `${scope}/data-access-${fileName}`, imports: [`${className}Repository`] },
    { from: `${scope}/infra-database`, imports: ["DatabaseService"] }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Infrastructure Services")
  builder.addImports([
    { from: `${scope}/infra-observability`, imports: ["LoggingService", "MetricsService"] },
    { from: `${scope}/infra-pubsub`, imports: ["PubsubService", "withEventPublishing"] },
    { from: `${scope}/infra-pubsub`, imports: ["TopicHandle"], isTypeOnly: true }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Environment Configuration")
  builder.addRaw(`import { env } from "${scope}/env";`)
  builder.addBlankLine()

  builder.addSectionComment("Repository Type Re-exports")
  builder.addBlankLine()

  builder.addImports([
    {
      from: `${scope}/data-access-${fileName}`,
      imports: [
        `${className}`,
        `${className}CreateInput`,
        `${className}UpdateInput`,
        `${className}Filter`
      ],
      isTypeOnly: true
    }
  ])
  builder.addRaw(`
export type { ${className}, ${className}CreateInput, ${className}UpdateInput, ${className}Filter };`)
  builder.addBlankLine()

  builder.addSectionComment("Event Schema")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} Event Schema
 *
 * Used with withEventPublishing helper for type-safe event publishing.
 */
const ${className}EventSchema = Schema.Union(
  Schema.Struct({
    type: Schema.Literal("${className}Created"),
    id: Schema.String,
    timestamp: Schema.DateFromSelf
  }),
  Schema.Struct({
    type: Schema.Literal("${className}Updated"),
    id: Schema.String,
    timestamp: Schema.DateFromSelf
  }),
  Schema.Struct({
    type: Schema.Literal("${className}Deleted"),
    id: Schema.String,
    timestamp: Schema.DateFromSelf
  })
);

type ${className}Event = Schema.Schema.Type<typeof ${className}EventSchema>;`)
  builder.addBlankLine()

  builder.addSectionComment("Service Implementation")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Repository error type union (from data-access layer)
 *
 * This is the complete set of errors that repository operations can produce.
 * Each error type is explicitly listed (not using union type aliases) because
 * Effect.catchTags requires specific tagged error types to work properly.
 */
type ${className}RepoError =
  // Repository-specific errors (from contract)
  | ${className}NotFoundRepositoryError
  | ${className}ValidationRepositoryError
  | ${className}ConflictRepositoryError
  | ${className}DatabaseRepositoryError
  // Infrastructure errors (from data-access)
  | ${className}TimeoutError
  | ${className}ConnectionError
  | ${className}TransactionError
  // Database service errors (from infra-database)
  | DatabaseError
  | DatabaseInternalError
  | DatabaseConfigError
  | DatabaseConnectionError
  | DatabaseTimeoutError;

/**
 * Map repository errors to feature errors
 *
 * ERROR TRANSLATION:
 * - Repository NotFound → Domain NotFound
 * - Repository Validation → Domain Validation
 * - Repository Conflict → Domain AlreadyExists
 * - Repository Database → Service dependency error
 * - Infrastructure errors → Service dependency/internal errors
 *
 * Uses Effect.catchTags for type-safe, exhaustive error handling.
 */
const mapRepoErrors = <A, R>(
  effect: Effect.Effect<A, ${className}RepoError, R>,
  operation: string
): Effect.Effect<A, ${className}FeatureError, R> =>
  effect.pipe(
    // Map repository errors to domain errors
    Effect.catchTags({
      "${className}NotFoundRepositoryError": (error) =>
        Effect.fail(new ${className}NotFoundError({
          message: error.message,
          ${name}Id: error.${name}Id
        })),
      "${className}ValidationRepositoryError": (error) =>
        Effect.fail(new ${className}ValidationError({
          message: error.message,
          field: error.field
        })),
      "${className}ConflictRepositoryError": (error) =>
        Effect.fail(new ${className}AlreadyExistsError({
          message: error.message,
          identifier: error.identifier
        })),
      "${className}DatabaseRepositoryError": (error) =>
        Effect.fail(${className}ServiceError.dependency(operation, error.message, error)),
    }),
    // Map infrastructure errors to service errors
    Effect.catchTags({
      "${className}TimeoutError": (error) =>
        Effect.fail(${className}ServiceError.dependency(
          operation,
          \`Operation timed out after \${error.timeoutMs}ms\`,
          error
        )),
      "${className}ConnectionError": (error) =>
        Effect.fail(${className}ServiceError.dependency(
          operation,
          \`Connection to \${error.target} failed\`,
          error
        )),
      "${className}TransactionError": (error) =>
        Effect.fail(${className}ServiceError.dependency(
          operation,
          \`Transaction \${error.phase} failed\`,
          error
        )),
    }),
    // Map database service errors
    Effect.catchTags({
      "DatabaseError": (error) =>
        Effect.fail(${className}ServiceError.dependency(operation, "Database operation failed", error)),
      "DatabaseInternalError": (error) =>
        Effect.fail(${className}ServiceError.internal(operation, "Database internal error", error)),
      "DatabaseConfigError": (error) =>
        Effect.fail(${className}ServiceError.dependency(operation, "Database configuration error", error)),
      "DatabaseConnectionError": (error) =>
        Effect.fail(${className}ServiceError.dependency(operation, "Database connection failed", error)),
      "DatabaseTimeoutError": (error) =>
        Effect.fail(${className}ServiceError.dependency(operation, "Database operation timed out", error)),
    }),
    // Log errors for observability
    Effect.tapError((error) =>
      Effect.logWarning(\`\${operation} failed\`, {
        errorTag: error._tag,
        operation,
      })
    )
  );

/**
 * Create service implementation
 *
 * Note: Return type is inferred by TypeScript. The Context.Tag ensures
 * the implementation matches ${className}ServiceInterface.
 */
const createServiceImpl = (
  repo: Context.Tag.Service<typeof ${className}Repository>,
  logger: Context.Tag.Service<typeof LoggingService>,
  metrics: Context.Tag.Service<typeof MetricsService>,
  eventTopic: TopicHandle<${className}Event>
) => ({
  get: (id: string) =>
    Effect.gen(function*() {
      const histogram = yield* metrics.histogram("${name.toLowerCase()}_get_duration_seconds");

      return yield* histogram.timer(
        Effect.gen(function*() {
          yield* logger.debug("${className}Service.get", { id });

          const result = yield* mapRepoErrors(
            repo.findById(id),
            "get"
          );

          if (Option.isNone(result)) {
            yield* logger.debug("${className} not found", { id });
          }

          return result;
        })
      );
    }).pipe(Effect.withSpan("${className}Service.get", { attributes: { id } })),

  findByCriteria: (
    criteria: ${className}Filter,
    offset: number,
    limit: number
  ) =>
    Effect.gen(function*() {
      const histogram = yield* metrics.histogram("${name.toLowerCase()}_list_duration_seconds");

      return yield* histogram.timer(
        Effect.gen(function*() {
          yield* logger.debug("${className}Service.findByCriteria", {
            criteria,
            offset,
            limit,
          });

          const result = yield* mapRepoErrors(
            repo.findAll(criteria, { skip: offset, limit }).pipe(
              Effect.map((result) => result.items)
            ),
            "findByCriteria"
          );

          yield* logger.debug("${className}Service.findByCriteria completed", {
            count: result.length,
          });

          return result;
        })
      );
    }).pipe(Effect.withSpan("${className}Service.findByCriteria")),

  count: (criteria: ${className}Filter) =>
    Effect.gen(function*() {
      yield* logger.debug("${className}Service.count", { criteria });

      return yield* mapRepoErrors(
        repo.count(criteria),
        "count"
      );
    }).pipe(Effect.withSpan("${className}Service.count")),

  create: (input: ${className}CreateInput) =>
    Effect.gen(function*() {
      const counter = yield* metrics.counter("${name.toLowerCase()}_created_total");
      const histogram = yield* metrics.histogram("${name.toLowerCase()}_create_duration_seconds");

      return yield* histogram.timer(
        withEventPublishing(
          Effect.gen(function*() {
            yield* logger.info("${className}Service.create", { input });

            const result = yield* mapRepoErrors(
              repo.create(input),
              "create"
            );

            yield* counter.increment;
            yield* logger.info("${className} created", { id: result.id });

            return result;
          }),
          (result) => ({ type: "${className}Created" as const, id: result.id, timestamp: new Date() }),
          eventTopic
        )
      );
    }).pipe(Effect.withSpan("${className}Service.create")),

  update: (id: string, input: ${className}UpdateInput) =>
    Effect.gen(function*() {
      const counter = yield* metrics.counter("${name.toLowerCase()}_updated_total");
      const histogram = yield* metrics.histogram("${name.toLowerCase()}_update_duration_seconds");

      return yield* histogram.timer(
        withEventPublishing(
          Effect.gen(function*() {
            yield* logger.info("${className}Service.update", { id, input });

            const result = yield* mapRepoErrors(
              repo.update(id, input).pipe(Effect.map(Option.some)),
              "update"
            );

            yield* counter.increment;
            yield* logger.info("${className} updated", { id });

            return result;
          }),
          () => ({ type: "${className}Updated" as const, id, timestamp: new Date() }),
          eventTopic
        )
      );
    }).pipe(Effect.withSpan("${className}Service.update", { attributes: { id } })),

  delete: (id: string) =>
    Effect.gen(function*() {
      const counter = yield* metrics.counter("${name.toLowerCase()}_deleted_total");
      const histogram = yield* metrics.histogram("${name.toLowerCase()}_delete_duration_seconds");

      return yield* histogram.timer(
        withEventPublishing(
          Effect.gen(function*() {
            yield* logger.info("${className}Service.delete", { id });

            yield* mapRepoErrors(
              repo.delete(id),
              "delete"
            );

            yield* counter.increment;
            yield* logger.info("${className} deleted", { id });
          }),
          () => ({ type: "${className}Deleted" as const, id, timestamp: new Date() }),
          eventTopic
        )
      );
    }).pipe(Effect.withSpan("${className}Service.delete", { attributes: { id } })),

  exists: (id: string) =>
    Effect.gen(function*() {
      yield* logger.debug("${className}Service.exists", { id });

      return yield* mapRepoErrors(
        repo.exists(id),
        "exists"
      );
    }).pipe(Effect.withSpan("${className}Service.exists", { attributes: { id } })),
});`)
  builder.addBlankLine()

  builder.addSectionComment("Service Interface (Inferred from Implementation)")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} Service Interface
 *
 * The interface type is INFERRED from the implementation (createServiceImpl).
 * This ensures the interface always matches the actual implementation types,
 * including proper Effect requirements and error types.
 */
export type ${className}ServiceInterface = ReturnType<typeof createServiceImpl>`)
  builder.addBlankLine()

  builder.addSectionComment("Context.Tag")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} Service Context.Tag
 *
 * Effect's Context.Tag pattern validates at compile-time that the Layer
 * provides an object matching ${className}ServiceInterface.
 *
 * Event publishing is handled inline using withEventPublishing helper.
 */
export class ${className}Service extends Context.Tag("${className}Service")<
  ${className}Service,
  ${className}ServiceInterface
>() {
  /**
   * Live layer - Production implementation
   *
   * Events are published inline using withEventPublishing helper:
   * - create() → ${className}Created
   * - update() → ${className}Updated
   * - delete() → ${className}Deleted
   *
   * Requires: ${className}Repository, LoggingService, MetricsService, PubsubService
   */
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function*() {
      const repo = yield* ${className}Repository
      const logger = yield* LoggingService
      const metrics = yield* MetricsService
      const pubsub = yield* PubsubService
      const eventTopic = yield* pubsub.topic("${name.toLowerCase()}-events", ${className}EventSchema)

      return createServiceImpl(repo, logger, metrics, eventTopic)
    })
  )

  /**
   * Test layer - Same as Live
   *
   * Testing is done by composing with test infrastructure layers
   * (e.g., DatabaseService.Test, LoggingService.Test) rather than
   * a separate implementation.
   */
  static readonly Test = this.Live;

  /**
   * Dev layer - Development with enhanced logging
   *
   * Same as Live - enhanced logging comes from LoggingService.Dev
   * when composing layers for development environment.
   */
  static readonly Dev = this.Live;

  /**
   * Auto layer - Environment-aware layer selection
   *
   * Automatically selects the appropriate layer based on env.NODE_ENV:
   * - "production" → Live layer
   * - "development" → Dev layer (with logging)
   * - "test" → Test layer
   * - undefined/other → Live layer (default)
   *
   * Requires: import { env } from "@scope/env";
   */
  static readonly Auto = Layer.suspend(() => {
    switch (env.NODE_ENV) {
      case "test":
        return ${className}Service.Test;
      case "development":
        return ${className}Service.Dev;
      default:
        return ${className}Service.Live;
    }
  });

  /**
   * Fully composed layer with all production dependencies
   */
  static readonly Layer = ${className}Service.Live.pipe(
    Layer.provide(${className}Repository.Live),
    Layer.provide(DatabaseService.Live),
    Layer.provide(LoggingService.Live),
    Layer.provide(MetricsService.Live),
    Layer.provide(PubsubService.Live)
  )

  /**
   * Test composed layer with test infrastructure
   */
  static readonly TestLayer = ${className}Service.Test.pipe(
    Layer.provide(${className}Repository.Test),
    Layer.provide(DatabaseService.Test),
    Layer.provide(LoggingService.Test),
    Layer.provide(MetricsService.Test),
    Layer.provide(PubsubService.Test)
  )
}`)
  builder.addBlankLine()

  // Generate sub-module re-exports if subModules are provided
  if (options.subModules && options.subModules.length > 0) {
    builder.addSectionComment("Sub-Module Re-exports")
    builder.addBlankLine()

    builder.addRaw(`// Re-export sub-module services for convenient access
// Use these for direct sub-module access or parent service composition`)
    builder.addBlankLine()

    for (const subModule of options.subModules) {
      const subClassName = createNamingVariants(subModule).className
      // Sub-modules are in sibling directories: ./authentication/, ./profile/, etc.
      builder.addRaw(
        `export { ${subClassName}Service, ${subClassName}Live, ${subClassName}Test } from "./${subModule}";`
      )
    }
    builder.addBlankLine()
  }

  return builder.toString()
}
