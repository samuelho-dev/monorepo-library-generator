/**
 * Provider Generator MCP Tool Handler (Refactored)
 *
 * Handles provider library generation via MCP protocol using unified infrastructure.
 */

import { Effect, ParseResult } from "effect"
import { generateProviderCore, type ProviderCoreOptions } from "../../generators/core/provider"
import {
  createExecutor,
  decodeProviderInput,
  formatErrorResponse,
  formatOutput,
  formatValidationError,
  type ProviderInput
} from "../../infrastructure"
import { ValidationError } from "../utils/validation"

/**
 * Create provider executor using unified infrastructure
 *
 * Properly typed with ProviderInput and ProviderCoreOptions generics.
 * No type assertions needed - TypeScript infers all types correctly.
 */
const providerExecutor = createExecutor<ProviderInput, ProviderCoreOptions>(
  "provider",
  generateProviderCore,
  (validated, metadata) => ({
    ...metadata,
    externalService: validated.externalService,
    platform: validated.platform ?? "node",
    ...(validated.operations !== undefined && { operations: validated.operations })
  })
)

/**
 * Handle provider generation with unified infrastructure
 */
export const handleGenerateProvider = (input: unknown) =>
  Effect.gen(function*() {
    // 1. Validate input using proper error channel
    const validated = yield* decodeProviderInput(input).pipe(
      Effect.mapError(
        (parseError) =>
          new ValidationError({
            message: ParseResult.TreeFormatter.formatErrorSync(parseError),
            cause: parseError
          })
      )
    )

    // 2. Handle dry-run mode
    if (validated.dryRun) {
      return {
        success: true,
        message: [
          "🔍 DRY RUN MODE",
          "",
          `Would generate provider library: provider-${validated.name}`,
          "",
          "📦 Configuration:",
          `  - Name: ${validated.name}`,
          `  - Operations: ${validated.operations?.join(", ") || "all"}`,
          "",
          "To actually generate files, set dryRun: false"
        ].join("\n")
      }
    }

    // 3. Execute generator with proper error handling
    return yield* providerExecutor
      .execute({
        ...validated,
        __interfaceType: "mcp"
      })
      .pipe(
        Effect.map((result) => formatOutput(result, "mcp")),
        Effect.catchTag("GeneratorExecutionError", (error) => Effect.succeed(formatErrorResponse(error)))
      )
  }).pipe(
    // Handle validation errors at top level
    Effect.catchTag("ValidationError", (error) =>
      Effect.succeed({
        success: false,
        message: formatValidationError(error.message)
      }))
  )
