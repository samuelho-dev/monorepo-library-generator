/**
 * Environment Library Generator (Nx Wrapper)
 *
 * Updates the existing libs/env library with type-safe environment
 * variable handling using Effect Config and a t3-env inspired API.
 *
 * Generation Process:
 * 1. Parse existing .env file from workspace root (or use defaults)
 * 2. Generate createEnv.ts (runtime library)
 * 3. Generate env.ts (user's createEnv call scaffolded from .env)
 * 4. Generate index.ts (single entry point)
 *
 * The generator ensures:
 * - Single source of truth (one createEnv call)
 * - Type-safe environment variable access
 * - Eager loading on module initialization (fail fast)
 * - Runtime protection for server vars on client
 * - Simple API: import { env } from '@workspace/env'
 */

import * as path from 'node:path';
import type { Tree } from '@nx/devkit';
import { formatFiles, logger } from '@nx/devkit';
import type { EnvGeneratorSchema } from './schema';
import { generateCreateEnvFile } from './templates/createEnv.template';
import { generateEnvScaffoldFile } from './templates/env-scaffold.template';
import { generateIndexFile } from './templates/index.template';
import { findDotEnvFile, parseDotEnvFile } from './utils/parse-dotenv';

/**
 * Environment Library Generator for Nx Workspaces
 *
 * Updates libs/env with generated environment variable handling.
 * Parses existing .env file and generates type-safe Effect Config loaders.
 *
 * @param tree - Nx Tree API for virtual file system operations
 * @param schema - User-provided generator options
 * @returns Callback function that displays post-generation instructions
 */
export async function envGenerator(tree: Tree, schema: EnvGeneratorSchema) {
  // Determine workspace root
  const workspaceRoot = tree.root || process.cwd();

  // Determine project root (default to libs/env)
  const projectRoot = schema.projectRoot || 'libs/env';
  const sourceRoot = path.join(projectRoot, 'src');

  // Validate that the project exists (should be created by init command)
  if (!tree.exists(projectRoot)) {
    throw new Error(
      `Environment library not found at ${projectRoot}. ` +
        `Run 'pnpm exec monorepo-library-generator init' first to create the workspace structure.`,
    );
  }

  logger.info(`🔍 Searching for .env file in workspace root...`);

  // Phase 1: Parse .env file from workspace root
  const dotEnvPath = findDotEnvFile(workspaceRoot);
  const vars = dotEnvPath ? parseDotEnvFile(dotEnvPath) : parseDotEnvFile(''); // Will use defaults

  logger.info(`📋 Parsed ${vars.length} environment variables`);
  logger.info(`   - Shared: ${vars.filter((v) => v.context === 'shared').length}`);
  logger.info(`   - Client: ${vars.filter((v) => v.context === 'client').length}`);
  logger.info(`   - Server: ${vars.filter((v) => v.context === 'server').length}`);

  // Phase 2: Generate source files using new templates
  logger.info(`📝 Generating type-safe environment files...`);

  // Generate createEnv.ts (runtime library)
  const createEnvContent = generateCreateEnvFile();
  tree.write(path.join(sourceRoot, 'createEnv.ts'), createEnvContent);
  logger.info(`   ✓ ${sourceRoot}/createEnv.ts (runtime library)`);

  // Generate env.ts (user's createEnv call)
  const envContent = generateEnvScaffoldFile(vars);
  tree.write(path.join(sourceRoot, 'env.ts'), envContent);
  logger.info(`   ✓ ${sourceRoot}/env.ts (environment definition)`);

  // Generate index.ts (single entry point)
  const indexContent = generateIndexFile();
  tree.write(path.join(sourceRoot, 'index.ts'), indexContent);
  logger.info(`   ✓ ${sourceRoot}/index.ts (entry point)`);

  // Clean up old files that are no longer needed
  const obsoleteFiles = [
    'types.ts',
    'config.ts',
    'schema.ts',
    'parse.ts',
    'client.ts',
    'server.ts',
  ];

  for (const file of obsoleteFiles) {
    const filePath = path.join(sourceRoot, file);
    if (tree.exists(filePath)) {
      tree.delete(filePath);
      logger.info(`   🗑️  Removed obsolete ${sourceRoot}/${file}`);
    }
  }

  // Format generated files
  await formatFiles(tree);

  // Return post-generation callback
  return () => {
    const _dotEnvMessage = dotEnvPath
      ? `\n📄 Parsed from: ${dotEnvPath}`
      : '\n⚠️  No .env file found - using defaults';
  };
}
