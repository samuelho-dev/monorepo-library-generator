/**
 * EffectMetrics Provider Library
 *
 * External service adapter for EffectMetrics.

This library provides an Effect-based adapter for the EffectMetrics external service.
It wraps the external SDK in Effect types for composable error handling.

Effect 3.0+ Pattern:
  - EffectMetrics extends Context.Tag
  - Access layers via static members: EffectMetrics.Live, EffectMetrics.Test

Usage:
  import { EffectMetrics } from '@myorg/provider-effect-metrics';
  const layer = EffectMetrics.Live;
 *
 */


// ============================================================================
// Error Types
// ============================================================================


export {
  EffectMetricsError,
  EffectMetricsNotFoundError,
  EffectMetricsValidationError,
  EffectMetricsConflictError,
  EffectMetricsConfigError,
  EffectMetricsConnectionError,
  EffectMetricsTimeoutError,
  EffectMetricsInternalError,
} from "./lib/errors";
export type { EffectMetricsServiceError } from "./lib/errors";

// ============================================================================
// Type Definitions
// ============================================================================


// Service types and interfaces

export type * from "./lib/types";


// ============================================================================
// Service Implementation
// ============================================================================


// EffectMetrics - External service adapter

// 

// Effect 3.0+ Pattern: Context.Tag with static layer members

// Access layers via static members:

//   - EffectMetrics.Live  (production - wraps real SDK)

//   - EffectMetrics.Test  (testing - mock implementation)

// 

// Migration from pre-3.0 pattern:

//   OLD: import { EffectMetricsLive } from '...';

//   NEW: import { EffectMetrics } from '...';

//        const layer = EffectMetrics.Live;


export { EffectMetrics } from "./lib/service";


// ============================================================================
// Validation Utilities
// ============================================================================


// Input validation functions

export * from "./lib/validation";


// ============================================================================
// Layer Compositions
// ============================================================================


// Pre-wired layer compositions with dependencies

// Use these if you want automatic dependency wiring:

//   - EffectMetricsLive  (production layer with dependencies)

//   - EffectMetricsTest  (test layer with mocks)

//   - EffectMetricsAuto  (automatic selection based on NODE_ENV)


export * from "./lib/layers";


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Usage Example

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 

// import { Effect, Layer } from 'effect';

// import { EffectMetrics, EffectMetricsLive } from '@myorg/provider-effect-metrics';

// 

// const program = Effect.gen(function* () {

//   const service = yield* EffectMetrics;

//   // Use service methods...

// });

// 

// const runnable = program.pipe(Effect.provide(EffectMetricsLive));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
