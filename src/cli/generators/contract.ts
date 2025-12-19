/**
 * Contract Generator for CLI (Refactored)
 *
 * Uses unified infrastructure for consistent generation across all interfaces.
 * Validates inputs using Effect Schema (same as MCP).
 */

import { Console, Effect, ParseResult } from "effect";
import { generateContractCore, type ContractCoreOptions } from "../../generators/core/contract";
import { createExecutor } from "../../infrastructure/execution/executor";
import { formatOutput } from "../../infrastructure/output/formatter";
import {
  decodeContractInput,
  type ContractInput
} from "../../infrastructure/validation/registry";

/**
 * Contract Generator Options - imported from validation registry
 * for single source of truth
 */
export type ContractGeneratorOptions = ContractInput;

/**
 * Create contract executor using unified infrastructure
 * Explicit type parameters ensure type safety without assertions
 */
const contractExecutor = createExecutor<ContractInput, ContractCoreOptions>(
  "contract",
  generateContractCore,
  (validated, metadata) => ({
    ...metadata,
    includeCQRS: validated.includeCQRS ?? false,
    includeRPC: validated.includeRPC ?? false,
    ...(validated.entities !== undefined && { entities: validated.entities })
  })
);

/**
 * Generate Contract Library (CLI)
 *
 * Before: 158 lines with manual metadata computation and infrastructure generation
 * After: ~50 lines using unified executor
 */
export function generateContract(options: ContractGeneratorOptions) {
  return Effect.gen(function* () {
    // Validate input with Effect Schema (like MCP does)
    const validated = yield* decodeContractInput(options).pipe(
      Effect.mapError((parseError) =>
        new Error(ParseResult.TreeFormatter.formatErrorSync(parseError))
      )
    );

    yield* Console.log(`Creating contract library: ${validated.name}...`);

    // Execute using unified infrastructure
    const result = yield* contractExecutor.execute({
      ...validated,
      __interfaceType: "cli" as const,
    });

    // Format and display output
    const output = formatOutput(result, "cli");
    yield* Console.log(output);

    return result;
  });
}
