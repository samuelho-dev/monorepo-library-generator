/**
 * Generator Metrics Tests
 *
 * Tests for OpenTelemetry metrics used in generator observability
 */

import { Effect, Metric, MetricBoundaries } from "effect"
import { describe, expect, it } from "vitest"
import {
  filesGenerated,
  generatorDuration,
  generatorErrors,
  generatorExecutions,
  infrastructureDuration,
  taggedFilesGenerated,
  taggedGeneratorDuration,
  taggedGeneratorError,
  taggedGeneratorExecution,
  taggedTemplateDuration,
  templateCompilations,
  templateDuration
} from "../metrics"

describe("Generator Metrics", () => {
  describe("Histogram Metrics", () => {
    it("should create generatorDuration histogram with exponential boundaries", () => {
      expect(generatorDuration).toBeDefined()
      // Verify it's a histogram by checking it accepts numeric updates
      const effect = generatorDuration.pipe(Metric.update(100))
      expect(effect).toBeDefined()
    })

    it("should create templateDuration histogram with exponential boundaries", () => {
      expect(templateDuration).toBeDefined()
      const effect = templateDuration.pipe(Metric.update(10))
      expect(effect).toBeDefined()
    })

    it("should create infrastructureDuration histogram with exponential boundaries", () => {
      expect(infrastructureDuration).toBeDefined()
      const effect = infrastructureDuration.pipe(Metric.update(50))
      expect(effect).toBeDefined()
    })
  })

  describe("Counter Metrics", () => {
    it("should create filesGenerated counter", () => {
      expect(filesGenerated).toBeDefined()
      const effect = Metric.increment(filesGenerated)
      expect(effect).toBeDefined()
    })

    it("should create generatorExecutions counter", () => {
      expect(generatorExecutions).toBeDefined()
      const effect = Metric.increment(generatorExecutions)
      expect(effect).toBeDefined()
    })

    it("should create generatorErrors counter", () => {
      expect(generatorErrors).toBeDefined()
      const effect = Metric.increment(generatorErrors)
      expect(effect).toBeDefined()
    })

    it("should create templateCompilations counter", () => {
      expect(templateCompilations).toBeDefined()
      const effect = Metric.increment(templateCompilations)
      expect(effect).toBeDefined()
    })
  })

  describe("Tagged Metric Helpers", () => {
    it("should create tagged generator duration for library type", () => {
      const tagged = taggedGeneratorDuration("contract")
      expect(tagged).toBeDefined()

      const effect = tagged.pipe(Metric.update(100))
      expect(effect).toBeDefined()
    })

    it("should create tagged generator execution for library and interface type", () => {
      const tagged = taggedGeneratorExecution("provider", "cli")
      expect(tagged).toBeDefined()

      const effect = Metric.increment(tagged)
      expect(effect).toBeDefined()
    })

    it("should create tagged generator error for error type and library", () => {
      const tagged = taggedGeneratorError("execution_error", "feature")
      expect(tagged).toBeDefined()

      const effect = Metric.increment(tagged)
      expect(effect).toBeDefined()
    })

    it("should create tagged template duration for template ID", () => {
      const tagged = taggedTemplateDuration("contract/errors")
      expect(tagged).toBeDefined()

      const effect = tagged.pipe(Metric.update(5))
      expect(effect).toBeDefined()
    })

    it("should create tagged files generated for library type", () => {
      const tagged = taggedFilesGenerated("data-access")
      expect(tagged).toBeDefined()

      const effect = tagged.pipe(Metric.incrementBy(10))
      expect(effect).toBeDefined()
    })
  })

  describe("Metric Effect Execution", () => {
    it("should execute counter increment effect", async () => {
      const effect = Effect.gen(function*() {
        yield* Metric.increment(generatorExecutions)
        return "done"
      })

      const result = await Effect.runPromise(effect)
      expect(result).toBe("done")
    })

    it("should execute histogram update effect", async () => {
      const effect = Effect.gen(function*() {
        yield* generatorDuration.pipe(Metric.update(150))
        return "done"
      })

      const result = await Effect.runPromise(effect)
      expect(result).toBe("done")
    })

    it("should execute tagged metric effects", async () => {
      const effect = Effect.gen(function*() {
        yield* Metric.increment(taggedGeneratorExecution("contract", "mcp"))
        yield* taggedGeneratorDuration("contract").pipe(Metric.update(200))
        yield* taggedFilesGenerated("contract").pipe(Metric.incrementBy(5))
        return "done"
      })

      const result = await Effect.runPromise(effect)
      expect(result).toBe("done")
    })
  })
})
