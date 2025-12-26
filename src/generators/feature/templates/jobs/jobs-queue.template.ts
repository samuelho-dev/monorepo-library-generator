/**
 * Feature Jobs Queue Template
 *
 * Generates server/jobs/queue.ts with job processing via QueueService.
 *
 * @module monorepo-library-generator/feature/jobs/jobs-queue-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { FeatureTemplateOptions } from "../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../utils/workspace-config"

/**
 * Generate server/jobs/queue.ts file
 *
 * Creates job queue service for async processing with:
 * - Integration with QueueService from infra-queue
 * - LoggingService for job tracking
 * - MetricsService for job telemetry
 * - Effect.withSpan() for distributed tracing
 */
export function generateJobsQueueFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, name, propertyName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Job Queue`,
    description: `Async job processing for ${name} operations via QueueService.

Features:
- Type-safe job definitions with Schema validation
- Retry policies and dead letter handling
- Metrics and logging for observability
- Distributed tracing via Effect.withSpan()

Job Types:
- Create${className}Job: Async entity creation
- Update${className}Job: Async entity update
- Delete${className}Job: Async entity deletion
- Bulk${className}Job: Batch processing`,
    module: `${scope}/feature-${fileName}/server/jobs/queue`
  })
  builder.addBlankLine()

  builder.addImports([
    { from: "effect", imports: ["Effect", "Layer", "Context", "Schema", "Duration", "Data", "Schedule"] },
    { from: "effect/ParseResult", imports: ["ParseError"], isTypeOnly: true }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Infrastructure Services")
  builder.addImports([
    { from: `${scope}/infra-queue`, imports: ["QueueService"] },
    { from: `${scope}/infra-observability`, imports: ["LoggingService", "MetricsService"] },
    { from: `${scope}/infra-database`, imports: ["DatabaseService"] }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Service Dependencies")
  builder.addImports([
    { from: "../services", imports: [`${className}Service`] }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Auth Context for Job Processing")
  builder.addImports([
    { from: `${scope}/contract-auth`, imports: ["CurrentUser"] }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Job Error Types")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Error thrown when job data fails schema validation
 */
export class ${className}JobValidationError extends Data.TaggedError("${className}JobValidationError")<{
  readonly message: string
  readonly jobId: string
  readonly jobType: string
  readonly cause?: unknown
}> {}

/**
 * Error thrown when job execution fails
 */
export class ${className}JobExecutionError extends Data.TaggedError("${className}JobExecutionError")<{
  readonly message: string
  readonly jobId: string
  readonly jobType: string
  readonly cause: unknown
}> {}

/**
 * Error thrown when job times out
 */
export class ${className}JobTimeoutError extends Data.TaggedError("${className}JobTimeoutError")<{
  readonly message: string
  readonly jobId: string
  readonly jobType: string
  readonly timeout: string
}> {}

/**
 * Union of all job processing errors
 */
export type ${className}JobError =
  | ${className}JobValidationError
  | ${className}JobExecutionError
  | ${className}JobTimeoutError`)
  builder.addBlankLine()

  builder.addSectionComment("Job Processor Schemas")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Schema configuration for job data validation
 *
 * Required for type-safe job processing. Each schema validates
 * the data payload before passing to service methods.
 *
 * IMPORTANT: Schema types must match the service method parameter types:
 * - createData must produce the type expected by ${className}Service.create()
 * - updateData must produce the type expected by ${className}Service.update()
 *
 * @example
 * \`\`\`typescript
 * import { Create${className}InputSchema, Update${className}InputSchema } from "${scope}/contract-${fileName}";
 *
 * const schemas: ${className}JobProcessorSchemas = {
 *   createData: Create${className}InputSchema,
 *   updateData: Update${className}InputSchema,
 * }
 * \`\`\`
 */
export interface ${className}JobProcessorSchemas {
  /**
   * Schema for create job data validation
   * Must produce a type compatible with ${className}Service.create()
   */
  readonly createData: Schema.Schema<Parameters<Context.Tag.Service<typeof ${className}Service>["create"]>[0], unknown>

  /**
   * Schema for update job data validation
   * Must produce a type compatible with ${className}Service.update() second parameter
   */
  readonly updateData: Schema.Schema<Parameters<Context.Tag.Service<typeof ${className}Service>["update"]>[1], unknown>
}
`)
  builder.addBlankLine()

  builder.addSectionComment("Job Definitions")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Queue configuration for ${name} jobs
 */
