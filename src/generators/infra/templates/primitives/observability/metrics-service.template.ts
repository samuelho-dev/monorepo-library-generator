/**
 * Metrics Service Template (Part of Observability)
 *
 * Generates proper Effect.Metric wrapper with counters, gauges, and histograms.
 * This is now part of the unified observability infrastructure.
 *
 * @module monorepo-library-generator/infra-templates/primitives/observability
 */

import { TypeScriptBuilder } from "../../../../../utils/code-builder"
import type { InfraTemplateOptions } from "../../../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../../../utils/workspace-config"

/**
 * Generate metrics service using Effect.Metric
 *
 * This template generates a metrics service that integrates with the
 * observability infrastructure. When the OTEL SDK layer is provided,
 * metrics are automatically exported via OpenTelemetry.
 */
export function generateMetricsServiceFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${className} Metrics Service`,
    description: `Metrics infrastructure using Effect.Metric primitive.

Provides:
- Counters: Monotonically increasing values
- Gauges: Values that can go up or down
- Histograms: Value distribution with buckets

Layer Architecture (follows Service + Provider pattern):
- Memory: In-memory metrics without OTEL export
- WithOtel: Requires OtelProvider dependency
- Live: With OtelProvider.Live for production
- Test: In-memory for testing
- Dev: With OtelProvider.Dev for development
- Auto: Environment-aware selection

Effect.Metric Features:
- Type-safe metric creation
- Automatic OpenTelemetry integration via infra-observability
- Fiber-local metric collection
- Composable metric operations
- Pre-defined HistogramBoundaries and StandardMetricNames`,
    module: `${scope}/infra-${fileName}/metrics`,
    see: ["https://effect.website/docs/observability/metrics"]
  })

  builder.addImports([
    {
      from: "effect",
      imports: ["Context", "Effect", "Layer", "Metric", "MetricBoundaries"]
    },
    { from: `${scope}/env`, imports: ["env"] },
    { from: "./provider", imports: ["OtelProvider"] }
  ])

  builder.addSectionComment("Metrics Service Interface")

  builder.addRaw(`/**
 * Counter handle for incrementing metrics
 */
export interface CounterHandle {
  /**
   * Increment counter by 1
   */
  readonly increment: Effect.Effect<void>

  /**
   * Increment counter by specified amount
   */
  readonly incrementBy: (value: number) => Effect.Effect<void>

  /**
   * Get current counter value
   */
  readonly get: Effect.Effect<number>
}

/**
 * Gauge handle for setting metrics
 */
export interface GaugeHandle {
  /**
   * Set gauge to specific value
   */
  readonly set: (value: number) => Effect.Effect<void>

  /**
   * Increment gauge by 1
   */
  readonly increment: Effect.Effect<void>

  /**
   * Increment gauge by specified amount
   */
  readonly incrementBy: (value: number) => Effect.Effect<void>

  /**
   * Decrement gauge by 1
   */
  readonly decrement: Effect.Effect<void>

  /**
   * Decrement gauge by specified amount
   */
  readonly decrementBy: (value: number) => Effect.Effect<void>

  /**
   * Get current gauge value
   */
  readonly get: Effect.Effect<number>
}

/**
 * Histogram handle for recording value distributions
 */
export interface HistogramHandle {
  /**
   * Record a value in the histogram
   */
  readonly record: (value: number) => Effect.Effect<void>

  /**
   * Time an effect and record the duration
   *
   * @example
   * \`\`\`typescript
   * const result = yield* histogram.timer(processRequest);
   * \`\`\`
   */
  readonly timer: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
}

/**
 * Metric options
 */
export interface MetricOptions {
  /**
   * Metric description
   */
  readonly description?: string

  /**
   * Additional labels/tags
   */
  readonly labels?: Record<string, string>
}

/**
 * Histogram options
 */
export interface HistogramOptions extends MetricOptions {
  /**
   * Custom bucket boundaries
   * @default [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
   */
  readonly boundaries?: ReadonlyArray<number>
}

/**
 * Metrics operations interface
 */
export interface MetricsOperations {
  /**
   * Create a counter metric
   *
   * Counters are monotonically increasing values.
   * Use for: request counts, error counts, items processed.
   */
  readonly counter: (
    name: string,
    options?: MetricOptions
  ) => Effect.Effect<CounterHandle>

  /**
   * Create a gauge metric
   *
   * Gauges can go up or down.
   * Use for: current connections, queue size, memory usage.
   */
  readonly gauge: (
    name: string,
    options?: MetricOptions
  ) => Effect.Effect<GaugeHandle>

