/**
 * Data-Access Generator for CLI (Refactored)
 *
 * Uses unified infrastructure for consistent generation.
 * Validates inputs using Effect Schema (same as MCP).
 */

import { execSync } from 'node:child_process';
import { Console, Effect, ParseResult } from 'effect';
import {
  type DataAccessCoreOptions,
  generateDataAccessCore,
} from '../../generators/core/data-access';
import { createExecutor } from '../../infrastructure/execution/executor';
import { formatOutput } from '../../infrastructure/output/formatter';
import {
  type DataAccessInput,
  decodeDataAccessInput,
} from '../../infrastructure/validation/registry';

/**
 * Data-Access Generator Options - imported from validation registry
 * for single source of truth
 */
export type DataAccessGeneratorOptions = DataAccessInput;

const dataAccessExecutor = createExecutor<DataAccessInput, DataAccessCoreOptions>(
  'data-access',
  generateDataAccessCore,
  (validated, metadata) => ({
    ...metadata,
    ...(validated.contractLibrary !== undefined && { contractLibrary: validated.contractLibrary }),
  }),
);

export function generateDataAccess(options: DataAccessGeneratorOptions) {
  return Effect.gen(function* () {
    // Validate input with Effect Schema (like MCP does)
    const validated = yield* decodeDataAccessInput(options).pipe(
      Effect.mapError(
        (parseError) => new Error(ParseResult.TreeFormatter.formatErrorSync(parseError)),
      ),
    );

    yield* Console.log(`Creating data-access library: ${validated.name}...`);

    const result = yield* dataAccessExecutor.execute({
      ...validated,
      __interfaceType: 'cli',
    });

    // Format generated code with eslint --fix for dprint compatibility
    yield* Effect.try(() => {
      const projectRoot = result.projectRoot;
      execSync(`pnpm exec eslint ${projectRoot}/src --ext .ts --fix`, {
        stdio: 'ignore',
        cwd: process.cwd(),
      });
    }).pipe(
      Effect.catchAll(() => Effect.void), // Ignore formatting errors
    );

    const output = formatOutput(result, 'cli');
    yield* Console.log(output);

    return result;
  });
}
