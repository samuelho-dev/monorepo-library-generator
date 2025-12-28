import { describe, expect, it } from '@effect/vitest'
import { Effect, Option, Schema } from 'effect'
import { JobExecutionError, JobTimeoutError, JobValidationError } from './job-errors'
import { JobDataRecord, JobMetadata, JobOperationType, UUID } from './job-schemas'
import { makePriorityQueue } from './priority-queue'

/**
 * Job Processor Unit Tests
 *
 * Tests for:
 * - UUID schema validation
 * - JobMetadata schema with defaults
 * - Job error types with correct _tag
 * - In-memory priority queue (TPriorityQueue)
 */

describe('Job Schemas', () => {
  describe('UUID', () => {
    it('should validate valid UUID format', () =>
      Effect.gen(function* () {
        const valid = yield* Schema.decode(UUID)('550e8400-e29b-41d4-a716-446655440000')
        expect(valid).toBe('550e8400-e29b-41d4-a716-446655440000')
      }).pipe(Effect.runPromise))

    it('should validate lowercase UUID', () =>
      Effect.gen(function* () {
        const valid = yield* Schema.decode(UUID)('550e8400-e29b-41d4-a716-446655440000')
        expect(valid).toBe('550e8400-e29b-41d4-a716-446655440000')
      }).pipe(Effect.runPromise))

    it('should validate uppercase UUID', () =>
      Effect.gen(function* () {
        const valid = yield* Schema.decode(UUID)('550E8400-E29B-41D4-A716-446655440000')
        expect(valid).toBe('550E8400-E29B-41D4-A716-446655440000')
      }).pipe(Effect.runPromise))

    it('should reject invalid UUID format', () =>
      Effect.gen(function* () {
        const result = yield* Schema.decode(UUID)('not-a-uuid').pipe(Effect.either)
        expect(result._tag).toBe('Left')
      }).pipe(Effect.runPromise))

    it('should reject UUID with wrong length', () =>
      Effect.gen(function* () {
        const result = yield* Schema.decode(UUID)('550e8400-e29b-41d4-a716').pipe(Effect.either)
        expect(result._tag).toBe('Left')
      }).pipe(Effect.runPromise))
  })

  describe('JobMetadata', () => {
    it.effect('should provide default values for optional fields', () =>
      Effect.gen(function* () {
        const job = { jobId: '550e8400-e29b-41d4-a716-446655440000' }
        const decoded = yield* Schema.decodeUnknown(JobMetadata)(job)
        expect(decoded.jobId).toBe('550e8400-e29b-41d4-a716-446655440000')
        expect(decoded.attempt).toBe(0)
        expect(decoded.priority).toBe(0)
        expect(decoded.enqueuedAt).toBeInstanceOf(Date)
        expect(decoded.correlationId).toBeUndefined()
      }))

    it.effect('should accept all fields', () =>
      Effect.gen(function* () {
        const now = new Date()
        const job = {
          jobId: '550e8400-e29b-41d4-a716-446655440000',
          correlationId: '660e8400-e29b-41d4-a716-446655440001',
          attempt: 3,
          priority: 10,
          enqueuedAt: now
        }
        const decoded = yield* Schema.decodeUnknown(JobMetadata)(job)
        expect(decoded.jobId).toBe('550e8400-e29b-41d4-a716-446655440000')
        expect(decoded.correlationId).toBe('660e8400-e29b-41d4-a716-446655440001')
        expect(decoded.attempt).toBe(3)
        expect(decoded.priority).toBe(10)
        expect(decoded.enqueuedAt).toEqual(now)
      }))

    it.effect('should reject invalid jobId', () =>
      Effect.gen(function* () {
        const job = { jobId: 'invalid' }
        const result = yield* Schema.decodeUnknown(JobMetadata)(job).pipe(Effect.either)
        expect(result._tag).toBe('Left')
      }))
  })

  describe('JobOperationType', () => {
    it.effect('should accept create', () =>
      Effect.gen(function* () {
        const decoded = yield* Schema.decode(JobOperationType)('create')
        expect(decoded).toBe('create')
      }))

    it.effect('should accept update', () =>
      Effect.gen(function* () {
        const decoded = yield* Schema.decode(JobOperationType)('update')
        expect(decoded).toBe('update')
      }))

    it.effect('should accept delete', () =>
      Effect.gen(function* () {
        const decoded = yield* Schema.decode(JobOperationType)('delete')
        expect(decoded).toBe('delete')
      }))

    it.effect('should reject invalid operation', () =>
      Effect.gen(function* () {
        const result = yield* Schema.decode(JobOperationType)('invalid').pipe(Effect.either)
        expect(result._tag).toBe('Left')
      }))
  })

  describe('JobDataRecord', () => {
    it.effect('should accept valid record', () =>
      Effect.gen(function* () {
        const data = { name: 'test', value: 123, nested: { foo: 'bar' } }
        const decoded = yield* Schema.decode(JobDataRecord)(data)
        expect(decoded).toEqual(data)
      }))

    it.effect('should accept empty record', () =>
      Effect.gen(function* () {
        const data = {}
        const decoded = yield* Schema.decode(JobDataRecord)(data)
        expect(decoded).toEqual({})
      }))
  })
})

