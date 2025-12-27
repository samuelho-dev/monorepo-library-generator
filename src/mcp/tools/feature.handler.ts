/**
 * Feature Generator MCP Tool Handler (Refactored)
 *
 * Handles feature library generation via MCP protocol using unified infrastructure.
 */

import { Effect, ParseResult } from "effect"
import { type FeatureCoreOptions, generateFeatureCore } from "../../generators/core/feature"
import {
  createExecutor,
  decodeFeatureInput,
  type FeatureInput,
  formatErrorResponse,
  formatOutput,
  formatValidationError
} from "../../infrastructure"
import { ValidationError } from "../utils/validation"

/**
 * Create feature executor using unified infrastructure
 * Explicit type parameters ensure type safety without assertions
 */
const featureExecutor = createExecutor<FeatureInput, FeatureCoreOptions>(
  "feature",
  generateFeatureCore,
  (validated, metadata) => ({
    ...metadata,
    ...(validated.dataAccessLibrary !== undefined && {
      dataAccessLibrary: validated.dataAccessLibrary
    }),
    includeClientState: validated.includeClientState ?? false,
    ...(validated.scope !== undefined && { scope: validated.scope }),
    ...(validated.platform !== undefined && { platform: validated.platform }),
    ...(validated.includeClientServer !== undefined && {
      includeClientServer: validated.includeClientServer
    }),
    includeCQRS: validated.includeCQRS ?? false
  })
)

/**
 * Handle feature generation with unified infrastructure
 */
export const handleGenerateFeature = (input: unknown) =>
  Effect.gen(function*() {
    // 1. Validate input using proper error channel
    const validated = yield* decodeFeatureInput(input).pipe(
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
          `Would generate feature library: feature-${validated.name}`,
          "",
          "📦 Configuration:",
          `  - Name: ${validated.name}`,
          `  - Data Access Library: ${validated.dataAccessLibrary || "none"}`,
          `  - Include Client State: ${validated.includeClientState ?? false}`,
          "",
          "To actually generate files, set dryRun: false"
        ].join("\n")
      }
    }

    // 3. Execute generator with proper error handling
    return yield* featureExecutor
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
