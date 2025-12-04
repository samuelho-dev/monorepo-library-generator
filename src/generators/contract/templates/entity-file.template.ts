/**
 * Entity File Template
 *
 * Generates individual entity files for bundle optimization.
 * Each entity gets its own file for tree-shakeable imports.
 */

export interface EntityFileOptions {
  readonly entityName: string
  readonly className: string
  readonly packageName: string
}

/**
 * Generate a single entity file
 *
 * Creates a standalone entity file with Schema.Class definition,
 * helper types, and validation functions.
 */
export function generateEntityFile(options: EntityFileOptions) {
  const { entityName } = options

  return `import { Schema } from "effect";

/**
 * ${entityName} Entity
 *
 * Domain entity with Effect Schema validation.
 *
 * TODO: Customize this entity for your domain:
 * 1. Add domain-specific fields
 * 2. Add validation rules (Schema.minLength, Schema.positive, etc.)
 * 3. Add computed fields if needed
 */
export class ${entityName} extends Schema.Class<${entityName}>("${entityName}")({
  id: Schema.UUID,
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc
  // TODO: Add your domain fields here
}) {}

/**
 * Insert type - for creating new ${entityName} (without generated fields)
 */
export type ${entityName}Insert = typeof ${entityName}.Encoded;

/**
 * Update type - partial insert (for updates)
 */
export type ${entityName}Update = Partial<${entityName}Insert>;

/**
 * Parse ${entityName} from unknown data with validation
 */
export const parse${entityName} = Schema.decodeUnknown(${entityName});

/**
 * Encode ${entityName} to plain object
 */
export const encode${entityName} = Schema.encode(${entityName});
`
}
