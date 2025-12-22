/**
 * EffectPubsub Service
 *
 * Service barrel exports with granular operation support.

Import options (from most optimal to most convenient):

1. Direct operations:
   import { createOperations } from '@scope/provider-effect-pubsub/service/operations/create'

2. Service tag:
   import { EffectPubsub } from '@scope/provider-effect-pubsub/service'

3. Type-only:
   import type { EffectPubsubServiceInterface } from '@scope/provider-effect-pubsub/service'

4. Package barrel (largest):
   import { EffectPubsub } from '@scope/provider-effect-pubsub'
 *
 * @module @myorg/provider-effect-pubsub/service
 */


// ============================================================================
// Re-export service interface and tag
// ============================================================================


export { EffectPubsub } from "./service";
export type { EffectPubsubServiceInterface } from "./service";