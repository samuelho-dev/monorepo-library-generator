/**
 * Data Access Validation Template
 *
 * Generates validation.ts file for data-access libraries with input validation schemas.
 *
 * @module monorepo-library-generator/data-access/validation-template
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder"
import type { DataAccessTemplateOptions } from "../../../utils/shared/types"

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
export function generateValidationFile(options: DataAccessTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options

  // Add file header
  builder.addFileHeader({
    title: `${className} Validation Schemas`,
    description: `Input validation using schema validators.
Validates data before repository operations to ensure domain constraints.

@see https://zod.dev for Zod schema validation`,
    module: `@custom-repo/data-access-${fileName}/server`
  })
  builder.addBlankLine()

  // Note: Types are expected to be defined in ./types.ts
  // Consumers should use those types for type checking after validation

  // Validation Helpers
  builder.addSectionComment("Validation Helpers")
  builder.addBlankLine()

  // Validate Create Input
  builder.addRaw(`/**
 * Validates ${className} Creation Input
 *
 * @param input - Unvalidated input data
 * @returns Validated input data
 * @throws ValidationError if input doesn't meet schema requirements
 */
export function validate${className}CreateInput(
  input: unknown,
) {
  if (typeof input !== 'object' || input === null) {
    throw new Error("Invalid ${className} create input: must be an object")
  }
  // TODO: Implement full schema validation (e.g., with Zod or Effect Schema)
  return input
}`)
  builder.addBlankLine()

  // Validate Update Input
  builder.addRaw(`/**
 * Validates ${className} Update Input
 *
 * @param input - Unvalidated update data
 * @returns Validated update data
 * @throws ValidationError if input doesn't meet schema requirements
 */
export function validate${className}UpdateInput(
  input: unknown,
) {
  if (typeof input !== 'object' || input === null) {
    throw new Error("Invalid ${className} update input: must be an object")
  }
  // TODO: Implement full schema validation (e.g., with Zod or Effect Schema)
  return input
}`)
  builder.addBlankLine()

  // Validate Filters
  builder.addRaw(`/**
 * Validates ${className} Filters
 *
 * @param input - Unvalidated filter data
 * @returns Validated filter data
 * @throws ValidationError if filters don't meet requirements
 */
export function validate${className}Filter(
  input: unknown,
) {
  if (typeof input !== 'object' || input === null) {
    throw new Error("Invalid ${className} filter: must be an object")
  }
  // TODO: Implement full schema validation (e.g., with Zod or Effect Schema)
  return input
}`)
  builder.addBlankLine()

  // Validate ID
  builder.addRaw(`/**
 * Validates a single ${className} ID
 *
 * @param id - Unvalidated ID
 * @returns Validated ID
 * @throws ValidationError if ID format is invalid
 */
export function validate${className}Id(id: unknown) {
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('Invalid ${className} ID: must be non-empty string');
  }
  return id;
}`)
  builder.addBlankLine()

  // Validate Pagination
  builder.addRaw(`/**
 * Validates pagination parameters
 *
 * Ensures skip and limit are non-negative integers within reasonable bounds.
 *
 * @param skip - Number of items to skip
 * @param limit - Maximum number of items to return
 * @returns Validated skip/limit values
 * @throws ValidationError if parameters are invalid
 */
export function validatePagination(
  skip: unknown,
  limit: unknown,
) {
  const skipNum = typeof skip === 'number' ? skip : 0;
  const limitNum = typeof limit === 'number' ? limit : 20;

  if (skipNum < 0) throw new Error('skip must be >= 0');
  if (limitNum < 1) throw new Error('limit must be >= 1');
  if (limitNum > 1000) throw new Error('limit must be <= 1000');

  return { skip: skipNum, limit: limitNum };
}`)
  builder.addBlankLine()

  // Validation Utilities
  builder.addSectionComment("Validation Utilities")
  builder.addBlankLine()

  // is${className} type guard
  builder.addRaw(`/**
 * Checks if an object is a valid ${className} entity
 *
 * @param obj - Object to check
 * @returns true if object is a valid ${className}
 */
export function is${className}(obj: unknown) {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'createdAt' in obj &&
    'updatedAt' in obj
  );
}`)
  builder.addBlankLine()

  // isValid${className}CreateInput type guard
  builder.addRaw(`/**
 * Checks if an object is valid for creation
 *
 * @param obj - Object to check
 * @returns true if object can be used for creation
 */
export function isValid${className}CreateInput(obj: unknown) {
  return typeof obj === 'object' && obj !== null;
}`)
  builder.addBlankLine()

  // isValid${className}UpdateInput type guard
  builder.addRaw(`/**
 * Checks if an object is valid for updates
 *
 * @param obj - Object to check
 * @returns true if object can be used for updates
 */
export function isValid${className}UpdateInput(obj: unknown) {
  return typeof obj === 'object' && (obj === null || Object.keys(obj).length > 0);
}
`)

  return builder.toString()
}
