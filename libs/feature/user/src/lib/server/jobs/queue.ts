import { CurrentUser } from "@samuelho-dev/contract-auth"
import { DatabaseService } from "@samuelho-dev/infra-database"
import { LoggingService, MetricsService } from "@samuelho-dev/infra-observability"
import { QueueService } from "@samuelho-dev/infra-queue"
import { Context, Data, Duration, Effect, Layer, Schedule, Schema } from "effect"
import type { ParseError } from "effect/ParseResult"
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
// Auth Context for Job Processing
// ============================================================================

// ============================================================================
// Job Error Types
// ============================================================================

/**
 * Error thrown when job data fails schema validation
 */
export class UserJobValidationError extends Data.TaggedError("UserJobValidationError")<{
  readonly message: string
  readonly jobId: string
  readonly jobType: string
  readonly cause?: unknown
}> {}

/**
 * Error thrown when job execution fails
 */
export class UserJobExecutionError extends Data.TaggedError("UserJobExecutionError")<{
  readonly message: string
  readonly jobId: string
  readonly jobType: string
  readonly cause: unknown
}> {}

/**
 * Error thrown when job times out
 */
export class UserJobTimeoutError extends Data.TaggedError("UserJobTimeoutError")<{
  readonly message: string
  readonly jobId: string
  readonly jobType: string
  readonly timeout: string
}> {}

/**
 * Union of all job processing errors
 */
export type UserJobError =
  | UserJobValidationError
  | UserJobExecutionError
  | UserJobTimeoutError

// ============================================================================
// Job Processor Schemas
// ============================================================================

/**
 * Schema configuration for job data validation
 *
 * Required for type-safe job processing. Each schema validates
 * the data payload before passing to service methods.
 *
 * IMPORTANT: Schema types must match the service method parameter types:
 * - createData must produce the type expected by UserService.create()
 * - updateData must produce the type expected by UserService.update()
 *
 * @example
 * ```typescript
 * import { CreateUserInputSchema, UpdateUserInputSchema } from "@samuelho-dev/contract-user";
 *
 * const schemas: UserJobProcessorSchemas = {
 *   createData: CreateUserInputSchema,
 *   updateData: UpdateUserInputSchema,
 * }
 * ```
 */
export interface UserJobProcessorSchemas {
  /**
   * Schema for create job data validation
   * Must produce a type compatible with UserService.create()
   */
  readonly createData: Schema.Schema<Parameters<Context.Tag.Service<typeof UserService>["create"]>[0], unknown>

  /**
   * Schema for update job data validation
   * Must produce a type compatible with UserService.update() second parameter
   */
  readonly updateData: Schema.Schema<Parameters<Context.Tag.Service<typeof UserService>["update"]>[1], unknown>
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
  JOB_TIMEOUT: Duration.minutes(5),

