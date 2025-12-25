/**
 * User Validation Schemas
 *
 * Input validation using schema validators.
Validates data before repository operations to ensure domain constraints.

@see https://zod.dev for Zod schema validation
 *
 * @module @samuelho-dev/data-access-user/server
 */

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates User Creation Input
 *
 * @param input - Unvalidated input data
 * @returns Validated input data
 * @throws ValidationError if input doesn't meet schema requirements
 */
export function validateUserCreateInput(input: unknown) {
  if (typeof input !== "object" || input === null) {
    throw new Error("Invalid User create input: must be an object")
  }
  // TODO: Implement full schema validation (e.g., with Zod or Effect Schema)
  return input
}

/**
 * Validates User Update Input
 *
 * @param input - Unvalidated update data
 * @returns Validated update data
 * @throws ValidationError if input doesn't meet schema requirements
 */
export function validateUserUpdateInput(input: unknown) {
  if (typeof input !== "object" || input === null) {
    throw new Error("Invalid User update input: must be an object")
  }
  // TODO: Implement full schema validation (e.g., with Zod or Effect Schema)
  return input
}

/**
 * Validates User Filters
 *
 * @param input - Unvalidated filter data
 * @returns Validated filter data
 * @throws ValidationError if filters don't meet requirements
 */
export function validateUserFilter(input: unknown) {
  if (typeof input !== "object" || input === null) {
    throw new Error("Invalid User filter: must be an object")
  }
  // TODO: Implement full schema validation (e.g., with Zod or Effect Schema)
  return input
}

/**
 * Validates a single User ID
 *
 * @param id - Unvalidated ID
 * @returns Validated ID
 * @throws ValidationError if ID format is invalid
 */
export function validateUserId(id: unknown) {
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("Invalid User ID: must be non-empty string")
  }
  return id
}

/**
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
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Checks if an object is a valid User entity
 *
 * @param obj - Object to check
 * @returns true if object is a valid User
 */
export function isUser(obj: unknown) {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "createdAt" in obj &&
    "updatedAt" in obj
  )
}

/**
 * Checks if an object is valid for creation
 *
 * @param obj - Object to check
 * @returns true if object can be used for creation
 */
export function isValidUserCreateInput(obj: unknown) {
  return typeof obj === "object" && obj !== null
}

/**
 * Checks if an object is valid for updates
 *
 * @param obj - Object to check
 * @returns true if object can be used for updates
 */
export function isValidUserUpdateInput(obj: unknown) {
  return typeof obj === "object" && (obj === null || Object.keys(obj).length > 0)
}
