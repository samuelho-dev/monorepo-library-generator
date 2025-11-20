import { Stripe, createStripeClient } from "./service";
import { env } from "@custom-repo/infra-env";
import { Effect, Layer } from "effect";
import type { StripeConfig } from "./service";

/**
 * stripe - Layer Implementations
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
export const StripeLive = Layer.sync(
  Stripe,
  () => {
    const config: StripeConfig = {
      apiKey: env.STRIPE_API_KEY,
      timeout: env.STRIPE_TIMEOUT || 20000,
    };

    const client = createStripeClient(config);
    return Stripe.make(client, config);
  },
);

/**
 * Dev Layer - Development environment
 *
 * Same as Live but with debug logging or relaxed validation
 */
export const StripeDev = Layer.sync(
  Stripe,
  () => {
    const config: StripeConfig = {
      apiKey: env.STRIPE_API_KEY || "dev_key",
      timeout: 30000, // Longer timeout for dev
    };

    const client = createStripeClient(config);
    return Stripe.make(client, config);
  },
);

/**
 * Test Layer - Testing environment
 *
 * Uses Layer.succeed for mock data
 */
export const StripeTest = Layer.succeed(
  Stripe,
  Stripe.make(
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
export const StripeAuto = Layer.suspend(() => {
  const nodeEnv = env.NODE_ENV;

  switch (nodeEnv) {
    case "production":
      return StripeLive;
    case "development":
      return StripeDev;
    case "test":
      return StripeTest;
    default:
      return StripeDev;
  }
});

/**
 * makeStripeLayer - Custom layer factory
 *
 * Use this to create a layer with custom configuration
 *
 * Example:
 * ```typescript
 * const customLayer = makeStripeLayer({
 *   apiKey: "custom_key",
 *   timeout: 5000,
 * });
 * ```
 */
export function makeStripeLayer(config: StripeConfig): Layer.Layer<Stripe> {
  return Layer.sync(Stripe, () => {
    const client = createStripeClient(config);
    return Stripe.make(client, config);
  });
}
