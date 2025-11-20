import { PaymentService } from "./service";
import { Effect, Layer } from "effect";

/**
 * Payment Layers
 *
 * Layer composition for payment feature.
Provides different layer implementations for different environments.
 *
 */


/**
 * Live layer for production
 */
export const PaymentServiceLive = PaymentService.Live;

/**
 * Test layer with mock implementations
 * Uses Layer.succeed with plain object for deterministic testing
 */
export const PaymentServiceTest = Layer.succeed(
  PaymentService,
  {
    exampleOperation: () => Effect.void,
  }
);

/**
 * Auto layer - automatically selects based on environment
 */
export const PaymentServiceAuto = PaymentService.Live;
