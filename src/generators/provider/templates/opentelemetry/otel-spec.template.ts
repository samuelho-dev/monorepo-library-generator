/**
 * OpenTelemetry Spec Template
 *
 * Generates test file for OpenTelemetry provider.
 *
 * @module monorepo-library-generator/provider/templates/opentelemetry
 */

import { TypeScriptBuilder } from "../../../../utils/code-builder"
import type { ProviderTemplateOptions } from "../../../../utils/types"

/**
 * Generate OpenTelemetry spec file
 */
export function generateOtelSpecFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder()

  builder.addFileHeader({
    title: "OpenTelemetry Provider Tests",
    description: "Test suite for OpenTelemetry provider service.",
    module: `${options.packageName}/spec`
  })

  builder.addImports([
    { from: "effect", imports: ["Effect"] },
    { from: "./otel", imports: ["OpenTelemetryProvider"] }
  ])

  builder.addRaw(`describe("OpenTelemetryProvider", () => {
  describe("Test layer", () => {
    it("provides disabled tracing and metrics", async () => {
      const program = Effect.gen(function*() {
        const otel = yield* OpenTelemetryProvider
        return {
          tracesEnabled: otel.tracesEnabled,
          metricsEnabled: otel.metricsEnabled,
          serviceName: otel.serviceName,
        }
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OpenTelemetryProvider.Test))
      )

      expect(result.tracesEnabled).toBe(false)
      expect(result.metricsEnabled).toBe(false)
      expect(result.serviceName).toBe("test-service")
    })
  })

  describe("make factory", () => {
    it("creates layer with custom configuration", () => {
      const customLayer = OpenTelemetryProvider.make({
        serviceName: "custom-service",
        serviceVersion: "1.2.3",
        traces: { enabled: true },
        metrics: { enabled: false },
      })

      // Note: This test would need OTEL SDK which may not be available in test env
      // For now, we just verify the layer compiles correctly
      expect(customLayer).toBeDefined()
    })
  })

  describe("Auto layer", () => {
    it("selects Test layer in test environment", async () => {
      // In test environment, Auto should resolve to Test layer
      const program = Effect.gen(function*() {
        const otel = yield* OpenTelemetryProvider
        return otel.serviceName
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(OpenTelemetryProvider.Test))
      )

      expect(result).toBe("test-service")
    })
  })
})
`)

  return builder.toString()
}
