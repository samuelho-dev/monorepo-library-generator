/**
 * Contract Sub-Module Events Template Definition
 *
 * Declarative template for generating events.ts in contract sub-modules.
 * Part of the Hybrid DDD pattern for sub-module support.
 *
 * @module monorepo-library-generator/templates/definitions/contract/submodule-events
 */

import type { TemplateDefinition } from '../../core/types'

/**
 * Contract Sub-Module Events Template Definition
 *
 * Generates an events.ts file for sub-modules with:
 * - Event base schema (metadata, correlation, user)
 * - CRUD domain events (Created, Updated, Deleted)
 * - Event union type for type-safe handling
 * - Event registry for registration
 */
export const contractSubmoduleEventsTemplate: TemplateDefinition = {
  id: 'contract/submodule-events',
  meta: {
    title: '{parentClassName} {subModuleClassName} Domain Events',
    description: `Domain events for the {subModuleName} sub-module.

Events are prefixed with "{subModuleClassName}." for routing in the parent domain's event bus.
These events can be published via PubsubService and consumed by other features.`,
    module: '{scope}/contract-{parentName}/{subModuleName}/events'
  },
  imports: [{ from: 'effect', items: ['Schema'] }],
  sections: [
    // Event Base Schema
    {
      title: 'Event Base Schema',
      content: {
        type: 'raw',
        value: `/**
 * Base event metadata for {subModuleName} events
 */
const {subModuleClassName}EventBase = Schema.Struct({
  /** Event timestamp */
  timestamp: Schema.DateTimeUtc,
  /** Correlation ID for tracing */
  correlationId: Schema.UUID,
  /** User who triggered the event (if applicable) */
  userId: Schema.optional(Schema.UUID),
  /** Additional metadata */
  metadata: Schema.optional(Schema.Record({
    key: Schema.String,
    value: Schema.Unknown
  }))
})`
      }
    },
    // Domain Events
    {
      title: '{subModuleClassName} Domain Events',
      content: {
        type: 'raw',
        value: `/**
 * {subModuleClassName} created event
 */
export const {subModuleClassName}Created = Schema.Struct({
  _tag: Schema.Literal("{subModuleClassName}.Created"),
  {subModuleName}Id: Schema.UUID,
  parent{parentClassName}Id: Schema.optional(Schema.UUID),
  ...{subModuleClassName}EventBase.fields
}).pipe(Schema.annotations({
  identifier: "{subModuleClassName}.Created",
  title: "{subModuleClassName} Created",
  description: "Emitted when a {subModuleName} is created"
}))`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * {subModuleClassName} updated event
 */
export const {subModuleClassName}Updated = Schema.Struct({
  _tag: Schema.Literal("{subModuleClassName}.Updated"),
  {subModuleName}Id: Schema.UUID,
  changes: Schema.Record({
    key: Schema.String,
    value: Schema.Unknown
  }),
  ...{subModuleClassName}EventBase.fields
}).pipe(Schema.annotations({
  identifier: "{subModuleClassName}.Updated",
  title: "{subModuleClassName} Updated",
  description: "Emitted when a {subModuleName} is updated"
}))`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * {subModuleClassName} deleted event
 */
export const {subModuleClassName}Deleted = Schema.Struct({
  _tag: Schema.Literal("{subModuleClassName}.Deleted"),
  {subModuleName}Id: Schema.UUID,
  ...{subModuleClassName}EventBase.fields
}).pipe(Schema.annotations({
  identifier: "{subModuleClassName}.Deleted",
  title: "{subModuleClassName} Deleted",
  description: "Emitted when a {subModuleName} is deleted"
}))`
      }
    },
    // Event Union Type
    {
      title: 'Event Union Type',
      content: {
        type: 'raw',
        value: `/**
 * Union of all {subModuleName} domain events
 *
 * Use this for type-safe event handling:
 * \`\`\`typescript
 * const handle = (event: {subModuleClassName}Event) => {
 *   switch (event._tag) {
 *     case "{subModuleClassName}.Created": ...
 *     case "{subModuleClassName}.Updated": ...
 *   }
 * }
 * \`\`\`
 */
export type {subModuleClassName}Event =
  | Schema.Schema.Type<typeof {subModuleClassName}Created>
  | Schema.Schema.Type<typeof {subModuleClassName}Updated>
  | Schema.Schema.Type<typeof {subModuleClassName}Deleted>

/**
 * All {subModuleName} event schemas for registration
 */
export const {subModuleClassName}Events = {
  {subModuleClassName}Created,
  {subModuleClassName}Updated,
  {subModuleClassName}Deleted
}`
      }
    }
  ]
}

export default contractSubmoduleEventsTemplate
