/**
 * Code Validation
 *
 * Pattern-based validation for generated code.
 * Enforces Effect-TS patterns and quality gates.
 *
 * @module monorepo-library-generator/infrastructure/code-validation
 */

import { Data, Effect } from 'effect'

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error thrown when code validation fails
 */
export class CodeValidationError extends Data.TaggedError('CodeValidationError')<{
  readonly message: string
  readonly violations: ReadonlyArray<CodeViolation>
}> {}

/**
 * A single code validation violation
 */
export interface CodeViolation {
  readonly rule: string
  readonly severity: 'error' | 'warning' | 'info'
  readonly message: string
  readonly location?: {
    readonly line?: number
    readonly column?: number
    readonly file?: string
  }
  readonly suggestion?: string
}

// ============================================================================
// Validation Rules
// ============================================================================

/**
 * Validation rule definition
 */
export interface CodeValidationRule {
  readonly id: string
  readonly description: string
  readonly severity: 'error' | 'warning' | 'info'
  readonly pattern: RegExp
  readonly validate: (content: string, matches: Array<RegExpMatchArray>) => Array<CodeViolation>
}

/**
 * Effect-TS yield* enforcement rule
 *
 * Ensures Effect.gen blocks use yield* instead of yield
 */
export const yieldStarRequiredRule: CodeValidationRule = {
  id: 'effect/yield-star-required',
  description: 'Ensures Effects are properly unwrapped with yield* in Effect.gen blocks',
  severity: 'error',
  pattern: /Effect\.gen\(function\*\s*\(\)\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g,
  validate: (content, matches) => {
    const violations: Array<CodeViolation> = []

    for (const match of matches) {
      const body = match[1] ?? ''
      // Look for 'yield' not followed by '*'
      const badYields = body.match(/\byield\s+(?!\*)/g)

      if (badYields) {
        violations.push({
          rule: 'effect/yield-star-required',
          severity: 'error',
          message: `Found ${badYields.length} yield without * in Effect.gen. Use yield* for Effects.`,
          suggestion: "Replace 'yield someEffect' with 'yield* someEffect'"
        })
      }
    }

    return violations
  }
}

/**
 * Tagged error readonly fields rule
 *
 * Ensures Data.TaggedError fields are marked readonly
 */
export const taggedErrorReadonlyRule: CodeValidationRule = {
  id: 'effect/tagged-error-readonly',
  description: 'Ensures Data.TaggedError fields are marked readonly',
  severity: 'warning',
  pattern: /class\s+\w+\s+extends\s+Data\.TaggedError\([^)]+\)<\{([^}]+)\}>/g,
  validate: (content, matches) => {
    const violations: Array<CodeViolation> = []

    for (const match of matches) {
      const fields = match[1] ?? ''
      // Split by semicolon or newline and check each field
      const fieldDefs = fields.split(/[;\n]/).filter((f) => f.trim())

      for (const field of fieldDefs) {
        if (field.trim() && !field.includes('readonly')) {
          violations.push({
            rule: 'effect/tagged-error-readonly',
            severity: 'warning',
            message: `Field "${field.trim()}" should be marked readonly`,
            suggestion: `Change to: readonly ${field.trim()}`
          })
        }
      }
    }

    return violations
  }
}

/**
 * Context.Tag layer order rule
 *
 * Ensures static layers follow convention: Live, Test, Dev, Auto
 */
export const layerOrderRule: CodeValidationRule = {
  id: 'effect/layer-order',
  description: 'Ensures Context.Tag static layers follow convention order',
  severity: 'info',
  pattern:
    /class\s+\w+\s+extends\s+Context\.Tag\([^)]+\)<[^>]+>\(\)\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g,
  validate: (content, matches) => {
    const violations: Array<CodeViolation> = []
    const expectedOrder = ['Live', 'Test', 'Dev', 'Auto']

    for (const match of matches) {
      const body = match[1] ?? ''
      const staticDefs = Array.from(body.matchAll(/static\s+(\w+)\s*=/g))
        .map((m) => m[1])
        .filter((name) => expectedOrder.includes(name ?? ''))

      if (staticDefs.length > 1) {
        let lastIndex = -1
        for (const def of staticDefs) {
          const currentIndex = expectedOrder.indexOf(def ?? '')
          if (currentIndex < lastIndex) {
            violations.push({
              rule: 'effect/layer-order',
              severity: 'info',
              message: `Static layers should follow order: ${expectedOrder.join(' > ')}`,
              suggestion: 'Reorder static layer definitions'
            })
            break
          }
          lastIndex = currentIndex
        }
      }
    }

    return violations
  }
}

