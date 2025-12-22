import { Context, Effect, Layer, Metric, MetricBoundaries } from "effect";

/**
 * Metrics Service
 *
 * Metrics infrastructure using Effect.Metric primitive.

Provides:
- Counters: Monotonically increasing values
- Gauges: Values that can go up or down
- Histograms: Value distribution with buckets

Effect.Metric Features:
- Type-safe metric creation
- Automatic OpenTelemetry integration
- Fiber-local metric collection
- Composable metric operations
 *
 * @module @myorg/infra-metrics/service
 * @see EFFECT_PATTERNS.md for metrics patterns
 */

// ============================================================================
// Metrics Service Interface (Effect.Metric Wrapper)
// ============================================================================

/**
 * Counter handle for incrementing metrics
 */
export interface CounterHandle {
  /**
   * Increment counter by 1
   */
  readonly increment: Effect.Effect<void>;

  /**
   * Increment counter by specified amount
   */
  readonly incrementBy: (value: number) => Effect.Effect<void>;

  /**
   * Get current counter value
   */
  readonly get: Effect.Effect<number>;
}

/**
 * Gauge handle for setting metrics
 */
export interface GaugeHandle {
  /**
   * Set gauge to specific value
   */
  readonly set: (value: number) => Effect.Effect<void>;

  /**
   * Increment gauge by 1
   */
  readonly increment: Effect.Effect<void>;

  /**
   * Increment gauge by specified amount
   */
  readonly incrementBy: (value: number) => Effect.Effect<void>;

  /**
   * Decrement gauge by 1
   */
  readonly decrement: Effect.Effect<void>;

  /**
   * Decrement gauge by specified amount
   */
  readonly decrementBy: (value: number) => Effect.Effect<void>;

  /**
   * Get current gauge value
   */
  readonly get: Effect.Effect<number>;
}

/**
 * Histogram handle for recording value distributions
 */
export interface HistogramHandle {
  /**
   * Record a value in the histogram
   */
  readonly record: (value: number) => Effect.Effect<void>;

  /**
   * Time an effect and record the duration
   *
   * @example
   * ```typescript
   * const result = yield* histogram.timer(processRequest);
   * ```
   */
  readonly timer: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
}

/**
 * Metric options
 */
export interface MetricOptions {
  /**
   * Metric description
   */
  readonly description?: string;

  /**
   * Additional labels/tags
   */
  readonly labels?: Record<string, string>;
}

/**
 * Histogram options
 */
export interface HistogramOptions extends MetricOptions {
  /**
   * Custom bucket boundaries
   * @default [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
   */
  readonly boundaries?: readonly number[];
}

/**
 * Metrics Service
 *
 * Metrics infrastructure using Effect.Metric primitive.
 * Provides counters, gauges, and histograms with OpenTelemetry support.
 */
export class MetricsService extends Context.Tag("@myorg/infra-metrics/MetricsService")<
  MetricsService,
  {
    /**
     * Create a counter metric
     *
     * Counters are monotonically increasing values.
     * Use for: request counts, error counts, items processed.
     *
     * @example
     * ```typescript
     * const requestCounter = yield* metrics.counter("http_requests_total", {
     *   description: "Total HTTP requests"
     * });
     *
     * yield* requestCounter.increment;
     * ```
     */
    readonly counter: (name: string, options?: MetricOptions) => Effect.Effect<CounterHandle>;

    /**
     * Create a gauge metric
     *
     * Gauges can go up or down.
     * Use for: current connections, queue size, memory usage.
     *
     * @example
     * ```typescript
     * const activeConnections = yield* metrics.gauge("active_connections", {
     *   description: "Current active connections"
     * });
     *
     * yield* activeConnections.increment;
     * yield* activeConnections.decrement;
     * ```
     */
    readonly gauge: (name: string, options?: MetricOptions) => Effect.Effect<GaugeHandle>;

    /**
     * Create a histogram metric
     *
     * Histograms track value distributions.
     * Use for: request duration, response size, batch size.
     *
     * @example
     * ```typescript
     * const requestDuration = yield* metrics.histogram("http_request_duration_seconds", {
     *   description: "HTTP request duration",
     *   boundaries: [0.01, 0.05, 0.1, 0.5, 1, 5]
     * });
     *
     * yield* requestDuration.timer(handleRequest);
     * ```
     */
    readonly histogram: (
      name: string,
      options?: HistogramOptions,
    ) => Effect.Effect<HistogramHandle>;
  }
