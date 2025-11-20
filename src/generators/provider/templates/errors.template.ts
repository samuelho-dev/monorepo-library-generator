/**
 * Provider Generator - Errors Template
 *
 * Generates error types for provider libraries using Data.TaggedError pattern.
 * Includes specialized error types for external service integration:
 * - API errors with status codes
 * - Connection and timeout errors
 * - Rate limiting errors
 * - Authentication errors
 * - Safe error mapping from SDK errors
 *
 * @module monorepo-library-generator/provider/templates/errors
 */

import { TypeScriptBuilder } from '../../../utils/code-generation/typescript-builder';
import type { ProviderTemplateOptions } from '../../../utils/shared/types';

/**
 * Generate errors.ts file for provider library
 *
 * Creates Data.TaggedError-based error types and mapping functions
 * for wrapping external service errors in Effect-friendly types.
 *
 * @param options - Provider template options
 * @returns Generated TypeScript code
 */
export function generateErrorsFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, externalService, name: projectClassName } = options;

  // File header
  builder.addRaw('/**');
  builder.addRaw(` * ${projectClassName} - Error Types`);
  builder.addRaw(' *');
  builder.addRaw(' * CRITICAL: Use Data.TaggedError (NOT manual classes)');
  builder.addRaw(' * Reference: provider.md lines 716-766');
  builder.addRaw(' */');
  builder.addBlankLine();

  // Imports
  builder.addImport('effect', 'Data');
  builder.addImport('effect', 'Effect');
  builder.addBlankLine();

  // Base Error
  builder.addRaw('/**');
  builder.addRaw(` * Base ${className} Error`);
  builder.addRaw(' *');
  builder.addRaw(' * Pattern: Data.TaggedError with inline properties');
  builder.addRaw(' */');
  builder.addRaw(
    `export class ${className}Error extends Data.TaggedError("${className}Error")<{`,
  );
  builder.addRaw('  readonly message: string;');
  builder.addRaw('  readonly cause?: unknown;');
  builder.addRaw('}> {}');
  builder.addBlankLine();

  // API Error
  builder.addRaw('/**');
  builder.addRaw(` * API Error - for ${externalService} API failures`);
  builder.addRaw(' */');
  builder.addRaw(
    `export class ${className}ApiError extends Data.TaggedError("${className}ApiError")<{`,
  );
  builder.addRaw('  readonly message: string;');
  builder.addRaw('  readonly statusCode?: number;');
  builder.addRaw('  readonly errorCode?: string;');
  builder.addRaw('  readonly cause?: unknown;');
  builder.addRaw('}> {}');
  builder.addBlankLine();

  // Connection Error
  builder.addRaw('/**');
  builder.addRaw(' * Connection Error - for network/connectivity failures');
  builder.addRaw(' */');
  builder.addRaw(
    `export class ${className}ConnectionError extends Data.TaggedError("${className}ConnectionError")<{`,
  );
  builder.addRaw('  readonly message: string;');
  builder.addRaw('  readonly cause?: unknown;');
  builder.addRaw('}> {}');
  builder.addBlankLine();

  // Rate Limit Error
  builder.addRaw('/**');
  builder.addRaw(' * Rate Limit Error - for API rate limiting');
  builder.addRaw(' */');
  builder.addRaw(
    `export class ${className}RateLimitError extends Data.TaggedError("${className}RateLimitError")<{`,
  );
  builder.addRaw('  readonly message: string;');
  builder.addRaw('  readonly retryAfter?: number;');
  builder.addRaw('  readonly limit?: number;');
  builder.addRaw('  readonly remaining?: number;');
  builder.addRaw('}> {}');
  builder.addBlankLine();

  // Validation Error
  builder.addRaw('/**');
  builder.addRaw(' * Validation Error - for input validation failures');
  builder.addRaw(' */');
  builder.addRaw(
    `export class ${className}ValidationError extends Data.TaggedError("${className}ValidationError")<{`,
  );
  builder.addRaw('  readonly message: string;');
  builder.addRaw('  readonly field?: string;');
  builder.addRaw('  readonly value?: unknown;');
  builder.addRaw('}> {}');
  builder.addBlankLine();

  // Timeout Error
  builder.addRaw('/**');
  builder.addRaw(' * Timeout Error - for request timeouts');
  builder.addRaw(' */');
  builder.addRaw(
    `export class ${className}TimeoutError extends Data.TaggedError("${className}TimeoutError")<{`,
  );
  builder.addRaw('  readonly message: string;');
  builder.addRaw('  readonly timeout: number;');
  builder.addRaw('}> {}');
  builder.addBlankLine();

  // Authentication Error
  builder.addRaw('/**');
  builder.addRaw(' * Authentication Error - for auth failures');
  builder.addRaw(' */');
  builder.addRaw(
    `export class ${className}AuthenticationError extends Data.TaggedError("${className}AuthenticationError")<{`,
  );
  builder.addRaw('  readonly message: string;');
  builder.addRaw('  readonly cause?: unknown;');
  builder.addRaw('}> {}');
  builder.addBlankLine();

  // Service Error Union Type
  builder.addRaw('/**');
  builder.addRaw(` * Union of all ${className} service errors`);
  builder.addRaw(' */');
  builder.addRaw(
    `export type ${className}ServiceError =`,
  );
  builder.addRaw(`  | ${className}Error`);
  builder.addRaw(`  | ${className}ApiError`);
  builder.addRaw(`  | ${className}AuthenticationError`);
  builder.addRaw(`  | ${className}RateLimitError`);
  builder.addRaw(`  | ${className}TimeoutError`);
  builder.addRaw(`  | ${className}ConnectionError`);
  builder.addRaw(`  | ${className}ValidationError;`);
  builder.addBlankLine();

  // Error Mapping Function
  builder.addRaw('/**');
  builder.addRaw(' * Error Mapping Function');
  builder.addRaw(' *');
  builder.addRaw(' * CRITICAL: Use safe property access with Reflect.get');
  builder.addRaw(' * NO type coercion or assertions');
  builder.addRaw(' */');
  builder.addRaw(
    `export function map${className}Error(error: unknown): ${className}ServiceError {`,
  );
  builder.addRaw('  // Safe property access with type guard');
  builder.addRaw('  const errorObj = typeof error === "object" && error !== null ? error : {};');
  builder.addRaw('  const message = Reflect.get(errorObj, "message");');
  builder.addRaw('  const statusCode = Reflect.get(errorObj, "statusCode");');
  builder.addRaw('  const code = Reflect.get(errorObj, "code");');
  builder.addBlankLine();
  builder.addRaw('  // Authentication errors');
  builder.addRaw('  if (statusCode === 401 || statusCode === 403) {');
  builder.addRaw(`    return new ${className}AuthenticationError({`);
  builder.addRaw(
    '      message: typeof message === "string" ? message : "Authentication failed",',
  );
  builder.addRaw('      cause: error,');
  builder.addRaw('    });');
  builder.addRaw('  }');
  builder.addBlankLine();
  builder.addRaw('  // Rate limit errors');
  builder.addRaw('  if (statusCode === 429) {');
  builder.addRaw('    const retryAfter = Reflect.get(errorObj, "retryAfter");');
  builder.addRaw(`    return new ${className}RateLimitError({`);
  builder.addRaw(
    '      message: typeof message === "string" ? message : "Rate limit exceeded",',
  );
  builder.addRaw(
    '      ...(typeof retryAfter === "number" && { retryAfter }),',
  );
  builder.addRaw('    });');
  builder.addRaw('  }');
  builder.addBlankLine();
  builder.addRaw('  // Timeout errors');
  builder.addRaw('  if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT") {');
  builder.addRaw(`    return new ${className}TimeoutError({`);
  builder.addRaw(
    '      message: typeof message === "string" ? message : "Request timeout",',
  );
  builder.addRaw('      timeout: 20000,');
  builder.addRaw('    });');
  builder.addRaw('  }');
  builder.addBlankLine();
  builder.addRaw('  // Connection errors');
  builder.addRaw('  if (code === "ECONNREFUSED" || code === "ENOTFOUND") {');
  builder.addRaw(`    return new ${className}ConnectionError({`);
  builder.addRaw(
    '      message: typeof message === "string" ? message : "Connection failed",',
  );
  builder.addRaw('      cause: error,');
  builder.addRaw('    });');
  builder.addRaw('  }');
  builder.addBlankLine();
  builder.addRaw('  // API errors (4xx/5xx)');
  builder.addRaw(
    '  if (typeof statusCode === "number" && statusCode >= 400) {',
  );
  builder.addRaw(`    return new ${className}ApiError({`);
  builder.addRaw(
    '      message: typeof message === "string" ? message : "API error",',
  );
  builder.addRaw('      statusCode,');
  builder.addRaw(
    '      ...(typeof code === "string" && { errorCode: code }),',
  );
  builder.addRaw('      cause: error,');
  builder.addRaw('    });');
  builder.addRaw('  }');
  builder.addBlankLine();
  builder.addRaw('  // Generic error');
  builder.addRaw(`  return new ${className}Error({`);
  builder.addRaw(
    '    message: typeof message === "string" ? message : "Unknown error",',
  );
  builder.addRaw('    cause: error,');
  builder.addRaw('  });');
  builder.addRaw('}');
  builder.addBlankLine();

  // Helper function
  builder.addRaw('/**');
  builder.addRaw(
    ` * Helper: Run ${externalService} operation with error mapping`,
  );
  builder.addRaw(' */');
  builder.addRaw(`export function run${className}Operation<A>(`);
  builder.addRaw('  operation: () => Promise<A>,');
  builder.addRaw(`): Effect.Effect<A, ${className}ServiceError> {`);
  builder.addRaw('  return Effect.tryPromise({');
  builder.addRaw('    try: operation,');
  builder.addRaw(`    catch: map${className}Error,`);
  builder.addRaw('  });');
  builder.addRaw('}');
  builder.addBlankLine();

  return builder.toString();
}
