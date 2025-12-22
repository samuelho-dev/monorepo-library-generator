/**
 * Infrastructure Errors Template
 *
 * Generates service error definitions using Data.TaggedError.
 *
 * @module monorepo-library-generator/infra-templates
 */

import { createErrorUnionType } from '../../../utils/templates';
import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { InfraTemplateOptions } from '../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config';

/**
 * Generate errors file for infrastructure service
 */
export function generateErrorsFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  // File header
  builder.addFileHeader({
    title: `${className} Service Errors`,
    description: `Domain errors using Data.TaggedError for proper Effect integration.\nThese errors are NOT serializable (use in internal operations).\nFor RPC/network boundaries, use Schema.TaggedError instead.\n\nTODO: Customize this file for your service:\n1. Define domain-specific error types\n2. Add error context (ids, values, reasons)\n3. Document error recovery strategies\n4. Add helper constructors for error creation`,
    module: `${scope}/infra-${fileName}/errors`,
    see: ['https://effect.website/docs/api/Data/TaggedError for error patterns'],
  });

  // Imports
  builder.addImport('effect', 'Data');

  // Section: Core Service Errors
  builder.addSectionComment('Core Service Errors');

  // Base error
  builder.addRaw(`/**
 * Base ${className} error
 *
 * All service errors extend this base error.
 * Use domain-specific error types (NotFound, Validation, etc.) for precise handling.
 */
export class ${className}Error extends Data.TaggedError(
  "${className}Error"
)<{
  /** Human-readable error message */
  readonly message: string;

  /** Optional underlying cause */
  readonly cause?: unknown;
}> {
  static create(message: string, cause?: unknown) {
    return new ${className}Error({
      message,
      ...(cause !== undefined ? { cause } : {}),
    });
  }
}`);
  builder.addBlankLine();

  // NotFound error
  builder.addRaw(`/**
 * Resource not found error
 *
 * Raised when requested resource doesn't exist.
 */
export class ${className}NotFoundError extends Data.TaggedError(
  "${className}NotFoundError"
)<{
  /** Human-readable error message */
  readonly message: string;

  /** Identifier that was not found */
  readonly id: string;
}> {
  static create(id: string) {
    return new ${className}NotFoundError({
      message: \`${className} not found: \${id}\`,
      id,
    });
  }
}`);
  builder.addBlankLine();

  // Validation error
  builder.addRaw(`/**
 * Validation error
 *
 * Raised when input data fails validation.
 */
export class ${className}ValidationError extends Data.TaggedError(
  "${className}ValidationError"
)<{
  /** Human-readable error message */
  readonly message: string;

  /** List of validation errors */
  readonly errors: readonly string[];
}> {
  static create(errors: readonly string[]) {
    return new ${className}ValidationError({
      message: "Validation failed",
      errors,
    });
  }
}`);
  builder.addBlankLine();

  // Conflict error
  builder.addRaw(`/**
 * Conflict error
 *
 * Raised when operation conflicts with existing state (e.g., duplicate).
 */
export class ${className}ConflictError extends Data.TaggedError(
  "${className}ConflictError"
)<{
  /** Human-readable error message */
  readonly message: string;

  /** Optional identifier of conflicting resource */
  readonly conflictingId?: string;
}> {
  static create(conflictingId?: string) {
    return new ${className}ConflictError({
      message: conflictingId
        ? \`Resource already exists: \${conflictingId}\`
        : "Resource already exists",
      ...(conflictingId !== undefined ? { conflictingId } : {}),
    });
  }
}`);
  builder.addBlankLine();

  // Config error
  builder.addRaw(`/**
 * Configuration error
 *
 * Raised when service is misconfigured.
 */
export class ${className}ConfigError extends Data.TaggedError(
  "${className}ConfigError"
)<{
  /** Human-readable error message */
  readonly message: string;

  /** Configuration property that is invalid */
  readonly property: string;
}> {
  static create(property: string, reason: string) {
    return new ${className}ConfigError({
      message: \`Invalid configuration for \${property}: \${reason}\`,
      property,
    });
  }
}`);
  builder.addBlankLine();

  // Section: Operation Errors
  builder.addSectionComment('Operation Errors');

  // Connection error
  builder.addRaw(`/**
 * Connection error
 *
 * Raised when connection to external service fails.
 */
export class ${className}ConnectionError extends Data.TaggedError(
  "${className}ConnectionError"
)<{
  /** Human-readable error message */
  readonly message: string;

  /** Connection target (service name, host, etc.) */
  readonly target: string;

  /** Underlying connection error */
  readonly cause: unknown;
}> {
  static create(target: string, cause: unknown) {
    return new ${className}ConnectionError({
      message: \`Failed to connect to \${target}\`,
      target,
      cause,
    });
  }
}`);
  builder.addBlankLine();

  // Timeout error
  builder.addRaw(`/**
 * Timeout error
 *
 * Raised when operation exceeds timeout.
 */
export class ${className}TimeoutError extends Data.TaggedError(
  "${className}TimeoutError"
)<{
  /** Human-readable error message */
  readonly message: string;

  /** Timeout duration in milliseconds */
  readonly timeoutMs: number;

  /** Operation that timed out */
  readonly operation: string;
}> {
  static create(
    operation: string,
    timeoutMs: number
  ) {
    return new ${className}TimeoutError({
      message: \`Operation "\${operation}" timed out after \${timeoutMs}ms\`,
      timeoutMs,
      operation,
    });
  }
}`);
  builder.addBlankLine();

  // Internal error
  builder.addRaw(`/**
 * Internal error
 *
 * Raised when unexpected internal error occurs.
 */
export class ${className}InternalError extends Data.TaggedError(
  "${className}InternalError"
)<{
  /** Human-readable error message */
  readonly message: string;

  /** Underlying error cause */
  readonly cause: unknown;
}> {
  static create(reason: string, cause: unknown) {
    return new ${className}InternalError({
      message: \`Internal error: \${reason}\`,
      cause,
    });
  }
}`);
  builder.addBlankLine();

  // Section: Error Type Union
  builder.addSectionComment('Error Type Union');

  builder.addRaw(
    createErrorUnionType({
      typeName: `${className}ServiceError`,
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
      jsdoc: `Union of all ${className} service errors\n\nUse this type for service method signatures:\n\n@example\n\`\`\`typescript\nreadonly operation: () => Effect.Effect<Result, ${className}ServiceError>;\n\`\`\``,
    }),
  );
  builder.addBlankLine();

  // TODO comment
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
// }`);

  return builder.toString();
}
