/**
 * Feature Errors Template Definition
 *
 * Declarative template for generating shared/errors.ts in feature libraries.
 * Defines service-level errors using Data.TaggedError pattern.
 *
 * @module monorepo-library-generator/templates/definitions/feature/errors
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Feature Errors Template Definition
 *
 * Generates a complete errors.ts file with:
 * - Domain errors (NotFound, Validation, AlreadyExists, Permission)
 * - Service-level errors (Dependency, Orchestration, Internal)
 * - Error codes enumeration
 * - Combined error union types
 */
export const featureErrorsTemplate: TemplateDefinition = {
  id: "feature/errors",
  meta: {
    title: "{className} Feature Errors",
    description: `Service-level errors for {propertyName} feature.

Error Categories:
- Domain Errors: NotFound, Validation, AlreadyExists, Permission
- Service Errors: Dependency, Orchestration, Internal

CONTRACT-FIRST: Domain errors ({className}NotFoundError, etc.) are imported from contract library.
This file defines SERVICE-LEVEL errors for orchestration failures.`,
    module: "{scope}/feature-{fileName}/shared/errors"
  },
  imports: [
    { from: "effect", items: ["Data"] },
    {
      from: "{scope}/contract-{fileName}",
      items: [
        "{className}NotFoundError",
        "{className}ValidationError",
        "{className}AlreadyExistsError",
        "{className}PermissionError"
      ]
    }
  ],
  sections: [
    // Re-export Domain Errors
    {
      title: "Domain Error Re-exports",
      content: {
        type: "raw",
        value: `/**
 * Re-export domain errors from contract library
 *
 * These are the canonical domain errors used throughout the feature.
 * Import from contract library directly when possible.
 */
export {
  {className}NotFoundError,
  {className}ValidationError,
  {className}AlreadyExistsError,
  {className}PermissionError
}`
      }
    },
    // Service Error Codes
    {
      title: "Service Error Codes",
      content: {
        type: "raw",
        value: `/**
 * {className} Service Error Codes
 *
 * Codes for service-level errors (not domain errors).
 * Domain errors use their own specific codes.
 */
export const {className}ServiceErrorCode = {
  /** Error from downstream service or dependency */
  DEPENDENCY: "{className}ServiceDependencyError" as const,
  /** Error during multi-step orchestration */
  ORCHESTRATION: "{className}ServiceOrchestrationError" as const,
  /** Unexpected internal error */
  INTERNAL: "{className}ServiceInternalError" as const
}`
      }
    },
    // Service Dependency Error
    {
      title: "Service Errors",
      content: {
        type: "raw",
        value: `/**
 * {className} Dependency Error
 *
 * Thrown when a downstream service or external dependency fails.
 * Examples: Database timeout, external API failure, cache miss with fallback failure.
 */
export class {className}DependencyError extends Data.TaggedError("{className}DependencyError")<{
  readonly message: string
  readonly code: typeof {className}ServiceErrorCode.DEPENDENCY
  readonly dependency: string
  readonly cause?: unknown
}> {
  static make(dependency: string, message: string, cause?: unknown) {
    return new {className}DependencyError({
      message,
      code: {className}ServiceErrorCode.DEPENDENCY,
      dependency,
      cause
    })
  }
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * {className} Orchestration Error
 *
 * Thrown when a multi-step operation fails partway through.
 * Examples: Saga pattern failures, distributed transaction rollback.
 */
export class {className}OrchestrationError extends Data.TaggedError("{className}OrchestrationError")<{
  readonly message: string
  readonly code: typeof {className}ServiceErrorCode.ORCHESTRATION
  readonly step: string
  readonly completedSteps: readonly string[]
  readonly cause?: unknown
}> {
  static make(
    step: string,
    completedSteps: readonly string[],
    message: string,
    cause?: unknown
  ) {
    return new {className}OrchestrationError({
      message,
      code: {className}ServiceErrorCode.ORCHESTRATION,
      step,
      completedSteps,
      cause
    })
  }
}`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * {className} Internal Error
 *
 * Thrown for unexpected errors that don't fit other categories.
 * These should be investigated and potentially reclassified.
 */
export class {className}InternalError extends Data.TaggedError("{className}InternalError")<{
  readonly message: string
  readonly code: typeof {className}ServiceErrorCode.INTERNAL
  readonly cause?: unknown
}> {
  static make(message: string, cause?: unknown) {
    return new {className}InternalError({
      message,
      code: {className}ServiceErrorCode.INTERNAL,
      cause
    })
  }
}`
      }
    },
    // Combined Error Types
    {
      title: "Combined Error Types",
      content: {
        type: "raw",
        value: `/**
 * {className} Domain Error Union
 *
 * All domain-level errors from the contract library.
 */
export type {className}DomainError =
  | {className}NotFoundError
  | {className}ValidationError
  | {className}AlreadyExistsError
  | {className}PermissionError`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * {className} Service Error Union
 *
 * All service-level errors defined in this feature.
 */
export type {className}ServiceError =
  | {className}DependencyError
  | {className}OrchestrationError
  | {className}InternalError`
      }
    },
    {
      content: {
        type: "raw",
        value: `/**
 * {className} Feature Error Union
 *
 * All possible errors from this feature (domain + service).
 * Use this type in service method return types.
 */
export type {className}FeatureError =
  | {className}DomainError
  | {className}ServiceError`
      }
    }
  ]
}

export default featureErrorsTemplate
