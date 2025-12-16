/**
 * Provider Generator MCP Tool Handler (Refactored)
 *
 * Handles provider library generation via MCP protocol using unified infrastructure.
 */

import { Effect, ParseResult } from "effect"
import { generateProviderCore } from "../../generators/core/provider"
import { createExecutor } from "../../infrastructure/execution/executor"
import { formatErrorResponse, formatOutput, formatValidationError } from "../../infrastructure/output/formatter"
import { decodeProviderInput } from "../../infrastructure/validation/registry"
import { ValidationError } from "../utils/validation"
import type { McpResponse } from "../../infrastructure/output/formatter"

/**
 * Create provider executor using unified infrastructure
 */
const providerExecutor = createExecutor(
  "provider",
  generateProviderCore,
  (validated, metadata) => {
    const externalService = validated["externalService"] as string
    const platform = (validated["platform"] as "node" | "browser" | "universal" | "edge" | undefined) || "node"
    const operations = (validated["operations"] as ReadonlyArray<string> | undefined) || ["create", "read", "update", "delete", "query"]
    return {
      ...metadata,
      externalService,
      platform,
      operations
    }
  }
)

/**
 * Handle provider generation with unified infrastructure
 */
export const handleGenerateProvider = (input: unknown) =>
  Effect.gen(function* () {
    // 1. Validate input using proper error channel
    const validated = yield* decodeProviderInput(input).pipe(
      Effect.mapError((parseError) =>
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
        __interfaceType: "mcp" as const
      })
      .pipe(
        Effect.map((result) => formatOutput(result, "mcp")),
        Effect.catchTag("GeneratorExecutionError", (error) =>
          Effect.succeed(formatErrorResponse(error))
        )
      )
  }).pipe(
    // Handle validation errors at top level
    Effect.catchTag("ValidationError", (error) =>
      Effect.succeed({
        success: false,
        message: formatValidationError(error.message)
      } as McpResponse)
    )
  )
