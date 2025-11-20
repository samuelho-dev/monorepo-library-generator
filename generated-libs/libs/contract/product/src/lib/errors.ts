import { Data, Schema } from "effect";

/**
 * Product Domain Errors
 *
 * Defines all error types for product domain operations.
 *
 * ERROR TYPE SELECTION GUIDE:
 * ===========================
 *
 * 1. Data.TaggedError - For Domain & Repository Errors (DEFAULT CHOICE)
 *    ✅ Use when: Errors stay within your service boundary (same process)
 *    ✅ Use when: Repository errors, business logic errors, service errors
 *    ✅ Benefits: Lightweight, better performance, simpler API
 *    ✅ Pattern: Used in this template by default
 *    ❌ Cannot: Serialize over network boundaries (RPC, HTTP)
 *
 *    Example:
 *    ```typescript
 *    export class ProductNotFoundError extends Data.TaggedError("ProductNotFoundError")<{
 *      readonly message: string;
 *      readonly productId: string;
 *    }> {}
 *    ```
 *
 * 2. Schema.TaggedError - For RPC/Network Boundaries (SPECIAL CASES ONLY)
 *    ✅ Use when: Errors cross network boundaries (client ↔ server RPC)
 *    ✅ Use when: Building APIs that expose errors to external clients
 *    ✅ Benefits: Fully serializable, can cross process boundaries
 *    ✅ Example use cases:
 *       - tRPC procedures that return errors to frontend
 *       - Microservice RPC calls between services
 *       - Public API error responses
 *    ⚠️  Caution: More complex API, requires Schema definitions
 *    ⚠️  Overhead: Adds serialization/deserialization cost
 *
 * IMPORTANT DECISION:
 * This template uses Data.TaggedError for ALL errors (domain + repository).
 * This is CORRECT for most use cases because:
 * - Repository errors stay within the same process (data-access → feature)
 * - Service errors stay within the same process (feature → app)
 * - Only when building RPC endpoints (e.g., tRPC) should you use Schema.TaggedError
 *
 * If you need RPC-serializable errors, see /libs/contract/product/src/lib/rpc.ts
 *
 * TODO: Customize this file for your domain:
 * 1. Add domain-specific error types as needed (use Data.TaggedError)
 * 2. Add helper factory methods for common error scenarios
 * 3. Consider adding:
 *    - State transition errors (if domain has state machine)
 *    - Business rule violation errors
 *    - Resource conflict errors
 * 4. ONLY if building RPC APIs: Add Schema.TaggedError variants in rpc.ts
 *
 * @see https://effect.website/docs/guides/error-management for error handling
 * @see libs/contract/product/src/lib/rpc.ts for RPC-serializable errors
 * @module @custom-repo/contract-product/errors
 */


// ============================================================================
// Domain Errors (Data.TaggedError)
// ============================================================================

// Use Data.TaggedError for domain-level errors that occur in business logic.

// These errors are NOT serializable over RPC by default.


/**
 * Error thrown when product is not found
 */
export class ProductNotFoundError extends Data.TaggedError("ProductNotFoundError")<{
    readonly message: string;
    readonly productId: string;
  }> {
  static create(productId: string): ProductNotFoundError {
    return new ProductNotFoundError({
      message: `Product not found: ${productId}`,
      productId,
    });
  }

}

/**
 * Error thrown when product validation fails
 */
export class ProductValidationError extends Data.TaggedError("ProductValidationError")<{
    readonly message: string;
    readonly field?: string;
    readonly constraint?: string;
    readonly value?: unknown;
  }> {
  static create(params: {
    message: string;
    field?: string;
    constraint?: string;
    value?: unknown;
  }): ProductValidationError {
    return new ProductValidationError({
      message: params.message,
      ...(params.field !== undefined && { field: params.field }),
      ...(params.constraint !== undefined && { constraint: params.constraint }),
      ...(params.value !== undefined && { value: params.value }),
    });
  }

  static fieldRequired(field: string): ProductValidationError {
    return new ProductValidationError({
      message: `${field} is required`,
      field,
      constraint: "required",
    });
  }

  static fieldInvalid(field: string, constraint: string, value?: unknown): ProductValidationError {
    return new ProductValidationError({
      message: `${field} is invalid: ${constraint}`,
      field,
      constraint,
      ...(value !== undefined && { value }),
    });
  }

}

/**
 * Error thrown when product already exists
 */
