/**
 * Contract Events Template
 *
 * Generates events.ts file for contract libraries with domain event
 * definitions using Schema.Class for event-driven architecture.
 *
 * @module monorepo-library-generator/contract/events-template
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { ContractTemplateOptions } from "../../../utils/shared/types"

/**
 * Generate events.ts file for contract library
 *
 * Creates domain event definitions with:
 * - Base event metadata schemas
 * - Aggregate metadata for event sourcing
 * - CRUD domain events (Created, Updated, Deleted)
 */
export function generateEventsFile(options: ContractTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, propertyName } = options
  const domainName = propertyName

  // Add file header
  builder.addRaw(createFileHeader(className, domainName, fileName))
  builder.addBlankLine()

  // Add imports
  builder.addImports([{ from: "effect", imports: ["Schema"] }])

  builder.addImports([
    { from: "./entities", imports: [`${className}Id`], isTypeOnly: true }
  ])

  builder.addBlankLine()

  // ============================================================================
  // SECTION 1: Base Event Metadata
  // ============================================================================

  builder.addSectionComment("Base Event Metadata")
  builder.addBlankLine()

  // EventMetadata schema
  builder.addRaw(`/**
 * Standard metadata for all events
 */
export const EventMetadata = Schema.Struct({
  /** Unique event identifier */
  eventId: Schema.UUID.annotations({
    title: "Event ID",
    description: "Unique identifier for this event"
  }),

  /** Event type identifier */
  eventType: Schema.String.annotations({
    title: "Event Type",
    description: "Name of the event type"
  }),

  /** Event version for schema evolution */
  eventVersion: Schema.Literal("1.0").annotations({
    title: "Event Version",
    description: "Event schema version for evolution"
  }),

  /** Timestamp when event occurred */
  occurredAt: Schema.DateTimeUtcFromSelf.annotations({
    title: "Occurred At",
    description: "UTC timestamp when the event occurred"
  }),

  /** Optional correlation ID for tracing */
  correlationId: Schema.optional(Schema.UUID).annotations({
    title: "Correlation ID",
    description: "ID to correlate related events across services"
  }),

  /** Optional causation ID (ID of event that caused this one) */
  causationId: Schema.optional(Schema.UUID).annotations({
    title: "Causation ID",
    description: "ID of the event that caused this event"
  }),
}).pipe(
  Schema.annotations({
    identifier: "EventMetadata",
    title: "Event Metadata",
    description: "Standard metadata included in all domain events"
  })
);
`)

  builder.addBlankLine()

  // AggregateMetadata schema
  builder.addRaw(`/**
 * Aggregate metadata for events tied to an aggregate root
 */
export const AggregateMetadata = Schema.Struct({
  /** Aggregate root identifier */
  aggregateId: Schema.UUID.annotations({
    title: "Aggregate ID",
    description: "Identifier of the aggregate root this event belongs to"
  }),

  /** Aggregate type */
  aggregateType: Schema.Literal("${className}").annotations({
    title: "Aggregate Type",
    description: "Type name of the aggregate root"
  }),

  /** Aggregate version for optimistic concurrency */
  aggregateVersion: Schema.Number.pipe(
    Schema.int(),
    Schema.positive()
  ).annotations({
    title: "Aggregate Version",
    description: "Version number for optimistic concurrency control",
    jsonSchema: { minimum: 1 }
  }),
}).pipe(
  Schema.annotations({
    identifier: "AggregateMetadata",
    title: "Aggregate Metadata",
    description: "Metadata for event sourcing and aggregate tracking"
  })
);
`)

  builder.addBlankLine()

  // ============================================================================
  // SECTION 2: CRUD Domain Events
  // ============================================================================

  builder.addSectionComment("CRUD Domain Events")
  builder.addBlankLine()

  // CreatedEvent
  builder.addRaw(createCreatedEvent(className, propertyName))
  builder.addBlankLine()

  // UpdatedEvent
  builder.addRaw(createUpdatedEvent(className, propertyName))
  builder.addBlankLine()

  // DeletedEvent
  builder.addRaw(createDeletedEvent(className, propertyName))
  builder.addBlankLine()

  // ============================================================================
  // SECTION 3: Event Union Types
  // ============================================================================

  builder.addSectionComment("Event Union Types")
  builder.addBlankLine()

  builder.addTypeAlias({
    name: `${className}DomainEvent`,
    type: `
  | ${className}CreatedEvent
  | ${className}UpdatedEvent
  | ${className}DeletedEvent`,
    exported: true,
    jsdoc: `Union of all ${domainName} domain events`
  })

  builder.addBlankLine()

  return builder.toString()
}

/**
 * Create file header
 */
function createFileHeader(
  className: string,
  domainName: string,
  fileName: string
) {
  return `/**
 * ${className} Domain Events
 *
 * Defines domain events for ${domainName} operations.
 * Events are used for event-driven architecture and messaging.
 *
 * @see https://effect.website/docs/schema/schema for Schema patterns
 * @module @custom-repo/contract-${fileName}/events
 */`
}

