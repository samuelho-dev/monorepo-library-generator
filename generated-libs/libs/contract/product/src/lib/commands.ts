import { Schema } from "effect";
import type { ProductId } from "./entities";

/**
 * Product Commands (CQRS Write Operations)
 *
 * Commands represent write intentions with validation rules.
 * Each command should be validated and immutable.
 *
 * TODO: Customize for your domain:
 * 1. Add domain-specific command fields
 * 2. Add validation rules (Schema.minLength, Schema.positive, etc.)
 * 3. Create custom commands for domain-specific operations
 * 4. Add factory methods for command creation
 *
 * @module @custom-repo/contract-product/commands
 */


// ============================================================================
// CRUD Commands
// ============================================================================


/**
 * Command to create a new Product
 */
export class CreateProductCommand extends Schema.Class<CreateProductCommand>("CreateProductCommand")({
  /** Product name */
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),

  // TODO: Add domain-specific fields
  // Example fields:
  //
  // /** Product description */
  // description: Schema.optional(Schema.String),
  //
  // /** Product category */
  // category: Schema.String,
  //
  // /** Owner user ID */
  // ownerId: Schema.UUID,
}) {
  static create(params: {
    name: string;
    // TODO: Add parameters
  }) {
    return new CreateProductCommand({
      name: params.name,
      // TODO: Add fields
    });
  }
}

/**
 * Command to update an existing Product
 */
export class UpdateProductCommand extends Schema.Class<UpdateProductCommand>("UpdateProductCommand")({
  /** Product ID to update */
  productId: Schema.UUID,

  /** Fields to update */
  updates: Schema.Record({
    key: Schema.String,
    value: Schema.Unknown,
  }).pipe(Schema.minProperties(1)),

  // TODO: Add domain-specific update fields
  // Example fields:
  //
  // /** New name (optional) */
  // name: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
  //
  // /** New status (optional) */
  // status: Schema.optional(Schema.String),
}) {
  static create(params: {
    productId: ProductId;
    updates: Record<string, unknown>;
  }) {
    return new UpdateProductCommand({
      productId: params.productId,
      updates: params.updates,
    });
  }
}

/**
 * Command to delete a Product
 */
export class DeleteProductCommand extends Schema.Class<DeleteProductCommand>("DeleteProductCommand")({
  /** Product ID to delete */
  productId: Schema.UUID,

  /** Reason for deletion (optional) */
  reason: Schema.optional(Schema.String),
}) {
  static create(params: {
    productId: ProductId;
    reason?: string;
  }) {
    return new DeleteProductCommand({
      productId: params.productId,
      ...(params.reason !== undefined && { reason: params.reason }),
    });
  }
}

// TODO: Add domain-specific commands here

// Example - Status change command (if domain has state machine):

// 

// export class ChangeProductStatusCommand extends Schema.Class<ChangeProductStatusCommand>("ChangeProductStatusCommand")({

//   productId: Schema.UUID,

//   newStatus: Schema.String,

//   reason: Schema.optional(Schema.String),

// }) {

//   static create(params: { ... }) { ... }

// }


// ============================================================================
// Command Union Type
// ============================================================================


/**
 * Union of all product commands
 */
export type ProductCommand = 
  | CreateProductCommand
  | UpdateProductCommand
  | DeleteProductCommand;

// TODO: Add custom commands to this union


/**
 * Schema for ProductCommand union
 */
export const ProductCommandSchema = Schema.Union(
  CreateProductCommand,
  UpdateProductCommand,
  DeleteProductCommand
  // TODO: Add custom command schemas
);