export const ${className}QueueConfig = {
  /** Queue name for ${name} jobs */
  QUEUE_NAME: "${propertyName}-jobs",

  /** Default retry configuration */
  DEFAULT_RETRIES: 3,

  /** Default retry delay */
  RETRY_DELAY: Duration.seconds(5),

  /** Default job timeout */
  JOB_TIMEOUT: Duration.minutes(5),

  /** System user for job processing (when no user context from job data) */
  SYSTEM_USER: {
    id: "system-job-processor",
    email: "system@${propertyName}-jobs.internal",
    roles: ["system"] as const
  }
} as const

/**
 * System user layer for job processing
 *
 * Jobs run outside of HTTP request context, so they need to provide
 * their own CurrentUser context. This layer provides a system user
 * for operations that require auth context.
 *
 * For user-initiated jobs, extract user info from job.initiatedBy
 * and create a user-specific layer instead.
 */
export const ${className}SystemUserLayer = Layer.succeed(
  CurrentUser,
  ${className}QueueConfig.SYSTEM_USER
)`)
  builder.addBlankLine()

  builder.addSectionComment("Job Types")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Base job metadata included in all jobs
 */
export const JobMetadata = Schema.Struct({
  /** Unique job identifier */
  jobId: Schema.UUID,

  /** Correlation ID for tracing */
  correlationId: Schema.optional(Schema.UUID),

  /** Number of retry attempts */
  attempt: Schema.optionalWith(Schema.Number, { default: () => 0 }),

  /** Job priority (higher = more urgent) */
  priority: Schema.optionalWith(Schema.Number, { default: () => 0 }),

  /** When the job was enqueued */
  enqueuedAt: Schema.optionalWith(Schema.Date, { default: () => new Date() })
})`)
  builder.addBlankLine()

  builder.addRaw(`/**
 * Create ${name} job
 */
export class Create${className}Job extends Schema.Class<Create${className}Job>(
  "Create${className}Job"
)({
  ...JobMetadata.fields,

  /** Job type identifier */
  type: Schema.Literal("create"),

  /** Entity data to create */
  data: Schema.Record({ key: Schema.String, value: Schema.Unknown }),

  /** User who initiated the job */
  initiatedBy: Schema.optional(Schema.UUID)
}) {
  static create(params: {
    data: Record<string, unknown>
    initiatedBy?: string;
    correlationId?: string;
    priority?: number
  }) {
    return new Create${className}Job({
      jobId: crypto.randomUUID(),
      type: "create",
      data: params.data,
      ...(params.initiatedBy !== undefined && { initiatedBy: params.initiatedBy }),
      ...(params.correlationId !== undefined && { correlationId: params.correlationId }),
      ...(params.priority !== undefined && { priority: params.priority })
    })
  }
}`)
  builder.addBlankLine()

  builder.addRaw(`/**
 * Update ${name} job
 */
export class Update${className}Job extends Schema.Class<Update${className}Job>(
  "Update${className}Job"
)({
  ...JobMetadata.fields,

  /** Job type identifier */
  type: Schema.Literal("update"),

  /** Entity ID to update */
  entityId: Schema.UUID,

  /** Fields to update */
  data: Schema.Record({ key: Schema.String, value: Schema.Unknown }),

  /** User who initiated the job */
  initiatedBy: Schema.optional(Schema.UUID)
}) {
  static create(params: {
    entityId: string;
    data: Record<string, unknown>
    initiatedBy?: string;
    correlationId?: string;
    priority?: number
  }) {
    return new Update${className}Job({
      jobId: crypto.randomUUID(),
      type: "update",
      entityId: params.entityId,
      data: params.data,
      ...(params.initiatedBy !== undefined && { initiatedBy: params.initiatedBy }),
      ...(params.correlationId !== undefined && { correlationId: params.correlationId }),
      ...(params.priority !== undefined && { priority: params.priority })
    })
  }
}`)
  builder.addBlankLine()

  builder.addRaw(`/**
 * Delete ${name} job
 */
export class Delete${className}Job extends Schema.Class<Delete${className}Job>(
  "Delete${className}Job"
)({
  ...JobMetadata.fields,

  /** Job type identifier */
  type: Schema.Literal("delete"),

  /** Entity ID to delete */
  entityId: Schema.UUID,

  /** Whether to soft delete */
  softDelete: Schema.optionalWith(Schema.Boolean, { default: () => false }),

  /** User who initiated the job */
  initiatedBy: Schema.optional(Schema.UUID)
}) {
  static create(params: {
    entityId: string;
    softDelete?: boolean;
    initiatedBy?: string;
    correlationId?: string;
    priority?: number
  }) {
    return new Delete${className}Job({
      jobId: crypto.randomUUID(),
      type: "delete",
      entityId: params.entityId,
      ...(params.softDelete !== undefined && { softDelete: params.softDelete }),
      ...(params.initiatedBy !== undefined && { initiatedBy: params.initiatedBy }),
      ...(params.correlationId !== undefined && { correlationId: params.correlationId }),
      ...(params.priority !== undefined && { priority: params.priority })
    })
  }
}`)
  builder.addBlankLine()

  builder.addRaw(`/**
 * Bulk ${name} job for batch processing
 */
export class Bulk${className}Job extends Schema.Class<Bulk${className}Job>(
  "Bulk${className}Job"
)({
  ...JobMetadata.fields,

  /** Job type identifier */
  type: Schema.Literal("bulk"),

  /** Operation to perform */
  operation: Schema.Union(
    Schema.Literal("create"),
    Schema.Literal("update"),
    Schema.Literal("delete")
  ),

  /** Items to process */
  items: Schema.Array(Schema.Record({ key: Schema.String, value: Schema.Unknown })),

  /** User who initiated the job */
  initiatedBy: Schema.optional(Schema.UUID),

  /** Continue on individual item errors */
  continueOnError: Schema.optionalWith(Schema.Boolean, { default: () => true })
}) {
  static create(params: {
    operation: "create" | "update" | "delete";
    items: Array<Record<string, unknown>>
    initiatedBy?: string;
    correlationId?: string;
    priority?: number;
    continueOnError?: boolean
  }) {
    return new Bulk${className}Job({
      jobId: crypto.randomUUID(),
      type: "bulk",
      operation: params.operation,
      items: params.items,
      ...(params.initiatedBy !== undefined && { initiatedBy: params.initiatedBy }),
      ...(params.correlationId !== undefined && { correlationId: params.correlationId }),
      ...(params.priority !== undefined && { priority: params.priority }),
      ...(params.continueOnError !== undefined && {
        continueOnError: params.continueOnError
      })
    })
  }
}`)
  builder.addBlankLine()

  builder.addRaw(`/**
 * Union of all ${name} job types
 */
export type ${className}Job =
  | Create${className}Job
  | Update${className}Job
  | Delete${className}Job
  | Bulk${className}Job`)
  builder.addBlankLine()

  builder.addSectionComment("Job Queue Interface")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} Job Queue Interface
 *
 * Provides methods to enqueue and process jobs.
 */
