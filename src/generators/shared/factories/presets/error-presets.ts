/**
 * Error Presets
 *
 * Predefined error definitions for all library types. These presets provide
 * standardized error patterns that can be used with the error factory.
 *
 * @module monorepo-library-generator/generators/shared/factories/presets/error-presets
 *
 * @example
 * ```typescript
 * import { ERROR_DEFINITIONS, ERROR_SETS } from './error-presets';
 *
 * // Use individual error definitions
 * const errors = [
 *   ERROR_DEFINITIONS.notFound('User', 'userId'),
 *   ERROR_DEFINITIONS.validation('User'),
 * ];
 *
 * // Or use predefined sets for a library type
 * const infraErrors = ERROR_SETS.infra('Cache')
 * ```
 */

import type { ErrorDefinition, ProviderType } from "../types"

// ============================================================================
// Individual Error Definitions
// ============================================================================

/**
 * Factory functions for creating standard error definitions
 *
 * Each function returns an ErrorDefinition that can be used with the error factory.
 * The functions accept a className (e.g., 'User') and generate the appropriate
 * field definitions and static create methods.
 */
export const ERROR_DEFINITIONS: {
  readonly base: (className: string) => ErrorDefinition
  readonly notFound: (className: string, idField?: string) => ErrorDefinition
  readonly validation: (className: string) => ErrorDefinition
  readonly conflict: (className: string) => ErrorDefinition
  readonly config: (className: string) => ErrorDefinition
  readonly connection: (className: string) => ErrorDefinition
  readonly timeout: (className: string) => ErrorDefinition
  readonly internal: (className: string) => ErrorDefinition
  readonly permission: (className: string, propertyName: string) => ErrorDefinition
  readonly alreadyExists: (className: string, propertyName: string) => ErrorDefinition
  readonly transaction: (className: string) => ErrorDefinition
  readonly database: (className: string) => ErrorDefinition
  readonly service: (className: string) => ErrorDefinition
  readonly api: (className: string) => ErrorDefinition
  readonly rateLimit: (className: string) => ErrorDefinition
  readonly authentication: (className: string) => ErrorDefinition
  readonly repositoryNotFound: (className: string, propertyName: string) => ErrorDefinition
  readonly repositoryValidation: (className: string) => ErrorDefinition
  readonly repositoryConflict: (className: string) => ErrorDefinition
  readonly repositoryDatabase: (className: string) => ErrorDefinition
} = {
  /**
   * Base error - root error that all others extend
   *
   * Includes optional context fields for error tracing:
   * - correlationId: Request/trace correlation identifier
   * - timestamp: When the error occurred
   * - operation: The operation that failed
   */
  base: (className: string) => ({
    name: "Error",
    description: `Base ${className} error. All service errors extend this.

Includes optional context fields for error tracing:
- correlationId: Request/trace correlation identifier
- timestamp: When the error occurred
- operation: The operation that failed`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: "cause", type: "unknown", optional: true, jsdoc: "Optional underlying cause for error chaining" },
      { name: "correlationId", type: "string", optional: true, jsdoc: "Request/trace correlation identifier" },
      { name: "timestamp", type: "Date", optional: true, jsdoc: "When the error occurred" },
      { name: "operation", type: "string", optional: true, jsdoc: "The operation that failed" }
    ],
    schemaFields: [
      { name: "message", schema: "Schema.String" },
      { name: "cause", schema: "Schema.Unknown", optional: true },
      { name: "correlationId", schema: "Schema.String", optional: true },
      { name: "timestamp", schema: "Schema.DateFromSelf", optional: true },
      { name: "operation", schema: "Schema.String", optional: true }
    ],
    staticCreate: {
      params: [
        { name: "message", type: "string" },
        { name: "cause", type: "unknown", optional: true }
      ],
      body: `return new ${className}Error({
      message,
      timestamp: new Date(),
      ...(cause !== undefined ? { cause } : {})
    })`
    }
  }),

  /**
   * Not found error - resource doesn't exist
   */
  notFound: (className: string, idField = "id") => ({
    name: "NotFoundError",
    description: `Error thrown when ${className} is not found.`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: idField, type: "string", jsdoc: "Identifier that was not found" }
    ],
    schemaFields: [
      { name: "message", schema: "Schema.String" },
      { name: idField, schema: "Schema.String" }
    ],
    staticCreate: {
      params: [{ name: idField, type: "string" }],
      body: `return new ${className}NotFoundError({
      message: \`${className} not found: \${${idField}}\`,
      ${idField}
    })`
    }
  }),

  /**
   * Validation error - input data is invalid
   */
  validation: (className: string) => ({
    name: "ValidationError",
    description: `Error thrown when ${className} input validation fails.`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: "errors", type: "readonly string[]", jsdoc: "List of validation errors" }
    ],
    schemaFields: [
      { name: "message", schema: "Schema.String" },
      { name: "errors", schema: "Schema.Array(Schema.String)" }
    ],
    staticCreate: {
      params: [{ name: "errors", type: "readonly string[]" }],
      body: `return new ${className}ValidationError({
      message: "Validation failed",
      errors
    })`
    }
  }),

  /**
   * Conflict error - operation conflicts with existing state
   */
  conflict: (className: string) => ({
    name: "ConflictError",
    description: `Error thrown when ${className} operation conflicts with existing state (e.g., duplicate).`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: "conflictingId", type: "string", optional: true, jsdoc: "Identifier of conflicting resource" }
    ],
    schemaFields: [
      { name: "message", schema: "Schema.String" },
      { name: "conflictingId", schema: "Schema.String", optional: true }
    ],
    staticCreate: {
      params: [{ name: "conflictingId", type: "string", optional: true }],
      body: `return new ${className}ConflictError({
      message: conflictingId
        ? \`Resource already exists: \${conflictingId}\`
        : "Resource already exists",
      ...(conflictingId !== undefined ? { conflictingId } : {})
    })`
    }
  }),

  /**
   * Config error - service misconfiguration
   */
  config: (className: string) => ({
    name: "ConfigError",
    description: `Error thrown when ${className} is misconfigured.`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: "property", type: "string", jsdoc: "Configuration property that is invalid" }
    ],
    schemaFields: [
      { name: "message", schema: "Schema.String" },
      { name: "field", schema: "Schema.String", optional: true }
    ],
    staticCreate: {
      params: [
        { name: "property", type: "string" },
        { name: "reason", type: "string" }
      ],
      body: `return new ${className}ConfigError({
      message: \`Invalid configuration for \${property}: \${reason}\`,
      property
    })`
    }
  }),

  /**
   * Connection error - failed to connect to external service
   */
  connection: (className: string) => ({
    name: "ConnectionError",
    description: `Error thrown when database/service connection fails.

Server error (503). This is an infrastructure error that occurs when
the data layer cannot establish a connection to the underlying database
or external service.`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: "target", type: "string", jsdoc: "Connection target (service name, host, etc.)" },
      { name: "cause", type: "unknown", optional: true, jsdoc: "Underlying connection error" }
    ],
    schemaFields: [
      { name: "message", schema: "Schema.String" },
      { name: "endpoint", schema: "Schema.String", optional: true },
      { name: "cause", schema: "Schema.Unknown", optional: true }
    ],
    staticCreate: {
      params: [
        { name: "target", type: "string" },
        { name: "cause", type: "unknown", optional: true }
      ],
      body: `return new ${className}ConnectionError({
      message: \`Failed to connect to \${target}\`,
      target,
      ...(cause !== undefined && { cause })
    })`
    }
  }),

  /**
   * Timeout error - operation exceeded time limit
   */
  timeout: (className: string) => ({
    name: "TimeoutError",
    description: `Error thrown when database operation exceeds timeout.

Server error (504). This is an infrastructure error that occurs when
a database query or transaction takes longer than the configured timeout.`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: "operation", type: "string", jsdoc: "Operation that timed out" },
      { name: "timeoutMs", type: "number", jsdoc: "Timeout duration in milliseconds" }
    ],
    schemaFields: [
      { name: "message", schema: "Schema.String" },
      { name: "timeoutMs", schema: "Schema.Number", optional: true }
    ],
    staticCreate: {
      params: [
        { name: "operation", type: "string" },
        { name: "timeoutMs", type: "number" }
      ],
      body: `return new ${className}TimeoutError({
      message: \`Operation "\${operation}" timed out after \${timeoutMs}ms\`,
      operation,
      timeoutMs
    })`
    }
  }),

  /**
   * Internal error - unexpected internal failure
   *
   * Includes context fields for comprehensive error tracing.
   */
  internal: (className: string) => ({
    name: "InternalError",
    description: `Internal ${className} error. Used for unexpected failures.

Includes context fields for error tracing and cause chain preservation.`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: "cause", type: "unknown", jsdoc: "Underlying error cause for chaining" },
      { name: "correlationId", type: "string", optional: true, jsdoc: "Request/trace correlation identifier" },
      { name: "timestamp", type: "Date", optional: true, jsdoc: "When the error occurred" },
      { name: "operation", type: "string", optional: true, jsdoc: "The operation that failed" }
    ],
    schemaFields: [
      { name: "message", schema: "Schema.String" },
      { name: "cause", schema: "Schema.Unknown", optional: true },
      { name: "correlationId", schema: "Schema.String", optional: true },
      { name: "timestamp", schema: "Schema.DateFromSelf", optional: true },
      { name: "operation", schema: "Schema.String", optional: true }
    ],
    staticCreate: {
      params: [
        { name: "reason", type: "string" },
        { name: "cause", type: "unknown" }
      ],
      body: `return new ${className}InternalError({
      message: \`Internal error: \${reason}\`,
      cause,
      timestamp: new Date()
    })`
    }
  }),

  /**
   * Permission error - insufficient permissions
   */
  permission: (className: string, propertyName: string) => ({
    name: "PermissionError",
    description: `Error thrown when user lacks permission for ${className} operation.`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: "operation", type: "string", jsdoc: "Operation that was denied" },
      { name: `${propertyName}Id`, type: "string", optional: true, jsdoc: "Resource identifier" }
    ],
    schemaFields: [
      { name: "message", schema: "Schema.String" },
      { name: "operation", schema: "Schema.String" },
      { name: `${propertyName}Id`, schema: "Schema.String", optional: true }
    ],
    staticCreate: {
      params: [
        { name: "operation", type: "string" },
        { name: `${propertyName}Id`, type: "string", optional: true }
      ],
      body: `return new ${className}PermissionError({
      message: \`Permission denied for operation: \${operation}\`,
      operation,
      ...(${propertyName}Id !== undefined ? { ${propertyName}Id } : {})
    })`
    }
  }),

  /**
   * Already exists error - resource already exists
   */
  alreadyExists: (className: string, propertyName: string) => ({
    name: "AlreadyExistsError",
    description: `Error thrown when ${className} already exists.`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: `${propertyName}Id`, type: "string", optional: true, jsdoc: "Identifier of existing resource" }
    ],
    schemaFields: [
      { name: "message", schema: "Schema.String" },
      { name: `${propertyName}Id`, schema: "Schema.String", optional: true }
    ],
    staticCreate: {
      params: [{ name: `${propertyName}Id`, type: "string", optional: true }],
      body: `return new ${className}AlreadyExistsError({
      message: ${propertyName}Id
        ? \`${className} already exists: \${${propertyName}Id}\`
        : "${className} already exists",
      ...(${propertyName}Id !== undefined ? { ${propertyName}Id } : {})
    })`
    }
  }),

  /**
   * Transaction error - database transaction failed
   */
  transaction: (className: string) => ({
    name: "TransactionError",
    description: `Error thrown when database transaction fails.

Server error (500). This is an infrastructure error that occurs when
a database transaction cannot be started, committed, or rolled back.`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: "operation", type: "string", jsdoc: "Transaction operation that failed" },
      { name: "phase", type: "\"begin\" | \"commit\" | \"rollback\"", jsdoc: "Transaction phase that failed" },
      { name: "cause", type: "unknown", optional: true, jsdoc: "Underlying database error" }
    ],
    schemaFields: [
      { name: "message", schema: "Schema.String" },
      { name: "operation", schema: "Schema.String" },
      { name: "phase", schema: "Schema.String" },
      { name: "cause", schema: "Schema.Unknown", optional: true }
    ],
    staticCreate: {
      params: [
        { name: "operation", type: "string" },
        { name: "phase", type: "\"begin\" | \"commit\" | \"rollback\"" },
        { name: "cause", type: "unknown", optional: true }
      ],
      body: `return new ${className}TransactionError({
      message: \`Transaction \${phase} failed during \${operation}\`,
      operation,
      phase,
      ...(cause !== undefined && { cause })
    })`
    }
  }),

  /**
   * Database error - general database operation failure
   */
  database: (className: string) => ({
    name: "DatabaseError",
    description: `Error thrown when ${className} database operation fails.`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: "operation", type: "string", jsdoc: "Database operation that failed" },
      { name: "cause", type: "unknown", optional: true, jsdoc: "Underlying database error" }
    ],
    schemaFields: [
      { name: "message", schema: "Schema.String" },
      { name: "operation", schema: "Schema.String" },
      { name: "cause", schema: "Schema.Unknown", optional: true }
    ],
    staticCreate: {
      params: [
        { name: "operation", type: "string" },
        { name: "cause", type: "unknown", optional: true }
      ],
      body: `return new ${className}DatabaseError({
      message: \`Database operation failed: \${operation}\`,
      operation,
      ...(cause !== undefined ? { cause } : {})
    })`
    }
  }),

  /**
   * Service error - general service operation failure
   *
   * Includes context fields for comprehensive error tracing and code classification.
   */
  service: (className: string) => ({
    name: "ServiceError",
    description: `General ${className} service error.

Includes context fields for error tracing:
- code: Error classification (DEPENDENCY, ORCHESTRATION, INTERNAL)
- correlationId: Request/trace correlation identifier
- timestamp: When the error occurred`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: "operation", type: "string", jsdoc: "Service operation that failed" },
      { name: "code", type: "\"DEPENDENCY\" | \"ORCHESTRATION\" | \"INTERNAL\"", jsdoc: "Error classification code" },
      { name: "cause", type: "unknown", optional: true, jsdoc: "Underlying error cause for chaining" },
      { name: "correlationId", type: "string", optional: true, jsdoc: "Request/trace correlation identifier" },
      { name: "timestamp", type: "Date", optional: true, jsdoc: "When the error occurred" }
    ],
    schemaFields: [
      { name: "message", schema: "Schema.String" },
      { name: "operation", schema: "Schema.String" },
      { name: "code", schema: "Schema.Literal(\"DEPENDENCY\", \"ORCHESTRATION\", \"INTERNAL\")" },
      { name: "cause", schema: "Schema.Unknown", optional: true },
      { name: "correlationId", schema: "Schema.String", optional: true },
      { name: "timestamp", schema: "Schema.DateFromSelf", optional: true }
    ],
    staticCreate: {
      params: [
        { name: "operation", type: "string" },
        { name: "cause", type: "unknown", optional: true }
      ],
      body: `return new ${className}ServiceError({
      message: \`Service operation failed: \${operation}\`,
      operation,
      code: "INTERNAL",
      timestamp: new Date(),
      ...(cause !== undefined ? { cause } : {})
    })`
    },
    additionalMethods: [
      {
        name: "dependency",
        params: [
          { name: "operation", type: "string" },
          { name: "reason", type: "string" },
          { name: "cause", type: "unknown", optional: true }
        ],
        body: `return new ${className}ServiceError({
      message: \`\${operation}: \${reason}\`,
      operation,
      code: "DEPENDENCY",
      timestamp: new Date(),
      ...(cause !== undefined ? { cause } : {})
    })`
      },
      {
        name: "orchestration",
        params: [
          { name: "operation", type: "string" },
          { name: "reason", type: "string" },
          { name: "cause", type: "unknown", optional: true }
        ],
        body: `return new ${className}ServiceError({
      message: \`\${operation}: \${reason}\`,
      operation,
      code: "ORCHESTRATION",
      timestamp: new Date(),
      ...(cause !== undefined ? { cause } : {})
    })`
      },
      {
        name: "internal",
        params: [
          { name: "operation", type: "string" },
          { name: "reason", type: "string" },
          { name: "cause", type: "unknown", optional: true }
        ],
        body: `return new ${className}ServiceError({
      message: \`\${operation}: \${reason}\`,
      operation,
      code: "INTERNAL",
      timestamp: new Date(),
      ...(cause !== undefined ? { cause } : {})
    })`
      }
    ]
  }),

  /**
   * API error - external API call failure
   */
  api: (className: string) => ({
    name: "ApiError",
    description: `Error thrown when ${className} API call fails.`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: "statusCode", type: "number", optional: true, jsdoc: "HTTP status code" },
      { name: "endpoint", type: "string", optional: true, jsdoc: "API endpoint" },
      { name: "cause", type: "unknown", optional: true, jsdoc: "Underlying API error" }
    ],
    schemaFields: [
      { name: "message", schema: "Schema.String" },
      { name: "statusCode", schema: "Schema.Number", optional: true },
      { name: "endpoint", schema: "Schema.String", optional: true }
    ],
    staticCreate: {
      params: [
        { name: "endpoint", type: "string" },
        { name: "statusCode", type: "number", optional: true },
        { name: "cause", type: "unknown", optional: true }
      ],
      body: `return new ${className}ApiError({
      message: statusCode
        ? \`API call to \${endpoint} failed with status \${statusCode}\`
        : \`API call to \${endpoint} failed\`,
      endpoint,
      ...(statusCode !== undefined ? { statusCode } : {}),
      ...(cause !== undefined ? { cause } : {})
    })`
    }
  }),

  /**
   * Rate limit error - too many requests
   */
  rateLimit: (className: string) => ({
    name: "RateLimitError",
    description: `Error thrown when ${className} rate limit is exceeded.`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: "retryAfterMs", type: "number", optional: true, jsdoc: "Milliseconds until retry is allowed" }
    ],
    schemaFields: [
      { name: "message", schema: "Schema.String" },
      { name: "retryAfterMs", schema: "Schema.Number", optional: true }
    ],
    staticCreate: {
      params: [{ name: "retryAfterMs", type: "number", optional: true }],
      body: `return new ${className}RateLimitError({
      message: retryAfterMs
        ? \`Rate limit exceeded. Retry after \${retryAfterMs}ms\`
        : "Rate limit exceeded",
      ...(retryAfterMs !== undefined ? { retryAfterMs } : {})
    })`
    }
  }),

  /**
   * Authentication error - auth failure
   */
  authentication: (className: string) => ({
    name: "AuthenticationError",
    description: `Error thrown when ${className} authentication fails.`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: "reason", type: "string", optional: true, jsdoc: "Reason for authentication failure" }
    ],
    schemaFields: [
      { name: "message", schema: "Schema.String" },
      { name: "reason", schema: "Schema.String", optional: true }
    ],
    staticCreate: {
      params: [{ name: "reason", type: "string", optional: true }],
      body: `return new ${className}AuthenticationError({
      message: reason
        ? \`Authentication failed: \${reason}\`
        : "Authentication failed",
      ...(reason !== undefined ? { reason } : {})
    })`
    }
  }),

  // ============================================================================
  // Repository Error Definitions (for contract libraries)
  // ============================================================================

  /**
   * Repository not found error
   */
  repositoryNotFound: (className: string, propertyName: string) => ({
    name: "NotFoundRepositoryError",
    description: `Repository error for ${className} not found.`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: `${propertyName}Id`, type: "string", jsdoc: "Identifier that was not found" }
    ],
    schemaFields: [
      { name: "message", schema: "Schema.String" },
      { name: `${propertyName}Id`, schema: "Schema.String" }
    ],
    staticCreate: {
      params: [{ name: `${propertyName}Id`, type: "string" }],
      body: `return new ${className}NotFoundRepositoryError({
      message: \`${className} not found: \${${propertyName}Id}\`,
      ${propertyName}Id
    })`
    }
  }),

  /**
   * Repository validation error
   */
  repositoryValidation: (className: string) => ({
    name: "ValidationRepositoryError",
    description: `Repository error for ${className} validation failures.`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: "field", type: "string", optional: true, jsdoc: "Field that failed validation" },
      { name: "constraint", type: "string", optional: true, jsdoc: "Constraint that was violated" }
    ],
    schemaFields: [
      { name: "message", schema: "Schema.String" },
      { name: "field", schema: "Schema.String", optional: true },
      { name: "constraint", schema: "Schema.String", optional: true }
    ],
    staticCreate: {
      params: [
        {
          name: "params",
          type: `{
    message: string;
    field?: string;
    constraint?: string
  }`
        }
      ],
      body: `return new ${className}ValidationRepositoryError({
      message: params.message,
      ...(params.field !== undefined && { field: params.field }),
      ...(params.constraint !== undefined && { constraint: params.constraint })
    })`
    }
  }),

  /**
   * Repository conflict error
   */
  repositoryConflict: (className: string) => ({
    name: "ConflictRepositoryError",
    description: `Repository error for ${className} conflicts.`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: "identifier", type: "string", optional: true, jsdoc: "Identifier of conflicting resource" }
    ],
    schemaFields: [
      { name: "message", schema: "Schema.String" },
      { name: "identifier", schema: "Schema.String", optional: true }
    ],
    staticCreate: {
      params: [{ name: "identifier", type: "string", optional: true }],
      body: `return new ${className}ConflictRepositoryError({
      message: identifier
        ? \`${className} already exists: \${identifier}\`
        : "${className} already exists",
      ...(identifier !== undefined ? { identifier } : {})
    })`
    }
  }),

  /**
   * Repository database error
   */
  repositoryDatabase: (className: string) => ({
    name: "DatabaseRepositoryError",
    description: `Repository error for ${className} database failures.`,
    fields: [
      { name: "message", type: "string", jsdoc: "Human-readable error message" },
      { name: "operation", type: "string", jsdoc: "Database operation that failed" },
      { name: "cause", type: "string", optional: true, jsdoc: "Underlying database error" }
    ],
    schemaFields: [
      { name: "message", schema: "Schema.String" },
      { name: "operation", schema: "Schema.String" },
      { name: "cause", schema: "Schema.String", optional: true }
    ],
    staticCreate: {
      params: [
        {
          name: "params",
          type: `{
    message: string;
    operation: string;
    cause?: string
  }`
        }
      ],
      body: `return new ${className}DatabaseRepositoryError({
      message: params.message,
      operation: params.operation,
      ...(params.cause !== undefined && { cause: params.cause })
    })`
    }
  })
}

