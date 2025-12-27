/**
 * TypeScript compilation testing utilities
 *
 * Uses TypeScript compiler API to validate generated code syntax.
 * Note: This performs syntax validation only, not full type checking,
 * since the virtual tree doesn't support full module resolution.
 *
 * @module monorepo-library-generator/integration/compiler
 */
import type { Tree } from "@nx/devkit"
import * as ts from "typescript"

/**
 * Safely extract parse diagnostics from a TypeScript source file.
 *
 * `parseDiagnostics` is an internal TypeScript API property that contains
 * syntax errors found during parsing. This function provides type-safe
 * access to this internal property.
 */
function getParseDiagnostics(sourceFile: ts.SourceFile) {
  // TypeScript internal API: parseDiagnostics contains syntax errors from parsing
  // We need to access this internal property via type guard since it's not in the public API
  const sf: unknown = sourceFile
  if (sf && typeof sf === "object" && "parseDiagnostics" in sf) {
    type SourceFileWithDiagnostics = { parseDiagnostics?: unknown }
    const sfWithDiags: SourceFileWithDiagnostics = sf
    const diags = sfWithDiags.parseDiagnostics
    return Array.isArray(diags) ? diags : []
  }
  return []
}

export interface CompilationResult {
  readonly success: boolean
  readonly errors: ReadonlyArray<{
    readonly file: string
    readonly line: number
    readonly message: string
  }>
  readonly fileCount: number
}

/**
 * Validate TypeScript syntax of files from Nx virtual tree
 *
 * This performs syntax parsing to catch syntax errors in generated code.
 * It doesn't do full type checking since module resolution in virtual
 * trees is complex and would require mocking the entire project.
 */
export function compileTreeFiles(tree: Tree, projectRoot: string) {
  const files = collectTypeScriptFiles(tree, projectRoot)
  if (files.length === 0) {
    return {
      success: true,
      errors: [],
      fileCount: 0
    }
  }

  const errors: Array<{ file: string; line: number; message: string }> = []

  // Parse each file to check for syntax errors
  for (const filePath of files) {
    const content = tree.read(filePath, "utf-8")
    if (content === null) continue

    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TS
    )

    // Get syntax diagnostics (parse errors)
    const syntaxDiags = getParseDiagnostics(sourceFile)
    for (const diag of syntaxDiags) {
      const pos = diag.start !== undefined
        ? ts.getLineAndCharacterOfPosition(sourceFile, diag.start)
        : { line: 0, character: 0 }
      errors.push({
        file: filePath,
        line: pos.line + 1,
        message: ts.flattenDiagnosticMessageText(diag.messageText, "\n")
      })
    }
  }

  return {
    success: errors.length === 0,
    errors,
    fileCount: files.length
  }
}

function collectTypeScriptFiles(tree: Tree, projectRoot: string) {
  const files: Array<string> = []

  const visit = (path: string) => {
    if (tree.isFile(path)) {
      if (path.endsWith(".ts") && !path.endsWith(".spec.ts") && !path.endsWith(".test.ts")) {
        files.push(path)
      }
    } else {
      for (const child of tree.children(path)) {
        visit(`${path}/${child}`)
      }
    }
  }

  if (tree.exists(projectRoot)) {
    visit(projectRoot)
  }

  return files
}
