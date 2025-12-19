/**
 * Provider Generator for CLI (Refactored)
 *
 * Uses unified infrastructure for consistent generation.
 * Validates inputs using Effect Schema (same as MCP).
 */

import { Console, Effect, ParseResult } from "effect";
import { generateProviderCore, type ProviderCoreOptions } from "../../generators/core/provider";
import { createExecutor } from "../../infrastructure/execution/executor";
import { formatOutput } from "../../infrastructure/output/formatter";
import {
  decodeProviderInput,
  type ProviderInput
} from "../../infrastructure/validation/registry";

/**
 * Provider Generator Options - imported from validation registry
 * for single source of truth
 */
export type ProviderGeneratorOptions = ProviderInput;

/**
 * Provider executor with properly typed generics
 *
 * No type assertions needed - the executor preserves the ProviderInput type
 * throughout the flow, allowing TypeScript to verify all field access.
 */
const providerExecutor = createExecutor<ProviderInput, ProviderCoreOptions>(
  "provider",
  generateProviderCore,
  (validated, metadata) => ({
    ...metadata,
    externalService: validated.externalService,
    platform: validated.platform ?? "node",
    operations: validated.operations ?? [
      "create",
      "read",
      "update",
      "delete",
      "query",
    ],
  })
);

export function generateProvider(options: ProviderGeneratorOptions) {
  return Effect.gen(function* () {
    // Validate input with Effect Schema (like MCP does)
    const validated = yield* decodeProviderInput(options).pipe(
      Effect.mapError((parseError) =>
        new Error(ParseResult.TreeFormatter.formatErrorSync(parseError))
      )
    );

    yield* Console.log(`Creating provider library: ${validated.name}...`);

    const result = yield* providerExecutor.execute({
      ...validated,
      __interfaceType: "cli" as const,
    });

    const output = formatOutput(result, "cli");
    yield* Console.log(output);

    return result;
  });
}
