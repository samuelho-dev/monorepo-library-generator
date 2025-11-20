/**
 * Contract Events Template
 *
 * Generates events.ts file for contract libraries with domain event
 * definitions using Schema.Class for event-driven architecture.
 *
 * @module monorepo-library-generator/contract/events-template
 */

import { TypeScriptBuilder } from '../../../utils/code-generation/typescript-builder';
import type { ContractTemplateOptions } from '../../../utils/shared/types';

/**
 * Generate events.ts file for contract library
 *
 * Creates domain event definitions with:
 * - Base event metadata schemas
 * - Aggregate metadata for event sourcing
 * - CRUD domain events (Created, Updated, Deleted)
 */
export function generateEventsFile(options: ContractTemplateOptions): string {
  const builder = new TypeScriptBuilder();
  const { className, fileName, propertyName } = options;
  const domainName = propertyName;

  // Add file header
  builder.addRaw(createFileHeader(className, domainName, fileName));
  builder.addBlankLine();

  // Add imports
  builder.addImports([{ from: 'effect', imports: ['Schema', 'DateTime'] }]);

  builder.addImports([
    { from: './entities', imports: [`${className}Id`], isTypeOnly: true },
  ]);

  builder.addBlankLine();

  // ============================================================================
  // SECTION 1: Base Event Metadata
  // ============================================================================

  builder.addSectionComment('Base Event Metadata');
  builder.addBlankLine();

  // EventMetadata schema
  builder.addRaw(`/**
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
`);

  builder.addBlankLine();

  // AggregateMetadata schema
  builder.addRaw(`/**
 * Aggregate metadata for events tied to an aggregate root
 */
export const AggregateMetadata = Schema.Struct({
  /** Aggregate root identifier */
  aggregateId: Schema.UUID,

  /** Aggregate type */
  aggregateType: Schema.Literal("${className}"),

  /** Aggregate version for optimistic concurrency */
  aggregateVersion: Schema.Number.pipe(Schema.int(), Schema.positive()),
});
`);

  builder.addBlankLine();

  // ============================================================================
  // SECTION 2: CRUD Domain Events
  // ============================================================================

  builder.addSectionComment('CRUD Domain Events');
  builder.addBlankLine();

  // CreatedEvent
  builder.addRaw(createCreatedEvent(className, propertyName));
  builder.addBlankLine();

  // UpdatedEvent
  builder.addRaw(createUpdatedEvent(className, propertyName));
  builder.addBlankLine();

  // DeletedEvent
  builder.addRaw(createDeletedEvent(className, propertyName));
  builder.addBlankLine();

  // ============================================================================
  // SECTION 3: Event Union Types
  // ============================================================================

  builder.addSectionComment('Event Union Types');
  builder.addBlankLine();

  builder.addTypeAlias({
    name: `${className}DomainEvent`,
    type: `
  | ${className}CreatedEvent
  | ${className}UpdatedEvent
  | ${className}DeletedEvent`,
    exported: true,
    jsdoc: `Union of all ${domainName} domain events`,
  });

  builder.addComment('TODO: Add custom domain events to this union');
  builder.addBlankLine();

  return builder.toString();
}

/**
 * Create file header
 */
function createFileHeader(
  className: string,
  domainName: string,
  fileName: string,
): string {
  return `/**
 * ${className} Domain Events
 *
 * Defines domain events for ${domainName} operations.
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
 * @module @custom-repo/contract-${fileName}/events
 */`;
}

/**
 * Create CreatedEvent class
 */
