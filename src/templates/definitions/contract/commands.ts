/**
 * Contract Commands Template Definition
 *
 * Declarative template for generating commands.ts in contract libraries.
 * Contains CQRS command patterns using Schema.Class.
 *
 * @module monorepo-library-generator/templates/definitions/contract/commands
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Contract Commands Template Definition
 *
 * Generates a complete commands.ts file with:
 * - CRUD commands (Create, Update, Delete)
 * - Static factory methods
 * - Command union types
 * - Schema union for validation
 */
export const contractCommandsTemplate: TemplateDefinition = {
  id: "contract/commands",
  meta: {
    title: "{className} Commands (CQRS Write Operations)",
    description: `Commands represent write intentions with validation rules.
Each command should be validated and immutable.

TODO: Customize for your domain:
1. Add domain-specific command fields
2. Add validation rules (Schema.minLength, Schema.positive, etc.)
3. Add Schema.annotations() for OpenAPI/documentation
4. Add Schema.filter() for cross-field validation
5. Add Schema.transform() for data normalization
6. Create custom commands for domain-specific operations
7. Add factory methods for command creation`,
    module: "{scope}/contract-{fileName}/commands"
  },
  imports: [
    { from: "effect", items: ["Schema"] },
    { from: "./rpc-definitions", items: ["{className}Id"] }
  ],
  sections: [
    // CRUD Commands Section
    {
      title: "CRUD Commands",
      content: {
        type: "raw",
        value: `/**
 * Command to create a new {className}
 *
 * @example
 * \`\`\`typescript
 * const command = Create{className}Command.make({ name: "My {className}" })
 * // or use the convenience factory:
 * const command = Create{className}Command.create({ name: "My {className}" })
 * \`\`\`
 */
export class Create{className}Command extends Schema.Class<Create{className}Command>("Create{className}Command")({
  /** {className} name */
  name: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(255)
  ).annotations({
    title: "{className} Name",
    description: "The name for the new {className}",
    examples: ["New {className}"]
  }),

  // TODO: Add domain-specific fields with Schema.annotations()
  // Example:
  // description: Schema.optional(Schema.String),
  // category: Schema.String,
  // ownerId: Schema.UUID
}) {
  /**
   * Create a new {className} command with validated input
   */
  static create(params: { name: string }) {
    return new Create{className}Command(params)
  }
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Command to update an existing {className}
 *
 * @example
 * \`\`\`typescript
 * const command = Update{className}Command.create({
 *   {propertyName}Id: "..." as {className}Id,
 *   updates: { name: "Updated Name" }
 * })
 * \`\`\`
 */
export class Update{className}Command extends Schema.Class<Update{className}Command>("Update{className}Command")({
  /** {className} ID to update (branded type for type safety) */
  {propertyName}Id: {className}Id.annotations({
    title: "{className} ID",
    description: "Branded UUID of the {className} to update"
  }),

  /** Fields to update */
  updates: Schema.Record({
    key: Schema.String,
    value: Schema.Unknown
  }).annotations({
    title: "Updates",
    description: "Key-value pairs of fields to update"
  }),

  // TODO: Add specific update fields instead of generic Record
  // name: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
  // status: Schema.optional(Schema.String)
}) {
  /**
   * Create an update command with validated input
   */
  static create(params: {
    {propertyName}Id: {className}Id;
    updates: Record<string, unknown>
  }) {
    return new Update{className}Command(params)
  }
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Command to delete a {className}
 *
 * @example
 * \`\`\`typescript
 * const command = Delete{className}Command.create({
 *   {propertyName}Id: "..." as {className}Id,
 *   reason: "No longer needed"
 * })
 * \`\`\`
 */
export class Delete{className}Command extends Schema.Class<Delete{className}Command>("Delete{className}Command")({
  /** {className} ID to delete (branded type for type safety) */
  {propertyName}Id: {className}Id.annotations({
    title: "{className} ID",
    description: "Branded UUID of the {className} to delete"
  }),

  /** Reason for deletion (optional) */
  reason: Schema.optional(Schema.String).annotations({
    title: "Deletion Reason",
    description: "Optional reason for deleting this {className}"
  })
}) {
  /**
   * Create a delete command with validated input
   */
  static create(params: {
    {propertyName}Id: {className}Id;
    reason?: string
  }) {
    return new Delete{className}Command(params)
  }
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `// TODO: Add domain-specific commands here
// Example - Status change command (if domain has state machine):
//
// export class Change{className}StatusCommand extends Schema.Class<Change{className}StatusCommand>("Change{className}StatusCommand")({
//   {propertyName}Id: {className}Id, // Branded ID type
//   newStatus: Schema.String,
//   reason: Schema.optional(Schema.String),
// }) {
//   static create(params: { ... }) { ... }
// }`
      }
    },

    // Command Union Type Section
    {
      title: "Command Union Type",
      content: {
        type: "raw",
        value: `/**
 * Union of all {propertyName} commands
 */
export type {className}Command =
  | Create{className}Command
  | Update{className}Command
  | Delete{className}Command

// TODO: Add custom commands to this union`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Schema for {className}Command union
 */
export const {className}CommandSchema = Schema.Union(
  Create{className}Command,
  Update{className}Command,
  Delete{className}Command
  // TODO: Add custom command schemas
)`
      }
    }
  ]
}

export default contractCommandsTemplate
