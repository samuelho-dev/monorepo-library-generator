/**
 * Enhanced Help Text Utilities
 *
 * Utilities for creating rich help text with examples and output structure
 *
 * @module monorepo-library-generator/cli/help
 */

import { HelpDoc } from "@effect/cli"
import * as Span from "@effect/cli/HelpDoc/Span"

/**
 * Example command definition
 */
export interface CommandExample {
  readonly command: string
  readonly description: string
}

/**
 * Enhanced help configuration
 */
export interface EnhancedHelpConfig {
  readonly description: string
  readonly examples?: ReadonlyArray<CommandExample>
  readonly outputStructure?: ReadonlyArray<string>
  readonly notes?: ReadonlyArray<string>
}

/**
 * Create a span from text
 */
function text(value: string) {
  return Span.text(value)
}

/**
 * Create a code span
 */
function code(value: string) {
  return Span.code(value)
}

/**
 * Convert array to non-empty tuple for HelpDoc.enumeration
 * Returns undefined if array is empty
 */
function toNonEmptyArray<T>(arr: Array<T>) {
  if (arr.length === 0) return undefined
  const first = arr[0]
  if (first === undefined) return undefined
  const result: [T, ...Array<T>] = [first, ...arr.slice(1)]
  return result
}

/**
 * Create enhanced help text with examples and output structure
 */
export function createEnhancedHelp(config: EnhancedHelpConfig) {
  const sections: Array<string> = []

  // Main description
  sections.push(config.description)

  // Examples section
  if (config.examples && config.examples.length > 0) {
    sections.push("")
    sections.push("EXAMPLES")
    for (const example of config.examples) {
      sections.push(`  $ ${example.command}`)
      sections.push(`      ${example.description}`)
    }
  }

  // Output structure section
  if (config.outputStructure && config.outputStructure.length > 0) {
    sections.push("")
    sections.push("OUTPUT STRUCTURE")
    for (const line of config.outputStructure) {
      sections.push(`  ${line}`)
    }
  }

  // Notes section
  if (config.notes && config.notes.length > 0) {
    sections.push("")
    sections.push("NOTES")
    for (const note of config.notes) {
      sections.push(`  • ${note}`)
    }
  }

  return sections.join("\n")
}

/**
 * Create HelpDoc with examples section
 */
export function createHelpDoc(config: EnhancedHelpConfig) {
  const parts: Array<HelpDoc.HelpDoc> = []

  // Main description
  parts.push(HelpDoc.p(config.description))

  // Examples section
  if (config.examples && config.examples.length > 0) {
    parts.push(HelpDoc.h2("EXAMPLES"))
    const exampleDocs = config.examples.map((example) =>
      HelpDoc.p(
        Span.spans([
          code(`$ ${example.command}`),
          text("\n    "),
          text(example.description)
        ])
      )
    )
    const nonEmpty = toNonEmptyArray(exampleDocs)
    if (nonEmpty) parts.push(HelpDoc.enumeration(nonEmpty))
  }

  // Output structure section
  if (config.outputStructure && config.outputStructure.length > 0) {
    parts.push(HelpDoc.h2("OUTPUT STRUCTURE"))
    const structureDocs = config.outputStructure.map((line) => HelpDoc.p(code(line)))
    const nonEmptyStructure = toNonEmptyArray(structureDocs)
    if (nonEmptyStructure) parts.push(HelpDoc.enumeration(nonEmptyStructure))
  }

  // Notes section
  if (config.notes && config.notes.length > 0) {
    parts.push(HelpDoc.h2("NOTES"))
    const noteDocs = config.notes.map((note) => HelpDoc.p(`• ${note}`))
    const nonEmptyNotes = toNonEmptyArray(noteDocs)
    if (nonEmptyNotes) parts.push(HelpDoc.enumeration(nonEmptyNotes))
  }

  return HelpDoc.blocks(parts)
}
