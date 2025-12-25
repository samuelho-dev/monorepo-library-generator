import { LoggingService, MetricsService } from "@samuelho-dev/infra-observability"
import { QueueService } from "@samuelho-dev/infra-queue"
import { Context, Data, Duration, Effect, Layer, Schedule, Schema } from "effect"
import { UserService } from "../services"

/**
 * User Job Queue
 *
 * Async job processing for user operations via QueueService.

Features:
- Type-safe job definitions with Schema validation
- Retry policies and dead letter handling
- Metrics and logging for observability
- Distributed tracing via Effect.withSpan()

Job Types:
- CreateUserJob: Async entity creation
- UpdateUserJob: Async entity update
- DeleteUserJob: Async entity deletion
- BulkUserJob: Batch processing
 *
 * @module @samuelho-dev/feature-user/server/jobs/queue
 */


// ============================================================================
// Infrastructure Services
// ============================================================================

// ============================================================================
// Service Dependencies
// ============================================================================

// ============================================================================
// Job Validation Error
// ============================================================================

/**
 * Error thrown when job data fails schema validation
 */
export class JobDataValidationError extends Data.TaggedError("JobDataValidationError")<{
  readonly message: string
  readonly jobId: string
  readonly jobType: string
  readonly cause?: unknown
}> {}

// ============================================================================
// Job Processor Schemas
// ============================================================================

/**
 * Schema configuration for job data validation
 *
 * Required for type-safe job processing. Each schema validates
 * the data payload before passing to service methods.
 *
 * @example
 * ```typescript
 * const schemas: UserJobProcessorSchemas = {
 *   createData: CreateUserInputSchema,
 *   updateData: UpdateUserInputSchema,
 *   bulkItemData: BulkUserItemSchema
 * }
 * ```
 */
export interface UserJobProcessorSchemas<
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


// ============================================================================
// Job Definitions
// ============================================================================

/**
 * Queue configuration for user jobs
 */
export const UserQueueConfig = {
  /** Queue name for user jobs */
  QUEUE_NAME: "user-jobs",

  /** Default retry configuration */
  DEFAULT_RETRIES: 3,

  /** Default retry delay */
  RETRY_DELAY: Duration.seconds(5),

  /** Default job timeout */
  JOB_TIMEOUT: Duration.minutes(5)
} as const

// ============================================================================
// Job Types
// ============================================================================

/**
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
})

/**
 * Create user job
 */
export class CreateUserJob extends Schema.Class<CreateUserJob>(
  "CreateUserJob"
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
    data: Record<string, unknown>;
    initiatedBy?: string;
    correlationId?: string;
    priority?: number;
  }) {
    return new CreateUserJob({
      jobId: crypto.randomUUID(),
      type: "create",
      data: params.data,
      ...(params.initiatedBy && { initiatedBy: params.initiatedBy }),
      ...(params.correlationId && { correlationId: params.correlationId }),
      ...(params.priority && { priority: params.priority })
    })
  }
}

/**
 * Update user job
 */
export class UpdateUserJob extends Schema.Class<UpdateUserJob>(
  "UpdateUserJob"
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
    data: Record<string, unknown>;
    initiatedBy?: string;
    correlationId?: string;
    priority?: number;
  }) {
    return new UpdateUserJob({
      jobId: crypto.randomUUID(),
      type: "update",
      entityId: params.entityId,
      data: params.data,
      ...(params.initiatedBy && { initiatedBy: params.initiatedBy }),
      ...(params.correlationId && { correlationId: params.correlationId }),
      ...(params.priority && { priority: params.priority })
    })
  }
}

/**
 * Delete user job
 */
export class DeleteUserJob extends Schema.Class<DeleteUserJob>(
  "DeleteUserJob"
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
    priority?: number;
  }) {
    return new DeleteUserJob({
      jobId: crypto.randomUUID(),
      type: "delete",
      entityId: params.entityId,
      ...(params.softDelete !== undefined && { softDelete: params.softDelete }),
      ...(params.initiatedBy && { initiatedBy: params.initiatedBy }),
      ...(params.correlationId && { correlationId: params.correlationId }),
      ...(params.priority && { priority: params.priority })
    })
  }
}

/**
 * Bulk user job for batch processing
 */
