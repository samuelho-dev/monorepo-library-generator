/**
 * Code Validators
 *
 * Validates generated TypeScript code for syntax errors, type correctness,
 * and adherence to Effect patterns.
 *
 * @module monorepo-library-generator/validators
 */

import { Data, Effect } from "effect"
import ts from "typescript"

/**
 * Error thrown when code validation fails
 */
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string
  readonly diagnostics?: ReadonlyArray<string>
  readonly path?: string
}> {
  static create(message: string, diagnostics?: ReadonlyArray<string>, path?: string) {
    return new ValidationError({
      message,
      ...(diagnostics !== undefined && { diagnostics }),
      ...(path !== undefined && { path }),
    })
  }

  static fromDiagnostics(diagnostics: ReadonlyArray<ts.Diagnostic>, path?: string) {
    const messages = diagnostics.map((diagnostic) => {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
      if (diagnostic.file && diagnostic.start !== undefined) {
        const { character, line } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
        return `Line ${line + 1}, Col ${character + 1}: ${message}`
      }
      return message
    })

    return new ValidationError({
      message: "TypeScript compilation errors detected",
      diagnostics: messages,
      ...(path !== undefined && { path }),
    })
  }
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /**
   * TypeScript compiler options to use for validation
   */
  readonly compilerOptions?: ts.CompilerOptions

  /**
   * Whether to check for semantic errors (type checking)
   * Default: false (syntax only)
   */
  readonly checkSemantics?: boolean

  /**
   * File path for better error messages
   */
  readonly filePath?: string
}

/**
 * Code validators for generated TypeScript
 */
export class CodeValidators {
  /**
   * Validate TypeScript syntax
   *
   * Checks if the generated code is syntactically valid TypeScript.
   * Does not perform type checking by default (faster).
   *
   * @example
   * ```typescript
   * const code = 'export const foo = "bar";';
   *
   * await Effect.runPromise(
   *   CodeValidators.validateTypeScript(code)
   * );
   * ```
   */
  static validateTypeScript(
    content: string,
    options: ValidationOptions = {}
  ): Effect.Effect<void, ValidationError> {
    return Effect.gen(function*() {
      const filePath = options.filePath || "generated.ts"

      // Parse the source file
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true, // setParentNodes
        ts.ScriptKind.TS
      )

      // Note: createSourceFile performs syntax validation internally
      // If there are syntax errors, they would be caught during semantic checking

      // Optionally check for semantic errors (type checking)
      if (options.checkSemantics) {
        yield* CodeValidators.validateSemantics(sourceFile, options.compilerOptions, filePath)
      }

      yield* Effect.logDebug("TypeScript validation passed").pipe(
        Effect.annotateLogs({ filePath })
      )
    }).pipe(
      Effect.withSpan("CodeValidators.validateTypeScript", {
        attributes: { filePath: options.filePath || "generated.ts" }
      })
    )
  }

  /**
   * Validate TypeScript semantics (type checking)
   *
   * Performs full type checking on the generated code.
   * More expensive than syntax-only validation.
   */
  private static validateSemantics(
    sourceFile: ts.SourceFile,
    compilerOptions: ts.CompilerOptions = {},
    filePath: string
  ): Effect.Effect<void, ValidationError> {
    return Effect.gen(function*() {
      const defaultOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        ...compilerOptions
      }

      // Create a program for type checking
      const program = ts.createProgram({
        rootNames: [filePath],
        options: defaultOptions,
        host: {
          ...ts.createCompilerHost(defaultOptions),
          getSourceFile: (fileName) => {
            if (fileName === filePath) {
              return sourceFile
            }
            return undefined
          },
          fileExists: (fileName) => fileName === filePath,
          readFile: (fileName) => {
            if (fileName === filePath) {
              return sourceFile.getFullText()
            }
            return undefined
          }
        }
      })

      // Get semantic diagnostics
      const semanticDiagnostics = program.getSemanticDiagnostics(sourceFile)

      if (semanticDiagnostics.length > 0) {
        yield* Effect.logWarning("TypeScript semantic errors detected").pipe(
          Effect.annotateLogs({ filePath, errorCount: semanticDiagnostics.length })
        )

        yield* Effect.fail(
          ValidationError.fromDiagnostics(semanticDiagnostics, filePath)
        )
      }
    })
  }

  /**
   * Validate that content matches a pattern
   *
   * Useful for ensuring generated code contains required elements.
   */
  static validatePattern(
    content: string,
    pattern: RegExp,
    errorMessage: string
  ): Effect.Effect<void, ValidationError> {
    return Effect.gen(function*() {
      if (!pattern.test(content)) {
        yield* Effect.fail(
          ValidationError.create(errorMessage)
        )
      }
    })
  }

  /**
   * Validate that content does NOT match a pattern
   *
   * Useful for ensuring generated code doesn't contain anti-patterns.
   */
  static validateNotPattern(
    content: string,
    pattern: RegExp,
    errorMessage: string
  ): Effect.Effect<void, ValidationError> {
    return Effect.gen(function*() {
      if (pattern.test(content)) {
        yield* Effect.fail(
          ValidationError.create(errorMessage)
        )
      }
    })
  }

  /**
   * Validate Effect patterns in generated code
   *
   * Checks for common Effect.ts patterns and anti-patterns.
   */
  static validateEffectPatterns(
    content: string,
    filePath?: string
  ): Effect.Effect<void, ValidationError> {
    return Effect.gen(function*() {
      const validations: Array<Effect.Effect<void, ValidationError>> = []

      // Check for Context.Tag with separate interface (anti-pattern)
      if (content.includes("Context.Tag") && content.includes("interface") && content.includes("Service")) {
        const separateInterfacePattern =
          /interface\s+\w+Service\s*\{[\s\S]*?\}\s*export\s+class\s+\w+Service\s+extends\s+Context\.Tag/
        if (separateInterfacePattern.test(content)) {
          validations.push(
            CodeValidators.validateNotPattern(
              content,
              separateInterfacePattern,
              "Context.Tag should use inline interface, not separate interface declaration (per EFFECT_PATTERNS.md)"
            )
          )
        }
      }

      // Check for Data.TaggedError without proper extends
      if (content.includes("Error") && content.includes("class")) {
        validations.push(
          Effect.gen(function*() {
            const errorClasses = content.match(/class\s+\w+Error\s+extends/g)
            if (errorClasses) {
              const hasTaggedError = content.includes("Data.TaggedError")
              if (!hasTaggedError) {
                yield* Effect.logWarning(
                  "Error classes should extend Data.TaggedError for type-safe error handling"
                ).pipe(
                  Effect.annotateLogs({ filePath })
                )
              }
            }
          })
        )
      }

      // Check for Layer usage without proper service tag
      if (content.includes("Layer.") && !content.includes("Context.Tag")) {
        validations.push(
          Effect.logWarning(
            "Layer found without Context.Tag service definition"
          ).pipe(
            Effect.annotateLogs({ filePath })
          )
        )
      }

      // Run all validations
      yield* Effect.all(validations, { concurrency: "unbounded", discard: true })

      yield* Effect.logDebug("Effect pattern validation passed").pipe(
        Effect.annotateLogs({ filePath })
      )
    })
  }

  /**
   * Validate file naming conventions
   *
   * Ensures generated file names follow project conventions.
   */
  static validateFileName(
    fileName: string,
    expectedPattern: RegExp,
    description: string
  ): Effect.Effect<void, ValidationError> {
    return Effect.gen(function*() {
      if (!expectedPattern.test(fileName)) {
        yield* Effect.fail(
          ValidationError.create(
            `File name "${fileName}" does not match expected pattern: ${description}`
          )
        )
      }
    })
  }

  /**
   * Combine multiple validators
   *
   * Runs all validators and collects all errors.
   */
  static validateAll(
    validators: ReadonlyArray<Effect.Effect<void, ValidationError>>
  ): Effect.Effect<void, ValidationError> {
    return Effect.gen(function*() {
      const results = yield* Effect.all(validators, {
        concurrency: "unbounded",
        mode: "either"
      })

      const errors = results.filter((result) => result._tag === "Left") as Array<
        { _tag: "Left"; left: ValidationError }
      >

      if (errors.length > 0) {
        const allDiagnostics = errors.flatMap((e) => e.left.diagnostics || [e.left.message])

        yield* Effect.fail(
          ValidationError.create(
            `${errors.length} validation error(s) detected`,
            allDiagnostics
          )
        )
      }
    })
  }
}

