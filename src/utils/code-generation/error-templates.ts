/**
 * Error Template Utilities
 *
 * Shared utilities for generating Error class templates across all generators.
 * Consolidates Data.TaggedError patterns and error-related code generation.
 *
 * @module monorepo-library-generator/error-template-utils
 */

/**
 * Field definition for Tagged Error class
 */
export interface ErrorField {
  /**
   * Field name
   * @example "id", "message", "field"
   */
  readonly name: string

  /**
   * TypeScript type
   * @example "string", "number", "unknown"
   */
  readonly type: string

  /**
   * Whether field is optional
   * @default false
   */
  readonly optional?: boolean

  /**
   * Whether field is readonly
   * @default true
   */
  readonly readonly?: boolean
}

/**
 * Static method parameter definition
 */
export interface MethodParameter {
  /**
   * Parameter name
   */
  readonly name: string

  /**
   * TypeScript type
   */
  readonly type: string

  /**
   * Whether parameter is optional
   * @default false
   */
  readonly optional?: boolean
}

/**
 * Static factory method definition
 */
export interface StaticFactoryMethod {
  /**
   * Method name (usually "create")
   */
  readonly name: string

  /**
   * Method parameters
   */
  readonly params: ReadonlyArray<MethodParameter>

  /**
   * Return type
   */
  readonly returnType: string

  /**
   * Method body (JavaScript code as string)
   */
  readonly body: string
}

/**
 * Tagged Error class configuration
 */
export interface TaggedErrorConfig {
  /**
   * Class name
   * @example "UserNotFoundError"
   */
  readonly className: string

  /**
   * Tag name for Data.TaggedError
   * @example "UserNotFoundError"
   */
  readonly tagName: string

  /**
   * Error class fields
   */
  readonly fields: ReadonlyArray<ErrorField>

  /**
   * Optional static methods (typically a "create" factory)
   */
  readonly staticMethods?: ReadonlyArray<StaticFactoryMethod>

  /**
   * Optional JSDoc comment
   */
  readonly jsdoc?: string
}

/**
 * Generates a Data.TaggedError class definition
 *
 * Creates Effect-style tagged errors with:
 * - Data.TaggedError base class
 * - Readonly fields
 * - Optional static factory methods
 * - JSDoc documentation
 *
 * @example
 * ```typescript
 * const errorClass = createTaggedErrorClass({
 *   className: 'UserNotFoundError',
 *   tagName: 'UserNotFoundError',
 *   fields: [
 *     { name: 'message', type: 'string' },
 *     { name: 'id', type: 'string' }
 *   ],
 *   staticMethods: [{
 *     name: 'create',
 *     params: [{ name: 'id', type: 'string' }],
 *     returnType: 'UserNotFoundError',
 *     body: `return new UserNotFoundError({
 *       message: \`User not found: \${id}\`,
 *       id,
 *     });`
 *   }],
 *   jsdoc: 'Error thrown when a user entity is not found'
 * });
 *
 * builder.addRaw(errorClass);
 * ```
 */
export function createTaggedErrorClass(config: TaggedErrorConfig) {
  const { className, fields, jsdoc, staticMethods, tagName } = config

  // Generate field definitions
  const fieldDefs = fields
    .map((f) => {
      const readonly = f.readonly !== false ? "readonly " : ""
      const optional = f.optional ? "?" : ""
      return `  ${readonly}${f.name}${optional}: ${f.type};`
    })
    .join("\n")

  // Generate static methods
  const methodDefs = staticMethods?.length
    ? "\n  " +
      staticMethods
        .map((method) => {
          const params = method.params
            .map((p) => `${p.name}${p.optional ? "?" : ""}: ${p.type}`)
            .join(", ")

          // Indent method body lines
          const indentedBody = method.body
            .split("\n")
            .map((line) => `    ${line}`)
            .join("\n")

          return `static ${method.name}(${params}) {\n${indentedBody}\n  }`
        })
        .join("\n\n  ")
    : ""

  // Generate JSDoc
  const jsdocComment = jsdoc ? `/**\n * ${jsdoc}\n */\n` : ""

  // Build complete class
  return `${jsdocComment}export class ${className} extends Data.TaggedError(
  "${tagName}"
)<{
${fieldDefs}
}>${methodDefs ? " {" + methodDefs + "\n}" : " {}"}`
}

/**
 * Type guard function configuration
 */