export interface ${className}JobQueueInterface {
  /**
   * Enqueue a job for async processing
   */
  readonly enqueue: (job: ${className}Job) => Effect.Effect<void, ParseError, never>

  /**
   * Enqueue a job with priority
   */
  readonly enqueueWithPriority: (
    job: ${className}Job,
    priority: number
  ) => Effect.Effect<void, ParseError, never>

  /**
   * Start processing jobs from the queue
   */
  readonly startProcessing: () => Effect.Effect<void>

  /**
   * Stop processing jobs
   */
  readonly stopProcessing: () => Effect.Effect<void>

  /**
   * Get queue statistics
   */
  readonly stats: Effect.Effect<{
    readonly pending: number
    readonly processing: number
    readonly completed: number
    readonly failed: number
  }>
}
`)
  builder.addBlankLine()

  builder.addSectionComment("Job Processor Helpers")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Validate data against schema with typed error
 */
const validateJobData = <T>(
  data: unknown,
  schema: Schema.Schema<T, unknown>,
  jobId: string,
  jobType: string
) =>
  Schema.decodeUnknown(schema)(data).pipe(
    Effect.mapError((parseError) =>
      new ${className}JobValidationError({
        message: \`Job data validation failed: \${parseError.message}\`,
        jobId,
        jobType,
        cause: parseError
      })
    )
  )

/**
 * Service type constraint - ensures schema types match service method types
 *
 * This type extracts the expected input types from the ${className}Service
 * to ensure job data is properly typed for service method calls.
 */
type ${className}ServiceType = Context.Tag.Service<typeof ${className}Service>

/**
 * Process a create job
 *
 * Schema validation transforms unknown job.data into the service's create input type.
 * The schema must produce a type compatible with service.create().
 */
const processCreateJob = (
  job: Create${className}Job,
  service: ${className}ServiceType,
  schemas: { createData: Schema.Schema<Parameters<${className}ServiceType["create"]>[0], unknown> }
) =>
  Effect.gen(function*() {
    const validatedData = yield* validateJobData(job.data, schemas.createData, job.jobId, "create")
    yield* service.create(validatedData)
  })

/**
 * Process an update job
 *
 * Schema validation transforms unknown job.data into the service's update input type.
 * The schema must produce a type compatible with service.update() second parameter.
 */
const processUpdateJob = (
  job: Update${className}Job,
  service: ${className}ServiceType,
  schemas: { updateData: Schema.Schema<Parameters<${className}ServiceType["update"]>[1], unknown> }
) =>
  Effect.gen(function*() {
    const validatedData = yield* validateJobData(job.data, schemas.updateData, job.jobId, "update")
    yield* service.update(job.entityId, validatedData)
  })

/**
 * Process a delete job
 */
const processDeleteJob = (
  job: Delete${className}Job,
  service: ${className}ServiceType
) => service.delete(job.entityId)

/**
 * Process a single bulk item
 *
 * Uses bracket notation for index signature access per strict typing requirements.
 * For create operations, uses the create input type; for update, uses update input type.
 */
const processBulkItem = (
  item: Record<string, unknown>,
  operation: "create" | "update" | "delete",
  service: ${className}ServiceType,
  validatedCreateItem: Parameters<${className}ServiceType["create"]>[0] | null,
  validatedUpdateItem: Parameters<${className}ServiceType["update"]>[1] | null
) =>
  Effect.gen(function*() {
    // Use bracket notation for index signature access (not dot notation)
    const itemId = item["id"]
    const hasValidId = typeof itemId === "string" && itemId.length > 0

    if (operation === "create" && validatedCreateItem !== null) {
      yield* service.create(validatedCreateItem)
    } else if (operation === "update" && hasValidId && validatedUpdateItem !== null) {
      yield* service.update(itemId, validatedUpdateItem)
    } else if (operation === "delete" && hasValidId) {
      yield* service.delete(itemId)
    }
  })

/**
 * Process a bulk job
 *
 * For bulk operations, the schema must produce types compatible with both
 * create and update service methods since bulk can do either operation.
 */
const processBulkJob = (
  job: Bulk${className}Job,
  service: ${className}ServiceType,
  logger: Context.Tag.Service<typeof LoggingService>,
  schemas: {
    createData: Schema.Schema<Parameters<${className}ServiceType["create"]>[0], unknown>
    updateData: Schema.Schema<Parameters<${className}ServiceType["update"]>[1], unknown>
  }
) =>
  Effect.gen(function*() {
    for (const item of job.items) {
      // Validate based on operation type
      if (job.operation === "create") {
        const validatedItem = yield* validateJobData(item, schemas.createData, job.jobId, "bulk").pipe(
          Effect.catchAll((error) =>
            job.continueOnError
              ? Effect.gen(function*() {
                  yield* logger.warn("Bulk job item validation failed, skipping", {
                    item,
                    error: error.message
                  })
                  return null
                })
              : Effect.fail(error)
          )
        )
        if (validatedItem !== null) {
          yield* processBulkItem(item, job.operation, service, validatedItem, null)
        }
      } else if (job.operation === "update") {
        const validatedItem = yield* validateJobData(item, schemas.updateData, job.jobId, "bulk").pipe(
          Effect.catchAll((error) =>
            job.continueOnError
              ? Effect.gen(function*() {
                  yield* logger.warn("Bulk job item validation failed, skipping", {
                    item,
                    error: error.message
                  })
                  return null
                })
              : Effect.fail(error)
          )
        )
        if (validatedItem !== null) {
          yield* processBulkItem(item, job.operation, service, null, validatedItem)
        }
      } else if (job.operation === "delete") {
        yield* processBulkItem(item, job.operation, service, null, null)
      }
    }
  })
`)
  builder.addBlankLine()

  builder.addSectionComment("Job Processor Implementation")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Process a single job with schema validation
 *
 * All job data is validated against the provided schemas before
 * being passed to service methods, ensuring type safety at runtime.
 */
