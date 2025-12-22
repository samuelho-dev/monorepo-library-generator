/**
 * EffectLogger Service
 *
 * Service barrel exports with granular operation support.

Import options (from most optimal to most convenient):

1. Direct operations:
   import { createOperations } from '@scope/provider-effect-logger/service/operations/create'

2. Service tag:
   import { EffectLogger } from '@scope/provider-effect-logger/service'

3. Type-only:
   import type { EffectLoggerServiceInterface } from '@scope/provider-effect-logger/service'

4. Package barrel (largest):
   import { EffectLogger } from '@scope/provider-effect-logger'
 *
 * @module @myorg/provider-effect-logger/service
 */

// ============================================================================
// Re-export service interface and tag
// ============================================================================

export type { EffectLoggerServiceInterface } from "./service";
export { EffectLogger } from "./service";
