/**
 * RPC Errors Template
 *
 * Generates RPC infrastructure error types.
 *
 * Error Boundaries:
 * - Schema.TaggedError: For errors that cross RPC boundaries (serializable)
 * - Data.TaggedError: For domain errors that stay within the service
 *
 * @module monorepo-library-generator/infra-templates/rpc
 */

import { TypeScriptBuilder } from '../../../../utils/code-builder';
import type { InfraTemplateOptions } from '../../../../utils/types';
import { WORKSPACE_CONFIG } from '../../../../utils/workspace-config';

/**
 * Generate RPC errors file
 *
 * Creates infrastructure-level errors for RPC operations.
 */
export function generateRpcErrorsFile(options: InfraTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, fileName } = options;
  const scope = WORKSPACE_CONFIG.getScope();

  builder.addFileHeader({
    title: `${className} Errors`,
    description: `RPC infrastructure errors.

These are infrastructure-level errors for RPC operations.
Feature-specific RPC errors should be defined in each feature library.

Error Boundaries:
- Schema.TaggedError: For errors that cross RPC boundaries (serializable)
- Data.TaggedError: For domain errors that stay within the service

Note: AuthError is defined in middleware.ts for co-location with AuthMiddleware.`,
    module: `${scope}/infra-${fileName}/errors`,
    see: ['EFFECT_PATTERNS.md for error patterns'],
  });

  builder.addImports([{ from: 'effect', imports: ['Schema', 'Data'] }]);

  builder.addSectionComment('RPC Infrastructure Errors (Schema.TaggedError)');

  builder.addRaw(`/**
 * Base RPC infrastructure error
 *
 * Use for errors that need to cross RPC boundaries.
 * This is serializable and can be sent over the wire.
 */
export class RpcInfraError extends Schema.TaggedError<RpcInfraError>()(
  "RpcInfraError",
  {
    message: Schema.String,
    code: Schema.String,
    details: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown }))
  }
) {}

/**
 * Rate limit error
 */
export class RpcRateLimitError extends Schema.TaggedError<RpcRateLimitError>()(
  "RpcRateLimitError",
  {
    message: Schema.String,
    retryAfter: Schema.Number // Seconds until retry allowed
  }
) {}

/**
 * Validation error for invalid request payloads
 */
export class RpcValidationError extends Schema.TaggedError<RpcValidationError>()(
  "RpcValidationError",
  {
    message: Schema.String,
    field: Schema.optional(Schema.String),
    issues: Schema.Array(
      Schema.Struct({
        path: Schema.Array(Schema.String),
        message: Schema.String
      })
    )
  }
) {}

/**
 * Not found error
 */
export class RpcNotFoundError extends Schema.TaggedError<RpcNotFoundError>()(
  "RpcNotFoundError",
  {
    message: Schema.String,
    resource: Schema.String,
    id: Schema.optional(Schema.String)
  }
) {}

/**
 * Timeout error
 */
export class RpcTimeoutError extends Schema.TaggedError<RpcTimeoutError>()(
  "RpcTimeoutError",
  {
    message: Schema.String,
    operation: Schema.String,
    timeoutMs: Schema.Number
  }
) {}

/**
 * Union of all RPC infrastructure errors (excluding AuthError which is in middleware.ts)
 */
export type RpcError =
  | RpcInfraError
  | RpcRateLimitError
  | RpcValidationError
  | RpcNotFoundError
  | RpcTimeoutError
`);

  builder.addSectionComment('Domain-Level Errors (Data.TaggedError)');

  builder.addRaw(`/**
 * Internal infrastructure error
 *
 * Use for errors that stay within the service layer.
 * These are NOT serializable and should not cross RPC boundaries.
 */
export class ${className}InternalError extends Data.TaggedError<${className}InternalError>(
  "${className}InternalError"
)<{
  readonly message: string
  readonly cause?: unknown
}> {}

/**
 * Configuration error
 */
export class ${className}ConfigError extends Data.TaggedError<${className}ConfigError>(
  "${className}ConfigError"
)<{
  readonly message: string
  readonly key?: string
}> {}

/**
 * Connection error
 */
export class ${className}ConnectionError extends Data.TaggedError<${className}ConnectionError>(
  "${className}ConnectionError"
)<{
  readonly message: string
  readonly endpoint?: string
  readonly cause?: unknown
}> {}
`);

  builder.addSectionComment('Error Mapping Utilities');

  builder.addRaw(`/**
 * Map domain error to RPC error for crossing boundaries
 *
 * @example
 * \`\`\`typescript
 * const handler = Effect.gen(function* () {
 *   yield* doSomething().pipe(
 *     Effect.catchTag("UserNotFoundError", (e) =>
 *       Effect.fail(mapToRpcError(e))
 *     )
 *   );
 * });
 * \`\`\`
 */
export const mapToRpcError = (error: unknown): RpcError => {
  if (error instanceof ${className}InternalError) {
    return new RpcInfraError({
      message: error.message,
      code: "INTERNAL_ERROR"
    })
  }

  if (error instanceof ${className}ConfigError) {
    return new RpcInfraError({
      message: "Configuration error",
      code: "CONFIG_ERROR"
    })
  }

  if (error instanceof ${className}ConnectionError) {
    return new RpcInfraError({
      message: "Service unavailable",
      code: "SERVICE_UNAVAILABLE"
    })
  }

  // Unknown error
  return new RpcInfraError({
    message: error instanceof Error ? error.message : "Unknown error",
    code: "UNKNOWN_ERROR"
  })
}

/**
 * Error codes for HTTP status mapping
 */
export const RpcErrorCodes = {
  // 4xx Client Errors
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  RATE_LIMITED: "RATE_LIMITED",

  // 5xx Server Errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  TIMEOUT: "TIMEOUT",
  NETWORK_ERROR: "NETWORK_ERROR",

  // RPC-specific
  GROUP_NOT_FOUND: "GROUP_NOT_FOUND",
  OPERATION_NOT_FOUND: "OPERATION_NOT_FOUND",
  PARSE_ERROR: "PARSE_ERROR"
} as const

/**
 * Map error code to HTTP status
 */
export const errorCodeToHttpStatus = (code: string): number => {
  switch (code) {
    case RpcErrorCodes.BAD_REQUEST:
    case RpcErrorCodes.VALIDATION_ERROR:
    case RpcErrorCodes.PARSE_ERROR:
      return 400
    case RpcErrorCodes.UNAUTHORIZED:
      return 401
    case RpcErrorCodes.FORBIDDEN:
      return 403
    case RpcErrorCodes.NOT_FOUND:
    case RpcErrorCodes.GROUP_NOT_FOUND:
    case RpcErrorCodes.OPERATION_NOT_FOUND:
      return 404
    case RpcErrorCodes.RATE_LIMITED:
      return 429
    case RpcErrorCodes.TIMEOUT:
      return 504
    case RpcErrorCodes.SERVICE_UNAVAILABLE:
    case RpcErrorCodes.NETWORK_ERROR:
      return 503
    case RpcErrorCodes.INTERNAL_ERROR:
    default:
      return 500
  }
}
`);

  return builder.toString();
}