export interface TypeGuardConfig {
  /**
   * Class name prefix
   * @example "User"
   */
  readonly className: string

  /**
   * Error type suffixes to generate guards for
   * @example ["NotFoundError", "ValidationError", "ConflictError"]
   */
  readonly errorTypes: ReadonlyArray<string>
}

/**
 * Generates type guard functions for tagged errors
 *
 * Creates `is${ClassName}${ErrorType}` functions that check the `_tag` property.
 *
 * @example
 * ```typescript
 * const typeGuards = createTypeGuardFunctions({
 *   className: 'User',
 *   errorTypes: ['NotFoundError', 'ValidationError', 'ConflictError']
 * });
 *
 * builder.addRaw(typeGuards);
 * ```
 *
 * Generates:
 * ```typescript
 * export function isUserNotFoundError(error: unknown): error is UserNotFoundError {
 *   return (
 *     typeof error === "object" &&
 *     error !== null &&
 *     "_tag" in error &&
 *     error._tag === "UserNotFoundError"
 *   );
 * }
 * ```
 */
export function createTypeGuardFunctions(config: TypeGuardConfig) {
  const { className, errorTypes } = config

  return errorTypes
    .map((errorType) => {
      const fullTypeName = `${className}${errorType}`

      return `export function is${fullTypeName}(
  error: unknown
) {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "${fullTypeName}"
  );
}`
    })
    .join("\n\n")
}

/**
 * Error union type configuration
 */
export interface ErrorUnionTypeConfig {
  /**
   * Union type name
   * @example "UserRepositoryError" or "UserServiceError"
   */
  readonly typeName: string

  /**
   * Base error class name
   * @example "UserError"
   */
  readonly baseError: string

  /**
   * Additional error types in the union
   * @example ["UserNotFoundError", "UserValidationError"]
   */
  readonly errorTypes: ReadonlyArray<string>

  /**
   * Whether to export the type
   * @default true
   */
  readonly exported?: boolean

  /**
   * Optional JSDoc comment
   */
  readonly jsdoc?: string
}

/**
 * Generates an error union type
 *
 * Creates discriminated union types for Error handling in Effect.
 *
 * @example
 * ```typescript
 * const unionType = createErrorUnionType({
 *   typeName: 'UserRepositoryError',
 *   baseError: 'UserError',
 *   errorTypes: [
 *     'UserNotFoundError',
 *     'UserValidationError',
 *     'UserConflictError'
 *   ],
 *   jsdoc: 'Union of all User repository errors'
 * });
 *
 * builder.addRaw(unionType);
 * ```
 *
 * Generates:
 * ```typescript
 * /**
 *  * Union of all User repository errors
 *  *\/
 * export type UserRepositoryError =
 *   | UserError
 *   | UserNotFoundError
 *   | UserValidationError
 *   | UserConflictError;
 * ```
 */
export function createErrorUnionType(config: ErrorUnionTypeConfig) {
  const { baseError, errorTypes, exported = true, jsdoc, typeName } = config

  const exportKeyword = exported ? "export " : ""
  const jsdocComment = jsdoc ? `/**\n * ${jsdoc}\n */\n` : ""

  const errorUnion = errorTypes.map((e) => `  | ${e}`).join("\n")

  return `${jsdocComment}${exportKeyword}type ${typeName} =
  | ${baseError}
${errorUnion};`
}

/**
 * Pre-configured error class templates for common error types
 */

/**
 * Generates a standard NotFoundError class
 */
export function createNotFoundError(className: string) {
  return createTaggedErrorClass({
    className: `${className}NotFoundError`,
    tagName: `${className}NotFoundError`,
    fields: [
      { name: "message", type: "string" },
      { name: "id", type: "string" }
    ],
    staticMethods: [
      {
        name: "create",
        params: [{ name: "id", type: "string" }],
        returnType: `${className}NotFoundError`,
        body: `return new ${className}NotFoundError({
  message: \`${className} not found: \${id}\`,
  id,
});`
      }
    ],
    jsdoc: `Error thrown when a ${className} entity is not found`
  })
}

/**
 * Generates a standard ValidationError class
 */
