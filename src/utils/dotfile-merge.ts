/**
 * Dotfile Merging for Effect.ts Code Quality Enforcement
 *
 * This module provides pure merge functions for combining user dotfiles
 * with Effect.ts templates. All merge strategies ensure Effect.ts rules
 * take precedence over user configurations.
 *
 * Design Principles:
 * - Pure functions for core merge logic (easy testing)
 * - Effect.ts wrapper functions for integration
 * - File type-specific merge strategies
 * - Comment stripping by default
 * - Effect.ts rules ALWAYS override user configs
 *
 * @module utils/dotfile-merge
 */

import { Data, Effect, Either } from "effect"
import type { DotfileName } from "./dotfiles"

// ==========================================
// JSON Type Definitions
// ==========================================

type JsonPrimitive = string | number | boolean | null
type JsonArray = ReadonlyArray<JsonValue>
type JsonObject = { readonly [key: string]: JsonValue }
type JsonValue = JsonPrimitive | JsonArray | JsonObject

// ==========================================
// Error Types
// ==========================================

export class DotfileMergeError extends Data.TaggedError("DotfileMergeError")<{
  readonly message: string
  readonly dotfileName: string
  readonly cause?: unknown
}> {}

export class DotfileParseError extends Data.TaggedError("DotfileParseError")<{
  readonly message: string
  readonly dotfileName: string
  readonly content: string
  readonly cause?: unknown
}> {}

export type MergeErrors = DotfileMergeError | DotfileParseError

// ==========================================
// Core Types
// ==========================================

/**
 * Merge strategy for each dotfile type
 */
export type MergeStrategy =
  | "override" // Effect.ts template completely replaces user config
  | "append" // Append Effect.ts config to user config (ESLint)
  | "deep-merge" // Deep merge with Effect.ts taking precedence (JSON)

/**
 * Result of a merge operation
 */
export interface MergeResult {
  readonly merged: string
  readonly strategy: MergeStrategy
  readonly hadExisting: boolean
  readonly effectRulesApplied: number // How many Effect.ts rules were applied
}

// ==========================================
// Pure Merge Functions (Easily Testable)
// ==========================================

/**
 * Strip comments from JSON content
 * Handles both single-line (//) and multi-line (/* *\/) comments
 *
 * @pure
 * @param content - JSON string with comments (JSONC)
 * @returns JSON string without comments
 */
export const stripJsonComments = (content: string) => {
  // For JSON files (tsconfig.json, .vscode/*.json), we need to be careful
  // not to strip glob patterns like "src/**/*" which contain /* and */
  //
  // Strategy: Only strip comments that appear outside of quoted strings
  // This is a simplified approach - for production use, consider a proper JSON parser

  let result = ""
  let inString = false
  let escapeNext = false
  let i = 0

  while (i < content.length) {
    const char = content[i]
    const nextChar = content[i + 1]

    // Handle escape sequences in strings
    if (escapeNext) {
      result += char
      escapeNext = false
      i++
      continue
    }

    // Track string boundaries
    if (char === "\"" && !escapeNext) {
      inString = !inString
      result += char
      i++
      continue
    }

    // Track escape character
    if (char === "\\" && inString) {
      escapeNext = true
      result += char
      i++
      continue
    }

    // Skip comments only if outside strings
    if (!inString) {
      // Single-line comment
      if (char === "/" && nextChar === "/") {
        // Skip until end of line
        while (i < content.length && content[i] !== "\n") {
          i++
        }
        continue
      }

      // Multi-line comment
      if (char === "/" && nextChar === "*") {
        // Skip until */
        i += 2
        while (i < content.length - 1) {
          if (content[i] === "*" && content[i + 1] === "/") {
            i += 2
            break
          }
          i++
        }
        continue
      }
    }

    // Normal character
    result += char
    i++
  }

  return result
}

/**
 * Parse JSON safely with Either for error handling
 *
 * @pure
 * @param content - JSON string to parse
 * @returns Either with error message or parsed object
 */
export const parseJsonSafe = (content: string) => {
  try {
    const parsed = JSON.parse(content)
    return Either.right(parsed)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Either.left(message)
  }
}

/**
 * Deep merge two JSON objects
 * Effect.ts config (right) takes precedence over user config (left)
 *
 * Based on TypeScript's tsconfig.json extends behavior:
 * - Object properties: Deep merge with Effect.ts winning conflicts
 * - Arrays: Effect.ts completely replaces user arrays (per TypeScript spec)
 *
 * @pure
 * @param user - User's configuration object
 * @param effect - Effect.ts configuration object
 * @returns Merged configuration with Effect.ts taking precedence
 */
