/**
 * EffectMetrics Service
 *
 * Service barrel exports with granular operation support.

Import options (from most optimal to most convenient):

1. Direct operations:
   import { createOperations } from '@scope/provider-effect-metrics/service/operations/create'

2. Service tag:
   import { EffectMetrics } from '@scope/provider-effect-metrics/service'

3. Type-only:
   import type { EffectMetricsServiceInterface } from '@scope/provider-effect-metrics/service'

4. Package barrel (largest):
   import { EffectMetrics } from '@scope/provider-effect-metrics'
 *
 * @module @myorg/provider-effect-metrics/service
 */


// ============================================================================
// Re-export service interface and tag
// ============================================================================


export { EffectMetrics } from "./service";
export type { EffectMetricsServiceInterface } from "./service";