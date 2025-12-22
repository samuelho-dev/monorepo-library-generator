/**
 * Contract Commands Template
 *
 * Generates commands.ts file for contract libraries with CQRS command
 * definitions using Schema.Class for write operations.
 *
 * @module monorepo-library-generator/contract/commands-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { ContractTemplateOptions } from '../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config';

/**
 * Generate commands.ts file for contract library
 *
 * Creates CQRS command definitions with:
 * - CRUD commands (Create, Update, Delete)
 * - Static factory methods
 * - Command union types
 * - Schema union for validation
 */
export function generateCommandsFile(options: ContractTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName, propertyName } = options;
  const domainName = propertyName;
  const scope = WORKSPACE_CONFIG.getScope();

  // Add file header
  builder.addRaw(createFileHeader(className, fileName, scope));
  builder.addBlankLine();

  // Add imports
  builder.addImports([{ from: 'effect', imports: ['Schema'] }]);

  builder.addImports([{ from: './types/database', imports: [`${className}Id`] }]);

  builder.addBlankLine();

  // ============================================================================
  // SECTION 1: CRUD Commands
  // ============================================================================

  builder.addSectionComment('CRUD Commands');
  builder.addBlankLine();

  // Create command
  builder.addRaw(createCreateCommand(className));
  builder.addBlankLine();

  // Update command
  builder.addRaw(createUpdateCommand(className, propertyName));
  builder.addBlankLine();

  // Delete command
  builder.addRaw(createDeleteCommand(className, propertyName));
  builder.addBlankLine();

  // TODO comment for custom commands
  builder.addComment('TODO: Add domain-specific commands here');
  builder.addComment('Example - Status change command (if domain has state machine):');
  builder.addComment('');
  builder.addComment(
    `export class Change${className}StatusCommand extends Schema.Class<Change${className}StatusCommand>("Change${className}StatusCommand")({`,
  );
  builder.addComment(`  ${propertyName}Id: ${className}Id, // Branded ID type`);
  builder.addComment('  newStatus: Schema.String,');
  builder.addComment('  reason: Schema.optional(Schema.String),');
  builder.addComment('}) {');
  builder.addComment('  static create(params: { ... }) { ... }');
  builder.addComment('}');
  builder.addBlankLine();

  // ============================================================================
  // SECTION 2: Command Union Type
  // ============================================================================

  builder.addSectionComment('Command Union Type');
  builder.addBlankLine();

  builder.addTypeAlias({
    name: `${className}Command`,
    type: `
  | Create${className}Command
  | Update${className}Command
  | Delete${className}Command`,
    exported: true,
    jsdoc: `Union of all ${domainName} commands`,
  });

  builder.addComment('TODO: Add custom commands to this union');
  builder.addBlankLine();

  // Command schema union
  builder.addRaw(`/**
 * Schema for ${className}Command union
 */
export const ${className}CommandSchema = Schema.Union(
  Create${className}Command,
  Update${className}Command,
  Delete${className}Command
  // TODO: Add custom command schemas
);
`);

  return builder.toString();
}

/**
 * Create file header
 */
function createFileHeader(className: string, fileName: string, scope: string) {
  return `/**
 * ${className} Commands (CQRS Write Operations)
 *
 * Commands represent write intentions with validation rules.
 * Each command should be validated and immutable.
 *
 * TODO: Customize for your domain:
 * 1. Add domain-specific command fields
 * 2. Add validation rules (Schema.minLength, Schema.positive, etc.)
 * 3. Add Schema.annotations() for OpenAPI/documentation
 * 4. Add Schema.filter() for cross-field validation
 * 5. Add Schema.transform() for data normalization
 * 6. Create custom commands for domain-specific operations
 * 7. Add factory methods for command creation
 *
 * @module ${scope}/contract-${fileName}/commands
 */`;
}

/**
 * Create Create command
 */
function createCreateCommand(className: string) {
  return `/**
 * Command to create a new ${className}
 *
 * @example
 * \`\`\`typescript
 * const command = Create${className}Command.make({ name: "My ${className}" });
 * // or use the convenience factory:
 * const command = Create${className}Command.create({ name: "My ${className}" });
 * \`\`\`
 */
export class Create${className}Command extends Schema.Class<Create${className}Command>("Create${className}Command")({
  /** ${className} name */
  name: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(255)
  ).annotations({
    title: "${className} Name",
    description: "The name for the new ${className}",
    examples: ["New ${className}"]
  }),

  // TODO: Add domain-specific fields with Schema.annotations()
  // Example:
  // description: Schema.optional(Schema.String),
  // category: Schema.String,
  // ownerId: Schema.UUID,
}) {
  /**
   * Create a new ${className} command with validated input
   */
  static create(params: { name: string }) {
    return new Create${className}Command(params);
  }
}`;
}

/**
 * Create Update command
 */
function createUpdateCommand(className: string, propertyName: string) {
  return `/**
 * Command to update an existing ${className}
 *
 * @example
 * \`\`\`typescript
 * const command = Update${className}Command.create({
 *   ${propertyName}Id: "..." as ${className}Id,
 *   updates: { name: "Updated Name" }
 * });
 * \`\`\`
 */
export class Update${className}Command extends Schema.Class<Update${className}Command>("Update${className}Command")({
  /** ${className} ID to update (branded type for type safety) */
  ${propertyName}Id: ${className}Id.annotations({
    title: "${className} ID",
    description: "Branded UUID of the ${className} to update"
  }),

  /** Fields to update */
  updates: Schema.Record({
    key: Schema.String,
    value: Schema.Unknown,
  }).annotations({
    title: "Updates",
    description: "Key-value pairs of fields to update"
  }),

  // TODO: Add specific update fields instead of generic Record
  // name: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
  // status: Schema.optional(Schema.String),
}) {
  /**
   * Create an update command with validated input
   */
  static create(params: {
    ${propertyName}Id: ${className}Id;
    updates: Record<string, unknown>;
  }) {
    return new Update${className}Command(params);
  }
}`;
}

/**
 * Create Delete command
 */
function createDeleteCommand(className: string, propertyName: string) {
  return `/**
 * Command to delete a ${className}
 *
 * @example
 * \`\`\`typescript
 * const command = Delete${className}Command.create({
 *   ${propertyName}Id: "..." as ${className}Id,
 *   reason: "No longer needed"
 * });
 * \`\`\`
 */
export class Delete${className}Command extends Schema.Class<Delete${className}Command>("Delete${className}Command")({
  /** ${className} ID to delete (branded type for type safety) */
  ${propertyName}Id: ${className}Id.annotations({
    title: "${className} ID",
    description: "Branded UUID of the ${className} to delete"
  }),

  /** Reason for deletion (optional) */
  reason: Schema.optional(Schema.String).annotations({
    title: "Deletion Reason",
    description: "Optional reason for deleting this ${className}"
  }),
}) {
  /**
   * Create a delete command with validated input
   */
  static create(params: {
    ${propertyName}Id: ${className}Id;
    reason?: string;
  }) {
    return new Delete${className}Command(params);
  }
}`;
}
