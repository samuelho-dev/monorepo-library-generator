/**
 * Naming Utilities
 *
 * Provides workspace-agnostic naming convention utilities.
 * Abstracts NX's `names()` function to support non-NX monorepos.
 *
 * This utility converts input names to various casing conventions:
 * - PascalCase (for class names)
 * - camelCase (for properties/variables)
 * - kebab-case (for file names)
 * - SCREAMING_SNAKE_CASE (for constants)
 */

/**
 * Convert string to PascalCase
 *
 * @param input - Input string (any format)
 * @returns PascalCase string
 *
 * @example
 * toPascalCase("user-profile") // "UserProfile"
 * toPascalCase("user_profile") // "UserProfile"
 * toPascalCase("userProfile") // "UserProfile"
 */
function toPascalCase(input: string) {
  return input
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("")
}

/**
 * Convert string to camelCase
 *
 * @param input - Input string (any format)
 * @returns camelCase string
 *
 * @example
 * toCamelCase("user-profile") // "userProfile"
 * toCamelCase("user_profile") // "userProfile"
 * toCamelCase("UserProfile") // "userProfile"
 */
function toCamelCase(input: string) {
  const pascal = toPascalCase(input)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

/**
 * Convert string to kebab-case
 *
 * @param input - Input string (any format)
 * @returns kebab-case string
 *
 * @example
 * toKebabCase("UserProfile") // "user-profile"
 * toKebabCase("userProfile") // "user-profile"
 * toKebabCase("user_profile") // "user-profile"
 */
function toKebabCase(input: string) {
  return (
    input
      // Insert hyphen before uppercase letters
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      // Replace spaces and underscores with hyphens
      .replace(/[\s_]+/g, "-")
      // Convert to lowercase
      .toLowerCase()
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, "")
  )
}

/**
 * Convert string to SCREAMING_SNAKE_CASE
 *
 * @param input - Input string (any format)
 * @returns SCREAMING_SNAKE_CASE string
 *
 * @example
 * toScreamingSnakeCase("user-profile") // "USER_PROFILE"
 * toScreamingSnakeCase("userProfile") // "USER_PROFILE"
 * toScreamingSnakeCase("UserProfile") // "USER_PROFILE"
 */
function toScreamingSnakeCase(input: string) {
  return (
    input
      // Insert underscore before uppercase letters
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      // Replace hyphens and spaces with underscores
      .replace(/[-\s]+/g, "_")
      // Convert to uppercase
      .toUpperCase()
      // Remove leading/trailing underscores
      .replace(/^_+|_+$/g, "")
  )
}

/**
 * Create all naming variants from input string
 *
 * This function replaces NX's `names()` utility with a workspace-agnostic implementation.
 * It generates all common naming conventions used in code generation.
 *
 * @param input - Input name (any format)
 * @returns Object with all naming variants
 *
 * @example
 * ```typescript
 * const variants = createNamingVariants("user-profile");
 * // {
 * //   name: "user-profile",
 * //   className: "UserProfile",
 * //   propertyName: "userProfile",
 * //   fileName: "user-profile",
 * //   constantName: "USER_PROFILE"
 * // }
 * ```
 *
 * @example
 * ```typescript
 * const variants = createNamingVariants("UserProfile");
 * // {
 * //   name: "UserProfile",
 * //   className: "UserProfile",
 * //   propertyName: "userProfile",
 * //   fileName: "user-profile",
 * //   constantName: "USER_PROFILE"
 * // }
 * ```
 */
export function createNamingVariants(input: string) {
  if (!input || input.trim() === "") {
    throw new Error("Input name cannot be empty")
  }

  const trimmedInput = input.trim()

  return {
    name: trimmedInput,
    className: toPascalCase(trimmedInput),
    propertyName: toCamelCase(trimmedInput),
    fileName: toKebabCase(trimmedInput),
    constantName: toScreamingSnakeCase(trimmedInput)
  }
}

/**
 * Compatibility alias for NX's `names()` function
 *
 * This allows for drop-in replacement of NX's names utility.
 *
 * @deprecated Use createNamingVariants instead for clarity
 */
export const names = createNamingVariants