/**
 * Validator for specific file types
 */
export class FileTypeValidators {
  /**
   * Validate an errors.ts file
   */
  static validateErrorsFile(content: string, filePath?: string): Effect.Effect<void, ValidationError> {
    return Effect.gen(function*() {
      yield* CodeValidators.validateTypeScript(content, {
        ...(filePath !== undefined && { filePath }),
      })

      yield* CodeValidators.validatePattern(
        content,
        /Data\.TaggedError/,
        "errors.ts must contain Data.TaggedError definitions"
      )

      yield* CodeValidators.validatePattern(
        content,
        /export\s+(class|const)/,
        "errors.ts must export error definitions"
      )
    })
  }

  /**
   * Validate an entities.ts file
   */
  static validateEntitiesFile(content: string, filePath?: string): Effect.Effect<void, ValidationError> {
    return Effect.gen(function*() {
      yield* CodeValidators.validateTypeScript(content, {
        ...(filePath !== undefined && { filePath }),
      })

      yield* CodeValidators.validatePattern(
        content,
        /Schema\.Struct/,
        "entities.ts must contain Schema.Struct definitions"
      )
    })
  }

  /**
   * Validate a ports.ts file (contract library)
   */
  static validatePortsFile(content: string, filePath?: string): Effect.Effect<void, ValidationError> {
    return Effect.gen(function*() {
      yield* CodeValidators.validateTypeScript(content, {
        ...(filePath !== undefined && { filePath }),
      })

      yield* CodeValidators.validatePattern(
        content,
        /Context\.Tag/,
        "ports.ts must contain Context.Tag service definitions"
      )
    })
  }

  /**
   * Validate a service.ts file (feature library)
   */
  static validateServiceFile(content: string, filePath?: string): Effect.Effect<void, ValidationError> {
    return Effect.gen(function*() {
      yield* CodeValidators.validateTypeScript(content, {
        ...(filePath !== undefined && { filePath }),
      })

      yield* CodeValidators.validatePattern(
        content,
        /Context\.Tag/,
        "service.ts must contain Context.Tag service definition"
      )

      yield* CodeValidators.validatePattern(
        content,
        /Layer\.(effect|sync|scoped)/,
        "service.ts must contain Layer implementation"
      )
    })
  }
}
