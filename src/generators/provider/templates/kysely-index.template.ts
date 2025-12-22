/**
 * Kysely Provider Index Template
 *
 * Specialized index.ts template for the Kysely database query builder provider.
 * This exports Kysely-specific error types and the service with static layers.
 *
 * @module monorepo-library-generator/provider/kysely-index-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import type { ProviderTemplateOptions } from '../../../utils/types';

/**
 * Generate Kysely provider index.ts file
 *
 * Exports:
 * - Kysely-specific error types (Error, Connection, Query, Transaction, Constraint)
 * - Service tag with static layers (Live, Test, Dev)
 * - Database type interface
 * - Validation utilities
 *
 * Note: Does NOT export from layers.ts - Kysely uses static layers on the service class.
 */
export function generateKyselyIndexFile(options: ProviderTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, packageName } = options;

  // File header
  builder.addFileHeader({
    title: `${className} Provider Library`,
    description: `Kysely database query builder provider with Effect integration.

This library wraps the Kysely query builder in Effect types for composable error handling.
Types should come from prisma-effect-kysely for type-safe database access.

Effect 3.0+ Pattern:
  - ${className} extends Context.Tag
  - Access layers via static members: ${className}.Test, ${className}.makeLive()

Usage:
  import { ${className} } from '${packageName}';
  const testLayer = ${className}.Test;
  const liveLayer = ${className}.makeLive(kyselyInstance);`,
  });

  builder.addBlankLine();

  // Error exports - Kysely-specific errors
  builder.addSectionComment('Error Types');
  builder.addBlankLine();

  builder.addRaw(`export {
  ${className}Error,
  ${className}ConnectionError,
  ${className}QueryError,
  ${className}TransactionError,
  ${className}ConstraintError,
} from "./lib/errors";
export type { ${className}ProviderError } from "./lib/errors";
`);

  builder.addBlankLine();

  // Service exports
  builder.addSectionComment('Service');
  builder.addBlankLine();

  builder.addComment(`${className} - Query builder provider with Effect integration`);
  builder.addComment('');
  builder.addComment('Effect 3.0+ Pattern: Context.Tag with static layer members');
  builder.addComment('Access layers via static members:');
  builder.addComment(`  - ${className}.Test     (uses Kysely DummyDriver for cold queries)`);
  builder.addComment(`  - ${className}.Dev      (DummyDriver with query logging)`);
  builder.addComment(`  - ${className}.makeLive(kyselyInstance)  (production)`);
  builder.addBlankLine();

  builder.addRaw(`export { ${className}, type Database, type ${className}ServiceInterface } from "./lib/service";
`);

  builder.addBlankLine();

  // Usage example
  builder.addComment('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  builder.addComment('Usage Example');
  builder.addComment('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  builder.addComment('');
  builder.addComment("import { Effect } from 'effect';");
  builder.addComment(`import { ${className} } from '${packageName}';`);
  builder.addComment('');
  builder.addComment('const program = Effect.gen(function* () {');
  builder.addComment(`  const db = yield* ${className};`);
  builder.addComment('  const users = yield* db.query((kysely) =>');
  builder.addComment("    kysely.selectFrom('users').selectAll().execute()");
  builder.addComment('  );');
  builder.addComment('  return users;');
  builder.addComment('});');
  builder.addComment('');
  builder.addComment(`// For testing with Kysely's DummyDriver:`);
  builder.addComment(`const runnable = program.pipe(Effect.provide(${className}.Test));`);
  builder.addComment('');
  builder.addComment('// For production with real database:');
  builder.addComment(
    `// const runnable = program.pipe(Effect.provide(${className}.makeLive(kyselyInstance)));`,
  );
  builder.addComment('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return builder.toString();
}
