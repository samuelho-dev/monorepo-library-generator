import { Context, Layer } from "effect";

/**
 * Memory Provider for Env
 *
 * In-memory provider implementation for testing and development.
Provides a simple data store without external dependencies.

TODO: Customize this file for your service:
1. Implement in-memory data structures for your domain
2. Add helper methods for testing
3. Consider state management (Map, Set, custom class)
4. Add reset() method for test isolation
 *
 * @module @custom-repo/infra-env/providers
 */

// ============================================================================
// Memory Provider Tag
// ============================================================================

/**
 * Memory Provider Context Tag
 *
 * Effect 3.0+ pattern: Context.Tag with inline interface definition.
 * Use this for dependency injection in tests and development.
 *
 * TODO: Define interface for memory provider
 * This should match the external service interface but use in-memory storage.
 */
export class MemoryEnvProvider extends Context.Tag(
  "@custom-repo/infra-env/MemoryEnvProvider"
)<
  MemoryEnvProvider,
  {
    // TODO: Add provider methods
    readonly store: Map<string, unknown>;
    readonly reset: () => void;
  }
>() {}

// ============================================================================
// Memory Provider Implementation
// ============================================================================

/**
 * Create memory provider
 *
 * TODO: Implement actual memory provider logic
 */
function createMemoryEnvProvider(): Context.Tag.Service<MemoryEnvProvider> {
  const store = new Map<string, unknown>();

  return {
    store,
    reset: () => {
      store.clear();
    },
  };
}

// ============================================================================
// Memory Provider Layer
// ============================================================================

/**
 * Memory Provider Layer
 *
 * Use this layer for testing and development.
 * All data is stored in-memory and lost when the process exits.
 */
export const MemoryEnvProviderLive = Layer.succeed(
  MemoryEnvProvider,
  createMemoryEnvProvider()
);

// TODO: Add provider factory if needed
// Example:
//
// export function makeMemoryEnvProvider(): Layer.Layer<
//   MemoryEnvProvider,
//   never,
//   never
// > {
//   return Layer.succeed(MemoryEnvProvider, createMemoryEnvProvider());
// }