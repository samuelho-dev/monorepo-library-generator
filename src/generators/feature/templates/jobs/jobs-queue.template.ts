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
    { from: "effect", imports: ["Effect", "Layer", "Context", "Schema", "Duration", "Data", "Schedule"] }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Infrastructure Services")
  builder.addImports([
    { from: `${scope}/infra-queue`, imports: ["QueueService"] },
    { from: `${scope}/infra-observability`, imports: ["LoggingService", "MetricsService"] }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Service Dependencies")
  builder.addImports([
    { from: "../services", imports: [`${className}Service`] }
  ])
  builder.addBlankLine()

  builder.addSectionComment("Job Validation Error")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Error thrown when job data fails schema validation
 */
export class JobDataValidationError extends Data.TaggedError("JobDataValidationError")<{
  readonly message: string
  readonly jobId: string
  readonly jobType: string
  readonly cause?: unknown
}> {}`)
  builder.addBlankLine()

  builder.addSectionComment("Job Processor Schemas")
  builder.addBlankLine()

  builder.addRaw(`/**
 * Schema configuration for job data validation
 *
 * Required for type-safe job processing. Each schema validates
 * the data payload before passing to service methods.
 *
 * @example
 * \`\`\`typescript
 * const schemas: ${className}JobProcessorSchemas = {
 *   createData: CreateUserInputSchema,
 *   updateData: UpdateUserInputSchema,
 *   bulkItemData: BulkUserItemSchema
 * }
 * \`\`\`
 */
export interface ${className}JobProcessorSchemas<
  CreateData = unknown,
  UpdateData = unknown,
  BulkItemData = unknown
> {
  /**
   * Schema for create job data validation
   */
  readonly createData: Schema.Schema<CreateData, unknown>

  /**
   * Schema for update job data validation
   */
  readonly updateData: Schema.Schema<UpdateData, unknown>

  /**
   * Schema for bulk job item data validation
   */
  readonly bulkItemData: Schema.Schema<BulkItemData, unknown>
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
  JOB_TIMEOUT: Duration.minutes(5)
} as const`)
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
      ...(params.initiatedBy && { initiatedBy: params.initiatedBy }),
      ...(params.correlationId && { correlationId: params.correlationId }),
      ...(params.priority && { priority: params.priority })
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
      ...(params.initiatedBy && { initiatedBy: params.initiatedBy }),
      ...(params.correlationId && { correlationId: params.correlationId }),
      ...(params.priority && { priority: params.priority })
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
      ...(params.initiatedBy && { initiatedBy: params.initiatedBy }),
      ...(params.correlationId && { correlationId: params.correlationId }),
      ...(params.priority && { priority: params.priority })
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
      ...(params.initiatedBy && { initiatedBy: params.initiatedBy }),
      ...(params.correlationId && { correlationId: params.correlationId }),
      ...(params.priority && { priority: params.priority }),
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
  readonly enqueue: (job: ${className}Job) => Effect.Effect<void>

  /**
   * Enqueue a job with priority
   */
  readonly enqueueWithPriority: (
    job: ${className}Job,
    priority: number
  ) => Effect.Effect<void>

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
      new JobDataValidationError({
        message: \`Job data validation failed: \${parseError.message}\`,
        jobId,
        jobType,
        cause: parseError
      })
    )
  )

/**
 * Process a create job
 */
const processCreateJob = <CreateData>(
  job: Create${className}Job,
  service: Context.Tag.Service<typeof ${className}Service>,
  schemas: { createData: Schema.Schema<CreateData, unknown> }
) =>
  Effect.gen(function*() {
    const validatedData = yield* validateJobData(job.data, schemas.createData, job.jobId, "create")
    yield* service.create(validatedData)
  })

/**
 * Process an update job
 */
const processUpdateJob = <UpdateData>(
  job: Update${className}Job,
  service: Context.Tag.Service<typeof ${className}Service>,
  schemas: { updateData: Schema.Schema<UpdateData, unknown> }
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
  service: Context.Tag.Service<typeof ${className}Service>
) => service.delete(job.entityId)

/**
 * Process a single bulk item
 */
const processBulkItem = <BulkItemData>(
  item: Record<string, unknown>,
  operation: "create" | "update" | "delete",
  service: Context.Tag.Service<typeof ${className}Service>,
  validatedItem: BulkItemData
) =>
  Effect.gen(function*() {
    if (operation === "create") {
      yield* service.create(validatedItem)
    } else if (operation === "update" && "id" in item && typeof item.id === "string") {
      yield* service.update(item.id, validatedItem)
    } else if (operation === "delete" && "id" in item && typeof item.id === "string") {
      yield* service.delete(item.id)
    }
  })

/**
 * Process a bulk job
 */
const processBulkJob = <BulkItemData>(
  job: Bulk${className}Job,
  service: Context.Tag.Service<typeof ${className}Service>,
  logger: Context.Tag.Service<typeof LoggingService>,
  schemas: { bulkItemData: Schema.Schema<BulkItemData, unknown> }
) =>
  Effect.gen(function*() {
    for (const item of job.items) {
      const validatedItem = yield* validateJobData(item, schemas.bulkItemData, job.jobId, "bulk").pipe(
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
        yield* processBulkItem(item, job.operation, service, validatedItem)
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
const processJob = <CreateData, UpdateData, BulkItemData>(
  job: ${className}Job,
  service: Context.Tag.Service<typeof ${className}Service>,
  logger: Context.Tag.Service<typeof LoggingService>,
  metrics: Context.Tag.Service<typeof MetricsService>,
  schemas: ${className}JobProcessorSchemas<CreateData, UpdateData, BulkItemData>
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
   * @param schemas - Schema configuration for validating job data
   */
  static readonly Live = <CreateData, UpdateData, BulkItemData>(
    schemas: ${className}JobProcessorSchemas<CreateData, UpdateData, BulkItemData>
  ) => Layer.effect(
    this,
    Effect.gen(function*() {
      const queueService = yield* QueueService;
      const service = yield* ${className}Service;
      const logger = yield* LoggingService;
      const metrics = yield* MetricsService;
      const failedCounter = yield* metrics.counter("${name.toLowerCase()}_jobs_failed_total")
      const pendingGauge = yield* metrics.gauge("${name.toLowerCase()}_jobs_pending")
      const processingGauge = yield* metrics.gauge("${name.toLowerCase()}_jobs_processing")

      // Create bounded queue for job storage
      const jobQueue = yield* queueService.bounded<${className}Job>(1000)

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
      const processWithRetry = (job: ${className}Job) =>
        processJob(job, service, logger, metrics, schemas).pipe(
          Effect.retry(retrySchedule),
          Effect.timeout(${className}QueueConfig.JOB_TIMEOUT),
          Effect.catchTag("JobDataValidationError", (error) =>
            Effect.gen(function*() {
              yield* failedCounter.increment
              failed++
              yield* logger.error("${name} job failed after retries", {
                jobId: job.jobId,
                type: job.type,
                error: { message: error.message, jobType: error.jobType }
              })
            })
          ),
          Effect.catchAll((error) =>
            Effect.gen(function*() {
              yield* failedCounter.increment
              failed++
              yield* logger.error("${name} job failed after retries", {
                jobId: job.jobId,
                type: job.type,
                error: error.message
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
            yield* Effect.forkDaemon(
              Effect.forever(
                Effect.gen(function*() {
                  const job = yield* jobQueue.take
                  pending--
                  processing++
                  yield* pendingGauge.set(pending)
                  yield* processingGauge.set(processing)
                  yield* Effect.fork(processWithRetry(job))
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
  static readonly Test = <CreateData, UpdateData, BulkItemData>(
    schemas: ${className}JobProcessorSchemas<CreateData, UpdateData, BulkItemData>
  ) => this.Live(schemas)
}
`)

  return builder.toString()
}
