/**
 * Feature RPC Errors Template Definition
 *
 * Declarative template for generating rpc/errors.ts in feature libraries.
 * Provides domain-specific RPC boundary error transformations.
 *
 * @module monorepo-library-generator/templates/definitions/feature/rpc-errors
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Feature RPC Errors Template Definition
 *
 * Generates an rpc/errors.ts file with:
 * - RPC error imports from infra-rpc
 * - Domain-specific RPC boundary wrapper
 * - Error transformation from domain to RPC errors
 */
export const featureRpcErrorsTemplate: TemplateDefinition = {
  id: "feature/rpc-errors",
  meta: {
    title: "{className} RPC Errors",
    description: `RPC error exports and domain-specific error boundary.

This file provides:
- RPC errors (Schema.TaggedError) from infra-rpc for serialization
- Domain errors (Data.TaggedError) from shared/errors for Effect.catchTag
- Domain-specific RPC boundary wrapper for error transformation

Error Flow:
  Domain Error (Data.TaggedError) → with{className}RpcBoundary → RPC Error (Schema.TaggedError)`,
    module: "{scope}/feature-{fileName}/rpc/errors"
  },
  imports: [
    { from: "effect", items: ["Effect"] },
    {
      from: "{scope}/infra-rpc",
      items: [
        "RpcConflictError",
        "RpcForbiddenError",
        "RpcInternalError",
        "RpcNotFoundError",
        "RpcValidationError"
      ]
    },
    {
      from: "../shared/errors",
      items: ["{className}FeatureError"],
      isTypeOnly: true
    }
  ],
  sections: [
    // Import Notes
    {
      title: "Import Notes",
      content: {
        type: "raw",
        value: `// NOTE: For RPC errors (Schema.TaggedError), import directly from {scope}/infra-rpc:
// import { RpcNotFoundError, RpcValidationError, ... } from "{scope}/infra-rpc"
//
// For domain errors (Data.TaggedError), import directly from ../shared/errors:
// import { {className}NotFoundError, ... } from "../shared/errors"`
      }
    },
    // Domain-Specific RPC Boundary
    {
      title: "Domain-Specific RPC Boundary",
      content: {
        type: "raw",
        value: `/**
 * Transform {className} domain errors to RPC errors
 *
 * Use this at RPC handler boundaries to transform domain-specific
 * errors into serializable RPC errors with proper HTTP status codes.
 *
 * @example
 * \`\`\`typescript
 * const handler = {propertyName}Service.get(id).pipe(
 *   with{className}RpcBoundary
 * )
 * \`\`\`
 *
 * For custom transformations, use Effect.catchTag directly:
 * @example
 * \`\`\`typescript
 * const handler = {propertyName}Service.get(id).pipe(
 *   Effect.catchTag("{className}NotFoundError", (e) =>
 *     Effect.fail(new RpcNotFoundError({
 *       message: e.message,
 *       resource: "{className}",
 *       id: e.{propertyName}Id
 *     }))
 *   )
 * )
 * \`\`\`
 */
export const with{className}RpcBoundary = <A, R>(
  effect: Effect.Effect<A, {className}FeatureError, R>
) =>
  effect.pipe(
    // Domain Errors → RPC Errors
    Effect.catchTag("{className}NotFoundError", (e) =>
      Effect.fail(new RpcNotFoundError({
        message: e.message,
        resource: "{className}"
      }))
    ),
    Effect.catchTag("{className}ValidationError", (e) =>
      Effect.fail(new RpcValidationError({
        message: e.message,
        issues: []
      }))
    ),
    Effect.catchTag("{className}AlreadyExistsError", (e) =>
      Effect.fail(new RpcConflictError({
        message: e.message
      }))
    ),
    Effect.catchTag("{className}PermissionError", (e) =>
      Effect.fail(new RpcForbiddenError({
        message: e.message
      }))
    ),
    // Service Errors → RPC Internal Error
    Effect.catchTag("{className}DependencyError", () =>
      Effect.fail(new RpcInternalError({
        message: "Service dependency failure"
      }))
    ),
    Effect.catchTag("{className}OrchestrationError", () =>
      Effect.fail(new RpcInternalError({
        message: "Operation could not be completed"
      }))
    ),
    Effect.catchTag("{className}InternalError", () =>
      Effect.fail(new RpcInternalError({
        message: "An unexpected error occurred"
      }))
    ),
    // Catch-all for infrastructure errors
    Effect.catchAll(() =>
      Effect.fail(new RpcInternalError({
        message: "An unexpected error occurred"
      }))
    )
  )`
      }
    }
  ]
}

export default featureRpcErrorsTemplate
