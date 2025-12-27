/**
 * Contract Sub-Module Errors Template Definition
 *
 * Declarative template for generating errors.ts in contract sub-modules.
 * Part of the Hybrid DDD pattern for sub-module support.
 *
 * @module monorepo-library-generator/templates/definitions/contract/submodule-errors
 */

import type { TemplateDefinition } from '../../core/types'

/**
 * Contract Sub-Module Errors Template Definition
 *
 * Generates an errors.ts file for sub-modules with:
 * - NotFound error (entity not found)
 * - Validation error (field validation failures)
 * - Operation error (infrastructure/operation failures)
 * - Error union types
 *
 * These errors are the SINGLE SOURCE OF TRUTH for the sub-module.
 * Data-access and feature layers should import these errors.
 */
export const contractSubmoduleErrorsTemplate: TemplateDefinition = {
  id: 'contract/submodule-errors',
  meta: {
    title: '{parentClassName} {subModuleClassName} Errors',
    description: `Domain errors specific to the {subModuleName} sub-module.

These errors use Data.TaggedError for proper Effect integration:
- Discriminated unions (_tag property for pattern matching)
- Effect.catchTag support
- Type safety (no instanceof checks needed)

CONTRACT-FIRST ARCHITECTURE:
This file is the SINGLE SOURCE OF TRUTH for {subModuleName} errors.
Data-access and feature layers should import and re-export these errors
rather than defining their own.

@see https://effect.website/docs/other/data/tagged-error`,
    module: '{scope}/contract-{parentName}/{subModuleName}/errors'
  },
  imports: [{ from: 'effect', items: ['Data'] }],
  sections: [
    // Domain Errors
    {
      title: 'Domain Errors (Data.TaggedError)',
      content: {
        type: 'raw',
        value: `/**
 * Error thrown when {subModuleName} entity is not found
 */
export class {subModuleClassName}NotFoundError extends Data.TaggedError("{subModuleClassName}NotFoundError")<{
  readonly message: string
  readonly id: string
}> {
  static create(id: string) {
    return new {subModuleClassName}NotFoundError({
      message: \`{subModuleClassName} not found: \${id}\`,
      id
    })
  }
}`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * Error thrown when {subModuleName} validation fails
 */
export class {subModuleClassName}ValidationError extends Data.TaggedError("{subModuleClassName}ValidationError")<{
  readonly message: string
  readonly field: string
  readonly value?: unknown
}> {
  static create(field: string, message: string, value?: unknown) {
    return new {subModuleClassName}ValidationError({
      message,
      field,
      ...(value !== undefined && { value })
    })
  }

  static required(field: string) {
    return new {subModuleClassName}ValidationError({
      message: \`\${field} is required\`,
      field
    })
  }
}`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * Error thrown when {subModuleName} operation fails (e.g., database, network)
 */
export class {subModuleClassName}OperationError extends Data.TaggedError("{subModuleClassName}OperationError")<{
  readonly message: string
  readonly operation: string
  readonly cause?: unknown
}> {
  static create(operation: string, message: string, cause?: unknown) {
    return new {subModuleClassName}OperationError({
      message,
      operation,
      ...(cause !== undefined && { cause })
    })
  }
}`
      }
    },
    // Error Union Types
    {
      title: 'Error Union Types',
      content: {
        type: 'raw',
        value: `/**
 * Union of {subModuleName} domain errors (business logic)
 */
export type {subModuleClassName}DomainError =
  | {subModuleClassName}NotFoundError
  | {subModuleClassName}ValidationError

/**
 * Union of {subModuleName} repository/infrastructure errors
 */
export type {subModuleClassName}RepositoryError = {subModuleClassName}OperationError

/**
 * All possible {subModuleName} errors
 */
export type {subModuleClassName}Error =
  | {subModuleClassName}DomainError
  | {subModuleClassName}RepositoryError

// TODO: Add domain-specific errors here
// Example: {subModuleClassName}InsufficientFundsError, {subModuleClassName}ExpiredError, etc.`
      }
    }
  ]
}

export default contractSubmoduleErrorsTemplate
