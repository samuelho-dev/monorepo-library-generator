---
scope: libs/infra/queue/
updated: 2025-12-28
relates_to:
  - ../../CLAUDE.md
  - ../../../docs/INFRA.md
  - ../../../docs/EFFECT_PATTERNS.md
---

# @samuelho-dev/infra-queue

Queue infrastructure with job processing, priority queues, and distributed queue support.

## AI Agent Reference

This is an infrastructure library following Effect-based service patterns.

### Structure (Flat lib/ Directory)

- **lib/service.ts**: QueueService Context.Tag with static layers (Live, Test, Dev, Auto)
- **lib/errors.ts**: Data.TaggedError-based queue error types
- **lib/layers.ts**: Redis queue layer with `QueueRedisLayer`, `makePriorityQueueRedis`
- **lib/priority-queue.ts**: In-memory priority queue using TPriorityQueue (Effect STM)
- **lib/job-schemas.ts**: Shared job schemas (UUID, JobMetadata, JobOperationType, JobDataRecord)
- **lib/job-errors.ts**: Shared job error types (JobValidationError, JobExecutionError, JobTimeoutError)

### Import Patterns

```typescript
// Type-only import (zero runtime)
import type { QueueConfig, PriorityQueueHandle, JobError } from '@samuelho-dev/infra-queue/types'

// Service import
import { QueueService } from '@samuelho-dev/infra-queue'

// Job schemas and errors
import {
  UUID, JobMetadata, JobOperationType, JobDataRecord,
  JobValidationError, JobExecutionError, JobTimeoutError
} from '@samuelho-dev/infra-queue'

// Priority queue factories
import { makePriorityQueue, makePriorityQueueRedis } from '@samuelho-dev/infra-queue'

Effect.gen(function*() {
  const queue = yield* QueueService
  // Use queue...
})
```

### Priority Queue Usage

Two implementations with the same `PriorityQueueHandle` interface:

```typescript
// In-memory priority queue (TPriorityQueue - STM-based)
const memoryQueue = yield* makePriorityQueue(Schema.String)

// Redis priority queue (Sorted Sets - ZADD/BZPOPMAX)
const redisQueue = yield* makePriorityQueueRedis(Schema.String, 'my-queue')

// Both support the same interface
yield* queue.offer('item', 10)  // Add with priority
const item = yield* queue.take  // Get highest priority
const size = yield* queue.size  // Get queue size
```

### Job Processing Infrastructure

Shared schemas for job processing across features:

```typescript
import { JobMetadata, UUID, JobDataRecord } from '@samuelho-dev/infra-queue'

// JobMetadata provides:
// - jobId: UUID (branded string with pattern validation)
// - correlationId: optional UUID for distributed tracing
// - attempt: retry count (default 0)
// - priority: job priority (default 0)
// - enqueuedAt: timestamp (default now)

// Use in feature job classes
class MyJob extends Schema.Class<MyJob>("MyJob")({
  ...JobMetadata.fields,
  type: Schema.Literal("my-job"),
  data: JobDataRecord,
  initiatedBy: Schema.optional(UUID)
}) {}
```

### Customization Guide

1. **Configure Service** (`lib/service.ts`):
   - Memory layer (Live) for in-process queues
   - Redis layer for distributed queues

2. **Priority Queues**:
   - Use `makePriorityQueue` for in-memory (testing, single instance)
   - Use `makePriorityQueueRedis` for distributed (production)

3. **Job Processing**:
   - Import shared schemas from infra-queue
   - Define feature-specific job classes using `JobMetadata.fields`
   - Use feature-scoped errors for `Effect.catchTag` patterns

### Usage Example

```typescript
import {
  QueueService, makePriorityQueue, makePriorityQueueRedis,
  JobMetadata, UUID, JobDataRecord
} from '@samuelho-dev/infra-queue'

// Standard queue usage
const program = Effect.gen(function*() {
  const queue = yield* QueueService
  const jobQueue = yield* queue.bounded(1000, JobSchema)

  yield* jobQueue.offer(myJob)
  const job = yield* jobQueue.take
})

// Priority queue usage
const priorityProgram = Effect.gen(function*() {
  const queue = yield* makePriorityQueue(Schema.String)

  yield* queue.offer('low', 1)
  yield* queue.offer('high', 10)

  const next = yield* queue.take  // 'high' (priority 10)
})
```

### Testing Strategy

1. **QueueService.Test** - In-memory queue for unit tests
2. **makePriorityQueue** - In-memory priority queue for unit tests
3. **QueueRedisLayer** + **Redis.Test** - Redis queue with mock for integration tests
4. **makePriorityQueueRedis** + **Redis.Test** - Priority queue with mock for integration tests

## For Future Claude Code Instances

- [ ] Uses Context.Tag with static layers (Live, Test, Dev, Auto)
- [ ] Redis layer available via `QueueRedisLayer`
- [ ] Memory provider is included for testing
- [ ] Use Effect.Schema for queue message serialization
- [ ] `withJobEnqueuing` helper for type-safe job enqueuing
- [ ] `makePriorityQueue` for in-memory priority queues (TPriorityQueue/STM)
- [ ] `makePriorityQueueRedis` for Redis priority queues (Sorted Sets)
- [ ] Shared job schemas: `UUID`, `JobMetadata`, `JobOperationType`, `JobDataRecord`
- [ ] Shared job errors: `JobValidationError`, `JobExecutionError`, `JobTimeoutError`
- [ ] Feature generators use shared infrastructure, define feature-scoped errors