const processJob = (
  job: ${className}Job,
  service: ${className}ServiceType,
  logger: Context.Tag.Service<typeof LoggingService>,
  metrics: Context.Tag.Service<typeof MetricsService>,
  schemas: ${className}JobProcessorSchemas
) =>
  Effect.gen(function*() {
    const histogram = yield* metrics.histogram("${name.toLowerCase()}_job_duration_seconds")
    const counter = yield* metrics.counter("${name.toLowerCase()}_jobs_processed_total")

    yield* logger.info("Processing ${name} job", {
      jobId: job.jobId,
      type: job.type,
      attempt: job.attempt
    })

    yield* histogram.timer(
      Effect.gen(function*() {
        if (job.type === "create") {
          yield* processCreateJob(job, service, schemas)
        } else if (job.type === "update") {
          yield* processUpdateJob(job, service, schemas)
        } else if (job.type === "delete") {
          yield* processDeleteJob(job, service)
        } else if (job.type === "bulk") {
          yield* processBulkJob(job, service, logger, schemas)
        }
      })
    )

    yield* counter.increment
    yield* logger.info("${name} job completed", { jobId: job.jobId, type: job.type })
  }).pipe(
    Effect.withSpan("${className}JobQueue.processJob", {
      attributes: { jobId: job.jobId, type: job.type }
    })
  )