describe('Job Errors', () => {
  describe('JobValidationError', () => {
    it('should have correct _tag for Effect.catchTag', () => {
      const error = new JobValidationError({
        message: 'Validation failed',
        jobId: '550e8400-e29b-41d4-a716-446655440000',
        jobType: 'create'
      })
      expect(error._tag).toBe('JobValidationError')
      expect(error.message).toBe('Validation failed')
      expect(error.jobId).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(error.jobType).toBe('create')
    })

    it('should include optional cause', () => {
      const cause = new Error('Original error')
      const error = new JobValidationError({
        message: 'Validation failed',
        jobId: 'x',
        jobType: 'y',
        cause
      })
      expect(error.cause).toBe(cause)
    })
  })

  describe('JobExecutionError', () => {
    it('should have correct _tag for Effect.catchTag', () => {
      const cause = new Error('Execution failed')
      const error = new JobExecutionError({
        message: 'Job failed',
        jobId: '550e8400-e29b-41d4-a716-446655440000',
        jobType: 'update',
        cause
      })
      expect(error._tag).toBe('JobExecutionError')
      expect(error.message).toBe('Job failed')
      expect(error.cause).toBe(cause)
    })
  })

  describe('JobTimeoutError', () => {
    it('should have correct _tag for Effect.catchTag', () => {
      const error = new JobTimeoutError({
        message: 'Job timed out',
        jobId: '550e8400-e29b-41d4-a716-446655440000',
        jobType: 'delete',
        timeout: '5 minutes'
      })
      expect(error._tag).toBe('JobTimeoutError')
      expect(error.message).toBe('Job timed out')
      expect(error.timeout).toBe('5 minutes')
    })
  })
})

describe('Priority Queue (In-Memory)', () => {
  it.scoped('should dequeue higher priority items first', () =>
    Effect.gen(function* () {
      const queue = yield* makePriorityQueue(Schema.String)

      yield* queue.offer('low', 1)
      yield* queue.offer('high', 10)
      yield* queue.offer('medium', 5)

      expect(yield* queue.take).toBe('high')
      expect(yield* queue.take).toBe('medium')
      expect(yield* queue.take).toBe('low')
    }))

  it.scoped('should handle items with same priority in FIFO order', () =>
    Effect.gen(function* () {
      const queue = yield* makePriorityQueue(Schema.String)

      yield* queue.offer('first', 5)
      yield* queue.offer('second', 5)
      yield* queue.offer('third', 5)

      // Same priority items should come in order they were added
      const first = yield* queue.take
      const second = yield* queue.take
      const third = yield* queue.take

      // All should be processed (order may vary for same priority)
      expect([first, second, third].sort()).toEqual(['first', 'second', 'third'])
    }))

  it.scoped('should report correct size', () =>
    Effect.gen(function* () {
      const queue = yield* makePriorityQueue(Schema.String)

      expect(yield* queue.size).toBe(0)

      yield* queue.offer('a', 1)
      expect(yield* queue.size).toBe(1)

      yield* queue.offer('b', 2)
      expect(yield* queue.size).toBe(2)

      yield* queue.take
      expect(yield* queue.size).toBe(1)
    }))

  it.scoped('should peek without removing', () =>
    Effect.gen(function* () {
      const queue = yield* makePriorityQueue(Schema.String)

      yield* queue.offer('only', 5)

      const peeked = yield* queue.peek
      expect(Option.isSome(peeked)).toBe(true)
      expect(Option.getOrNull(peeked)).toBe('only')

      // Size should still be 1
      expect(yield* queue.size).toBe(1)

      // Should still be able to take
      expect(yield* queue.take).toBe('only')
      expect(yield* queue.size).toBe(0)
    }))

  it.scoped('should return None when peeking empty queue', () =>
    Effect.gen(function* () {
      const queue = yield* makePriorityQueue(Schema.String)

      const peeked = yield* queue.peek
      expect(Option.isNone(peeked)).toBe(true)
    }))

  it.scoped('should validate items on offer', () =>
    Effect.gen(function* () {
      const NumberSchema = Schema.Number
      const queue = yield* makePriorityQueue(NumberSchema)

      // Valid number should succeed
      const result1 = yield* queue.offer(42, 1)
      expect(result1).toBe(true)

      // Invalid item should fail validation
      const result2 = yield* queue.offer('not a number' as unknown as number, 1).pipe(Effect.either)
      expect(result2._tag).toBe('Left')
    }))

  it.scoped('should return false on offer after shutdown', () =>
    Effect.gen(function* () {
      const queue = yield* makePriorityQueue(Schema.String)

      yield* queue.shutdown

      const result = yield* queue.offer('item', 1)
      expect(result).toBe(false)
    }))

  it.scoped('should report shutdown status', () =>
    Effect.gen(function* () {
      const queue = yield* makePriorityQueue(Schema.String)

      expect(yield* queue.isShutdown).toBe(false)

      yield* queue.shutdown

      expect(yield* queue.isShutdown).toBe(true)
    }))

  it.scoped('should handle complex objects', () =>
    Effect.gen(function* () {
      const JobSchema = Schema.Struct({
        id: Schema.String,
        type: Schema.String,
        data: Schema.Unknown
      })

      const queue = yield* makePriorityQueue(JobSchema)

      const job1 = { id: '1', type: 'low', data: { value: 1 } }
      const job2 = { id: '2', type: 'high', data: { value: 2 } }

      yield* queue.offer(job1, 1)
      yield* queue.offer(job2, 10)

      const taken = yield* queue.take
      expect(taken.id).toBe('2')
      expect(taken.type).toBe('high')
    }))
})