export class BulkUserJob extends Schema.Class<BulkUserJob>(
  "BulkUserJob"
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
    items: Array<Record<string, unknown>>;
    initiatedBy?: string;
    correlationId?: string;
    priority?: number;
    continueOnError?: boolean;
  }) {
    return new BulkUserJob({
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
}

/**
 * Union of all user job types
 */
export type UserJob =
  | CreateUserJob
  | UpdateUserJob
  | DeleteUserJob
  | BulkUserJob

// ============================================================================
// Job Queue Interface
// ============================================================================

/**
 * User Job Queue Interface
 *
 * Provides methods to enqueue and process jobs.
 */
export interface UserJobQueueInterface {
  /**
   * Enqueue a job for async processing
   */
  readonly enqueue: (job: UserJob) => Effect.Effect<void>

  /**
   * Enqueue a job with priority
   */
  readonly enqueueWithPriority: (
    job: UserJob,
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


// ============================================================================
// Job Processor Helpers
// ============================================================================

/**
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
        message: `Job data validation failed: ${parseError.message}`,
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
  job: CreateUserJob,
  service: Context.Tag.Service<typeof UserService>,
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
  job: UpdateUserJob,
  service: Context.Tag.Service<typeof UserService>,
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
  job: DeleteUserJob,
  service: Context.Tag.Service<typeof UserService>
) => service.delete(job.entityId)

/**
 * Process a single bulk item
 */
const processBulkItem = <BulkItemData>(
  item: Record<string, unknown>,
  operation: "create" | "update" | "delete",
  service: Context.Tag.Service<typeof UserService>,
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
  job: BulkUserJob,
  service: Context.Tag.Service<typeof UserService>,
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


// ============================================================================
// Job Processor Implementation
// ============================================================================

/**
 * Process a single job with schema validation
 *
 * All job data is validated against the provided schemas before
 * being passed to service methods, ensuring type safety at runtime.
 */
const processJob = <CreateData, UpdateData, BulkItemData>(
  job: UserJob,
  service: Context.Tag.Service<typeof UserService>,
  logger: Context.Tag.Service<typeof LoggingService>,
  metrics: Context.Tag.Service<typeof MetricsService>,
  schemas: UserJobProcessorSchemas<CreateData, UpdateData, BulkItemData>
) =>
  Effect.gen(function*() {
    const histogram = yield* metrics.histogram("user_job_duration_seconds");
    const counter = yield* metrics.counter("user_jobs_processed_total");

    yield* logger.info("Processing user job", {
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
    yield* logger.info("user job completed", { jobId: job.jobId, type: job.type })
  }).pipe(
    Effect.withSpan("UserJobQueue.processJob", {
      attributes: { jobId: job.jobId, type: job.type }
    })
  )


// ============================================================================
// Context.Tag
// ============================================================================

/**
 * User Job Queue Context Tag
 *
 * @example
 * ```typescript
 * import { CreateUserInputSchema, UpdateUserInputSchema } from "@samuelho-dev/contract-user";
 *
 * // Define schemas for job data validation
 * const schemas: UserJobProcessorSchemas = {
 *   createData: CreateUserInputSchema,
 *   updateData: UpdateUserInputSchema,
 *   bulkItemData: Schema.Union(CreateUserInputSchema, UpdateUserInputSchema),
 * };
 *
 * const program = Effect.gen(function*() {
 *   const queue = yield* UserJobQueue;
 *
 *   // Enqueue an async create job
 *   const job = CreateUserJob.create({
 *     data: { name: "example" },
 *     initiatedBy: "user-123",
 *   });
 *
 *   yield* queue.enqueue(job);
 * });
 *
 * program.pipe(Effect.provide(UserJobQueue.Live(schemas)));
 * ```
 */
export class UserJobQueue extends Context.Tag("UserJobQueue")<
  UserJobQueue,
  UserJobQueueInterface
>() {
  /**
   * Live layer with QueueService dependency
   *
   * @param schemas - Schema configuration for validating job data
   */
  static readonly Live = <CreateData, UpdateData, BulkItemData>(
    schemas: UserJobProcessorSchemas<CreateData, UpdateData, BulkItemData>
  ) => Layer.effect(
    this,
    Effect.gen(function*() {
      const queueService = yield* QueueService;
      const service = yield* UserService;
      const logger = yield* LoggingService;
      const metrics = yield* MetricsService;

      const failedCounter = yield* metrics.counter("user_jobs_failed_total");
      const pendingGauge = yield* metrics.gauge("user_jobs_pending");
      const processingGauge = yield* metrics.gauge("user_jobs_processing");

      // Create bounded queue for job storage
      const jobQueue = yield* queueService.bounded<UserJob>(1000);

      // Stats tracking
      let pending = 0;
      let processing = 0;
      let completed = 0;
      let failed = 0;
      let isProcessing = false;

      // Retry schedule: fixed delay with max retries
      const retrySchedule = Schedule.spaced(UserQueueConfig.RETRY_DELAY).pipe(
        Schedule.compose(Schedule.recurs(UserQueueConfig.DEFAULT_RETRIES))
      );

      // Process jobs from the queue with retry logic
      const processWithRetry = (job: UserJob) =>
        processJob(job, service, logger, metrics, schemas).pipe(
          Effect.retry(retrySchedule),
          Effect.timeout(UserQueueConfig.JOB_TIMEOUT),
          Effect.catchTag("JobDataValidationError", (error) =>
            Effect.gen(function*() {
              yield* failedCounter.increment
              failed++
              yield* logger.error("user job failed after retries", {
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
              yield* logger.error("user job failed after retries", {
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
          }).pipe(Effect.withSpan("UserJobQueue.enqueue")),

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
          }).pipe(Effect.withSpan("UserJobQueue.enqueueWithPriority")),

        startProcessing: () =>
          Effect.gen(function*() {
            if (isProcessing) return
            isProcessing = true

            yield* logger.info("user job queue started")

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
          }).pipe(Effect.withSpan("UserJobQueue.startProcessing")),

        stopProcessing: () =>
          Effect.gen(function*() {
            isProcessing = false
            yield* logger.info("user job queue stopped")
          }).pipe(Effect.withSpan("UserJobQueue.stopProcessing")),

        stats: Effect.succeed({
          pending,
          processing,
          completed,
          failed
        }).pipe(Effect.withSpan("UserJobQueue.stats"))
      }
    })
  )

  /**
   * Test layer - uses same implementation as Live
   *
   * @param schemas - Schema configuration for validating job data
   */
  static readonly Test = <CreateData, UpdateData, BulkItemData>(
    schemas: UserJobProcessorSchemas<CreateData, UpdateData, BulkItemData>
  ) => this.Live(schemas)
}