`)
  builder.addBlankLine()

  builder.addSectionComment("Context.Tag")
  builder.addBlankLine()

  builder.addRaw(`/**
 * ${className} Job Queue Context Tag
 *
 * @example
 * \`\`\`typescript
 * import { Create${className}InputSchema, Update${className}InputSchema } from "${scope}/contract-${fileName}";
 *
 * // Define schemas for job data validation
 * const schemas: ${className}JobProcessorSchemas = {
 *   createData: Create${className}InputSchema,
 *   updateData: Update${className}InputSchema,
 *   bulkItemData: Schema.Union(Create${className}InputSchema, Update${className}InputSchema),
 * };
 *
 * const program = Effect.gen(function*() {
 *   const queue = yield* ${className}JobQueue;
 *
 *   // Enqueue an async create job
 *   const job = Create${className}Job.create({
 *     data: { name: "example" },
 *     initiatedBy: "user-123",
 *   })
 *
 *   yield* queue.enqueue(job)
 * })
 *
 * program.pipe(Effect.provide(${className}JobQueue.Live(schemas)))
 * \`\`\`
 */
export class ${className}JobQueue extends Context.Tag("${className}JobQueue")<
  ${className}JobQueue,
  ${className}JobQueueInterface
>() {
  /**
   * Live layer with QueueService dependency
   *
   * Requires ${className}Service which has CurrentUser in its method requirements.
   * Layer composition happens at the application level:
   *
   * @example
   * \`\`\`typescript
   * // Application-level layer composition
   * const AppLayer = Layer.mergeAll(
   *   ${className}JobQueue.Live(schemas),
   *   ${className}Service.Live,
   *   ${className}SystemUserLayer,  // Provides CurrentUser for job processing
   *   QueueService.Live,
   *   DatabaseService.Live,
   *   // ... other dependencies
   * )
   *
   * const program = Effect.gen(function*() {
   *   const queue = yield* ${className}JobQueue
   *   yield* queue.startProcessing()
   * }).pipe(Effect.provide(AppLayer))
   * \`\`\`
   *
   * @param schemas - Schema configuration for validating job data
   */
  static readonly Live = (
    schemas: ${className}JobProcessorSchemas
  ) => Layer.effect(
    this,
    Effect.gen(function*() {
      const queueService = yield* QueueService;
      const service = yield* ${className}Service;
      const logger = yield* LoggingService;
      const metrics = yield* MetricsService;
      const database = yield* DatabaseService;

      // Capture CurrentUser at layer construction for job processing
      // This ensures service method requirements are satisfied
      const systemUser = ${className}QueueConfig.SYSTEM_USER;
      const failedCounter = yield* metrics.counter("${name.toLowerCase()}_jobs_failed_total")
      const pendingGauge = yield* metrics.gauge("${name.toLowerCase()}_jobs_pending")
      const processingGauge = yield* metrics.gauge("${name.toLowerCase()}_jobs_processing")

      // Job schema for queue validation (union of all job types)
      const ${className}JobSchema = Schema.Union(
        Create${className}Job,
        Update${className}Job,
        Delete${className}Job,
        Bulk${className}Job
      )

      // Create bounded queue for job storage with schema validation
      const jobQueue = yield* queueService.bounded(1000, ${className}JobSchema)

      // Stats tracking
      let pending = 0;
      let processing = 0;
      let completed = 0;
      let failed = 0;
      let isProcessing = false      // Retry schedule: fixed delay with max retries
      const retrySchedule = Schedule.spaced(${className}QueueConfig.RETRY_DELAY).pipe(
        Schedule.compose(Schedule.recurs(${className}QueueConfig.DEFAULT_RETRIES))
      )

      // Process jobs from the queue with retry logic
      // CurrentUser is captured in service at layer construction time
      // All errors are properly tagged for contract-first error handling
      const processWithRetry = (job: ${className}Job) =>
        processJob(job, service, logger, metrics, schemas).pipe(
          // Transform any service errors into job execution errors FIRST
          // This ensures all errors have job-scoped tags before catchTag
          Effect.mapError((error) => {
            // Preserve job-scoped validation errors as-is
            if (error instanceof ${className}JobValidationError) {
              return error
            }
            // Wrap all other errors as job execution errors
            return new ${className}JobExecutionError({
              message: error instanceof Error ? error.message : String(error),
              jobId: job.jobId,
              jobType: job.type,
              cause: error
            })
          }),
          Effect.retry(retrySchedule),
          Effect.timeoutFail({
            duration: ${className}QueueConfig.JOB_TIMEOUT,
            onTimeout: () => new ${className}JobTimeoutError({
              message: \`Job \${job.jobId} timed out after \${${className}QueueConfig.JOB_TIMEOUT}\`,
              jobId: job.jobId,
              jobType: job.type,
              timeout: \`\${${className}QueueConfig.JOB_TIMEOUT}\`
            })
          }),
          // Handle validation errors (tagged with feature-scoped name)
          Effect.catchTag("${className}JobValidationError", (error) =>
            Effect.gen(function*() {
              yield* failedCounter.increment
              failed++
              yield* logger.error("${name} job validation failed", {
                jobId: error.jobId,
                jobType: error.jobType,
                errorTag: error._tag,
                message: error.message
              })
            })
          ),
          // Handle timeout errors (tagged with feature-scoped name)
          Effect.catchTag("${className}JobTimeoutError", (error) =>
            Effect.gen(function*() {
              yield* failedCounter.increment
              failed++
              yield* logger.error("${name} job timed out", {
                jobId: error.jobId,
                jobType: error.jobType,
                errorTag: error._tag,
                timeout: error.timeout
              })
            })
          ),
          // Handle execution errors (tagged with feature-scoped name)
          Effect.catchTag("${className}JobExecutionError", (error) =>
            Effect.gen(function*() {
              yield* failedCounter.increment
              failed++
              yield* logger.error("${name} job execution failed", {
                jobId: error.jobId,
                jobType: error.jobType,
                errorTag: error._tag,
                message: error.message
              })
            })
          ),
          Effect.tap(() => {
            completed++
          }),
          Effect.ensuring(Effect.sync(() => {
            processing--
          }))
        )

      return {
        enqueue: (job) =>
          Effect.gen(function*() {
            yield* jobQueue.offer(job)
            pending++
            yield* pendingGauge.set(pending)
            yield* logger.debug("Job enqueued", {
              jobId: job.jobId,
              type: job.type
            })
          }).pipe(Effect.withSpan("${className}JobQueue.enqueue")),

        enqueueWithPriority: (job, priority) =>
          Effect.gen(function*() {
            // For priority, we'd need a priority queue - using regular offer for now
            yield* jobQueue.offer({ ...job, priority })
            pending++
            yield* pendingGauge.set(pending)
            yield* logger.debug("Job enqueued with priority", {
              jobId: job.jobId,
              type: job.type,
              priority
            })
          }).pipe(Effect.withSpan("${className}JobQueue.enqueueWithPriority")),

        startProcessing: () =>
          Effect.gen(function*() {
            if (isProcessing) return
            isProcessing = true

            yield* logger.info("${name} job queue started")

            // Start processing loop in background
            // Provide CurrentUser context for service method requirements
            yield* Effect.forkDaemon(
              Effect.forever(
                Effect.gen(function*() {
                  const job = yield* jobQueue.take
                  pending--
                  processing++
                  yield* pendingGauge.set(pending)
                  yield* processingGauge.set(processing)
                  // Provide system user and database context when processing job
                  yield* Effect.fork(
                    processWithRetry(job).pipe(
                      Effect.provideService(CurrentUser, systemUser),
                      Effect.provideService(DatabaseService, database)
                    )
                  )
                })
              )
            )
          }).pipe(Effect.withSpan("${className}JobQueue.startProcessing")),

        stopProcessing: () =>
          Effect.gen(function*() {
            isProcessing = false
            yield* logger.info("${name} job queue stopped")
          }).pipe(Effect.withSpan("${className}JobQueue.stopProcessing")),

        stats: Effect.succeed({
          pending,
          processing,
          completed,
          failed
        }).pipe(Effect.withSpan("${className}JobQueue.stats"))
      }
    })
  )

  /**
   * Test layer - uses same implementation as Live
   *
   * @param schemas - Schema configuration for validating job data
   */
  static readonly Test = (
    schemas: ${className}JobProcessorSchemas
  ) => this.Live(schemas)
}
`)

  return builder.toString()
}