/**
 * Create CreatedEvent class
 */
function createCreatedEvent(className: string, propertyName: string) {
  return `/**
 * Event emitted when a ${propertyName} is created
 */
export class ${className}CreatedEvent extends Schema.Class<${className}CreatedEvent>(
  "${className}CreatedEvent"
)({
  ...EventMetadata.fields,
  ...AggregateMetadata.fields,

  /** ${className} identifier */
  ${propertyName}Id: Schema.UUID.annotations({
    title: "${className} ID",
    description: "ID of the ${propertyName} that was created"
  }),

  /** User who created the ${propertyName} */
  createdBy: Schema.optional(Schema.UUID).annotations({
    title: "Created By",
    description: "UUID of the user who created this ${propertyName}"
  })
}) {
  static create(params: {
    ${propertyName}Id: ${className}Id;
    createdBy?: string;
    correlationId?: string;
  }) {
    return new ${className}CreatedEvent({
      eventId: crypto.randomUUID(),
      eventType: "${className}CreatedEvent",
      eventVersion: "1.0",
      occurredAt: new Date(),
      aggregateId: params.${propertyName}Id,
      aggregateType: "${className}",
      aggregateVersion: 1,
      ${propertyName}Id: params.${propertyName}Id,
      ...(params.createdBy && { createdBy: params.createdBy }),
      ...(params.correlationId && { correlationId: params.correlationId }),
    });
  }
}`
}

/**
 * Create UpdatedEvent class
 */
function createUpdatedEvent(className: string, propertyName: string) {
  return `/**
 * Event emitted when a ${propertyName} is updated
 */
export class ${className}UpdatedEvent extends Schema.Class<${className}UpdatedEvent>(
  "${className}UpdatedEvent"
)({
  ...EventMetadata.fields,
  ...AggregateMetadata.fields,

  /** ${className} identifier */
  ${propertyName}Id: Schema.UUID.annotations({
    title: "${className} ID",
    description: "ID of the ${propertyName} that was updated"
  }),

  /** User who updated the ${propertyName} */
  updatedBy: Schema.optional(Schema.UUID).annotations({
    title: "Updated By",
    description: "UUID of the user who updated this ${propertyName}"
  }),

  /** Fields that were changed (optional) */
  changedFields: Schema.optional(Schema.Array(Schema.String)).annotations({
    title: "Changed Fields",
    description: "List of field names that were modified"
  })
}) {
  static create(params: {
    ${propertyName}Id: ${className}Id;
    aggregateVersion: number;
    updatedBy?: string;
    changedFields?: string[];
    correlationId?: string;
  }) {
    return new ${className}UpdatedEvent({
      eventId: crypto.randomUUID(),
      eventType: "${className}UpdatedEvent",
      eventVersion: "1.0",
      occurredAt: new Date(),
      aggregateId: params.${propertyName}Id,
      aggregateType: "${className}",
      aggregateVersion: params.aggregateVersion,
      ${propertyName}Id: params.${propertyName}Id,
      ...(params.updatedBy && { updatedBy: params.updatedBy }),
      ...(params.changedFields && { changedFields: params.changedFields }),
      ...(params.correlationId && { correlationId: params.correlationId }),
    });
  }
}`
}

/**
 * Create DeletedEvent class
 */
function createDeletedEvent(className: string, propertyName: string) {
  return `/**
 * Event emitted when a ${propertyName} is deleted
 */
export class ${className}DeletedEvent extends Schema.Class<${className}DeletedEvent>(
  "${className}DeletedEvent"
)({
  ...EventMetadata.fields,
  ...AggregateMetadata.fields,

  /** ${className} identifier */
  ${propertyName}Id: Schema.UUID.annotations({
    title: "${className} ID",
    description: "ID of the ${propertyName} that was deleted"
  }),

  /** User who deleted the ${propertyName} */
  deletedBy: Schema.optional(Schema.UUID).annotations({
    title: "Deleted By",
    description: "UUID of the user who deleted this ${propertyName}"
  }),

  /** Whether this was a soft delete */
  isSoftDelete: Schema.optional(Schema.Boolean).annotations({
    title: "Soft Delete",
    description: "True if this was a soft delete (marked as deleted but not removed)"
  })
}) {
  static create(params: {
    ${propertyName}Id: ${className}Id;
    aggregateVersion: number;
    deletedBy?: string;
    isSoftDelete?: boolean;
    correlationId?: string;
  }) {
    return new ${className}DeletedEvent({
      eventId: crypto.randomUUID(),
      eventType: "${className}DeletedEvent",
      eventVersion: "1.0",
      occurredAt: new Date(),
      aggregateId: params.${propertyName}Id,
      aggregateType: "${className}",
      aggregateVersion: params.aggregateVersion,
      ${propertyName}Id: params.${propertyName}Id,
      ...(params.deletedBy && { deletedBy: params.deletedBy }),
      ...(params.isSoftDelete !== undefined && { isSoftDelete: params.isSoftDelete }),
      ...(params.correlationId && { correlationId: params.correlationId }),
    });
  }
}`
}
