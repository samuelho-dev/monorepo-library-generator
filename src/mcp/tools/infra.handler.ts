/**
 * Infra Generator MCP Tool Handler (Refactored)
 *
 * Handles infrastructure library generation via MCP protocol using unified infrastructure.
 */

import { Effect, ParseResult } from "effect"
import { generateInfraCore } from "../../generators/core/infra"
import { createExecutor } from "../../infrastructure/execution/executor"
import { formatErrorResponse, formatOutput, formatValidationError } from "../../infrastructure/output/formatter"
import { decodeInfraInput } from "../../infrastructure/validation/registry"
import { ValidationError } from "../utils/validation"
import type { McpResponse } from "../../infrastructure/output/formatter"

/**
 * Create infra executor using unified infrastructure
 */
const infraExecutor = createExecutor(
  "infra",
  generateInfraCore,
  (validated, metadata) => {
    const platform = validated["platform"] as "node" | "browser" | "universal" | "edge" | undefined
    const includeClient = validated["includeClient"] as boolean | undefined
    const includeServer = validated["includeServer"] as boolean | undefined
    const result: any = { ...metadata }
    if (platform !== undefined) {
      result.platform = platform
    }
    if (includeClient && includeServer) {
      result.includeClientServer = true
    }
    return result
  }
)

/**
 * Handle infra generation with unified infrastructure
 */
export const handleGenerateInfra = (input: unknown) =>
  Effect.gen(function* () {
    // 1. Validate input using proper error channel
    const validated = yield* decodeInfraInput(input).pipe(
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
          `Would generate infra library: infra-${validated.name}`,
          "",
          "📦 Configuration:",
          `  - Name: ${validated.name}`,
          `  - Infrastructure Type: ${validated.infraType}`,
          `  - Include Client: ${validated.includeClient ?? true}`,
          `  - Include Server: ${validated.includeServer ?? true}`,
          "",
          "To actually generate files, set dryRun: false"
        ].join("\n")
      }
    }

    // 3. Execute generator with proper error handling
    return yield* infraExecutor
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
