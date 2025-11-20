/**
 * Contract Commands Template
 *
 * Generates commands.ts file for contract libraries with CQRS command
 * definitions using Schema.Class for write operations.
 *
 * @module monorepo-library-generator/contract/commands-template
 */

import { TypeScriptBuilder } from '../../../utils/code-generation/typescript-builder';
import type { ContractTemplateOptions } from '../../../utils/shared/types';

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

  // Add file header
  builder.addRaw(createFileHeader(className, domainName, fileName));
  builder.addBlankLine();

  // Add imports
  builder.addImports([{ from: 'effect', imports: ['Schema'] }]);

  builder.addImports([
    { from: './entities', imports: [`${className}Id`], isTypeOnly: true },
  ]);

  builder.addBlankLine();

  // ============================================================================
  // SECTION 1: CRUD Commands
  // ============================================================================

  builder.addSectionComment('CRUD Commands');
  builder.addBlankLine();

  // Create command
  builder.addRaw(createCreateCommand(className, propertyName));
  builder.addBlankLine();

  // Update command
  builder.addRaw(createUpdateCommand(className, propertyName));
  builder.addBlankLine();

  // Delete command
  builder.addRaw(createDeleteCommand(className, propertyName));
  builder.addBlankLine();

  // TODO comment for custom commands
  builder.addComment('TODO: Add domain-specific commands here');
  builder.addComment(
    'Example - Status change command (if domain has state machine):',
  );
  builder.addComment('');
  builder.addComment(
    `export class Change${className}StatusCommand extends Schema.Class<Change${className}StatusCommand>("Change${className}StatusCommand")({`,
  );
  builder.addComment(`  ${propertyName}Id: Schema.UUID,`);
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
function createFileHeader(
  className: string,
  domainName: string,
  fileName: string,
) {
  return `/**
 * ${className} Commands (CQRS Write Operations)
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
 * @module @custom-repo/contract-${fileName}/commands
 */`;
}

/**
 * Create Create command
 */
function createCreateCommand(className: string, _propertyName: string) {
  return `/**
 * Command to create a new ${className}
 */
export class Create${className}Command extends Schema.Class<Create${className}Command>("Create${className}Command")({
  /** ${className} name */
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),

  // TODO: Add domain-specific fields
  // Example fields:
  //
  // /** ${className} description */
  // description: Schema.optional(Schema.String),
  //
  // /** ${className} category */
  // category: Schema.String,
  //
  // /** Owner user ID */
  // ownerId: Schema.UUID,
}) {
  static create(params: {
    name: string;
    // TODO: Add parameters
  }) {
    return new Create${className}Command({
      name: params.name,
      // TODO: Add fields
    });
  }
}`;
}

/**
 * Create Update command
 */
function createUpdateCommand(className: string, propertyName: string) {
  return `/**
 * Command to update an existing ${className}
 */
export class Update${className}Command extends Schema.Class<Update${className}Command>("Update${className}Command")({
  /** ${className} ID to update */
  ${propertyName}Id: Schema.UUID,

  /** Fields to update */
  updates: Schema.Record({
    key: Schema.String,
    value: Schema.Unknown,
  }),

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
    ${propertyName}Id: ${className}Id;
    updates: Record<string, unknown>;
  }) {
    return new Update${className}Command({
      ${propertyName}Id: params.${propertyName}Id,
      updates: params.updates,
    });
  }
}`;
}

/**
 * Create Delete command
 */
function createDeleteCommand(className: string, propertyName: string) {
  return `/**
 * Command to delete a ${className}
 */
export class Delete${className}Command extends Schema.Class<Delete${className}Command>("Delete${className}Command")({
  /** ${className} ID to delete */
  ${propertyName}Id: Schema.UUID,

  /** Reason for deletion (optional) */
  reason: Schema.optional(Schema.String),
}) {
  static create(params: {
    ${propertyName}Id: ${className}Id;
    reason?: string;
  }) {
    return new Delete${className}Command({
      ${propertyName}Id: params.${propertyName}Id,
      ...(params.reason !== undefined && { reason: params.reason }),
    });
  }
}`;
}
