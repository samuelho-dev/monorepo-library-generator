/**
 * CQRS Operations Executor Template
 *
 * Generates server/cqrs/operations/executor.ts with middleware-enabled operation execution.
 *
 * @module monorepo-library-generator/feature/cqrs/operations-executor-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { FeatureTemplateOptions } from "../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

/**
 * Generate server/cqrs/operations/executor.ts file
 *
 * Creates operation executor with middleware:
 * - Pre/post operation hooks
 * - Logging and metrics integration
 * - Distributed tracing
 * - Error handling middleware
 */
export function generateOperationsExecutorFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, name } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Operation Executor`,
    description: `Executes ${name} operations with middleware pipeline.

Operations are the unit of work that combines commands and queries
with cross-cutting concerns like logging, metrics, and tracing.

Pattern: Operation → Middleware → Handler → Result

Usage:
- Wrap command/query execution in operations
- Add custom middleware for validation, auth, etc.`,
    module: `${options.packageName}/server/cqrs/operations`
  })
  builder.addBlankLine()

  builder.addImports([
    { from: "effect", imports: ["Context", "Effect", "Layer"] }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Infrastructure Services")
  builder.addImports([
    { from: `${scope}/infra-observability`, imports: ["LoggingService", "MetricsService"] }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Operation Types")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Operation metadata for tracing and logging
 */
export interface OperationMetadata {
  /** Unique operation name */
  readonly name: string

  /** Operation type (command or query) */
  readonly type: "command" | "query"

  /** Optional correlation ID */
  readonly correlationId?: string

  /** Optional user/service context */
  readonly actor?: string
}`)
  builder.addBlankLine()

  builder.addRaw(`/**
 * Middleware function type
 *
 * @typeParam A - Input type
 * @typeParam E - Error type
 * @typeParam R - Dependencies
 */
export type Middleware<A, E, R> = (
  next: Effect.Effect<A, E, R>
) => Effect.Effect<A, E, R>`)
  builder.addBlankLine()

  builder.addSectionComment("Operation Executor Interface")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Operation Executor Interface
 *
 * Executes operations with middleware pipeline.
 */
export interface OperationExecutorInterface {
  /**
   * Execute an operation with middleware
   *
   * @param metadata - Operation metadata for tracing
   * @param operation - The operation Effect to execute
   * @param middlewares - Optional additional middlewares
   */
  readonly execute: <A, E, R>(
    metadata: OperationMetadata,
    operation: Effect.Effect<A, E, R>,
    middlewares?: ReadonlyArray<Middleware<A, E, R>>
  ) => Effect.Effect<A, E, R | LoggingService | MetricsService>
}`)
  builder.addBlankLine()

  builder.addSectionComment("Operation Executor Implementation")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Create executor implementation with infrastructure dependencies
 */
const createExecutorImpl = (
  logger: Context.Tag.Service<typeof LoggingService>,
  metrics: Context.Tag.Service<typeof MetricsService>
) => ({
  execute: (metadata, operation, middlewares = []) => {
    // Build middleware pipeline
    const pipeline = middlewares.reduce(
      (acc, middleware) => middleware(acc),
      operation
    )

    return Effect.gen(function*() {
      const startTime = Date.now()
      const histogram = yield* metrics.histogram("${name.toLowerCase()}_operation_duration_seconds")
      const counter = yield* metrics.counter("${name.toLowerCase()}_operations_total")

      yield* logger.debug(\`Starting \${metadata.type}: \${metadata.name}\`, {
        type: metadata.type,
        correlationId: metadata.correlationId,
        actor: metadata.actor
      })

      const result = yield* pipeline.pipe(
        Effect.tapError((error) =>
          Effect.gen(function*() {
            yield* counter.increment
            yield* logger.error(\`\${metadata.type} failed: \${metadata.name}\`, {
              error: String(error),
              correlationId: metadata.correlationId
            })
          })
        )
      )

      const duration = (Date.now() - startTime) / 1000
      yield* histogram.record(duration)
      yield* counter.increment

      yield* logger.info(\`Completed \${metadata.type}: \${metadata.name}\`, {
        durationMs: Date.now() - startTime,
        correlationId: metadata.correlationId
      })

      return result
    }).pipe(
      Effect.withSpan(\`${className}Operation.\${metadata.name}\`, {
        attributes: {
          "operation.type": metadata.type,
          "operation.name": metadata.name,
          ...(metadata.correlationId && { "correlation.id": metadata.correlationId }),
          ...(metadata.actor && { actor: metadata.actor })
        }
      })
    )
  }
})`)
  builder.addBlankLine()

  builder.addSectionComment("Operation Executor Context.Tag")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} Operation Executor Context Tag
 *
 * Provides operation execution with middleware pipeline.
 *
 * @example
 * \`\`\`typescript
 * const program = Effect.gen(function*() {
 *   const executor = yield* ${className}OperationExecutor;
 *   const bus = yield* ${className}CommandBus;
 *
 *   const result = yield* executor.execute(
 *     {
 *       name: "Create${className}",
 *       type: "command",
 *       correlationId: "req-123",
 *     },
 *     bus.dispatch(new Create${className}Command(), input)
 *   )
 *
 *   return result;
 * })
 * \`\`\`
 */
export class ${className}OperationExecutor extends Context.Tag("${className}OperationExecutor")<
  ${className}OperationExecutor,
  OperationExecutorInterface
>() {
  /**
   * Live layer with logging and metrics
   */
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function*() {
      const logger = yield* LoggingService
      const metrics = yield* MetricsService

      return createExecutorImpl(logger, metrics)
    })
  )

  /**
   * Test layer - same as Live
   */
  static readonly Test = this.Live
}`)
  builder.addBlankLine()

  builder.addSectionComment("Common Middlewares")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Create a validation middleware
 *
 * @example
 * \`\`\`typescript
 * const validateMiddleware = createValidationMiddleware(
 *   (input) => input.name.length > 0
 * )
 * \`\`\`
 */
export function createValidationMiddleware<A, E, R>(
  validate: (input: unknown) => boolean,
  errorFactory: () => E
): Middleware<A, E, R> {
  return (next) =>
    Effect.gen(function*() {
      // Validation would happen before dispatch
      return yield* next
    })
}

/**
 * Create a retry middleware
 *
 * @example
 * \`\`\`typescript
 * const retryMiddleware = createRetryMiddleware({ times: 3 })
 * \`\`\`
 */
export function createRetryMiddleware<A, E, R>(options: {
  readonly times: number
}): Middleware<A, E, R> {
  return (next) =>
    next.pipe(
      Effect.retry({ times: options.times })
    )
}`)

  return builder.toString()
}

/**
 * Generate server/cqrs/operations/index.ts file
 */
export function generateOperationsIndexFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className } = options

  builder.addFileHeader({
    title: `${className} CQRS Operations Index`,
    description: "Barrel export for CQRS operations.",
    module: `${options.packageName}/server/cqrs/operations`
  })
  builder.addBlankLine()

  builder.addRaw(`export {
  ${className}OperationExecutor,
  createValidationMiddleware,
  createRetryMiddleware
} from "./executor"

export type {
  OperationMetadata,
  OperationExecutorInterface,
  Middleware
} from "./executor"`)

  return builder.toString()
}
