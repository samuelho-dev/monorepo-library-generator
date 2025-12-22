/**
 * EffectQueue Provider Library
 *
 * External service adapter for EffectQueue.

This library provides an Effect-based adapter for the EffectQueue external service.
It wraps the external SDK in Effect types for composable error handling.

Effect 3.0+ Pattern:
  - EffectQueue extends Context.Tag
  - Access layers via static members: EffectQueue.Live, EffectQueue.Test

Usage:
  import { EffectQueue } from '@myorg/provider-effect-queue';
  const layer = EffectQueue.Live;
 *
 */


// ============================================================================
// Error Types
// ============================================================================


export {
  EffectQueueError,
  EffectQueueNotFoundError,
  EffectQueueValidationError,
  EffectQueueConflictError,
  EffectQueueConfigError,
  EffectQueueConnectionError,
  EffectQueueTimeoutError,
  EffectQueueInternalError,
} from "./lib/errors";
export type { EffectQueueServiceError } from "./lib/errors";

// ============================================================================
// Type Definitions
// ============================================================================


// Service types and interfaces

export type * from "./lib/types";


// ============================================================================
// Service Implementation
// ============================================================================


// EffectQueue - External service adapter

// 

// Effect 3.0+ Pattern: Context.Tag with static layer members

// Access layers via static members:

//   - EffectQueue.Live  (production - wraps real SDK)

//   - EffectQueue.Test  (testing - mock implementation)

// 

// Migration from pre-3.0 pattern:

//   OLD: import { EffectQueueLive } from '...';

//   NEW: import { EffectQueue } from '...';

//        const layer = EffectQueue.Live;


export { EffectQueue } from "./lib/service";


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

//   - EffectQueueLive  (production layer with dependencies)

//   - EffectQueueTest  (test layer with mocks)

//   - EffectQueueAuto  (automatic selection based on NODE_ENV)


export * from "./lib/layers";


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Usage Example

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 

// import { Effect, Layer } from 'effect';

// import { EffectQueue, EffectQueueLive } from '@myorg/provider-effect-queue';

// 

// const program = Effect.gen(function* () {

//   const service = yield* EffectQueue;

//   // Use service methods...

// });

// 

// const runnable = program.pipe(Effect.provide(EffectQueueLive));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
