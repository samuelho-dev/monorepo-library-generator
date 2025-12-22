/**
 * EffectQueue Service
 *
 * Service barrel exports with granular operation support.

Import options (from most optimal to most convenient):

1. Direct operations:
   import { createOperations } from '@scope/provider-effect-queue/service/operations/create'

2. Service tag:
   import { EffectQueue } from '@scope/provider-effect-queue/service'

3. Type-only:
   import type { EffectQueueServiceInterface } from '@scope/provider-effect-queue/service'

4. Package barrel (largest):
   import { EffectQueue } from '@scope/provider-effect-queue'
 *
 * @module @myorg/provider-effect-queue/service
 */


// ============================================================================
// Re-export service interface and tag
// ============================================================================


export { EffectQueue } from "./service";
export type { EffectQueueServiceInterface } from "./service";