// ============================================================================
// Error Sets by Library Type
// ============================================================================

/**
 * Predefined error sets for each library type
 *
 * These sets provide the standard errors for each library type.
 * Use these with the error factory to generate consistent error definitions.
 */
export const ERROR_SETS = {
  /**
   * Contract library errors (domain errors)
   *
   * Domain errors are the single source of truth.
   * Other libraries re-export these.
   */
  contract: (className: string, propertyName: string) => [
    ERROR_DEFINITIONS.notFound(className, `${propertyName}Id`),
    ERROR_DEFINITIONS.validation(className),
    ERROR_DEFINITIONS.alreadyExists(className, propertyName),
    ERROR_DEFINITIONS.permission(className, propertyName)
  ],

  /**
   * Contract library repository errors
   *
   * Repository errors for data access layer operations.
   */
  contractRepository: (className: string, propertyName: string) => [
    ERROR_DEFINITIONS.repositoryNotFound(className, propertyName),
    ERROR_DEFINITIONS.repositoryValidation(className),
    ERROR_DEFINITIONS.repositoryConflict(className),
    ERROR_DEFINITIONS.repositoryDatabase(className)
  ],

  /**
   * Data-access library errors (repository/infrastructure)
   *
   * These are infrastructure errors for database operations.
   * Domain errors are re-exported from contract.
   */
  dataAccess: (className: string) => [
    ERROR_DEFINITIONS.connection(className),
    ERROR_DEFINITIONS.timeout(className),
    ERROR_DEFINITIONS.transaction(className)
  ],

  /**
   * Feature library errors (service layer)
   *
   * These are service-level errors.
   * Domain errors are re-exported from contract.
   */
  feature: (className: string) => [
    ERROR_DEFINITIONS.service(className)
  ],

  /**
   * Infrastructure library errors (base infrastructure)
   */
  infra: (className: string) => [
    ERROR_DEFINITIONS.base(className),
    ERROR_DEFINITIONS.notFound(className),
    ERROR_DEFINITIONS.validation(className),
    ERROR_DEFINITIONS.conflict(className),
    ERROR_DEFINITIONS.config(className),
    ERROR_DEFINITIONS.connection(className),
    ERROR_DEFINITIONS.timeout(className),
    ERROR_DEFINITIONS.internal(className)
  ],

  /**
   * Provider library errors (external service wrappers)
   *
   * Error set depends on provider type (SDK, CLI, HTTP, GraphQL).
   */
  provider: (className: string, providerType: ProviderType) => {
    const base = [ERROR_DEFINITIONS.base(className)]

    switch (providerType) {
      case "sdk":
        return [
          ...base,
          ERROR_DEFINITIONS.api(className),
          ERROR_DEFINITIONS.connection(className),
          ERROR_DEFINITIONS.rateLimit(className),
          ERROR_DEFINITIONS.timeout(className),
          ERROR_DEFINITIONS.authentication(className),
          ERROR_DEFINITIONS.notFound(className),
          ERROR_DEFINITIONS.conflict(className),
          ERROR_DEFINITIONS.config(className),
          ERROR_DEFINITIONS.internal(className)
        ]

      case "http":
        return [
          ...base,
          ERROR_DEFINITIONS.api(className),
          ERROR_DEFINITIONS.connection(className),
          ERROR_DEFINITIONS.timeout(className),
          ERROR_DEFINITIONS.rateLimit(className)
        ]

      case "graphql":
        return [
          ...base,
          ERROR_DEFINITIONS.api(className),
          ERROR_DEFINITIONS.connection(className),
          ERROR_DEFINITIONS.timeout(className),
          ERROR_DEFINITIONS.validation(className)
        ]

      case "cli":
        return [
          ...base,
          ERROR_DEFINITIONS.notFound(className),
          ERROR_DEFINITIONS.timeout(className),
          ERROR_DEFINITIONS.config(className)
        ]

      default:
        return base
    }
  }
}

// ============================================================================
// Error Name Helpers
// ============================================================================

/**
 * Get standard infrastructure error names for data-access libraries
 */
export function getInfrastructureErrorNames(className: string) {
  return [
    `${className}ConnectionError`,
    `${className}TimeoutError`,
    `${className}TransactionError`
  ]
}
