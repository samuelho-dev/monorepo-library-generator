import { describe, expect, it } from '@effect/vitest'
import { Redis } from '@samuelho-dev/provider-redis'
import { Effect, Option, Schema } from 'effect'
import { makePriorityQueueRedis } from './layers'

/**
 * Redis Priority Queue Integration Tests
 *
 * Tests for makePriorityQueueRedis using Redis.Test layer (in-memory).
 * These tests verify:
 * - Priority ordering (higher scores dequeued first)
 * - JSON serialization/deserialization
 * - Queue operations (offer, take, peek, size)
 * - Shutdown behavior
 */

// Test layer with Redis.Test for in-memory sorted set operations
const TestLayer = Redis.Test

describe('Redis Priority Queue (Sorted Sets)', () => {
  it.scoped('should dequeue higher priority items first', () =>
    Effect.gen(function* () {
      const queue = yield* makePriorityQueueRedis(Schema.String, 'test-queue-1')

      yield* queue.offer('low', 1)
      yield* queue.offer('high', 10)
      yield* queue.offer('medium', 5)

      // Higher priority (score) comes first
      expect(yield* queue.take).toBe('high')
      expect(yield* queue.take).toBe('medium')
      expect(yield* queue.take).toBe('low')
    }).pipe(Effect.provide(TestLayer)))

  it.scoped('should handle items with same priority', () =>
    Effect.gen(function* () {
      const queue = yield* makePriorityQueueRedis(Schema.String, 'test-queue-2')

      yield* queue.offer('first', 5)
      yield* queue.offer('second', 5)
      yield* queue.offer('third', 5)

      // All should be processed (Redis ZADD allows duplicates with same score)
      const results: string[] = []
      results.push(yield* queue.take)
      results.push(yield* queue.take)
      results.push(yield* queue.take)

      expect(results.sort()).toEqual(['first', 'second', 'third'])
    }).pipe(Effect.provide(TestLayer)))

  it.scoped('should report correct size', () =>
    Effect.gen(function* () {
      const queue = yield* makePriorityQueueRedis(Schema.String, 'test-queue-3')

      expect(yield* queue.size).toBe(0)

      yield* queue.offer('a', 1)
      expect(yield* queue.size).toBe(1)

      yield* queue.offer('b', 2)
      expect(yield* queue.size).toBe(2)

      yield* queue.take
      expect(yield* queue.size).toBe(1)
    }).pipe(Effect.provide(TestLayer)))

  it.scoped('should peek without removing', () =>
    Effect.gen(function* () {
      const queue = yield* makePriorityQueueRedis(Schema.String, 'test-queue-4')

      yield* queue.offer('item', 5)

      const peeked = yield* queue.peek
      expect(Option.isSome(peeked)).toBe(true)
      expect(Option.getOrNull(peeked)).toBe('item')

      // Size should still be 1
      expect(yield* queue.size).toBe(1)

      // Should still be able to take
      expect(yield* queue.take).toBe('item')
      expect(yield* queue.size).toBe(0)
    }).pipe(Effect.provide(TestLayer)))

  it.scoped('should return None when peeking empty queue', () =>
    Effect.gen(function* () {
      const queue = yield* makePriorityQueueRedis(Schema.String, 'test-queue-5')

      const peeked = yield* queue.peek
      expect(Option.isNone(peeked)).toBe(true)
    }).pipe(Effect.provide(TestLayer)))

  it.scoped('should return false on offer after shutdown', () =>
    Effect.gen(function* () {
      const queue = yield* makePriorityQueueRedis(Schema.String, 'test-queue-6')

      yield* queue.shutdown

      const result = yield* queue.offer('item', 1)
      expect(result).toBe(false)
    }).pipe(Effect.provide(TestLayer)))

  it.scoped('should report shutdown status', () =>
    Effect.gen(function* () {
      const queue = yield* makePriorityQueueRedis(Schema.String, 'test-queue-7')

      expect(yield* queue.isShutdown).toBe(false)

      yield* queue.shutdown

      expect(yield* queue.isShutdown).toBe(true)
    }).pipe(Effect.provide(TestLayer)))

  it.scoped('should serialize and deserialize complex objects', () =>
    Effect.gen(function* () {
      const JobSchema = Schema.Struct({
        id: Schema.String,
        type: Schema.String,
        payload: Schema.Struct({
          userId: Schema.String,
          action: Schema.String
        })
      })

      const queue = yield* makePriorityQueueRedis(JobSchema, 'test-queue-jobs')

      const job1 = { id: '1', type: 'email', payload: { userId: 'u1', action: 'welcome' } }
      const job2 = { id: '2', type: 'sms', payload: { userId: 'u2', action: 'verify' } }

      yield* queue.offer(job1, 1)
      yield* queue.offer(job2, 10)

      // Higher priority job comes first
      const taken = yield* queue.take
      expect(taken.id).toBe('2')
      expect(taken.type).toBe('sms')
      expect(taken.payload.userId).toBe('u2')
    }).pipe(Effect.provide(TestLayer)))

  it.scoped('should handle multiple queues independently', () =>
    Effect.gen(function* () {
      const queue1 = yield* makePriorityQueueRedis(Schema.String, 'independent-queue-1')
      const queue2 = yield* makePriorityQueueRedis(Schema.String, 'independent-queue-2')

      yield* queue1.offer('q1-item', 1)
      yield* queue2.offer('q2-item', 2)

      expect(yield* queue1.size).toBe(1)
      expect(yield* queue2.size).toBe(1)

      expect(yield* queue1.take).toBe('q1-item')
      expect(yield* queue2.take).toBe('q2-item')

      expect(yield* queue1.size).toBe(0)
      expect(yield* queue2.size).toBe(0)
    }).pipe(Effect.provide(TestLayer)))

  it.scoped('should handle negative priorities', () =>
    Effect.gen(function* () {
      const queue = yield* makePriorityQueueRedis(Schema.String, 'test-queue-negative')

      yield* queue.offer('very-low', -10)
      yield* queue.offer('low', 0)
      yield* queue.offer('high', 10)

      expect(yield* queue.take).toBe('high')
      expect(yield* queue.take).toBe('low')
      expect(yield* queue.take).toBe('very-low')
    }).pipe(Effect.provide(TestLayer)))

  it.scoped('should handle large priority values', () =>
    Effect.gen(function* () {
      const queue = yield* makePriorityQueueRedis(Schema.String, 'test-queue-large')

      yield* queue.offer('low', 1)
      yield* queue.offer('max', Number.MAX_SAFE_INTEGER)
      yield* queue.offer('high', 1000000)

      expect(yield* queue.take).toBe('max')
      expect(yield* queue.take).toBe('high')
      expect(yield* queue.take).toBe('low')
    }).pipe(Effect.provide(TestLayer)))

  it.scoped('should validate items on offer with schema', () =>
    Effect.gen(function* () {
      const NumberSchema = Schema.Number
      const queue = yield* makePriorityQueueRedis(NumberSchema, 'test-queue-validate')

      // Valid number should succeed
      const result1 = yield* queue.offer(42, 1)
      expect(result1).toBe(true)

      // Invalid item should fail validation
      const result2 = yield* queue
        .offer('not a number' as unknown as number, 1)
        .pipe(Effect.either)
      expect(result2._tag).toBe('Left')
    }).pipe(Effect.provide(TestLayer)))
})

describe('Redis Priority Queue - Interface Compatibility', () => {
  it.scoped('should be compatible with PriorityQueueHandle interface', () =>
    Effect.gen(function* () {
      // Test that Redis priority queue can be used interchangeably with in-memory
      const queue = yield* makePriorityQueueRedis(Schema.String, 'interface-test')

      // All interface methods should be available
      const offered = yield* queue.offer('test', 5)
      expect(offered).toBe(true)

      const size = yield* queue.size
      expect(size).toBe(1)

      const peeked = yield* queue.peek
      expect(Option.isSome(peeked)).toBe(true)

      const taken = yield* queue.take
      expect(taken).toBe('test')

      const isShutdown = yield* queue.isShutdown
      expect(isShutdown).toBe(false)

      yield* queue.shutdown
      expect(yield* queue.isShutdown).toBe(true)
    }).pipe(Effect.provide(TestLayer)))
})
