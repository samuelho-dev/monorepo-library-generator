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

  return `import { Brand, Schema } from "effect";

/**
 * ${entityName}Id - Branded ID Type
 *
 * Type-safe ID that prevents mixing ${entityName} IDs with other entity IDs.
 * See: https://effect.website/docs/code-style/branded-types/
 *
 * Example:
 * const userId: UserId = "123" as UserId;
 * const productId: ProductId = "456" as ProductId;
 * userRepo.findById(productId); // ❌ Type error - ProductId is not UserId!
 */
export type ${entityName}Id = string & Brand.Brand<"${entityName}Id">;

/**
 * ${entityName}Id Schema
 *
 * Validates and brands UUID strings as ${entityName}Id.
 */
export const ${entityName}Id = Schema.String.pipe(
  Schema.uuid(),
  Schema.brand("${entityName}Id")
);

/**
 * ${entityName} Entity
 *
 * Domain entity with Effect Schema validation and branded ID type.
 *
 * TODO: Customize this entity for your domain:
 * 1. Add domain-specific fields
 * 2. Add validation rules (Schema.minLength, Schema.positive, etc.)
 * 3. Add computed fields if needed
 * 4. Consider adding more branded types for other domain primitives
 */
export class ${entityName} extends Schema.Class<${entityName}>("${entityName}")({
  id: ${entityName}Id,
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
