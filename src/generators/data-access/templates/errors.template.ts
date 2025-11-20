/**
 * Data Access Errors Template
 *
 * Generates errors.ts file for data-access libraries with comprehensive
 * domain-specific error types using Data.TaggedError pattern.
 *
 * @module monorepo-library-generator/data-access/errors-template
 */

import {
  createErrorUnionType,
  createTypeGuardFunctions,
} from '../../../utils/code-generation/error-template-utils';
import { TypeScriptBuilder } from '../../../utils/code-generation/typescript-builder';
import type { DataAccessTemplateOptions } from '../../../utils/shared/types';

/**
 * Generate errors.ts file for data-access library
 *
 * Creates comprehensive error definitions including:
 * - Base error type
 * - Domain-specific errors (NotFound, Validation, Conflict, etc.)
 * - Helper factory methods
 * - Error union types
 * - Type guards
 */
export function generateErrorsFile(options: DataAccessTemplateOptions): string {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;

  // Add comprehensive file header with documentation
  builder.addFileHeader({
    title: `${className} Domain Error Types`,
    description: `Defines domain-specific error types using Effect's Data.TaggedError pattern.
These errors are thrown by repository operations and should be caught
at the service/feature layer for proper error handling and user feedback.

ARCHITECTURE: All errors use Data.TaggedError for:
- Discriminated unions (_tag property for pattern matching)
- Effect integration (Effect.catchTag support)
- Type safety (no instanceof checks needed)
- Proper error channel composition

TODO: Customize this file:
1. Add domain-specific error types beyond the base set
2. Document error conditions and recovery strategies
3. Add structured error data properties
4. Add custom factory methods for error creation

@see https://effect.website/docs/guides/error-management/error-channel-operations for patterns
@see https://effect.website/docs/other/data/tagged-error for Data.TaggedError`,
    module: `@custom-repo/data-access-${fileName}/server`,
  });
  builder.addBlankLine();

  // Add imports
  builder.addImports([{ from: 'effect', imports: ['Data'] }]);
  builder.addBlankLine();

  // Base Error Type
  builder.addSectionComment('Base Error Type');
  builder.addBlankLine();

  builder.addRaw(`/**
 * Base error type for all ${className} domain errors
 *
 * All ${className}-specific errors should extend this type.
 * This allows for centralized error handling at higher layers.
 *
 * @example
 * \`\`\`typescript
 * // Catch all ${className} errors
 * const result = yield* operation.pipe(
 *   Effect.catchTag("${className}Error", (error) => {
 *     console.error(\`${className} error: \${error.message}\`, { cause: error.cause });
 *     return Effect.fail(new ServiceError("Operation failed"));
 *   })
 * );
 * \`\`\`
 */
export class ${className}Error extends Data.TaggedError(
  "${className}Error"
)<{
  readonly message: string;
  readonly cause?: unknown;
}> {}`);
  builder.addBlankLine();

  // Domain-Specific Error Types
  builder.addSectionComment('Domain-Specific Error Types');
  builder.addBlankLine();

  // NotFoundError
  builder.addRaw(`/**
 * Error thrown when a ${className} entity is not found
 *
 * Client error (404). Occurs during lookup operations (findById, findOne).
 *
 * @example
 * \`\`\`typescript
 * if (Option.isNone(result)) {
 *   return yield* Effect.fail(${className}NotFoundError.create(id));
 * }
 * \`\`\`
 */
export class ${className}NotFoundError extends Data.TaggedError(
  "${className}NotFoundError"
)<{
  readonly message: string;
  readonly id: string;
}> {
  static create(id: string): ${className}NotFoundError {
    return new ${className}NotFoundError({
      message: \`${className} not found: \${id}\`,
      id,
    });
  }
}`);
  builder.addBlankLine();

  // ValidationError
  builder.addRaw(`/**
 * Error thrown when input validation fails
 *
 * Client error (400). Occurs when provided data doesn't meet domain requirements.
 *
 * @example
 * \`\`\`typescript
 * if (!isValidEmail(email)) {
 *   return yield* Effect.fail(
 *     ${className}ValidationError.create(["Invalid email format"])
 *   );
 * }
 * \`\`\`
 */
export class ${className}ValidationError extends Data.TaggedError(
  "${className}ValidationError"
)<{
  readonly message: string;
  readonly errors: readonly string[];
}> {
  static create(errors: readonly string[]): ${className}ValidationError {
    return new ${className}ValidationError({
      message: "Validation failed",
      errors,
    });
  }
}`);
  builder.addBlankLine();

  // ConflictError
  builder.addRaw(`/**
 * Error thrown when operation violates unique constraints
 *
 * Client error (409 Conflict). Occurs when trying to create/update an entity
 * with duplicate values that violate unique constraints.
 *
 * @example
 * \`\`\`typescript
 * if (existingEmail) {
 *   return yield* Effect.fail(
 *     ${className}ConflictError.create("Email already registered")
 *   );
 * }
 * \`\`\`
 */
export class ${className}ConflictError extends Data.TaggedError(
  "${className}ConflictError"
)<{
  readonly message: string;
  readonly conflictingId?: string;
}> {
  static create(conflictingId?: string): ${className}ConflictError {
    return new ${className}ConflictError({
      message: conflictingId
        ? \`Resource already exists: \${conflictingId}\`
        : "Resource already exists",
      conflictingId,
    });
  }
}`);
  builder.addBlankLine();

  // ConfigError
  builder.addRaw(`/**
 * Error thrown for configuration issues
 *
 * Configuration error. Occurs when service is misconfigured or required
 * configuration is missing.
 */
export class ${className}ConfigError extends Data.TaggedError(
  "${className}ConfigError"
)<{
  readonly message: string;
  readonly property: string;
}> {
  static create(property: string, reason: string): ${className}ConfigError {
    return new ${className}ConfigError({
      message: \`Invalid configuration for \${property}: \${reason}\`,
      property,
    });
  }
}`);
  builder.addBlankLine();

  // ConnectionError
  builder.addRaw(`/**
 * Error thrown when connection to external service fails
 *
 * Server error (503). Occurs when unable to connect to database or other services.
 */
export class ${className}ConnectionError extends Data.TaggedError(
  "${className}ConnectionError"
)<{
  readonly message: string;
  readonly target: string;
  readonly cause: unknown;
}> {
  static create(target: string, cause: unknown): ${className}ConnectionError {
    return new ${className}ConnectionError({
      message: \`Failed to connect to \${target}\`,
      target,
      cause,
    });
  }
}`);
  builder.addBlankLine();

  // TimeoutError
  builder.addRaw(`/**
 * Error thrown when operation exceeds timeout
 *
 * Server error (504). Occurs when database query or external call takes too long.
 */
export class ${className}TimeoutError extends Data.TaggedError(
  "${className}TimeoutError"
)<{
  readonly message: string;
  readonly operation: string;
  readonly timeoutMs: number;
}> {
  static create(operation: string, timeoutMs: number): ${className}TimeoutError {
    return new ${className}TimeoutError({
      message: \`Operation "\${operation}" timed out after \${timeoutMs}ms\`,
      operation,
      timeoutMs,
    });
  }
}`);
  builder.addBlankLine();

  // InternalError
  builder.addRaw(`/**
 * Error thrown when an internal system error occurs
 *
 * Server error (500). Occurs for database errors, network issues, or unexpected failures.
 * This is a catch-all for errors that should not happen in normal operation.
 *
 * @example
 * \`\`\`typescript
 * try {
 *   // database operation
 * } catch (error) {
 *   return yield* Effect.fail(
 *     ${className}InternalError.create("Failed to save ${className}", error)
 *   );
 * }
 * \`\`\`
 */
export class ${className}InternalError extends Data.TaggedError(
  "${className}InternalError"
)<{
  readonly message: string;
  readonly cause: unknown;
}> {
  static create(reason: string, cause: unknown): ${className}InternalError {
    return new ${className}InternalError({
      message: \`Internal error: \${reason}\`,
      cause,
    });
  }
}`);
  builder.addBlankLine();

  // Error Type Union
  builder.addSectionComment('Error Type Union');
  builder.addBlankLine();

  builder.addRaw(
    createErrorUnionType({
      typeName: `${className}RepositoryError`,
      baseError: `${className}Error`,
      errorTypes: [
        `${className}NotFoundError`,
        `${className}ValidationError`,
        `${className}ConflictError`,
        `${className}ConfigError`,
        `${className}ConnectionError`,
        `${className}TimeoutError`,
        `${className}InternalError`,
      ],
      jsdoc: `Union of all ${className} repository errors\n\nUse this type for repository method signatures:\n\n@example\n\`\`\`typescript\nexport interface ${className}Repository {\n  readonly findById: (id: string) => Effect.Effect<\n    Option.Option<${className}>,\n    ${className}RepositoryError\n  >;\n}\n\`\`\``,
    }),
  );
  builder.addBlankLine();

  // Type Guards
  builder.addSectionComment('Type Guards (using _tag property)');
  builder.addBlankLine();

  // Generate type guard functions using utility
  builder.addRaw(
    createTypeGuardFunctions({
      className,
      errorTypes: [
        'NotFoundError',
        'ValidationError',
        'ConflictError',
        'ConfigError',
        'ConnectionError',
        'TimeoutError',
        'InternalError',
      ],
    }),
  );
  builder.addBlankLine();

  // Add TODO comment for additional error types
  builder.addRaw(`// TODO: Add domain-specific error types here
// Example:
//
// export class ${className}BusinessRuleError extends Data.TaggedError(
//   "${className}BusinessRuleError"
// )<{
//   readonly message: string;
//   readonly rule: string;
// }> {
//   static create(rule: string): ${className}BusinessRuleError {
//     return new ${className}BusinessRuleError({
//       message: \`Business rule violated: \${rule}\`,
//       rule,
//     });
//   }
// }
`);

  return builder.toString();
}