function createCreatedEvent(className: string, propertyName: string): string {
  return `/**
 * Event emitted when a ${propertyName} is created
 */
export class ${className}CreatedEvent extends Schema.Class<${className}CreatedEvent>(
  "${className}CreatedEvent"
)({
  ...EventMetadata.fields,
  ...AggregateMetadata.fields,

  /** ${className} identifier */
  ${propertyName}Id: Schema.UUID,

  /** User who created the ${propertyName} */
  createdBy: Schema.optional(Schema.UUID),

  // TODO: Add domain-specific fields to the event payload
}) {
  static create(params: {
    ${propertyName}Id: ${className}Id;
    createdBy?: string;
    correlationId?: string;
  }): ${className}CreatedEvent {
    return new ${className}CreatedEvent({
      eventId: crypto.randomUUID(),
      eventType: "${className}CreatedEvent",
      eventVersion: "1.0",
      occurredAt: new Date().toISOString(),
      aggregateId: params.${propertyName}Id,
      aggregateType: "${className}",
      aggregateVersion: 1,
      ${propertyName}Id: params.${propertyName}Id,
      ...(params.createdBy && { createdBy: params.createdBy }),
      ...(params.correlationId && { correlationId: params.correlationId }),
    });
  }
}`;
}

/**
 * Create UpdatedEvent class
 */
function createUpdatedEvent(className: string, propertyName: string): string {
  return `/**
 * Event emitted when a ${propertyName} is updated
 */
export class ${className}UpdatedEvent extends Schema.Class<${className}UpdatedEvent>(
  "${className}UpdatedEvent"
)({
  ...EventMetadata.fields,
  ...AggregateMetadata.fields,

  /** ${className} identifier */
  ${propertyName}Id: Schema.UUID,

  /** User who updated the ${propertyName} */
  updatedBy: Schema.optional(Schema.UUID),

  /** Fields that were changed (optional) */
  changedFields: Schema.optional(Schema.Array(Schema.String)),

  // TODO: Add domain-specific fields to track what changed
}) {
  static create(params: {
    ${propertyName}Id: ${className}Id;
    aggregateVersion: number;
    updatedBy?: string;
    changedFields?: string[];
    correlationId?: string;
  }): ${className}UpdatedEvent {
    return new ${className}UpdatedEvent({
      eventId: crypto.randomUUID(),
      eventType: "${className}UpdatedEvent",
      eventVersion: "1.0",
      occurredAt: new Date().toISOString(),
      aggregateId: params.${propertyName}Id,
      aggregateType: "${className}",
      aggregateVersion: params.aggregateVersion,
      ${propertyName}Id: params.${propertyName}Id,
      ...(params.updatedBy && { updatedBy: params.updatedBy }),
      ...(params.changedFields && { changedFields: params.changedFields }),
      ...(params.correlationId && { correlationId: params.correlationId }),
    });
  }
}`;
}

/**
 * Create DeletedEvent class
 */
function createDeletedEvent(className: string, propertyName: string): string {
  return `/**
 * Event emitted when a ${propertyName} is deleted
 */
export class ${className}DeletedEvent extends Schema.Class<${className}DeletedEvent>(
  "${className}DeletedEvent"
)({
  ...EventMetadata.fields,
  ...AggregateMetadata.fields,

  /** ${className} identifier */
  ${propertyName}Id: Schema.UUID,

  /** User who deleted the ${propertyName} */
  deletedBy: Schema.optional(Schema.UUID),

  /** Whether this was a soft delete */
  isSoftDelete: Schema.optional(Schema.Boolean),

  // TODO: Add domain-specific fields
}) {
  static create(params: {
    ${propertyName}Id: ${className}Id;
    aggregateVersion: number;
    deletedBy?: string;
    isSoftDelete?: boolean;
    correlationId?: string;
  }): ${className}DeletedEvent {
    return new ${className}DeletedEvent({
      eventId: crypto.randomUUID(),
      eventType: "${className}DeletedEvent",
      eventVersion: "1.0",
      occurredAt: new Date().toISOString(),
      aggregateId: params.${propertyName}Id,
      aggregateType: "${className}",
      aggregateVersion: params.aggregateVersion,
      ${propertyName}Id: params.${propertyName}Id,
      ...(params.deletedBy && { deletedBy: params.deletedBy }),
      ...(params.isSoftDelete !== undefined && { isSoftDelete: params.isSoftDelete }),
      ...(params.correlationId && { correlationId: params.correlationId }),
    });
  }
}`;
}
