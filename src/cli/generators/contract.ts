/**
 * Contract Generator for CLI (Effect Wrapper)
 *
 * Thin wrapper around the shared contract generator core.
 * Uses Effect FileSystem via EffectFsAdapter.
 *
 * @module monorepo-library-generator/cli/generators/contract
 */

import { Effect, Console } from 'effect';
import { FileSystem, Path } from '@effect/platform';
import { createEffectFsAdapter } from '../../utils/effect-fs-adapter';
import { generateContractCore, type GeneratorResult } from '../../generators/core/contract-generator-core';

/**
 * Contract Generator Options
 */
export interface ContractGeneratorOptions {
  readonly name: string;
  readonly description?: string;
  readonly tags?: string;
  readonly includeCQRS?: boolean;
  readonly includeRPC?: boolean;
}

/**
 * Generate a contract library (CLI)
 *
 * Generates a contract library following Effect-based architecture patterns.
 * Uses Effect-native FileSystem operations.
 *
 * @param options - Generator options
 * @returns Effect that succeeds with GeneratorResult or fails with platform errors
 */
export function generateContract(options: ContractGeneratorOptions) {
  return Effect.gen(function* () {
    // 1. Get workspace root
    const workspaceRoot = yield* Effect.sync(() => process.cwd());

    // 2. Create Effect FileSystem adapter (requires FileSystem and Path services)
    const adapter = yield* createEffectFsAdapter(workspaceRoot);

    // 3. Run core generator
    yield* Console.log(`Creating contract library: ${options.name}...`);

    const result: GeneratorResult = yield* (
      generateContractCore(adapter, options) as Effect.Effect<GeneratorResult>
    );

    // 4. CLI-specific output
    yield* Console.log('✨ Contract library created successfully!');
    yield* Console.log(`  Location: ${result.projectRoot}`);
    yield* Console.log(`  Package: ${result.packageName}`);
    yield* Console.log(`\nNext steps:`);
    yield* Console.log(`  1. cd ${result.projectRoot}`);
    yield* Console.log(`  2. pnpm install`);
    yield* Console.log(`  3. pnpm build`);

    return result;
  });
}