/**
 * Effect import rule
 *
 * Ensures Effect is imported when using Effect constructs
 */
export const effectImportRule: CodeValidationRule = {
  id: 'effect/import-required',
  description: 'Ensures Effect is imported when using Effect constructs',
  severity: 'error',
  pattern: /\bEffect\.(gen|succeed|fail|map|flatMap|tap|withSpan|catchAll|retry|all)\b/g,
  validate: (content, matches) => {
    const violations: Array<CodeViolation> = []

    if (matches.length > 0) {
      const hasEffectImport = /import\s+.*\{[^}]*Effect[^}]*\}\s+from\s+["']effect["']/.test(
        content
      )
      if (!hasEffectImport) {
        violations.push({
          rule: 'effect/import-required',
          severity: 'error',
          message: 'Using Effect methods but Effect is not imported',
          suggestion: 'Add: import { Effect } from "effect"'
        })
      }
    }

    return violations
  }
}

/**
 * Data import rule
 *
 * Ensures Data is imported when using Data.TaggedError
 */
export const dataImportRule: CodeValidationRule = {
  id: 'effect/data-import-required',
  description: 'Ensures Data is imported when using Data.TaggedError',
  severity: 'error',
  pattern: /\bData\.TaggedError\b/g,
  validate: (content, matches) => {
    const violations: Array<CodeViolation> = []

    if (matches.length > 0) {
      const hasDataImport = /import\s+.*\{[^}]*Data[^}]*\}\s+from\s+["']effect["']/.test(content)
      if (!hasDataImport) {
        violations.push({
          rule: 'effect/data-import-required',
          severity: 'error',
          message: 'Using Data.TaggedError but Data is not imported',
          suggestion: 'Add: import { Data } from "effect"'
        })
      }
    }

    return violations
  }
}

/**
 * Context import rule
 *
 * Ensures Context is imported when using Context.Tag
 */
export const contextImportRule: CodeValidationRule = {
  id: 'effect/context-import-required',
  description: 'Ensures Context is imported when using Context.Tag',
  severity: 'error',
  pattern: /\bContext\.Tag\b/g,
  validate: (content, matches) => {
    const violations: Array<CodeViolation> = []

    if (matches.length > 0) {
      const hasContextImport = /import\s+.*\{[^}]*Context[^}]*\}\s+from\s+["']effect["']/.test(
        content
      )
      if (!hasContextImport) {
        violations.push({
          rule: 'effect/context-import-required',
          severity: 'error',
          message: 'Using Context.Tag but Context is not imported',
          suggestion: 'Add: import { Context } from "effect"'
        })
      }
    }

    return violations
  }
}

/**
 * Schema import rule
 *
 * Ensures Schema is imported when using Schema constructs
 */
export const schemaImportRule: CodeValidationRule = {
  id: 'effect/schema-import-required',
  description: 'Ensures Schema is imported when using Schema constructs',
  severity: 'error',
  pattern: /\bSchema\.(Struct|String|Number|Boolean|Array|Union|Class)\b/g,
  validate: (content, matches) => {
    const violations: Array<CodeViolation> = []

    if (matches.length > 0) {
      const hasSchemaImport =
        /import\s+.*\{[^}]*Schema[^}]*\}\s+from\s+["']effect["']/.test(content) ||
        /import\s+.*Schema\s+from\s+["']@effect\/schema["']/.test(content)
      if (!hasSchemaImport) {
        violations.push({
          rule: 'effect/schema-import-required',
          severity: 'error',
          message: 'Using Schema but Schema is not imported',
          suggestion: 'Add: import { Schema } from "effect"'
        })
      }
    }

    return violations
  }
}

/**
 * Consistent class naming rule
 *
 * Ensures class names follow PascalCase convention
 */