export const deepMergeJson = (user: JsonValue, effect: JsonValue): JsonValue => {
  // Primitives and null: Effect.ts wins
  if (typeof effect !== "object" || effect === null) {
    return effect
  }

  // Arrays: Effect.ts replaces completely (matches TypeScript behavior)
  if (Array.isArray(effect)) {
    return effect
  }

  // Type guard for JsonObject
  const isJsonObject = (val: JsonValue): val is JsonObject => {
    return typeof val === "object" && val !== null && !Array.isArray(val)
  }

  // Effect must be an object at this point (arrays returned above)
  if (!isJsonObject(effect)) {
    return effect
  }

  // Objects: Deep merge
  // If user is not an object, start with empty object
  const userObj = isJsonObject(user) ? user : {}
  const result: Record<string, JsonValue> = { ...userObj }

  for (const key in effect) {
    if (Object.prototype.hasOwnProperty.call(effect, key)) {
      const effectValue = effect[key]
      const userValue = userObj[key]

      if (effectValue !== undefined && userValue !== undefined && isJsonObject(effectValue) && isJsonObject(userValue)) {
        // Recursively merge nested objects
        result[key] = deepMergeJson(userValue, effectValue)
      } else if (effectValue !== undefined) {
        // Effect.ts value wins (primitives, arrays, null)
        result[key] = effectValue
      }
    }
  }

  return result
}

/**
 * Get merge strategy for a specific dotfile type
 *
 * @param dotfileName - Name of the dotfile
 * @returns Merge strategy to use
 */
export const getMergeStrategy = (dotfileName: DotfileName) => {
  switch (dotfileName) {
    case "eslint.config.mjs":
      return "append"
    case ".editorconfig":
      return "override"
    case "tsconfig.json":
    case ".vscode/settings.json":
      return "deep-merge"
    case ".vscode/extensions.json":
      return "deep-merge" // Special case: array union for recommendations
    default:
      return "override"
  }
}

/**
 * Count number of Effect.ts-specific rules/settings in content
 * Simple heuristic: count lines that aren't empty or comments
 *
 * @param content - File content to analyze
 * @returns Approximate number of rules/settings
 */
export const countEffectRules = (content: string) => {
  const lines = content.split("\n")
  const nonEmptyLines = lines.filter((line) => {
    const trimmed = line.trim()
    return trimmed.length > 0 && !trimmed.startsWith("//") && !trimmed.startsWith("*")
  })
  return Math.max(1, Math.floor(nonEmptyLines.length / 5)) // Rough estimate
}

// ==========================================
// File Type-Specific Merge Functions
// ==========================================

/**
 * Merge JSON configuration files (tsconfig.json, .vscode/settings.json)
 *
 * Strategy: Deep merge with Effect.ts config taking precedence
 *
 * @param userContent - JSON string from user's existing file
 * @param effectContent - JSON string from Effect.ts template
 * @returns Either with merged JSON string or error message
 */
export const mergeJsonConfig = (
  userContent: string,
  effectContent: string
) => {
  // Strip comments from both
  const userClean = stripJsonComments(userContent)
  const effectClean = stripJsonComments(effectContent)

  // Parse both
  const userParsed = parseJsonSafe(userClean)
  const effectParsed = parseJsonSafe(effectClean)

  // Handle parse errors
  if (Either.isLeft(userParsed)) {
    return Either.left(`Failed to parse user config: ${userParsed.left}`)
  }
  if (Either.isLeft(effectParsed)) {
    return Either.left(`Failed to parse Effect.ts template: ${effectParsed.left}`)
  }

  // Deep merge (Effect.ts wins conflicts)
  const merged = deepMergeJson(userParsed.right, effectParsed.right)

  // Stringify with consistent formatting
  return Either.right(JSON.stringify(merged, null, 2) + "\n")
}

/**
 * Merge VSCode extensions files
 *
 * Strategy: Union of recommendations arrays (no duplicates)
 *
 * @param userContent - JSON string from user's extensions.json
 * @param effectContent - JSON string from Effect.ts template
 * @returns Either with merged JSON string or error message
 */
