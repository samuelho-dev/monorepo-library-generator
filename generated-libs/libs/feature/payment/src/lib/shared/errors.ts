import { Data } from "effect";

/**
 * Payment Errors
 *
 * Domain errors using Data.TaggedError pattern.
 *
 * @module @custom-repo/feature-payment/shared/errors
 */


export class PaymentError extends Data.TaggedError("PaymentError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {
}


// TODO: Add domain-specific errors

// Example:

// // export class PaymentNotFoundError extends Data.TaggedError("PaymentNotFoundError")<{

// //   readonly id: string;

// // }> {}