export const classNamingRule: CodeValidationRule = {
  id: 'naming/class-pascal-case',
  description: 'Ensures class names follow PascalCase convention',
  severity: 'warning',
  pattern: /\bclass\s+([a-z_][a-zA-Z0-9_]*)/g,
  validate: (content, matches) => {
    const violations: Array<CodeViolation> = []

    for (const match of matches) {
      const className = match[1]
      if (className && /^[a-z]/.test(className)) {
        violations.push({
          rule: 'naming/class-pascal-case',
          severity: 'warning',
          message: `Class name "${className}" should be PascalCase`,
          suggestion: `Change to: ${className.charAt(0).toUpperCase()}${className.slice(1)}`
        })
      }
    }

    return violations
  }
}

// ============================================================================
// Validation Engine
// ============================================================================

/**
 * Default validation rules
 */
export const defaultCodeRules: ReadonlyArray<CodeValidationRule> = [
  yieldStarRequiredRule,
  taggedErrorReadonlyRule,
  layerOrderRule,
  effectImportRule,
  dataImportRule,
  contextImportRule,
  schemaImportRule,
  classNamingRule
]

/**
 * Validation result
 */
export interface CodeValidationResult {
  readonly valid: boolean
  readonly violations: ReadonlyArray<CodeViolation>
  readonly errorCount: number
  readonly warningCount: number
  readonly infoCount: number
}

/**
 * Validate generated code against rules
 */
export function validateGeneratedCode(
  content: string,
  rules: ReadonlyArray<CodeValidationRule> = defaultCodeRules
) {
  return Effect.sync(() => {
    const violations: Array<CodeViolation> = []

    for (const rule of rules) {
      const matches = Array.from(content.matchAll(rule.pattern))
      if (matches.length > 0) {
        const ruleViolations = rule.validate(content, matches)
        for (const violation of ruleViolations) {
          violations.push(violation)
        }
      }
    }

    const errorCount = violations.filter((v) => v.severity === 'error').length
    const warningCount = violations.filter((v) => v.severity === 'warning').length
    const infoCount = violations.filter((v) => v.severity === 'info').length

    return {
      valid: errorCount === 0,
      violations,
      errorCount,
      warningCount,
      infoCount
    }
  }).pipe(Effect.withSpan('validation.generated-code'))
}

/**
 * Validate multiple files
 */
export function validateGeneratedFiles(
  files: ReadonlyArray<{ path: string; content: string }>,
  rules: ReadonlyArray<CodeValidationRule> = defaultCodeRules
) {
  return Effect.gen(function* () {
    const results = new Map<string, CodeValidationResult>()

    for (const file of files) {
      const result = yield* validateGeneratedCode(file.content, rules)
      results.set(file.path, result)
    }

    return results
  }).pipe(
    Effect.withSpan('validation.generated-files', {
      attributes: { 'validation.file_count': files.length }
    })
  )
}

/**
 * Create a custom validation rule
 */
export function createCodeRule(config: {
  id: string
  description: string
  severity?: 'error' | 'warning' | 'info'
  pattern: RegExp
  validate: (content: string, matches: Array<RegExpMatchArray>) => Array<CodeViolation>
}) {
  return {
    id: config.id,
    description: config.description,
    severity: config.severity ?? 'warning',
    pattern: config.pattern,
    validate: config.validate
  }
}

/**
 * Combine validation results from multiple files
 */
export function aggregateResults(results: Map<string, CodeValidationResult>) {
  let allViolations: Array<CodeViolation> = []
  let totalErrors = 0
  let totalWarnings = 0
  let totalInfos = 0

  for (const [path, result] of results) {
    // Add file path to each violation
    const violationsWithPath = result.violations.map((v) => ({
      ...v,
      location: { ...v.location, file: path }
    }))
    allViolations = [...allViolations, ...violationsWithPath]
    totalErrors += result.errorCount
    totalWarnings += result.warningCount
    totalInfos += result.infoCount
  }

  return {
    valid: totalErrors === 0,
    violations: allViolations,
    errorCount: totalErrors,
    warningCount: totalWarnings,
    infoCount: totalInfos
  }
}