  /** System user for job processing (when no user context from job data) */
  SYSTEM_USER: {
    id: "system-job-processor",
    email: "system@user-jobs.internal",
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
export const UserSystemUserLayer = Layer.succeed(
  CurrentUser,
  UserQueueConfig.SYSTEM_USER
)

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
    data: Record<string, unknown>
    initiatedBy?: string;
    correlationId?: string;
    priority?: number
  }) {
    return new CreateUserJob({
      jobId: crypto.randomUUID(),
      type: "create",
      data: params.data,
      ...(params.initiatedBy !== undefined && { initiatedBy: params.initiatedBy }),
      ...(params.correlationId !== undefined && { correlationId: params.correlationId }),
      ...(params.priority !== undefined && { priority: params.priority })
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
    data: Record<string, unknown>
    initiatedBy?: string;
    correlationId?: string;
    priority?: number
  }) {
    return new UpdateUserJob({
      jobId: crypto.randomUUID(),
      type: "update",
      entityId: params.entityId,
      data: params.data,
      ...(params.initiatedBy !== undefined && { initiatedBy: params.initiatedBy }),
      ...(params.correlationId !== undefined && { correlationId: params.correlationId }),
      ...(params.priority !== undefined && { priority: params.priority })
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
    priority?: number
  }) {
    return new DeleteUserJob({
      jobId: crypto.randomUUID(),
      type: "delete",
      entityId: params.entityId,
      ...(params.softDelete !== undefined && { softDelete: params.softDelete }),
      ...(params.initiatedBy !== undefined && { initiatedBy: params.initiatedBy }),
      ...(params.correlationId !== undefined && { correlationId: params.correlationId }),
      ...(params.priority !== undefined && { priority: params.priority })
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
    items: ReadonlyArray<{ readonly [x: string]: unknown }>
    initiatedBy?: string;
    correlationId?: string;
    priority?: number;
    continueOnError?: boolean
  }) {
    return new BulkUserJob({
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
  readonly enqueue: (job: UserJob) => Effect.Effect<void, ParseError, never>

  /**
   * Enqueue a job with priority
   */
  readonly enqueueWithPriority: (
    job: UserJob,
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
      new UserJobValidationError({
        message: `Job data validation failed: ${parseError.message}`,
        jobId,
        jobType,
        cause: parseError
      })
    )
  )

/**
 * Service type constraint - ensures schema types match service method types
 *
 * This type extracts the expected input types from the UserService
 * to ensure job data is properly typed for service method calls.
 */
type UserServiceType = Context.Tag.Service<typeof UserService>

/**
 * Process a create job
 *
 * Schema validation transforms unknown job.data into the service's create input type.
 * The schema must produce a type compatible with service.create().
 */
const processCreateJob = (
  job: CreateUserJob,
  service: UserServiceType,
  schemas: { createData: Schema.Schema<Parameters<UserServiceType["create"]>[0], unknown> }
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
  job: UpdateUserJob,
  service: UserServiceType,
  schemas: { updateData: Schema.Schema<Parameters<UserServiceType["update"]>[1], unknown> }
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
  service: UserServiceType
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
  service: UserServiceType,
  validatedCreateItem: Parameters<UserServiceType["create"]>[0] | null,
  validatedUpdateItem: Parameters<UserServiceType["update"]>[1] | null
) =>
  Effect.gen(function*() {
    const itemId = item.id
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
 * Handle validation error in bulk processing
 */
const handleBulkValidationError = (
  continueOnError: boolean,
  logger: Context.Tag.Service<typeof LoggingService>,
  item: Record<string, unknown>
) => (error: UserJobError) =>
  continueOnError
    ? Effect.gen(function*() {
        yield* logger.warn("Bulk job item validation failed, skipping", {
          item,
          error: error.message
        })
        return null
      })
    : Effect.fail(error)

/**
 * Process bulk create operation
 */
const processBulkCreate = (
  item: Record<string, unknown>,
  job: BulkUserJob,
  service: UserServiceType,
  logger: Context.Tag.Service<typeof LoggingService>,
  schemas: { createData: Schema.Schema<Parameters<UserServiceType["create"]>[0], unknown> }
) =>
  Effect.gen(function*() {
    const validatedItem = yield* validateJobData(item, schemas.createData, job.jobId, "bulk").pipe(
      Effect.catchAll(handleBulkValidationError(job.continueOnError, logger, item))
    )
    if (validatedItem !== null) {
      yield* processBulkItem(item, "create", service, validatedItem, null)
    }
  })

/**
 * Process bulk update operation
 */
const processBulkUpdate = (
  item: Record<string, unknown>,
  job: BulkUserJob,
  service: UserServiceType,
  logger: Context.Tag.Service<typeof LoggingService>,
  schemas: { updateData: Schema.Schema<Parameters<UserServiceType["update"]>[1], unknown> }
) =>
  Effect.gen(function*() {
    const validatedItem = yield* validateJobData(item, schemas.updateData, job.jobId, "bulk").pipe(
      Effect.catchAll(handleBulkValidationError(job.continueOnError, logger, item))
    )
    if (validatedItem !== null) {
      yield* processBulkItem(item, "update", service, null, validatedItem)
    }
  })

/**
 * Process a bulk job
 *
 * For bulk operations, the schema must produce types compatible with both
 * create and update service methods since bulk can do either operation.
 */
const processBulkJob = (
  job: BulkUserJob,
  service: UserServiceType,
  logger: Context.Tag.Service<typeof LoggingService>,
  schemas: {
    createData: Schema.Schema<Parameters<UserServiceType["create"]>[0], unknown>
    updateData: Schema.Schema<Parameters<UserServiceType["update"]>[1], unknown>
  }
) =>
  Effect.gen(function*() {
    for (const item of job.items) {
      switch (job.operation) {
        case "create":
          yield* processBulkCreate(item, job, service, logger, schemas)
          break
        case "update":
          yield* processBulkUpdate(item, job, service, logger, schemas)
          break
        case "delete":
          yield* processBulkItem(item, "delete", service, null, null)
          break
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
const processJob = (
  job: UserJob,
  service: UserServiceType,
  logger: Context.Tag.Service<typeof LoggingService>,
  metrics: Context.Tag.Service<typeof MetricsService>,
  schemas: UserJobProcessorSchemas
) =>
  Effect.gen(function*() {
    const histogram = yield* metrics.histogram("user_job_duration_seconds")
    const counter = yield* metrics.counter("user_jobs_processed_total")

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
 *   })
 *
 *   yield* queue.enqueue(job)
 * })
 *
 * program.pipe(Effect.provide(UserJobQueue.Live(schemas)))
 * ```
 */
export class UserJobQueue extends Context.Tag("UserJobQueue")<
  UserJobQueue,
  UserJobQueueInterface
>() {
  /**
   * Live layer with QueueService dependency
   *
   * Requires UserService which has CurrentUser in its method requirements.
   * Layer composition happens at the application level:
   *
   * @example
   * ```typescript
   * // Application-level layer composition
   * const AppLayer = Layer.mergeAll(
   *   UserJobQueue.Live(schemas),
   *   UserService.Live,
   *   UserSystemUserLayer,  // Provides CurrentUser for job processing
   *   QueueService.Live,
   *   DatabaseService.Live,
   *   // ... other dependencies
   * )
   *
   * const program = Effect.gen(function*() {
   *   const queue = yield* UserJobQueue
   *   yield* queue.startProcessing()
   * }).pipe(Effect.provide(AppLayer))
   * ```
   *
   * @param schemas - Schema configuration for validating job data
   */
  static readonly Live = (
    schemas: UserJobProcessorSchemas
  ) => Layer.effect(
    this,
    Effect.gen(function*() {
      const queueService = yield* QueueService;
      const service = yield* UserService;
      const logger = yield* LoggingService;
      const metrics = yield* MetricsService;
      const database = yield* DatabaseService;

      // Capture CurrentUser at layer construction for job processing
      // This ensures service method requirements are satisfied
      const systemUser = UserQueueConfig.SYSTEM_USER;
      const failedCounter = yield* metrics.counter("user_jobs_failed_total")
      const pendingGauge = yield* metrics.gauge("user_jobs_pending")
      const processingGauge = yield* metrics.gauge("user_jobs_processing")

      // Job schema for queue validation (union of all job types)
      const UserJobSchema = Schema.Union(
        CreateUserJob,
        UpdateUserJob,
        DeleteUserJob,
        BulkUserJob
      )

      // Create bounded queue for job storage with schema validation
      const jobQueue = yield* queueService.bounded(1000, UserJobSchema)

      // Stats tracking
      let pending = 0;
      let processing = 0;
      let completed = 0;
      let failed = 0;
      let isProcessing = false      // Retry schedule: fixed delay with max retries
      const retrySchedule = Schedule.spaced(UserQueueConfig.RETRY_DELAY).pipe(
        Schedule.compose(Schedule.recurs(UserQueueConfig.DEFAULT_RETRIES))
      )

      // Process jobs from the queue with retry logic
      // CurrentUser is captured in service at layer construction time
      // All errors are properly tagged for contract-first error handling
      const processWithRetry = (job: UserJob) =>
        processJob(job, service, logger, metrics, schemas).pipe(
          // Transform any service errors into job execution errors FIRST
          // This ensures all errors have job-scoped tags before catchTag
          Effect.mapError((error) => {
            // Preserve job-scoped validation errors as-is
            if (error instanceof UserJobValidationError) {
              return error
            }
            // Wrap all other errors as job execution errors
            return new UserJobExecutionError({
              message: error instanceof Error ? error.message : String(error),
              jobId: job.jobId,
              jobType: job.type,
              cause: error
            })
          }),
          Effect.retry(retrySchedule),
          Effect.timeoutFail({
            duration: UserQueueConfig.JOB_TIMEOUT,
            onTimeout: () => new UserJobTimeoutError({
              message: `Job ${job.jobId} timed out after ${UserQueueConfig.JOB_TIMEOUT}`,
              jobId: job.jobId,
              jobType: job.type,
              timeout: `${UserQueueConfig.JOB_TIMEOUT}`
            })
          }),
          // Handle validation errors (tagged with feature-scoped name)
          Effect.catchTag("UserJobValidationError", (error) =>
            Effect.gen(function*() {
              yield* failedCounter.increment
              failed++
              yield* logger.error("user job validation failed", {
                jobId: error.jobId,
                jobType: error.jobType,
                errorTag: error._tag,
                message: error.message
              })
            })
          ),
          // Handle timeout errors (tagged with feature-scoped name)
          Effect.catchTag("UserJobTimeoutError", (error) =>
            Effect.gen(function*() {
              yield* failedCounter.increment
              failed++
              yield* logger.error("user job timed out", {
                jobId: error.jobId,
                jobType: error.jobType,
                errorTag: error._tag,
                timeout: error.timeout
              })
            })
          ),
          // Handle execution errors (tagged with feature-scoped name)
          Effect.catchTag("UserJobExecutionError", (error) =>
            Effect.gen(function*() {
              yield* failedCounter.increment
              failed++
              yield* logger.error("user job execution failed", {
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
  static readonly Test = (
    schemas: UserJobProcessorSchemas
  ) => this.Live(schemas)
}
