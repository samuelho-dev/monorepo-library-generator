/**
 * Data Access Validation Template
 *
 * Generates validation.ts file for data-access libraries with input validation schemas.
 *
 * @module monorepo-library-generator/data-access/validation-template
 */

import { TypeScriptBuilder } from '../../../utils/code-generation/typescript-builder';
import type { DataAccessTemplateOptions } from '../../../utils/shared/types';

/**
 * Generate validation.ts file for data-access library
 *
 * Creates validation functions including:
 * - Input validation for create/update operations
 * - Filter validation
 * - ID validation
 * - Pagination validation
 * - Type guards
 */
export function generateValidationFile(
  options: DataAccessTemplateOptions,
): string {
  const builder = new TypeScriptBuilder();
  const { className, fileName, propertyName: _propertyName } = options;

  // Add file header
  builder.addFileHeader({
    title: `${className} Validation Schemas`,
    description: `Input validation using schema validators (e.g., Zod, Yup).
Validates data before repository operations to ensure domain constraints.

TODO: Customize this file:
1. Choose validation library (Zod recommended)
2. Define schemas for ${className}CreateInput and ${className}UpdateInput
3. Add custom validators for domain rules
4. Define error messages and localization if needed
5. Add coercion/transformation logic if needed

@see https://zod.dev for Zod schema validation`,
    module: `@custom-repo/data-access-${fileName}/server`,
  });
  builder.addBlankLine();

  // Add imports
  builder.addImports([
    {
      from: './types.js',
      imports: [
        `${className}Filter`,
        `${className}CreateInput`,
        `${className}UpdateInput`,
      ],
      isTypeOnly: true,
    },
  ]);
  builder.addBlankLine();

  // Validation Helpers
  builder.addSectionComment('Validation Helpers');
  builder.addBlankLine();

  // Validate Create Input
  builder.addRaw(`/**
 * Validates ${className} Creation Input
 *
 * TODO: Implement validation using your schema library
 * Example with Zod:
 * \`\`\`typescript
 * import { z } from 'zod';
 *
 * const ${className}CreateSchema = z.object({
 *   name: z.string().min(1).max(255),
 *   description: z.string().optional(),
 *   price: z.number().positive(),
 * });
 *
 * export function validate${className}CreateInput(input: unknown): ${className}CreateInput {
 *   return ${className}CreateSchema.parse(input);
 * }
 * \`\`\`
 *
 * @param input - Unvalidated input data
 * @returns Validated input data
 * @throws ValidationError if input doesn't meet schema requirements
 *
 * @example
 * \`\`\`typescript
 * const input = validate${className}CreateInput({
 *   name: 'New ${className}',
 *   price: 99.99
 * });
 * \`\`\`
 */
export function validate${className}CreateInput(
  input: unknown,
): ${className}CreateInput {
  // TODO: Implement schema validation
  // Currently accepts any input - replace with actual validation
  return input as ${className}CreateInput;
}`);
  builder.addBlankLine();

  // Validate Update Input
  builder.addRaw(`/**
 * Validates ${className} Update Input
 *
 * TODO: Implement validation using your schema library
 * Example with Zod:
 * \`\`\`typescript
 * const ${className}UpdateSchema = z.object({
 *   name: z.string().min(1).max(255).optional(),
 *   description: z.string().optional(),
 *   price: z.number().positive().optional(),
 * });
 *
 * export function validate${className}UpdateInput(input: unknown): ${className}UpdateInput {
 *   return ${className}UpdateSchema.parse(input);
 * }
 * \`\`\`
 *
 * @param input - Unvalidated update data
 * @returns Validated update data
 * @throws ValidationError if input doesn't meet schema requirements
 *
 * @example
 * \`\`\`typescript
 * const updates = validate${className}UpdateInput({
 *   name: 'Updated ${className}'
 * });
 * \`\`\`
 */
export function validate${className}UpdateInput(
  input: unknown,
): ${className}UpdateInput {
  // TODO: Implement schema validation
  // Currently accepts any input - replace with actual validation
  return input as ${className}UpdateInput;
}`);
  builder.addBlankLine();

  // Validate Filters
  builder.addRaw(`/**
 * Validates ${className} Filters
 *
 * TODO: Implement validation for filter parameters
 * Example with Zod:
 * \`\`\`typescript
 * const ${className}FilterSchema = z.object({
 *   search: z.string().optional(),
 *   status: z.enum(['active', 'inactive']).optional(),
 *   minPrice: z.number().optional(),
 *   maxPrice: z.number().optional(),
 * });
 *
 * export function validate${className}Filter(input: unknown): ${className}Filter {
 *   return ${className}FilterSchema.parse(input);
 * }
 * \`\`\`
 *
 * @param input - Unvalidated filter data
 * @returns Validated filter data
 * @throws ValidationError if filters don't meet requirements
 *
 * @example
 * \`\`\`typescript
 * const filters = validate${className}Filter({
 *   search: 'laptop',
 *   status: 'active'
 * });
 * \`\`\`
 */
export function validate${className}Filter(
  input: unknown,
): ${className}Filter {
  // TODO: Implement schema validation
  // Currently accepts any input - replace with actual validation
  return input as ${className}Filter;
}`);
  builder.addBlankLine();

  // Validate ID
  builder.addRaw(`/**
 * Validates a single ${className} ID
 *
 * TODO: Implement ID validation based on your ID format
 * - UUID: z.string().uuid()
 * - Nanoid: z.string().regex(/^[a-zA-Z0-9_-]{21}$/)
 * - Numeric: z.string().regex(/^\\d+$/)
 *
 * @param id - Unvalidated ID
 * @returns Validated ID
 * @throws ValidationError if ID format is invalid
 *
 * @example
 * \`\`\`typescript
 * const id = validate${className}Id('550e8400-e29b-41d4-a716-446655440000');
 * \`\`\`
 */
export function validate${className}Id(id: unknown): string {
  // TODO: Implement ID format validation
  // Currently accepts any string - replace with actual validation
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('Invalid ${className} ID: must be non-empty string');
  }
  return id;
}`);
  builder.addBlankLine();

  // Validate Pagination
  builder.addRaw(`/**
 * Validates pagination parameters
 *
 * Ensures skip and limit are non-negative integers within reasonable bounds.
 *
 * TODO: Customize limits based on your application
 * - Consider database performance
 * - Set reasonable maximums
 * - Define default values
 *
 * @param skip - Number of items to skip
 * @param limit - Maximum number of items to return
 * @returns Validated skip/limit values
 * @throws ValidationError if parameters are invalid
 *
 * @example
 * \`\`\`typescript
 * const { skip, limit } = validatePagination(0, 20);
 * \`\`\`
 */
export function validatePagination(
  skip: unknown,
  limit: unknown,
): { skip: number; limit: number } {
  // TODO: Implement pagination validation
  const skipNum = typeof skip === 'number' ? skip : 0;
  const limitNum = typeof limit === 'number' ? limit : 20;

  // Validate ranges
  if (skipNum < 0) throw new Error('skip must be >= 0');
  if (limitNum < 1) throw new Error('limit must be >= 1');
  if (limitNum > 1000) throw new Error('limit must be <= 1000'); // TODO: Adjust max limit

  return { skip: skipNum, limit: limitNum };
}`);
  builder.addBlankLine();

  // Validation Utilities
  builder.addSectionComment('Validation Utilities');
  builder.addBlankLine();

  // is${className} type guard
  builder.addRaw(`/**
 * Checks if an object is a valid ${className} entity
 *
 * TODO: Implement based on your entity structure
 *
 * @param obj - Object to check
 * @returns true if object is a valid ${className}
 *
 * @example
 * \`\`\`typescript
 * if (is${className}(obj)) {
 *   // obj is guaranteed to be a ${className}
 * }
 * \`\`\`
 */
export function is${className}(obj: unknown): obj is any {
  // TODO: Implement entity validation
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'createdAt' in obj &&
    'updatedAt' in obj
  );
}`);
  builder.addBlankLine();

  // isValid${className}CreateInput type guard
  builder.addRaw(`/**
 * Checks if an object is valid for creation
 *
 * TODO: Implement based on your creation input requirements
 *
 * @param obj - Object to check
 * @returns true if object can be used for creation
 *
 * @example
 * \`\`\`typescript
 * if (isValid${className}CreateInput(obj)) {
 *   // obj is guaranteed to be valid creation input
 * }
 * \`\`\`
 */
export function isValid${className}CreateInput(obj: unknown): obj is ${className}CreateInput {
  // TODO: Implement creation input validation
  return typeof obj === 'object' && obj !== null;
}`);
  builder.addBlankLine();

  // isValid${className}UpdateInput type guard
  builder.addRaw(`/**
 * Checks if an object is valid for updates
 *
 * TODO: Implement based on your update input requirements
 *
 * @param obj - Object to check
 * @returns true if object can be used for updates
 *
 * @example
 * \`\`\`typescript
 * if (isValid${className}UpdateInput(updates)) {
 *   // obj is guaranteed to be valid update input
 * }
 * \`\`\`
 */
export function isValid${className}UpdateInput(obj: unknown): obj is ${className}UpdateInput {
  // TODO: Implement update input validation
  return typeof obj === 'object' && (obj === null || Object.keys(obj).length > 0);
}
`);

  return builder.toString();
}
