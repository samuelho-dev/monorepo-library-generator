/**
 * ESLint validation testing utilities
 *
 * Validates generated code against ESLint rules programmatically.
 *
 * @module monorepo-library-generator/integration/linter
 */
import type { Tree } from '@nx/devkit';

export interface LintResult {
  readonly success: boolean;
  readonly errors: ReadonlyArray<{
    readonly file: string;
    readonly line: number;
    readonly rule: string;
    readonly message: string;
  }>;
  readonly fileCount: number;
}

/**
 * Check for common lint violations in generated code
 *
 * This performs pattern-based validation without requiring ESLint runtime.
 * It checks for the specific rules defined in eslint.config.mjs:
 * - No explicit return types (except type predicates)
 * - No 'as' type assertions (except 'as const')
 * - No spread in Array.push
 * - No file extensions in imports
 * - No Effect.Do usage
 * - Use yield* not yield in Effect.gen
 */
export function lintTreeFiles(tree: Tree, projectRoot: string) {
  const files = collectTypeScriptFiles(tree, projectRoot);
  const errors: Array<{
    file: string;
    line: number;
    rule: string;
    message: string;
  }> = [];

  for (const filePath of files) {
    const content = tree.read(filePath, 'utf-8');
    if (content === null) continue;

    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Skip comment lines and lines that are part of JSDoc/docstrings
      const trimmed = line.trim();
      const isCommentLine =
        trimmed.startsWith('//') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('```');

      // Check for type assertions (as Type) - but allow 'as const'
      // Only check non-comment lines and look for actual TypeScript assertions
      // Pattern: expression as TypeName (capital letter start indicates type)
      if (!(isCommentLine || line.includes('// eslint-disable'))) {
        const asMatch = line.match(/\)\s+as\s+([A-Z]\w*)/);
        if (asMatch) {
          errors.push({
            file: filePath,
            line: lineNum,
            rule: 'no-type-assertion',
            message: `Type assertion 'as ${asMatch[1]}' found. Use type guards or refactor to avoid type coercion.`,
          });
        }
      }

      // Check for file extensions in imports
      if (line.match(/from\s+['"][^'"]+\.(m|c)?js['"]/)) {
        errors.push({
          file: filePath,
          line: lineNum,
          rule: 'no-file-extension',
          message: 'Do not use .js, .mjs, or .cjs extensions in imports.',
        });
      }

      // Check for Effect.Do usage
      if (line.includes('Effect.Do')) {
        errors.push({
          file: filePath,
          line: lineNum,
          rule: 'no-effect-do',
          message: 'Effect.Do is deprecated. Use Effect.gen with yield* syntax instead.',
        });
      }

      // Check for yield without * in Effect.gen context
      // This is a simplified check - the real rule is more sophisticated
      if (line.match(/yield\s+(?!\*)/) && content.includes('Effect.gen')) {
        // Additional check to make sure we're in Effect.gen context
        const contextLines = lines.slice(Math.max(0, index - 10), index + 1).join('\n');
        if (contextLines.includes('Effect.gen(function*')) {
          errors.push({
            file: filePath,
            line: lineNum,
            rule: 'yield-star-required',
            message: 'Use yield* (not yield) for Effect operations in Effect.gen.',
          });
        }
      }

      // Check for spread in Array.push
      if (line.match(/\.push\s*\(\s*\.\.\./)) {
        errors.push({
          file: filePath,
          line: lineNum,
          rule: 'no-spread-in-push',
          message:
            'Do not use spread arguments in Array.push. Use arr = [...arr, ...items] instead.',
        });
      }
    });

    // Check for explicit return types on functions (more complex check)
    // Only match actual function declarations with return types, not:
    // - Comments (// or *)
    // - Interface method signatures
    // - Type annotations in variable declarations
    const functionReturnTypePattern =
      /(?:^|\n)\s*(?:export\s+)?function\s+\w+\s*\([^)]*\)\s*:\s*[^{]+\s*\{/g;
    for (const match of content.matchAll(functionReturnTypePattern)) {
      // Skip if it's a type predicate (x is Type)
      if (match[0].includes(' is ')) continue;
      // Skip if it's inside a comment block
      const matchIndex = match.index ?? 0;
      const beforeMatch = content.substring(0, matchIndex);
      const lastCommentStart = beforeMatch.lastIndexOf('/*');
      const lastCommentEnd = beforeMatch.lastIndexOf('*/');
      if (lastCommentStart > lastCommentEnd) continue;
      // Skip if line starts with // or *
      const lineStart = beforeMatch.lastIndexOf('\n');
      const lineContent = content.substring(lineStart + 1, matchIndex + match[0].length);
      if (lineContent.trim().startsWith('//') || lineContent.trim().startsWith('*')) continue;

      const lineNum = content.substring(0, matchIndex).split('\n').length;
      errors.push({
        file: filePath,
        line: lineNum,
        rule: 'no-explicit-return-type',
        message:
          'Do not use explicit return type annotations. Let TypeScript infer the return type.',
      });
    }
  }

  return {
    success: errors.length === 0,
    errors,
    fileCount: files.length,
  };
}

function collectTypeScriptFiles(tree: Tree, projectRoot: string) {
  const files: Array<string> = [];

  const visit = (path: string) => {
    if (tree.isFile(path)) {
      if (path.endsWith('.ts') && !path.endsWith('.spec.ts') && !path.endsWith('.test.ts')) {
        files.push(path);
      }
    } else {
      for (const child of tree.children(path)) {
        visit(`${path}/${child}`);
      }
    }
  };

  if (tree.exists(projectRoot)) {
    visit(projectRoot);
  }

  return files;
}
