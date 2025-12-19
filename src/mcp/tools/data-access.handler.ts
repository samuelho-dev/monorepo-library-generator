/**
 * Data-Access Generator MCP Tool Handler (Refactored)
 *
 * Handles data-access library generation via MCP protocol using unified infrastructure.
 */

import { Effect, ParseResult } from "effect"
import { type DataAccessCoreOptions, generateDataAccessCore } from "../../generators/core/data-access"
import { createExecutor } from "../../infrastructure/execution/executor"
import { formatErrorResponse, formatOutput, formatValidationError } from "../../infrastructure/output/formatter"
import { type DataAccessInput, decodeDataAccessInput } from "../../infrastructure/validation/registry"
import { ValidationError } from "../utils/validation"

/**
 * Create data-access executor using unified infrastructure
 * Explicit type parameters ensure type safety without assertions
 */
const dataAccessExecutor = createExecutor<DataAccessInput, DataAccessCoreOptions>(
  "data-access",
  generateDataAccessCore,
  (validated, metadata) => ({
    ...metadata,
    includeCache: validated.includeCache ?? false,
    ...(validated.contractLibrary !== undefined && { contractLibrary: validated.contractLibrary })
  })
)

/**
 * Handle data-access generation with unified infrastructure
 */
export const handleGenerateDataAccess = (input: unknown) =>
  Effect.gen(function*() {
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
