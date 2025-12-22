/**
 * EffectPubsub Provider Library
 *
 * External service adapter for EffectPubsub.

This library provides an Effect-based adapter for the EffectPubsub external service.
It wraps the external SDK in Effect types for composable error handling.

Effect 3.0+ Pattern:
  - EffectPubsub extends Context.Tag
  - Access layers via static members: EffectPubsub.Live, EffectPubsub.Test

Usage:
  import { EffectPubsub } from '@myorg/provider-effect-pubsub';
  const layer = EffectPubsub.Live;
 *
 */

// ============================================================================
// Error Types
// ============================================================================

export type { EffectPubsubServiceError } from "./lib/errors";
export {
  EffectPubsubConfigError,
  EffectPubsubConflictError,
  EffectPubsubConnectionError,
  EffectPubsubError,
  EffectPubsubInternalError,
  EffectPubsubNotFoundError,
  EffectPubsubTimeoutError,
  EffectPubsubValidationError,
} from "./lib/errors";

// ============================================================================
// Type Definitions
// ============================================================================

// Service types and interfaces

export type * from "./lib/types";

// ============================================================================
// Service Implementation
// ============================================================================

// EffectPubsub - External service adapter

//

// Effect 3.0+ Pattern: Context.Tag with static layer members

// Access layers via static members:

//   - EffectPubsub.Live  (production - wraps real SDK)

//   - EffectPubsub.Test  (testing - mock implementation)

//

// Migration from pre-3.0 pattern:

//   OLD: import { EffectPubsubLive } from '...';

//   NEW: import { EffectPubsub } from '...';

//        const layer = EffectPubsub.Live;

export { EffectPubsub } from "./lib/service";

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

//   - EffectPubsubLive  (production layer with dependencies)

//   - EffectPubsubTest  (test layer with mocks)

//   - EffectPubsubAuto  (automatic selection based on NODE_ENV)

export * from "./lib/layers";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Usage Example

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

//

// import { Effect, Layer } from 'effect';

// import { EffectPubsub, EffectPubsubLive } from '@myorg/provider-effect-pubsub';

//

// const program = Effect.gen(function* () {

//   const service = yield* EffectPubsub;

//   // Use service methods...

// });

//

// const runnable = program.pipe(Effect.provide(EffectPubsubLive));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
