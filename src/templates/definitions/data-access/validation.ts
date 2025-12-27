/**
 * Data Access Validation Template Definition
 *
 * Declarative template for generating validation.ts in data-access libraries.
 * Contains input validation functions and type guards.
 *
 * @module monorepo-library-generator/templates/definitions/data-access/validation
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Data Access Validation Template Definition
 *
 * Generates a complete validation.ts file with:
 * - Input validation for create/update operations
 * - Filter validation
 * - ID validation
 * - Pagination validation
 * - Type guards
 */
export const dataAccessValidationTemplate: TemplateDefinition = {
  id: "data-access/validation",
  meta: {
    title: "{className} Validation Schemas",
    description: `Input validation using schema validators.
Validates data before repository operations to ensure domain constraints.

@see https://zod.dev for Zod schema validation`,
    module: "{scope}/data-access-{fileName}/server"
  },
  imports: [],
  sections: [
    // Validation Helpers
    {
      title: "Validation Helpers",
      content: {
        type: "raw",
        value: `/**
 * Validates {className} Creation Input
 *
 * @param input - Unvalidated input data
 * @returns Validated input data
 * @throws ValidationError if input doesn't meet schema requirements
 */
export function validate{className}CreateInput(input: unknown) {
  if (typeof input !== "object" || input === null) {
    throw new Error("Invalid {className} create input: must be an object")
  }
  // TODO: Implement full schema validation (e.g., with Zod or Effect Schema)
  return input
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Validates {className} Update Input
 *
 * @param input - Unvalidated update data
 * @returns Validated update data
 * @throws ValidationError if input doesn't meet schema requirements
 */
export function validate{className}UpdateInput(input: unknown) {
  if (typeof input !== "object" || input === null) {
    throw new Error("Invalid {className} update input: must be an object")
  }
  // TODO: Implement full schema validation (e.g., with Zod or Effect Schema)
  return input
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Validates {className} Filters
 *
 * @param input - Unvalidated filter data
 * @returns Validated filter data
 * @throws ValidationError if filters don't meet requirements
 */
export function validate{className}Filter(input: unknown) {
  if (typeof input !== "object" || input === null) {
    throw new Error("Invalid {className} filter: must be an object")
  }
  // TODO: Implement full schema validation (e.g., with Zod or Effect Schema)
  return input
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Validates a single {className} ID
 *
 * @param id - Unvalidated ID
 * @returns Validated ID
 * @throws ValidationError if ID format is invalid
 */
export function validate{className}Id(id: unknown) {
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("Invalid {className} ID: must be non-empty string")
  }
  return id
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Validates pagination parameters
 *
 * Ensures skip and limit are non-negative integers within reasonable bounds.
 *
 * @param skip - Number of items to skip
 * @param limit - Maximum number of items to return
 * @returns Validated skip/limit values
 * @throws ValidationError if parameters are invalid
 */
export function validatePagination(skip: unknown, limit: unknown) {
  const skipNum = typeof skip === "number" ? skip : 0
  const limitNum = typeof limit === "number" ? limit : 20

  if (skipNum < 0) throw new Error("skip must be >= 0")
  if (limitNum < 1) throw new Error("limit must be >= 1")
  if (limitNum > 1000) throw new Error("limit must be <= 1000")

  return { skip: skipNum, limit: limitNum }
}`
      }
    },
    // Validation Utilities
    {
      title: "Validation Utilities",
      content: {
        type: "raw",
        value: `/**
 * Checks if an object is a valid {className} entity
 *
 * @param obj - Object to check
 * @returns true if object is a valid {className}
 */
export function is{className}(obj: unknown) {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "createdAt" in obj &&
    "updatedAt" in obj
  )
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Checks if an object is valid for creation
 *
 * @param obj - Object to check
 * @returns true if object can be used for creation
 */
export function isValid{className}CreateInput(obj: unknown) {
  return typeof obj === "object" && obj !== null
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * Checks if an object is valid for updates
 *
 * @param obj - Object to check
 * @returns true if object can be used for updates
 */
export function isValid{className}UpdateInput(obj: unknown) {
  return typeof obj === "object" && (obj === null || Object.keys(obj).length > 0)
}`
      }
    }
  ]
}

export default dataAccessValidationTemplate
