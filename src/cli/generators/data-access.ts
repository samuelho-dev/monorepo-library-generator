/**
 * Data Access Generator for CLI (Effect Wrapper)
 *
 * Thin wrapper around the shared data-access generator core.
 * Uses Effect FileSystem via EffectFsAdapter.
 */

import { Effect, Console } from 'effect';
import { FileSystem, Path } from '@effect/platform';
import { createEffectFsAdapter } from '../../utils/effect-fs-adapter';
import { generateDataAccessCore, type GeneratorResult } from '../../generators/core/data-access-generator-core';

/**
 * Data Access Generator Options
 */
export interface DataAccessGeneratorOptions {
  readonly name: string;
  readonly description?: string;
  readonly tags?: string;
}

/**
 * Generate a data-access library (CLI)
 */
export function generateDataAccess(options: DataAccessGeneratorOptions) {
  return Effect.gen(function* () {
    const workspaceRoot = yield* Effect.sync(() => process.cwd());
    const adapter = yield* createEffectFsAdapter(workspaceRoot);

    yield* Console.log(`Creating data-access library: ${options.name}...`);

    const result: GeneratorResult = yield* (
      generateDataAccessCore(adapter, options) as Effect.Effect<GeneratorResult>
    );

    yield* Console.log('✨ Data access library created successfully!');
    yield* Console.log(`  Location: ${result.projectRoot}`);
    yield* Console.log(`  Package: ${result.packageName}`);
    yield* Console.log(`\nNext steps:`);
    yield* Console.log(`  1. cd ${result.projectRoot}`);
    yield* Console.log(`  2. Customize repository implementation`);
    yield* Console.log(`  3. pnpm install && pnpm build`);

    return result;
  });
}
