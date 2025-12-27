/**
 * Contract Errors Template Definition
 *
 * Declarative template for generating errors.ts in contract libraries.
 *
 * @module monorepo-library-generator/templates/definitions/contract/errors
 */

import type { TemplateDefinition } from '../../core/types'

/**
 * Contract Errors Template Definition
 *
 * Generates a complete errors.ts file with:
 * - Domain errors (NotFound, Validation, AlreadyExists, Permission)
 * - Repository errors (NotFoundRepository, ValidationRepository, Conflict, Database)
 * - Union types for both error categories
 *
 * Uses raw content sections because the error classes have complex static methods
 * with JavaScript template literals that shouldn't be interpolated.
 */
export const contractErrorsTemplate: TemplateDefinition = {
  id: 'contract/errors',
  meta: {
    title: '{className} Domain Errors',
    description: 'Defines all error types for {propertyName} domain operations.',
    module: '{scope}/contract-{fileName}/errors'
  },
  imports: [{ from: 'effect', items: ['Data'] }],
  sections: [
    // File header documentation
    {
      content: {
        type: 'raw',
        value: `/**
 * ERROR TYPE SELECTION GUIDE:
 * ===========================
 *
 * 1. Data.TaggedError - For Domain & Repository Errors (DEFAULT CHOICE)
 *    Use when: Errors stay within your service boundary (same process)
 *    Benefits: Lightweight, better performance, simpler API
 *
 * 2. Schema.TaggedError - For RPC/Network Boundaries (SPECIAL CASES ONLY)
 *    Use when: Errors cross network boundaries (client ↔ server RPC)
 *
 * This template uses Data.TaggedError for ALL errors (domain + repository).
 */`
      }
    },

    // Domain Errors Section
    {
      title: 'Domain Errors (Data.TaggedError)',
      content: {
        type: 'raw',
        value: `/**
 * Error thrown when {propertyName} is not found
 */
export class {className}NotFoundError extends Data.TaggedError(
  "{className}NotFoundError"
)<{
  /** Human-readable error message */
  readonly message: string
  /** Identifier that was not found */
  readonly {propertyName}Id: string
}> {
  static create({propertyName}Id: string) {
    return new {className}NotFoundError({
      message: \`{className} not found: \${{propertyName}Id}\`,
      {propertyName}Id
    })
  }
}`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * Error thrown when {propertyName} validation fails
 */
export class {className}ValidationError extends Data.TaggedError(
  "{className}ValidationError"
)<{
  /** Human-readable error message */
  readonly message: string
  /** Field that failed validation */
  readonly field?: string
  /** Constraint that was violated */
  readonly constraint?: string
  /** Invalid value */
  readonly value?: unknown
}> {
  static create(params: {
    message: string
    field?: string
    constraint?: string
    value?: unknown
  }) {
    return new {className}ValidationError({
      message: params.message,
      ...(params.field !== undefined && { field: params.field }),
      ...(params.constraint !== undefined && { constraint: params.constraint }),
      ...(params.value !== undefined && { value: params.value })
    })
  }

  static fieldRequired(field: string) {
    return new {className}ValidationError({
      message: \`\${field} is required\`,
      field,
      constraint: "required"
    })
  }

  static fieldInvalid(field: string, constraint: string, value?: unknown) {
    return new {className}ValidationError({
      message: \`\${field} is invalid: \${constraint}\`,
      field,
      constraint,
      ...(value !== undefined && { value })
    })
  }
}`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * Error thrown when {propertyName} already exists
 */
export class {className}AlreadyExistsError extends Data.TaggedError(
  "{className}AlreadyExistsError"
)<{
  /** Human-readable error message */
  readonly message: string
  /** Identifier of existing resource */
  readonly identifier?: string
}> {
  static create(identifier?: string) {
    return new {className}AlreadyExistsError({
      message: identifier
        ? \`{className} already exists: \${identifier}\`
        : "{className} already exists",
      ...(identifier !== undefined && { identifier })
    })
  }
}`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * Error thrown when {propertyName} operation is not permitted
 */
export class {className}PermissionError extends Data.TaggedError(
  "{className}PermissionError"
)<{
  /** Human-readable error message */
  readonly message: string
  /** Operation that was denied */
  readonly operation: string
  /** Resource identifier */
  readonly {propertyName}Id: string
}> {
  static create(params: {
    operation: string
    {propertyName}Id: string
  }) {
    return new {className}PermissionError({
      message: \`Operation '\${params.operation}' not permitted on {propertyName} \${params.{propertyName}Id}\`,
      operation: params.operation,
      {propertyName}Id: params.{propertyName}Id
    })
  }
}`
      }
    },

    // Domain Error Union Type
    {
      content: {
        type: 'raw',
        value: `/**
 * Union of all domain errors
 */
export type {className}DomainError =
  | {className}NotFoundError
  | {className}ValidationError
  | {className}AlreadyExistsError
  | {className}PermissionError`
      }
    },

    // Repository Errors Section
    {
      title: 'Repository Errors (Data.TaggedError)',
      content: {
        type: 'raw',
        value: `/**
 * Repository error for {propertyName} not found
 */
export class {className}NotFoundRepositoryError extends Data.TaggedError(
  "{className}NotFoundRepositoryError"
)<{
  /** Human-readable error message */
  readonly message: string
  /** Identifier that was not found */
  readonly {propertyName}Id: string
}> {
  static create({propertyName}Id: string) {
    return new {className}NotFoundRepositoryError({
      message: \`{className} not found: \${{propertyName}Id}\`,
      {propertyName}Id
    })
  }
}`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * Repository error for {propertyName} validation failures
 */
export class {className}ValidationRepositoryError extends Data.TaggedError(
  "{className}ValidationRepositoryError"
)<{
  /** Human-readable error message */
  readonly message: string
  /** Field that failed validation */
  readonly field?: string
  /** Constraint that was violated */
  readonly constraint?: string
}> {
  static create(params: {
    message: string
    field?: string
    constraint?: string
  }) {
    return new {className}ValidationRepositoryError({
      message: params.message,
      ...(params.field !== undefined && { field: params.field }),
      ...(params.constraint !== undefined && { constraint: params.constraint })
    })
  }
}`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * Repository error for {propertyName} conflicts
 */
export class {className}ConflictRepositoryError extends Data.TaggedError(
  "{className}ConflictRepositoryError"
)<{
  /** Human-readable error message */
  readonly message: string
  /** Identifier of conflicting resource */
  readonly identifier?: string
}> {
  static create(identifier?: string) {
    return new {className}ConflictRepositoryError({
      message: identifier
        ? \`{className} already exists: \${identifier}\`
        : "{className} already exists",
      ...(identifier !== undefined && { identifier })
    })
  }
}`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * Repository error for {propertyName} database failures
 */
export class {className}DatabaseRepositoryError extends Data.TaggedError(
  "{className}DatabaseRepositoryError"
)<{
  /** Human-readable error message */
  readonly message: string
  /** Database operation that failed */
  readonly operation: string
  /** Underlying database error */
  readonly cause?: string
}> {
  static create(params: {
    message: string
    operation: string
    cause?: string
  }) {
    return new {className}DatabaseRepositoryError({
      message: params.message,
      operation: params.operation,
      ...(params.cause !== undefined && { cause: params.cause })
    })
  }
}`
      }
    },

    // Repository Error Union Type
    {
      content: {
        type: 'raw',
        value: `/**
 * Union of all repository errors
 */
export type {className}RepositoryError =
  | {className}NotFoundRepositoryError
  | {className}ValidationRepositoryError
  | {className}ConflictRepositoryError
  | {className}DatabaseRepositoryError`
      }
    },

    // Combined Error Type
    {
      title: 'Error Union Types',
      content: {
        type: 'raw',
        value: `/**
 * All possible {propertyName} errors
 */
export type {className}Error = {className}DomainError | {className}RepositoryError`
      }
    }
  ]
}

export default contractErrorsTemplate
