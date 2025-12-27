/**
 * Template Resolver
 *
 * Handles variable interpolation in template strings.
 * Supports {variableName} syntax for substitution.
 *
 * @module monorepo-library-generator/templates/core/resolver
 */

import { Data, Effect, Option } from 'effect'
import type { TemplateContext } from './types'

// ============================================================================
// Error Types
// ============================================================================

/**
 * Interpolation Error
 *
 * Thrown when a variable cannot be resolved.
 */
export class InterpolationError extends Data.TaggedError('InterpolationError')<{
  readonly variable: string
  readonly message: string
}> {}

// ============================================================================
// Interpolation Functions
// ============================================================================

/**
 * Variable pattern for interpolation
 *
 * Matches {variableName} patterns in strings.
 * Uses negative lookbehind (?<!\$) to skip JavaScript template literals like ${variable}.
 * Supports nested paths like {options.name} for future extension.
 */
const VARIABLE_PATTERN = /(?<!\$)\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g

/**
 * Interpolate variables in a string
 *
 * Replaces {variableName} patterns with values from context.
 *
 * @param template - String with {variable} placeholders
 * @param context - Template context with variable values
 * @returns Effect with interpolated string or InterpolationError
 *
 * @example
 * ```typescript
 * const result = interpolate("{className}Repository", { className: "User" })
 * // Returns Effect.succeed("UserRepository")
 * ```
 */
export function interpolate(template: string, context: TemplateContext) {
  return Effect.gen(function* () {
    const errors: Array<string> = []

    const result = template.replace(VARIABLE_PATTERN, (match, variable: string) => {
      const value = resolveVariable(variable, context)
      if (Option.isNone(value)) {
        errors.push(variable)
        return match // Keep original placeholder if not found
      }
      return String(value.value)
    })

    if (errors.length > 0) {
      return yield* Effect.fail(
        new InterpolationError({
          variable: errors[0],
          message: `Unknown variable(s): ${errors.join(', ')}`
        })
      )
    }

    return result
  })
}

/**
 * Interpolate variables in a string (sync version)
 *
 * Non-Effect version for use in synchronous contexts.
 * Throws on missing variables.
 *
 * @param template - String with {variable} placeholders
 * @param context - Template context with variable values
 * @returns Interpolated string
 * @throws Error if variable is not found
 */
export function interpolateSync(template: string, context: TemplateContext) {
  return template.replace(VARIABLE_PATTERN, (match, variable: string) => {
    const value = resolveVariable(variable, context)
    if (Option.isNone(value)) {
      throw new Error(`Unknown variable: ${variable}`)
    }
    return String(value.value)
  })
}

/**
 * Check if a string contains interpolation placeholders
 *
 * @param template - String to check
 * @returns true if string contains {variable} patterns (but not ${variable} JS template literals)
 */
export function hasInterpolation(template: string) {
  // Create fresh regex to avoid stateful global regex issues
  // Use negative lookbehind to skip ${...} JavaScript template literals
  const pattern = /(?<!\$)\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/
  return pattern.test(template)
}

/**
 * Extract all variable names from a template string
 *
 * @param template - String with {variable} placeholders
 * @returns Array of variable names
 */
export function extractVariables(template: string) {
  const variables: Array<string> = []

  // Reset lastIndex for global regex
  VARIABLE_PATTERN.lastIndex = 0

  let match = VARIABLE_PATTERN.exec(template)
  while (match !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1])
    }
    match = VARIABLE_PATTERN.exec(template)
  }

  return variables
}

/**
 * Resolve a variable from context
 *
 * Supports nested paths like "options.name" via dot notation.
 *
 * @param variable - Variable name (may include dots for nesting)
 * @param context - Template context
 * @returns Option with value or None if not found
 */
function resolveVariable(variable: string, context: TemplateContext) {
  // Handle nested paths
  const parts = variable.split('.')
  let current: unknown = context

  for (const part of parts) {
    if (current === null || current === undefined) {
      return Option.none()
    }

    if (typeof current === 'object' && part in current) {
      const obj: Record<string, unknown> = current
      current = obj[part]
    } else {
      return Option.none()
    }
  }

  // Check for undefined/null values
  if (current === undefined || current === null) {
    return Option.none()
  }

  return Option.some(current)
}

/**
 * Interpolate all strings in an object recursively (internal implementation)
 *
 * Returns unknown - callers should use type-specific wrappers.
 */
function interpolateDeepInternal(
  value: unknown,
  context: TemplateContext
): Effect.Effect<unknown, InterpolationError> {
  return Effect.gen(function* () {
    if (typeof value === 'string') {
      return yield* interpolate(value, context)
    }

    if (Array.isArray(value)) {
      const results: Array<unknown> = []
      for (const item of value) {
        results.push(yield* interpolateDeepInternal(item, context))
      }
      return results
    }

    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(value)) {
        result[key] = yield* interpolateDeepInternal(val, context)
      }
      return result
    }

    return value
  })
}

/**
 * Interpolate all strings in an object recursively
 *
 * Walks through objects and arrays, interpolating any string values.
 * The generic type T is preserved through the transformation - callers
 * provide the expected type and receive it back after interpolation.
 *
 * @param value - Value to interpolate (object, array, or string)
 * @param context - Template context
 * @returns Effect with interpolated value matching the input type structure
 */
export function interpolateDeep<T>(
  value: T,
  context: TemplateContext
): Effect.Effect<T, InterpolationError> {
  // Type assertion is safe: interpolateDeepInternal preserves structure
  // The internal function returns unknown, but the structure matches T
  return interpolateDeepInternal(value, context) as Effect.Effect<T, InterpolationError>
}

/**
 * Create a context from naming variants
 *
 * Helper to create a basic context from a name.
 *
 * @param name - Base name
 * @param options - Additional context options
 * @returns Template context with naming variants
 */
export function createContextFromName(name: string, options: Partial<TemplateContext> = {}) {
  // Simple naming transformations (real implementation uses createNamingVariants)
  const className = toPascalCase(name)
  const fileName = toKebabCase(name)
  const propertyName = toCamelCase(name)
  const constantName = toUpperSnakeCase(name)

  return {
    className,
    fileName,
    propertyName,
    constantName,
    scope: options.scope ?? '@app',
    packageName: options.packageName ?? `@app/${fileName}`,
    projectName: options.projectName ?? fileName,
    libraryType: options.libraryType ?? 'library',
    ...options
  }
}

// ============================================================================
// Naming Helpers (simplified versions)
// ============================================================================

function toPascalCase(str: string) {
  return str
    .split(/[-_\s]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

function toCamelCase(str: string) {
  const pascal = toPascalCase(str)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

function toKebabCase(str: string) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

function toUpperSnakeCase(str: string) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toUpperCase()
}
