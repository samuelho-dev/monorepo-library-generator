/**
 * EffectLogger Provider Library
 *
 * External service adapter for EffectLogger.

This library provides an Effect-based adapter for the EffectLogger external service.
It wraps the external SDK in Effect types for composable error handling.

Effect 3.0+ Pattern:
  - EffectLogger extends Context.Tag
  - Access layers via static members: EffectLogger.Live, EffectLogger.Test

Usage:
  import { EffectLogger } from '@myorg/provider-effect-logger';
  const layer = EffectLogger.Live;
 *
 */


// ============================================================================
// Error Types
// ============================================================================


export {
  EffectLoggerError,
  EffectLoggerNotFoundError,
  EffectLoggerValidationError,
  EffectLoggerConflictError,
  EffectLoggerConfigError,
  EffectLoggerConnectionError,
  EffectLoggerTimeoutError,
  EffectLoggerInternalError,
} from "./lib/errors";
export type { EffectLoggerServiceError } from "./lib/errors";

// ============================================================================
// Type Definitions
// ============================================================================


// Service types and interfaces

export type * from "./lib/types";


// ============================================================================
// Service Implementation
// ============================================================================


// EffectLogger - External service adapter

// 

// Effect 3.0+ Pattern: Context.Tag with static layer members

// Access layers via static members:

//   - EffectLogger.Live  (production - wraps real SDK)

//   - EffectLogger.Test  (testing - mock implementation)

// 

// Migration from pre-3.0 pattern:

//   OLD: import { EffectLoggerLive } from '...';

//   NEW: import { EffectLogger } from '...';

//        const layer = EffectLogger.Live;


export { EffectLogger } from "./lib/service";


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

//   - EffectLoggerLive  (production layer with dependencies)

//   - EffectLoggerTest  (test layer with mocks)

//   - EffectLoggerAuto  (automatic selection based on NODE_ENV)


export * from "./lib/layers";


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Usage Example

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 

// import { Effect, Layer } from 'effect';

// import { EffectLogger, EffectLoggerLive } from '@myorg/provider-effect-logger';

// 

// const program = Effect.gen(function* () {

//   const service = yield* EffectLogger;

//   // Use service methods...

// });

// 

// const runnable = program.pipe(Effect.provide(EffectLoggerLive));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
