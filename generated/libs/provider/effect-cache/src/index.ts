/**
 * EffectCache Provider Library
 *
 * External service adapter for EffectCache.

This library provides an Effect-based adapter for the EffectCache external service.
It wraps the external SDK in Effect types for composable error handling.

Effect 3.0+ Pattern:
  - EffectCache extends Context.Tag
  - Access layers via static members: EffectCache.Live, EffectCache.Test

Usage:
  import { EffectCache } from '@myorg/provider-effect-cache';
  const layer = EffectCache.Live;
 *
 */

// ============================================================================
// Error Types
// ============================================================================

export type { EffectCacheServiceError } from "./lib/errors";
export {
  EffectCacheConfigError,
  EffectCacheConflictError,
  EffectCacheConnectionError,
  EffectCacheError,
  EffectCacheInternalError,
  EffectCacheNotFoundError,
  EffectCacheTimeoutError,
  EffectCacheValidationError,
} from "./lib/errors";

// ============================================================================
// Type Definitions
// ============================================================================

// Service types and interfaces

export type * from "./lib/types";

// ============================================================================
// Service Implementation
// ============================================================================

// EffectCache - External service adapter

//

// Effect 3.0+ Pattern: Context.Tag with static layer members

// Access layers via static members:

//   - EffectCache.Live  (production - wraps real SDK)

//   - EffectCache.Test  (testing - mock implementation)

//

// Migration from pre-3.0 pattern:

//   OLD: import { EffectCacheLive } from '...';

//   NEW: import { EffectCache } from '...';

//        const layer = EffectCache.Live;

export { EffectCache } from "./lib/service";

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

//   - EffectCacheLive  (production layer with dependencies)

//   - EffectCacheTest  (test layer with mocks)

//   - EffectCacheAuto  (automatic selection based on NODE_ENV)

export * from "./lib/layers";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Usage Example

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

//

// import { Effect, Layer } from 'effect';

// import { EffectCache, EffectCacheLive } from '@myorg/provider-effect-cache';

//

// const program = Effect.gen(function* () {

//   const service = yield* EffectCache;

//   // Use service methods...

// });

//

// const runnable = program.pipe(Effect.provide(EffectCacheLive));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