  /**
   * Create a histogram metric
   *
   * Histograms track value distributions.
   * Use for: request duration, response size, batch size.
   */
  readonly histogram: (
    name: string,
    options?: HistogramOptions
  ) => Effect.Effect<HistogramHandle>
}

/**
 * Metrics Service
 *
 * Metrics infrastructure using Effect.Metric primitive.
 * Provides counters, gauges, and histograms with OpenTelemetry support.
 *
 * @example
 * \`\`\`typescript
 * import { MetricsService, HistogramBoundaries, StandardMetricNames } from "${scope}/infra-${fileName}";
 *
 * const program = Effect.gen(function*() {
 *   const metrics = yield* MetricsService;
 *
 *   const counter = yield* metrics.counter(StandardMetricNames.httpRequestsTotal);
 *   yield* counter.increment;
 *
 *   const histogram = yield* metrics.histogram("request_duration", {
 *     boundaries: HistogramBoundaries.httpDuration
 *   });
 *   yield* histogram.timer(handleRequest);
 * }).pipe(Effect.provide(MetricsService.Live));
 * \`\`\`
 */
export class MetricsService extends Context.Tag(
  "${scope}/infra-${fileName}/MetricsService"
)<
  MetricsService,
  MetricsOperations
>() {
  // ===========================================================================
  // Helper: Make Metrics Implementation
  // ===========================================================================

  /**
   * Create metrics implementation using Effect.Metric
   */
  static makeMetrics(): MetricsOperations {
    return {
      counter: (name: string, options?: MetricOptions) =>
        Effect.sync(() => {
          const counter = Metric.counter(name, {
            description: options?.description
          })

          return {
            increment: Metric.increment(counter),
            incrementBy: (value: number) => Metric.incrementBy(counter, value),
            get: Metric.value(counter).pipe(
              Effect.map((state) => {
                // MetricState is a union type - counter state has a "count" property
                if ("count" in state) {
                  return state.count
                }
                return 0
              })
            )
          }
        }),

      gauge: (name: string, options?: MetricOptions) =>
        Effect.sync(() => {
          const gauge = Metric.gauge(name, {
            description: options?.description
          })

          return {
            set: (value: number) => Metric.set(gauge, value),
            increment: Metric.incrementBy(gauge, 1),
            incrementBy: (value: number) => Metric.incrementBy(gauge, value),
            decrement: Metric.incrementBy(gauge, -1),
            decrementBy: (value: number) => Metric.incrementBy(gauge, -value),
            get: Metric.value(gauge).pipe(
              Effect.map((state) => {
                if ("value" in state) {
                  return state.value
                }
                return 0
              })
            )
          }
        }),

      histogram: (name: string, options?: HistogramOptions) =>
        Effect.sync(() => {
          // Use exponential boundaries by default (good for HTTP latency)
          const boundaries = options?.boundaries
            ? MetricBoundaries.linear({ start: options.boundaries[0] ?? 0.005, width: 0.05, count: options.boundaries.length })
            : MetricBoundaries.exponential({ start: 0.005, factor: 2, count: 11 })
          const histogram = Metric.histogram(name, boundaries)

          return {
            record: (value: number) => Metric.update(histogram, value),
            timer: <A, E, R>(effect: Effect.Effect<A, E, R>) =>
              Effect.gen(function*() {
                const start = Date.now()
                const result = yield* effect
                const duration = (Date.now() - start) / 1000 // Convert to seconds
                yield* Metric.update(histogram, duration)
                return result
              })
          }
        })
    }
  }

  /**
   * Create in-memory metrics implementation for testing
   */
  static makeInMemory(): MetricsOperations {
    // Store metrics by name for test assertions
    const counters = new Map<string, { count: number }>()
    const gauges = new Map<string, { value: number }>()
    const histograms = new Map<string, { values: Array<number> }>()

    return {
      counter: (name: string) =>
        Effect.sync(() => {
          const state = counters.get(name) ?? { count: 0 }
          counters.set(name, state)

          return {
            increment: Effect.sync(() => { state.count++ }),
            incrementBy: (value: number) => Effect.sync(() => { state.count += value }),
            get: Effect.sync(() => state.count)
          }
        }),

      gauge: (name: string) =>
        Effect.sync(() => {
          const state = gauges.get(name) ?? { value: 0 }
          gauges.set(name, state)

          return {
            set: (v: number) => Effect.sync(() => { state.value = v }),
            increment: Effect.sync(() => { state.value++ }),
            incrementBy: (v: number) => Effect.sync(() => { state.value += v }),
            decrement: Effect.sync(() => { state.value-- }),
            decrementBy: (v: number) => Effect.sync(() => { state.value -= v }),
            get: Effect.sync(() => state.value)
          }
        }),

      histogram: (name: string) =>
        Effect.sync(() => {
          const state = histograms.get(name) ?? { values: [] }
          histograms.set(name, state)

          return {
            record: (value: number) => Effect.sync(() => { state.values.push(value) }),
            timer: <A, E, R>(effect: Effect.Effect<A, E, R>) =>
              Effect.gen(function*() {
                const start = Date.now()
                const result = yield* effect
                const duration = (Date.now() - start) / 1000
                state.values.push(duration)
                return result
              })
          }
        })
    }
  }

  // ===========================================================================
  // Memory Layer (Standalone - No OTEL)
  // ===========================================================================

  /**
   * Memory Layer - In-memory metrics without OTEL export
   *
   * Uses Effect's Metric primitive. Metrics are collected but not exported.
   * Use for testing or when OTEL infrastructure is not available.
   */
  static readonly Memory = Layer.succeed(MetricsService, MetricsService.makeMetrics())

  // ===========================================================================
  // WithOtel Layer (Requires OtelProvider)
  // ===========================================================================

  /**
   * WithOtel Layer - Metrics with OTEL provider dependency
   *
   * Requires OtelProvider to be provided. When the OTEL SDK is initialized,
   * Effect.Metric automatically exports to OpenTelemetry.
   *
   * @example
   * \`\`\`typescript
   * const customLayer = Layer.provide(
   *   MetricsService.WithOtel,
   *   OtelProvider.make({ serviceName: "custom" })
   * );
   * \`\`\`
   */
  static readonly WithOtel = Layer.effect(
    MetricsService,
    Effect.gen(function*() {
      // Just verify OtelProvider is available
      // The OTEL SDK layer handles the actual export
      yield* OtelProvider
      return MetricsService.makeMetrics()
    })
  )

  // ===========================================================================
  // Static Live Layer
  // ===========================================================================

  /**
   * Live Layer - Production metrics with OTEL
   *
   * Uses Effect.Metric with OTEL SDK for production export.
   */
  static readonly Live = Layer.provide(
    MetricsService.WithOtel,
    OtelProvider.Live
  )

  // ===========================================================================
  // Static Test Layer
  // ===========================================================================

  /**
   * Test Layer - In-memory metrics for testing
   *
   * Metrics are collected in memory for test assertions.
   */
  static readonly Test = Layer.sync(MetricsService, () => MetricsService.makeInMemory())

  // ===========================================================================
  // Dev Layer
  // ===========================================================================

  /**
   * Dev Layer - Metrics with debug logging and OTEL
   */
  static readonly Dev = Layer.effect(
    MetricsService,
    Effect.gen(function*() {
      const otel = yield* OtelProvider
      yield* Effect.logDebug("[MetricsService] [DEV] Initialized", {
        serviceName: otel.serviceName,
        metricsEnabled: otel.metricsEnabled
      })

      const baseMetrics = MetricsService.makeMetrics()

      return {
        counter: (name: string, options?: MetricOptions) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[MetricsService] [DEV] Creating counter", { name, options })
            return yield* baseMetrics.counter(name, options)
          }),

        gauge: (name: string, options?: MetricOptions) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[MetricsService] [DEV] Creating gauge", { name, options })
            return yield* baseMetrics.gauge(name, options)
          }),

        histogram: (name: string, options?: HistogramOptions) =>
          Effect.gen(function*() {
            yield* Effect.logDebug("[MetricsService] [DEV] Creating histogram", { name, options })
            return yield* baseMetrics.histogram(name, options)
          })
      }
    })
  ).pipe(Layer.provide(OtelProvider.Dev))

  // ===========================================================================
  // Auto Layer
  // ===========================================================================

  /**
   * Auto Layer - Environment-aware layer selection
   *
   * Selects appropriate layer based on NODE_ENV:
   * - "production" → Live (with OtelProvider.Live)
   * - "development" → Dev (with logging)
   * - "test" → Test (in-memory)
   * - default → Dev
   */
  static readonly Auto = Layer.suspend(() => {
    switch (env.NODE_ENV) {
      case "production":
        return MetricsService.Live
      case "test":
        return MetricsService.Test
      default:
        // "development" and other environments use Dev
        return MetricsService.Dev
    }
  })
}
`)

  return builder.toString()
}
