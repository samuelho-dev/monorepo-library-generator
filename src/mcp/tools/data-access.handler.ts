/**
 * Data-Access Generator MCP Tool Handler (Refactored)
 *
 * Handles data-access library generation via MCP protocol using unified infrastructure.
 */

import { Effect, ParseResult } from "effect"
import { generateDataAccessCore } from "../../generators/core/data-access"
import { createExecutor } from "../../infrastructure/execution/executor"
import { formatErrorResponse, formatOutput, formatValidationError } from "../../infrastructure/output/formatter"
import { decodeDataAccessInput } from "../../infrastructure/validation/registry"
import { ValidationError } from "../utils/validation"
import type { McpResponse } from "../../infrastructure/output/formatter"

/**
 * Create data-access executor using unified infrastructure
 */
const dataAccessExecutor = createExecutor(
  "data-access",
  generateDataAccessCore,
  (validated, metadata) => {
    const contractLibrary = validated["contractLibrary"] as string | undefined
    const includeCache = (validated["includeCache"] as boolean | undefined) ?? false
    return {
      ...metadata,
      ...(contractLibrary !== undefined && { contractLibrary }),
      includeCache
    }
  }
)

/**
 * Handle data-access generation with unified infrastructure
 */
export const handleGenerateDataAccess = (input: unknown) =>
  Effect.gen(function* () {
    // 1. Validate input using proper error channel
    const validated = yield* decodeDataAccessInput(input).pipe(
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
          `Would generate data-access library: data-access-${validated.name}`,
          "",
          "📦 Configuration:",
          `  - Name: ${validated.name}`,
          `  - Contract Library: ${validated.contractLibrary || "none"}`,
          `  - Include Cache: ${validated.includeCache ?? false}`,
          "",
          "To actually generate files, set dryRun: false"
        ].join("\n")
      }
    }

    // 3. Execute generator with proper error handling
    return yield* dataAccessExecutor
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