export const mergeVscodeExtensions = (
  userContent: string,
  effectContent: string
) => {
  // Strip comments and parse
  const userClean = stripJsonComments(userContent)
  const effectClean = stripJsonComments(effectContent)

  const userParsed = parseJsonSafe(userClean)
  const effectParsed = parseJsonSafe(effectClean)

  if (Either.isLeft(userParsed)) {
    return Either.left(`Failed to parse user extensions: ${userParsed.left}`)
  }
  if (Either.isLeft(effectParsed)) {
    return Either.left(`Failed to parse Effect.ts extensions: ${effectParsed.left}`)
  }

  // Extract recommendations arrays
  const userObj = userParsed.right
  const effectObj = effectParsed.right

  const userRecs: Array<string> = Array.isArray(userObj?.recommendations)
    ? userObj.recommendations
    : []
  const effectRecs: Array<string> = Array.isArray(effectObj?.recommendations)
    ? effectObj.recommendations
    : []

  // Union (deduplicate)
  const merged = Array.from(new Set([...userRecs, ...effectRecs]))

  // Reconstruct JSON
  return Either.right(JSON.stringify({ recommendations: merged }, null, 2) + "\n")
}

/**
 * Merge ESLint configuration files
 *
 * Strategy: Append Effect.ts config to user's config array
 *
 * Simple implementation: If Effect.ts marker found, use template.
 * Otherwise, extract and combine export arrays.
 *
 * @param userContent - JavaScript string from user's eslint.config.mjs
 * @param effectContent - JavaScript string from Effect.ts template
 * @returns Either with merged ESLint config or error message
 */
export const mergeEslintConfig = (
  userContent: string,
  effectContent: string
) => {
  // Check if Effect.ts config already present
  if (
    userContent.includes("@effect/eslint-plugin") ||
    userContent.includes("Effect.ts code style")
  ) {
    // Already merged, use Effect.ts template
    return Either.right(effectContent)
  }

  // Simple append: Add Effect.ts config as comment-marked section
  // More sophisticated merging would require AST parsing
  const separator = "\n\n// ========================================\n" +
    "// Effect.ts Code Quality Rules (auto-added)\n" +
    "// ========================================\n\n"

  // Extract imports from Effect.ts template
  const effectImports = effectContent
    .split("\n")
    .filter((line) => line.trim().startsWith("import "))
    .join("\n")

  // Extract config from Effect.ts template (everything after imports)
  const effectConfig = effectContent
    .split("\n")
    .filter((line) => !line.trim().startsWith("import "))
    .join("\n")
    .trim()

  // Combine: user imports + Effect.ts imports + user config + Effect.ts config
  const userImports = userContent
    .split("\n")
    .filter((line) => line.trim().startsWith("import "))
    .join("\n")

  const userConfig = userContent
    .split("\n")
    .filter((line) => !line.trim().startsWith("import "))
    .join("\n")
    .trim()

  // If user config ends with export, we need to merge arrays
  // For now, simple append with marker
  const merged = `${userImports}\n${effectImports}\n\n${userConfig}${separator}${effectConfig}`

  return Either.right(merged)
}

// ==========================================
// Effect-based Integration Functions
// ==========================================

/**
 * Merge dotfile with Effect.ts template
 *
 * Effect-wrapped version of merge dispatch for integration
 * with existing dotfiles.ts functions.
 *
 * @param dotfileName - Name of the dotfile to merge
 * @param userContent - Content from user's existing file
 * @param effectContent - Content from Effect.ts template
 * @returns Effect with merge result or error
 */
export const mergeDotfileContent = (
  dotfileName: DotfileName,
  userContent: string,
  effectContent: string
) =>
  Effect.gen(function*() {
    const strategy = getMergeStrategy(dotfileName)

    let mergeResult

    switch (strategy) {
      case "deep-merge":
        if (dotfileName === ".vscode/extensions.json") {
          mergeResult = mergeVscodeExtensions(userContent, effectContent)
        } else {
          mergeResult = mergeJsonConfig(userContent, effectContent)
        }
        break

      case "append":
        mergeResult = mergeEslintConfig(userContent, effectContent)
        break

      case "override":
        mergeResult = Either.right(effectContent)
        break
    }

    if (Either.isLeft(mergeResult)) {
      return yield* Effect.fail(
        new DotfileParseError({
          message: mergeResult.left,
          dotfileName,
          content: userContent.substring(0, 200) // First 200 chars for debugging
        })
      )
    }

    return {
      merged: mergeResult.right,
      strategy,
      hadExisting: true,
      effectRulesApplied: countEffectRules(effectContent)
    }
  })
