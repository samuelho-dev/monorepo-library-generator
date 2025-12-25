/**
 * Contract Errors Template
 *
 * Generates errors.ts file for contract libraries with comprehensive
 * domain and repository error definitions using Data.TaggedError pattern.
 *
 * Uses factory functions for consistent error generation.
 *
 * @module monorepo-library-generator/contract/errors-template
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import type { ContractTemplateOptions } from "../../../utils/types"
import { WORKSPACE_CONFIG } from "../../../utils/workspace-config"
import {
  createContractCombinedErrorType,
  createContractDomainErrors,
  createContractRepositoryErrors
} from "../../shared/factories"

/**
 * Generate errors.ts file for contract library
 *
 * Creates comprehensive error definitions including:
 * - Domain errors (business logic errors)
 * - Repository errors (data access errors)
 * - Helper factory methods
 * - Error union types
 */
export function generateErrorsFile(options: ContractTemplateOptions) {
  const builder = new TypeScriptBuilder()
  const { className, fileName, propertyName } = options
  const domainName = propertyName
  const scope = WORKSPACE_CONFIG.getScope()

  // Add comprehensive file header with documentation
  builder.addRaw(createFileHeader(className, domainName, fileName, scope))

  // Add imports
  builder.addImports([{ from: "effect", imports: ["Data"] }])

  // Generate domain errors using factory
  createContractDomainErrors({ className, propertyName })(builder)

  // Add TODO comment for custom domain errors
  builder.addComment("TODO: Add domain-specific errors here")
  builder.addComment("Example - State transition error (if domain has status/state machine):")
  builder.addComment(
    `export class ${className}InvalidStateError extends Data.TaggedError("${className}InvalidStateError")<{`
  )
  builder.addComment("  readonly message: string")
  builder.addComment("  readonly currentState: string")
  builder.addComment("  readonly targetState: string")
  builder.addComment(`  readonly ${propertyName}Id: string`)
  builder.addComment("}> {")
  builder.addComment(`  static create(params: {`)
  builder.addComment("    currentState: string")
  builder.addComment("    targetState: string")
  builder.addComment(`    ${propertyName}Id: string`)
  builder.addComment("  }) {")
  builder.addComment(`    return new ${className}InvalidStateError({`)
  builder.addComment(
    `      message: \`Cannot transition ${domainName} from \${params.currentState} to \${params.targetState}\`,`
  )
  builder.addComment("      ...params")
  builder.addComment("    })")
  builder.addComment("  }")
  builder.addComment("}")

  // Generate repository errors using factory
  createContractRepositoryErrors({ className, propertyName })(builder)

  // Generate combined error type using factory
  createContractCombinedErrorType(className)(builder)

  return builder.toString()
}

/**
 * Create comprehensive file header with documentation
 */
function createFileHeader(className: string, domainName: string, fileName: string, scope: string) {
  return `/**
 * ${className} Domain Errors
 *
 * Defines all error types for ${domainName} domain operations.
 *
 * ERROR TYPE SELECTION GUIDE:
 * ===========================
 *
 * 1. Data.TaggedError - For Domain & Repository Errors (DEFAULT CHOICE)
 *    ✅ Use when: Errors stay within your service boundary (same process)
 *    ✅ Use when: Repository errors, business logic errors, service errors
 *    ✅ Benefits: Lightweight, better performance, simpler API
 *    ✅ Pattern: Used in this template by default
 *    ❌ Cannot: Serialize over network boundaries (RPC, HTTP)
 *
 *    Example:
 *    \`\`\`typescript
 *    export class ${className}NotFoundError extends Data.TaggedError("${className}NotFoundError")<{
 *      readonly message: string
 *      readonly ${domainName}Id: string
 *    }> {}
 *    \`\`\`
 *
 * 2. Schema.TaggedError - For RPC/Network Boundaries (SPECIAL CASES ONLY)
 *    ✅ Use when: Errors cross network boundaries (client ↔ server RPC)
 *    ✅ Use when: Building APIs that expose errors to external clients
 *    ✅ Benefits: Fully serializable, can cross process boundaries
 *    ✅ Example use cases:
 *       - tRPC procedures that return errors to frontend
 *       - Microservice RPC calls between services
 *       - Public API error responses
 *    ⚠️  Caution: More complex API, requires Schema definitions
 *    ⚠️  Overhead: Adds serialization/deserialization cost
 *
 * IMPORTANT DECISION:
 * This template uses Data.TaggedError for ALL errors (domain + repository).
 * This is CORRECT for most use cases because:
 * - Repository errors stay within the same process (data-access → feature)
 * - Service errors stay within the same process (feature → app)
 * - Only when building RPC endpoints (e.g., tRPC) should you use Schema.TaggedError
 *
 * If you need RPC-serializable errors, see /libs/contract/${fileName}/src/lib/rpc.ts
 *
 * TODO: Customize this file for your domain:
 * 1. Add domain-specific error types as needed (use Data.TaggedError)
 * 2. Add helper factory methods for common error scenarios
 * 3. Consider adding:
 *    - State transition errors (if domain has state machine)
 *    - Business rule violation errors
 *    - Resource conflict errors
 * 4. ONLY if building RPC APIs: Add Schema.TaggedError variants in rpc.ts
 *
 * @see https://effect.website/docs/guides/error-management for error handling
 * @see libs/contract/${fileName}/src/lib/rpc.ts for RPC-serializable errors
 * @module ${scope}/contract-${fileName}/errors
 */`
}
