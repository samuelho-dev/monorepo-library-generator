import { DateTime, Schema } from "effect";
import type { ProductId } from "./entities";

/**
 * Product Domain Events
 *
 * Defines domain events for product operations.
 * Events are used for event-driven architecture and messaging.
 *
 * TODO: Customize this file for your domain:
 * 1. Add domain-specific fields to event payloads
 * 2. Create custom events for domain-specific operations
 * 3. Use EventMetadata for correlation and causation tracking
 * 4. Use AggregateMetadata for event sourcing patterns
 * 5. Consider adding:
 *    - State transition events (e.g., StatusChanged)
 *    - Business process events (e.g., Approved, Rejected)
 *    - Integration events for external systems
 *
 * @see https://effect.website/docs/schema/schema for Schema patterns
 * @module @custom-repo/contract-product/events
 */


// ============================================================================
// Base Event Metadata
// ============================================================================


/**
 * Standard metadata for all events
 */
export const EventMetadata = Schema.Struct({
  /** Unique event identifier */
  eventId: Schema.UUID,

  /** Event type identifier */
  eventType: Schema.String,

  /** Event version for schema evolution */
  eventVersion: Schema.Literal("1.0"),

  /** Timestamp when event occurred */
  occurredAt: Schema.DateTimeUtc,

  /** Optional correlation ID for tracing */
  correlationId: Schema.optional(Schema.UUID),

  /** Optional causation ID (ID of event that caused this one) */
  causationId: Schema.optional(Schema.UUID),
});


/**
 * Aggregate metadata for events tied to an aggregate root
 */
export const AggregateMetadata = Schema.Struct({
  /** Aggregate root identifier */
  aggregateId: Schema.UUID,

  /** Aggregate type */
  aggregateType: Schema.Literal("Product"),

  /** Aggregate version for optimistic concurrency */
  aggregateVersion: Schema.Number.pipe(Schema.int(), Schema.positive()),
});


// ============================================================================
// CRUD Domain Events
// ============================================================================


/**
 * Event emitted when a product is created
 */
export class ProductCreatedEvent extends Schema.Class<ProductCreatedEvent>(
  "ProductCreatedEvent"
)({
  ...EventMetadata.fields,
  ...AggregateMetadata.fields,

  /** Product identifier */
  productId: Schema.UUID,

  /** User who created the product */
  createdBy: Schema.optional(Schema.UUID),

  // TODO: Add domain-specific fields to the event payload
}) {
  static create(params: {
    productId: ProductId;
    createdBy?: string;
    correlationId?: string;
  }): ProductCreatedEvent {
    return new ProductCreatedEvent({
      eventId: crypto.randomUUID(),
      eventType: "ProductCreatedEvent",
      eventVersion: "1.0",
      occurredAt: new Date().toISOString(),
      aggregateId: params.productId,
      aggregateType: "Product",
      aggregateVersion: 1,
      productId: params.productId,
      ...(params.createdBy && { createdBy: params.createdBy }),
      ...(params.correlationId && { correlationId: params.correlationId }),
    });
  }
}

/**
 * Event emitted when a product is updated
 */
export class ProductUpdatedEvent extends Schema.Class<ProductUpdatedEvent>(
  "ProductUpdatedEvent"
)({
  ...EventMetadata.fields,
  ...AggregateMetadata.fields,

  /** Product identifier */
  productId: Schema.UUID,

  /** User who updated the product */
  updatedBy: Schema.optional(Schema.UUID),

  /** Fields that were changed (optional) */
  changedFields: Schema.optional(Schema.Array(Schema.String)),

  // TODO: Add domain-specific fields to track what changed
}) {
  static create(params: {
    productId: ProductId;
    aggregateVersion: number;
    updatedBy?: string;
    changedFields?: string[];
    correlationId?: string;
  }): ProductUpdatedEvent {
    return new ProductUpdatedEvent({
      eventId: crypto.randomUUID(),
      eventType: "ProductUpdatedEvent",
      eventVersion: "1.0",
      occurredAt: new Date().toISOString(),
      aggregateId: params.productId,
      aggregateType: "Product",
      aggregateVersion: params.aggregateVersion,
      productId: params.productId,
      ...(params.updatedBy && { updatedBy: params.updatedBy }),
      ...(params.changedFields && { changedFields: params.changedFields }),
      ...(params.correlationId && { correlationId: params.correlationId }),
    });
  }
}

/**
 * Event emitted when a product is deleted
 */
export class ProductDeletedEvent extends Schema.Class<ProductDeletedEvent>(
  "ProductDeletedEvent"
)({
  ...EventMetadata.fields,
  ...AggregateMetadata.fields,

  /** Product identifier */
  productId: Schema.UUID,

  /** User who deleted the product */
  deletedBy: Schema.optional(Schema.UUID),

  /** Whether this was a soft delete */
  isSoftDelete: Schema.optional(Schema.Boolean),

  // TODO: Add domain-specific fields
}) {
  static create(params: {
    productId: ProductId;
    aggregateVersion: number;
    deletedBy?: string;
    isSoftDelete?: boolean;
    correlationId?: string;
  }): ProductDeletedEvent {
    return new ProductDeletedEvent({
      eventId: crypto.randomUUID(),
      eventType: "ProductDeletedEvent",
      eventVersion: "1.0",
      occurredAt: new Date().toISOString(),
      aggregateId: params.productId,
      aggregateType: "Product",
      aggregateVersion: params.aggregateVersion,
      productId: params.productId,
      ...(params.deletedBy && { deletedBy: params.deletedBy }),
      ...(params.isSoftDelete !== undefined && { isSoftDelete: params.isSoftDelete }),
      ...(params.correlationId && { correlationId: params.correlationId }),
    });
  }
}

// ============================================================================
// Event Union Types
// ============================================================================


/**
 * Union of all product domain events
 */
export type ProductDomainEvent = 
  | ProductCreatedEvent
  | ProductUpdatedEvent
  | ProductDeletedEvent;

// TODO: Add custom domain events to this union

