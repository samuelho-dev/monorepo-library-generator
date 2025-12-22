/**
 * EffectCache Service
 *
 * Service barrel exports with granular operation support.

Import options (from most optimal to most convenient):

1. Direct operations:
   import { createOperations } from '@scope/provider-effect-cache/service/operations/create'

2. Service tag:
   import { EffectCache } from '@scope/provider-effect-cache/service'

3. Type-only:
   import type { EffectCacheServiceInterface } from '@scope/provider-effect-cache/service'

4. Package barrel (largest):
   import { EffectCache } from '@scope/provider-effect-cache'
 *
 * @module @myorg/provider-effect-cache/service
 */

// ============================================================================
// Re-export service interface and tag
// ============================================================================

export type { EffectCacheServiceInterface } from "./service";
export { EffectCache } from "./service";
