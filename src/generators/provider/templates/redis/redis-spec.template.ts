/**
 * Redis Provider Spec Template
 *
 * Generates test file for the Redis provider library.
 *
 * @module monorepo-library-generator/provider/templates/redis/spec
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"

/**
 * Generate Redis provider spec file
 */
export function generateRedisSpecFile() {
  const builder = new TypeScriptBuilder()

  builder.addFileHeader({
    title: "Redis Provider - Tests",
    description: `Unit tests for Redis provider using Effect patterns.

Tests cover:
- Test layer usage (in-memory mock)
- Error types and mapping
- Cache sub-service operations
- PubSub sub-service operations
- Queue sub-service operations`
  })
  builder.addBlankLine()

  // Imports - use ../index since spec is in lib/ folder
  builder.addImports([
    { from: "effect", imports: ["Effect"] },
    { from: "vitest", imports: ["describe", "expect", "it"] },
    { from: "../index", imports: ["mapRedisError", "Redis"] }
  ])

  // Test helpers
  builder.addSectionComment("Test Helpers")
  builder.addBlankLine()

  builder.addRaw(`const runTest = <A, E>(effect: Effect.Effect<A, E, Redis>) =>
  Effect.runPromise(effect.pipe(Effect.provide(Redis.Test)))`)
  builder.addBlankLine()

  // Tests
  builder.addSectionComment("Tests")
  builder.addBlankLine()

  builder.addRaw(`describe("Redis", () => {
  describe("Test Layer", () => {
    it("should provide a working test layer", async () => {
      const program = Effect.gen(function*() {
        const redis = yield* Redis
        return redis.config
      })

      const config = await runTest(program)
      expect(config.host).toBe("localhost")
      expect(config.port).toBe(6379)
    })

    it("should pass health check in test mode", async () => {
      const program = Effect.gen(function*() {
        const redis = yield* Redis
        return yield* redis.healthCheck
      })

      const result = await runTest(program)
      expect(result).toBe(true)
    })
  })

  describe("Cache Operations", () => {
    it("should return null for non-existent keys", async () => {
      const program = Effect.gen(function*() {
        const redis = yield* Redis
        return yield* redis.cache.get("non-existent-key")
      })

      const result = await runTest(program)
      expect(result).toBeNull()
    })

    it("should complete set operation", async () => {
      const program = Effect.gen(function*() {
        const redis = yield* Redis
        yield* redis.cache.set("test-key", "test-value")
        return "success"
      })

      const result = await runTest(program)
      expect(result).toBe("success")
    })

    it("should complete setex operation", async () => {
      const program = Effect.gen(function*() {
        const redis = yield* Redis
        yield* redis.cache.setex("test-key", 60, "test-value")
        return "success"
      })

      const result = await runTest(program)
      expect(result).toBe("success")
    })

    it("should return 0 for del on non-existent key", async () => {
      const program = Effect.gen(function*() {
        const redis = yield* Redis
        return yield* redis.cache.del("non-existent-key")
      })

      const result = await runTest(program)
      expect(result).toBe(0)
    })

    it("should respond to ping", async () => {
      const program = Effect.gen(function*() {
        const redis = yield* Redis
        return yield* redis.cache.ping()
      })

      const result = await runTest(program)
      expect(result).toBe("PONG")
    })
  })

  describe("PubSub Operations", () => {
    it("should return 0 subscribers for publish in test mode", async () => {
      const program = Effect.gen(function*() {
        const redis = yield* Redis
        return yield* redis.pubsub.publish("test-channel", "test-message")
      })

      const result = await runTest(program)
      expect(result).toBe(0)
    })

    it("should complete subscribe operation", async () => {
      const program = Effect.gen(function*() {
        const redis = yield* Redis
        yield* redis.pubsub.subscribe("test-channel", () => { /* test handler */ })
        return "subscribed"
      })

      const result = await runTest(program)
      expect(result).toBe("subscribed")
    })

    it("should complete unsubscribe operation", async () => {
      const program = Effect.gen(function*() {
        const redis = yield* Redis
        yield* redis.pubsub.unsubscribe("test-channel")
        return "unsubscribed"
      })

      const result = await runTest(program)
      expect(result).toBe("unsubscribed")
    })
  })

  describe("Queue Operations", () => {
    it("should return 1 for lpush", async () => {
      const program = Effect.gen(function*() {
        const redis = yield* Redis
        return yield* redis.queue.lpush("test-queue", "test-item")
      })

      const result = await runTest(program)
      expect(result).toBe(1)
    })

    it("should return null for brpop in test mode", async () => {
      const program = Effect.gen(function*() {
        const redis = yield* Redis
        return yield* redis.queue.brpop("test-queue", 0)
      })

      const result = await runTest(program)
      expect(result).toBeNull()
    })

    it("should return null for rpop on empty queue", async () => {
      const program = Effect.gen(function*() {
        const redis = yield* Redis
        return yield* redis.queue.rpop("test-queue")
      })

      const result = await runTest(program)
      expect(result).toBeNull()
    })

    it("should return 0 for llen on empty queue", async () => {
      const program = Effect.gen(function*() {
        const redis = yield* Redis
        return yield* redis.queue.llen("test-queue")
      })

      const result = await runTest(program)
      expect(result).toBe(0)
    })

    it("should return empty array for lrange on empty queue", async () => {
      const program = Effect.gen(function*() {
        const redis = yield* Redis
        return yield* redis.queue.lrange("test-queue", 0, -1)
      })

      const result = await runTest(program)
      expect(result).toEqual([])
    })
  })

  describe("Extended Operations", () => {
    it("should return false for exists on non-existent key", async () => {
      const program = Effect.gen(function*() {
        const redis = yield* Redis
        return yield* redis.exists("non-existent-key")
      })

      const result = await runTest(program)
      expect(result).toBe(false)
    })

    it("should return false for expire on non-existent key", async () => {
      const program = Effect.gen(function*() {
        const redis = yield* Redis
        return yield* redis.expire("non-existent-key", 60)
      })

      const result = await runTest(program)
      expect(result).toBe(false)
    })

    it("should return -2 for ttl on non-existent key", async () => {
      const program = Effect.gen(function*() {
        const redis = yield* Redis
        return yield* redis.ttl("non-existent-key")
      })

      const result = await runTest(program)
      expect(result).toBe(-2)
    })

    it("should return empty array for keys", async () => {
      const program = Effect.gen(function*() {
        const redis = yield* Redis
        return yield* redis.keys("*")
      })

      const result = await runTest(program)
      expect(result).toEqual([])
    })

    it("should return empty scan result", async () => {
      const program = Effect.gen(function*() {
        const redis = yield* Redis
        return yield* redis.scan(0)
      })

      const result = await runTest(program)
      expect(result.cursor).toBe(0)
      expect(result.keys).toEqual([])
    })
  })

  describe("Error Mapping", () => {
    it("should map connection refused to RedisConnectionError", () => {
      const error = mapRedisError({ code: "ECONNREFUSED", message: "Connection refused" })
      expect(error._tag).toBe("RedisConnectionError")
    })

    it("should map timeout to RedisTimeoutError", () => {
      const error = mapRedisError({ code: "ETIMEDOUT", message: "Timeout" }, "GET")
      expect(error._tag).toBe("RedisTimeoutError")
    })

    it("should map command failure to RedisCommandError", () => {
      const error = mapRedisError({ message: "Command failed" }, "SET")
      expect(error._tag).toBe("RedisCommandError")
    })

    it("should map unknown error to RedisError", () => {
      const error = mapRedisError({ message: "Unknown error" })
      expect(error._tag).toBe("RedisError")
    })
  })
})`)

  return builder.toString()
}
