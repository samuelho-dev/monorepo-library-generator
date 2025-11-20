import { Context, Layer } from "effect";

/**
 * Memory Provider for Cache
 *
 * In-memory provider implementation for testing and development.
Provides a simple data store without external dependencies.

TODO: Customize this file for your service:
1. Implement in-memory data structures for your domain
2. Add helper methods for testing
3. Consider state management (Map, Set, custom class)
4. Add reset() method for test isolation
 *
 * @module @custom-repo/infra-cache/providers
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
export class MemoryCacheProvider extends Context.Tag(
  "@custom-repo/infra-cache/MemoryCacheProvider"
)<
  MemoryCacheProvider,
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
function createMemoryCacheProvider(): Context.Tag.Service<MemoryCacheProvider> {
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
export const MemoryCacheProviderLive = Layer.succeed(
  MemoryCacheProvider,
  createMemoryCacheProvider()
);

// TODO: Add provider factory if needed
// Example:
//
// export function makeMemoryCacheProvider(): Layer.Layer<
//   MemoryCacheProvider,
//   never,
//   never
// > {
//   return Layer.succeed(MemoryCacheProvider, createMemoryCacheProvider());
// }