/**
 * Contract Generator MCP Tool Handler (Refactored)
 *
 * Handles contract library generation via MCP protocol using unified infrastructure.
 * No longer shells out to CLI/Nx - calls core generators directly.
 */

import { Effect, ParseResult } from "effect"
import { generateContractCore } from "../../generators/core/contract"
import { createExecutor } from "../../infrastructure/execution/executor"
import { formatErrorResponse, formatOutput, formatValidationError } from "../../infrastructure/output/formatter"
import { decodeContractInput } from "../../infrastructure/validation/registry"
import { ValidationError } from "../utils/validation"
import type { McpResponse } from "../../infrastructure/output/formatter"

/**
 * Create contract executor using unified infrastructure
 */
const contractExecutor = createExecutor(
  "contract",
  generateContractCore,
  (validated, metadata) => {
    const entities = validated["entities"] as ReadonlyArray<string> | undefined
    const includeCQRS = (validated["includeCQRS"] as boolean | undefined) ?? false
    const includeRPC = (validated["includeRPC"] as boolean | undefined) ?? false
    return {
      ...metadata,
      ...(entities !== undefined && { entities }),
      includeCQRS,
      includeRPC
    }
  }
)

/**
 * Handle contract generation with unified infrastructure
 *
 * Before: 137 lines with shell exec, command building, text parsing
 * After: ~40 lines with direct core generator invocation using proper Effect patterns
 */
export const handleGenerateContract = (input: unknown) =>
  Effect.gen(function* () {
    // 1. Validate input with Effect Schema using proper error channel
    const validated = yield* decodeContractInput(input).pipe(
      Effect.mapError((parseError) =>
        new ValidationError({
          message: ParseResult.TreeFormatter.formatErrorSync(parseError),
          cause: parseError
        })
      )
    )

    // 2. Handle dry-run mode (TODO: implement in executor)
    if (validated.dryRun) {
      return {
        success: true,
        message: [
          "🔍 DRY RUN MODE",
          "",
          `Would generate contract library: contract-${validated.name}`,
          "",
          "📦 Configuration:",
          `  - Name: ${validated.name}`,
          `  - Entities: ${validated.entities?.join(", ") || "none"}`,
          `  - CQRS: ${validated.includeCQRS ?? false}`,
          `  - RPC: ${validated.includeRPC ?? false}`,
          "",
          "To actually generate files, set dryRun: false"
        ].join("\n")
      }
    }

    // 3. Execute generator using unified infrastructure with proper error handling
    return yield* contractExecutor
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