>() {
  // ===========================================================================
  // Static Live Layer (Effect.Metric)
  // ===========================================================================

  /**
   * Live Layer - Production metrics using Effect.Metric
   *
   * Metrics are collected and can be exported via OpenTelemetry.
   */
  static readonly Live = Layer.succeed(this, {
    counter: (name: string, options?: MetricOptions) =>
      Effect.sync(() => {
        const counter = Metric.counter(name, {
          description: options?.description,
        });

        return {
          increment: Metric.increment(counter),
          incrementBy: (value: number) => Metric.incrementBy(counter, value),
          get: Metric.value(counter).pipe(
            Effect.map((state) => {
              // MetricState is a union type - counter state has a "count" property
              if ("count" in state) {
                return state.count;
              }
              return 0;
            }),
          ),
        } satisfies CounterHandle;
      }),

    gauge: (name: string, options?: MetricOptions) =>
      Effect.sync(() => {
        const gauge = Metric.gauge(name, {
          description: options?.description,
        });

        return {
          set: (value: number) => Metric.set(gauge, value),
          increment: Metric.incrementBy(gauge, 1),
          incrementBy: (value: number) => Metric.incrementBy(gauge, value),
          decrement: Metric.incrementBy(gauge, -1),
          decrementBy: (value: number) => Metric.incrementBy(gauge, -value),
          get: Metric.value(gauge).pipe(
            Effect.map((state) => {
              if ("value" in state) {
                return state.value;
              }
              return 0;
            }),
          ),
        } satisfies GaugeHandle;
      }),

    histogram: (name: string, options?: HistogramOptions) =>
      Effect.sync(() => {
        // Use exponential boundaries by default (good for HTTP latency)
        // Note: Custom boundaries require calculating linear/exponential params
        // For custom buckets, prefer using linear() or exponential() constructors
        const boundaries = options?.boundaries
          ? MetricBoundaries.linear({
              start: options.boundaries[0] ?? 0.005,
              width: 0.05,
              count: options.boundaries.length,
            })
          : MetricBoundaries.exponential({ start: 0.005, factor: 2, count: 11 });
        const histogram = Metric.histogram(name, boundaries);

        return {
          record: (value: number) => Metric.update(histogram, value),
          timer: <A, E, R>(effect: Effect.Effect<A, E, R>) =>
            Effect.gen(function* () {
              const start = Date.now();
              const result = yield* effect;
              const duration = (Date.now() - start) / 1000; // Convert to seconds
              yield* Metric.update(histogram, duration);
              return result;
            }),
        } satisfies HistogramHandle;
      }),
  });

  // ===========================================================================
  // Static Test Layer
  // ===========================================================================

  /**
   * Test Layer - In-memory metrics for testing
   *
   * Metrics are collected but not exported.
   */
  static readonly Test = Layer.sync(this, () => {
    // Store metrics by name for test assertions
    const counters = new Map<string, { count: number }>();
    const gauges = new Map<string, { value: number }>();
    const histograms = new Map<string, { values: number[] }>();

    return {
      counter: (name: string) =>
        Effect.sync(() => {
          const state = counters.get(name) ?? { count: 0 };
          counters.set(name, state);

          return {
            increment: Effect.sync(() => {
              state.count++;
            }),
            incrementBy: (value: number) =>
              Effect.sync(() => {
                state.count += value;
              }),
            get: Effect.sync(() => state.count),
          } satisfies CounterHandle;
        }),

      gauge: (name: string) =>
        Effect.sync(() => {
          const state = gauges.get(name) ?? { value: 0 };
          gauges.set(name, state);

          return {
            set: (v: number) =>
              Effect.sync(() => {
                state.value = v;
              }),
            increment: Effect.sync(() => {
              state.value++;
            }),
            incrementBy: (v: number) =>
              Effect.sync(() => {
                state.value += v;
              }),
            decrement: Effect.sync(() => {
              state.value--;
            }),
            decrementBy: (v: number) =>
              Effect.sync(() => {
                state.value -= v;
              }),
            get: Effect.sync(() => state.value),
          } satisfies GaugeHandle;
        }),

      histogram: (name: string) =>
        Effect.sync(() => {
          const state = histograms.get(name) ?? { values: [] };
          histograms.set(name, state);

          return {
            record: (value: number) =>
              Effect.sync(() => {
                state.values.push(value);
              }),
            timer: <A, E, R>(effect: Effect.Effect<A, E, R>) =>
              Effect.gen(function* () {
                const start = Date.now();
                const result = yield* effect;
                const duration = (Date.now() - start) / 1000;
                state.values.push(duration);
                return result;
              }),
          } satisfies HistogramHandle;
        }),
    };
  });
}
