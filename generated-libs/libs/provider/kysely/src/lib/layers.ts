import { Kysely, createKyselyClient } from "./service";
import { env } from "@custom-repo/infra-env";
import { Effect, Layer } from "effect";
import type { KyselyConfig } from "./service";

/**
 * kysely - Layer Implementations
 *
 * CRITICAL: Choose correct Layer type
 * Reference: provider.md lines 1548-1587
 *
 * Layer Selection Guide:
 * 1. Layer.succeed - Test/mock data (immediate value)
 * 2. Layer.sync - Pure sync functions (no async, no deps)
 * 3. Layer.effect - Async with dependencies
 * 4. Layer.scoped - Needs cleanup/release
 */


/**
 * Live Layer - Production environment
 *
 * Uses Layer.sync because:
 * - Client creation is synchronous
 * - No cleanup needed
 * - No async initialization
 *
 * Configuration: Uses @custom-repo/infra-env for environment variable access
 *
 * TODO: If your SDK requires async initialization, use Layer.effect instead
 * TODO: If your SDK needs cleanup (e.g., connection pooling), use Layer.scoped with Effect.acquireRelease
 */
export const KyselyLive = Layer.sync(
  Kysely,
  () => {
    const config: KyselyConfig = {
      apiKey: env.KYSELY_API_KEY,
      timeout: env.KYSELY_TIMEOUT || 20000,
    };

    const client = createKyselyClient(config);
    return Kysely.make(client, config);
  },
);

/**
 * Dev Layer - Development environment
 *
 * Same as Live but with debug logging or relaxed validation
 */
export const KyselyDev = Layer.sync(
  Kysely,
  () => {
    const config: KyselyConfig = {
      apiKey: env.KYSELY_API_KEY || "dev_key",
      timeout: 30000, // Longer timeout for dev
    };

    const client = createKyselyClient(config);
    return Kysely.make(client, config);
  },
);

/**
 * Test Layer - Testing environment
 *
 * Uses Layer.succeed for mock data
 */
export const KyselyTest = Layer.succeed(
  Kysely,
  Kysely.make(
    // Mock client
    {
      healthCheck: () => Promise.resolve({ status: "healthy" as const }),
    },
    {
      apiKey: "test_key",
      timeout: 1000,
    },
  ),
);

/**
 * Auto Layer - Automatic environment detection
 *
 * Selects appropriate layer based on NODE_ENV
 */
export const KyselyAuto = Layer.suspend(() => {
  const nodeEnv = env.NODE_ENV;

  switch (nodeEnv) {
    case "production":
      return KyselyLive;
    case "development":
      return KyselyDev;
    case "test":
      return KyselyTest;
    default:
      return KyselyDev;
  }
});

/**
 * makeKyselyLayer - Custom layer factory
 *
 * Use this to create a layer with custom configuration
 *
 * Example:
 * ```typescript
 * const customLayer = makeKyselyLayer({
 *   apiKey: "custom_key",
 *   timeout: 5000,
 * });
 * ```
 */
export function makeKyselyLayer(config: KyselyConfig): Layer.Layer<Kysely> {
  return Layer.sync(Kysely, () => {
    const client = createKyselyClient(config);
    return Kysely.make(client, config);
  });
}
