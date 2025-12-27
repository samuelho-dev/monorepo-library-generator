/**
 * Sub-Module Parsing Utilities
 *
 * Provides utilities for parsing sub-module configurations from comma-separated
 * strings into structured, typed objects with naming variants.
 *
 * @module monorepo-library-generator/utils/sub-modules
 *
 * @example
 * ```typescript
 * import { parseSubModules } from './sub-modules';
 *
 * const modules = parseSubModules('cart,checkout,wishlist')
 * // [
 * //   { name: 'cart', className: 'Cart', propertyName: 'cart', fileName: 'cart' },
 * //   { name: 'checkout', className: 'Checkout', propertyName: 'checkout', fileName: 'checkout' },
 * //   { name: 'wishlist', className: 'Wishlist', propertyName: 'wishlist', fileName: 'wishlist' }
 * // ]
 * ```
 */

import { createNamingVariants } from "./naming"

/**
 * Parsed sub-module with all naming variants
 *
 * Contains the original name plus derived naming conventions
 * for use in code generation templates.
 */
export interface ParsedSubModule {
  /** Original sub-module name */
  readonly name: string

  /** PascalCase name (e.g., "UserCart") */
  readonly className: string

  /** camelCase name (e.g., "userCart") */
  readonly propertyName: string

  /** kebab-case name (e.g., "user-cart") */
  readonly fileName: string

  /** SCREAMING_SNAKE_CASE name (e.g., "USER_CART") */
  readonly constantName: string
}

/**
 * Parse sub-modules from comma-separated string
 *
 * Converts a comma-separated list of sub-module names into an array
 * of structured objects with all naming variants pre-computed.
 *
 * @param input - Comma-separated sub-module names (e.g., "cart,checkout,wishlist")
 * @returns Array of parsed sub-modules with naming variants, empty array if input is undefined/empty
 *
 * @example Basic usage
 * ```typescript
 * const modules = parseSubModules('cart,checkout')
 * // [
 * //   { name: 'cart', className: 'Cart', ... },
 * //   { name: 'checkout', className: 'Checkout', ... }
 * // ]
 * ```
 *
 * @example Handles whitespace
 * ```typescript
 * const modules = parseSubModules(' cart , checkout ')
 * // Same result as above - whitespace is trimmed
 * ```
 *
 * @example Returns empty array for undefined/empty
 * ```typescript
 * parseSubModules(undefined) // []
 * parseSubModules('')        // []
 * parseSubModules('  ')      // []
 * ```
 */
export function parseSubModules(input?: string) {
  if (!input || input.trim() === "") {
    return []
  }

  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => {
      const variants = createNamingVariants(name)
      return {
        name,
        className: variants.className,
        propertyName: variants.propertyName,
        fileName: variants.fileName,
        constantName: variants.constantName
      }
    })
}

/**
 * Check if sub-modules are configured
 *
 * @param input - Comma-separated sub-module names or undefined
 * @returns true if at least one sub-module is defined
 *
 * @example
 * ```typescript
 * hasSubModules('cart,checkout') // true
 * hasSubModules('cart')          // true
 * hasSubModules('')              // false
 * hasSubModules(undefined)       // false
 * ```
 */
export function hasSubModules(input?: string) {
  return parseSubModules(input).length > 0
}

/**
 * Get sub-module names as array of strings
 *
 * Simple utility when you only need the names without naming variants.
 *
 * @param input - Comma-separated sub-module names
 * @returns Array of trimmed sub-module name strings
 *
 * @example
 * ```typescript
 * getSubModuleNames('cart, checkout, wishlist')
 * // ['cart', 'checkout', 'wishlist']
 * ```
 */
export function getSubModuleNames(input?: string) {
  return parseSubModules(input).map((m) => m.name)
}