export class ProductAlreadyExistsError extends Data.TaggedError("ProductAlreadyExistsError")<{
    readonly message: string;
    readonly identifier?: string;
  }> {
  static create(identifier?: string): ProductAlreadyExistsError {
    return new ProductAlreadyExistsError({
      message: identifier
        ? `Product already exists: ${identifier}`
        : `Product already exists`,
      ...(identifier !== undefined && { identifier }),
    });
  }

}

/**
 * Error thrown when product operation is not permitted
 */
export class ProductPermissionError extends Data.TaggedError("ProductPermissionError")<{
    readonly message: string;
    readonly operation: string;
    readonly productId: string;
    readonly userId?: string;
  }> {
  static create(params: {
    operation: string;
    productId: string;
    userId?: string;
  }): ProductPermissionError {
    return new ProductPermissionError({
      message: `Operation '${params.operation}' not permitted on product ${params.productId}`,
      operation: params.operation,
      productId: params.productId,
      ...(params.userId !== undefined && { userId: params.userId }),
    });
  }

}

// TODO: Add domain-specific errors here

// Example - State transition error (if domain has status/state machine):

// 

// export class ProductInvalidStateError extends Data.TaggedError("ProductInvalidStateError")<{

//   readonly message: string;

//   readonly currentState: string;

//   readonly targetState: string;

//   readonly productId: string;

// }> {

//   static create(params: {

//     currentState: string;

//     targetState: string;

//     productId: string;

//   }) {

//     return new ProductInvalidStateError({

//       message: `Cannot transition product from ${params.currentState} to ${params.targetState}`,

//       ...params,

//     });

//   }

// }


/**
 * Union of all domain errors
 */
export type ProductDomainError = 
  | ProductNotFoundError
  | ProductValidationError
  | ProductAlreadyExistsError
  | ProductPermissionError;

// ============================================================================
// Repository Errors (Data.TaggedError)
// ============================================================================

// Repository errors use Data.TaggedError for domain-level operations.

// These errors do NOT cross RPC boundaries - use rpc.ts for network errors.


/**
 * Repository error for product not found
 */
export class ProductNotFoundRepositoryError extends Data.TaggedError("ProductNotFoundRepositoryError")<{
    readonly message: string;
    readonly productId: string;
  }> {
  static create(productId: string): ProductNotFoundRepositoryError {
    return new ProductNotFoundRepositoryError({
      message: `Product not found: ${productId}`,
      productId,
    });
  }

}

/**
 * Repository error for product validation failures
 */
export class ProductValidationRepositoryError extends Data.TaggedError("ProductValidationRepositoryError")<{
    readonly message: string;
    readonly field?: string;
    readonly constraint?: string;
  }> {
  static create(params: {
    message: string;
    field?: string;
    constraint?: string;
  }): ProductValidationRepositoryError {
    return new ProductValidationRepositoryError({
      message: params.message,
      ...(params.field !== undefined && { field: params.field }),
      ...(params.constraint !== undefined && { constraint: params.constraint }),
    });
  }

}

/**
 * Repository error for product conflicts
 */
export class ProductConflictRepositoryError extends Data.TaggedError("ProductConflictRepositoryError")<{
    readonly message: string;
    readonly identifier?: string;
  }> {
  static create(identifier?: string): ProductConflictRepositoryError {
    return new ProductConflictRepositoryError({
      message: identifier
        ? `Product already exists: ${identifier}`
        : `Product already exists`,
      ...(identifier !== undefined && { identifier }),
    });
  }

}

/**
 * Repository error for product database failures
 */
export class ProductDatabaseRepositoryError extends Data.TaggedError("ProductDatabaseRepositoryError")<{
    readonly message: string;
    readonly operation: string;
    readonly cause?: string;
  }> {
  static create(params: {
    message: string;
    operation: string;
    cause?: string;
  }): ProductDatabaseRepositoryError {
    return new ProductDatabaseRepositoryError({
      message: params.message,
      operation: params.operation,
      ...(params.cause !== undefined && { cause: params.cause }),
    });
  }

}

/**
 * Union of all repository errors
 */
export type ProductRepositoryError = 
  | ProductNotFoundRepositoryError
  | ProductValidationRepositoryError
  | ProductConflictRepositoryError
  | ProductDatabaseRepositoryError;

// ============================================================================
// Error Union Types
// ============================================================================


/**
 * All possible product errors
 */
export type ProductError = ProductDomainError | ProductRepositoryError;