export function createValidationError(className: string) {
  return createTaggedErrorClass({
    className: `${className}ValidationError`,
    tagName: `${className}ValidationError`,
    fields: [
      { name: "message", type: "string" },
      { name: "field", type: "string", optional: true },
      { name: "constraint", type: "string", optional: true },
      { name: "value", type: "unknown", optional: true }
    ],
    staticMethods: [
      {
        name: "create",
        params: [
          {
            name: "params",
            type: `{
    message: string;
    field?: string;
    constraint?: string;
    value?: unknown;
  }`
          }
        ],
        returnType: `${className}ValidationError`,
        body: `return new ${className}ValidationError({
  message: params.message,
  ...(params.field !== undefined && { field: params.field }),
  ...(params.constraint !== undefined && { constraint: params.constraint }),
  ...(params.value !== undefined && { value: params.value }),
});`
      }
    ],
    jsdoc: `Error thrown when ${className} validation fails`
  })
}

/**
 * Generates a standard ConflictError class
 */
export function createConflictError(className: string) {
  return createTaggedErrorClass({
    className: `${className}ConflictError`,
    tagName: `${className}ConflictError`,
    fields: [
      { name: "message", type: "string" },
      { name: "conflictingId", type: "string", optional: true }
    ],
    staticMethods: [
      {
        name: "create",
        params: [{ name: "conflictingId", type: "string", optional: true }],
        returnType: `${className}ConflictError`,
        body: `return new ${className}ConflictError({
  message: conflictingId
    ? \`Resource already exists: \${conflictingId}\`
    : "Resource already exists",
  ...(conflictingId !== undefined && { conflictingId }),
});`
      }
    ],
    jsdoc: `Error thrown when a ${className} resource already exists`
  })
}

/**
 * Generates a standard ConnectionError class
 */
export function createConnectionError(className: string) {
  return createTaggedErrorClass({
    className: `${className}ConnectionError`,
    tagName: `${className}ConnectionError`,
    fields: [
      { name: "message", type: "string" },
      { name: "target", type: "string" },
      { name: "cause", type: "unknown" }
    ],
    staticMethods: [
      {
        name: "create",
        params: [
          { name: "target", type: "string" },
          { name: "cause", type: "unknown" }
        ],
        returnType: `${className}ConnectionError`,
        body: `return new ${className}ConnectionError({
  message: \`Failed to connect to \${target}\`,
  target,
  cause,
});`
      }
    ],
    jsdoc: `Error thrown when connection to external service fails`
  })
}

/**
 * Generates a standard TimeoutError class
 */
export function createTimeoutError(className: string) {
  return createTaggedErrorClass({
    className: `${className}TimeoutError`,
    tagName: `${className}TimeoutError`,
    fields: [
      { name: "message", type: "string" },
      { name: "operation", type: "string" },
      { name: "timeoutMs", type: "number" }
    ],
    staticMethods: [
      {
        name: "create",
        params: [
          { name: "operation", type: "string" },
          { name: "timeoutMs", type: "number" }
        ],
        returnType: `${className}TimeoutError`,
        body: `return new ${className}TimeoutError({
  message: \`Operation "\${operation}" timed out after \${timeoutMs}ms\`,
  operation,
  timeoutMs,
});`
      }
    ],
    jsdoc: `Error thrown when an operation times out`
  })
}

/**
 * Generates a standard ConfigError class
 */
export function createConfigError(className: string) {
  return createTaggedErrorClass({
    className: `${className}ConfigError`,
    tagName: `${className}ConfigError`,
    fields: [
      { name: "message", type: "string" },
      { name: "configKey", type: "string", optional: true }
    ],
    staticMethods: [
      {
        name: "create",
        params: [
          { name: "message", type: "string" },
          { name: "configKey", type: "string", optional: true }
        ],
        returnType: `${className}ConfigError`,
        body: `return new ${className}ConfigError({
  message,
  ...(configKey !== undefined && { configKey }),
});`
      }
    ],
    jsdoc: `Error thrown when configuration is invalid or missing`
  })
}

/**
 * Generates a standard InternalError class
 */
export function createInternalError(className: string) {
  return createTaggedErrorClass({
    className: `${className}InternalError`,
    tagName: `${className}InternalError`,
    fields: [
      { name: "message", type: "string" },
      { name: "cause", type: "unknown", optional: true }
    ],
    staticMethods: [
      {
        name: "create",
        params: [
          { name: "message", type: "string" },
          { name: "cause", type: "unknown", optional: true }
        ],
        returnType: `${className}InternalError`,
        body: `return new ${className}InternalError({
  message,
  ...(cause !== undefined && { cause }),
});`
      }
    ],
    jsdoc: `Error thrown when an unexpected internal error occurs`
  })
}
