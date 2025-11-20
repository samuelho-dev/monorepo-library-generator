import { DateTime, Schema } from "effect";
import type { DatabaseId } from "./entities";

/**
 * Database Domain Events
 *
 * Defines domain events for database operations.
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
 * @module @custom-repo/contract-database/events
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
  aggregateType: Schema.Literal("Database"),

  /** Aggregate version for optimistic concurrency */
  aggregateVersion: Schema.Number.pipe(Schema.int(), Schema.positive()),
});


// ============================================================================
// CRUD Domain Events
// ============================================================================


/**
 * Event emitted when a database is created
 */
export class DatabaseCreatedEvent extends Schema.Class<DatabaseCreatedEvent>(
  "DatabaseCreatedEvent"
)({
  ...EventMetadata.fields,
  ...AggregateMetadata.fields,

  /** Database identifier */
  databaseId: Schema.UUID,

  /** User who created the database */
  createdBy: Schema.optional(Schema.UUID),

  // TODO: Add domain-specific fields to the event payload
}) {
  static create(params: {
    databaseId: DatabaseId;
    createdBy?: string;
    correlationId?: string;
  }): DatabaseCreatedEvent {
    return new DatabaseCreatedEvent({
      eventId: crypto.randomUUID(),
      eventType: "DatabaseCreatedEvent",
      eventVersion: "1.0",
      occurredAt: new Date().toISOString(),
      aggregateId: params.databaseId,
      aggregateType: "Database",
      aggregateVersion: 1,
      databaseId: params.databaseId,
      ...(params.createdBy && { createdBy: params.createdBy }),
      ...(params.correlationId && { correlationId: params.correlationId }),
    });
  }
}

/**
 * Event emitted when a database is updated
 */
export class DatabaseUpdatedEvent extends Schema.Class<DatabaseUpdatedEvent>(
  "DatabaseUpdatedEvent"
)({
  ...EventMetadata.fields,
  ...AggregateMetadata.fields,

  /** Database identifier */
  databaseId: Schema.UUID,

  /** User who updated the database */
  updatedBy: Schema.optional(Schema.UUID),

  /** Fields that were changed (optional) */
  changedFields: Schema.optional(Schema.Array(Schema.String)),

  // TODO: Add domain-specific fields to track what changed
}) {
  static create(params: {
    databaseId: DatabaseId;
    aggregateVersion: number;
    updatedBy?: string;
    changedFields?: string[];
    correlationId?: string;
  }): DatabaseUpdatedEvent {
    return new DatabaseUpdatedEvent({
      eventId: crypto.randomUUID(),
      eventType: "DatabaseUpdatedEvent",
      eventVersion: "1.0",
      occurredAt: new Date().toISOString(),
      aggregateId: params.databaseId,
      aggregateType: "Database",
      aggregateVersion: params.aggregateVersion,
      databaseId: params.databaseId,
      ...(params.updatedBy && { updatedBy: params.updatedBy }),
      ...(params.changedFields && { changedFields: params.changedFields }),
      ...(params.correlationId && { correlationId: params.correlationId }),
    });
  }
}

/**
 * Event emitted when a database is deleted
 */
export class DatabaseDeletedEvent extends Schema.Class<DatabaseDeletedEvent>(
  "DatabaseDeletedEvent"
)({
  ...EventMetadata.fields,
  ...AggregateMetadata.fields,

  /** Database identifier */
  databaseId: Schema.UUID,

  /** User who deleted the database */
  deletedBy: Schema.optional(Schema.UUID),

  /** Whether this was a soft delete */
  isSoftDelete: Schema.optional(Schema.Boolean),

  // TODO: Add domain-specific fields
}) {
  static create(params: {
    databaseId: DatabaseId;
    aggregateVersion: number;
    deletedBy?: string;
    isSoftDelete?: boolean;
    correlationId?: string;
  }): DatabaseDeletedEvent {
    return new DatabaseDeletedEvent({
      eventId: crypto.randomUUID(),
      eventType: "DatabaseDeletedEvent",
      eventVersion: "1.0",
      occurredAt: new Date().toISOString(),
      aggregateId: params.databaseId,
      aggregateType: "Database",
      aggregateVersion: params.aggregateVersion,
      databaseId: params.databaseId,
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
 * Union of all database domain events
 */
export type DatabaseDomainEvent = 
  | DatabaseCreatedEvent
  | DatabaseUpdatedEvent
  | DatabaseDeletedEvent;

// TODO: Add custom domain events to this union

