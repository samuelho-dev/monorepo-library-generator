/**
 * Data Access Library Generator (Nx Wrapper)
 *
 * Thin wrapper around the shared data-access generator core.
 * Uses Nx Tree API via TreeAdapter.
 */

import { Tree, formatFiles, addProjectConfiguration } from '@nx/devkit';
import { Effect } from 'effect';
import type { DataAccessGeneratorSchema } from './schema.d';
import { createTreeAdapter } from '../../utils/tree-adapter';
import { generateDataAccessCore, type GeneratorResult } from '../core/data-access-generator-core';

/**
 * Data access generator for Nx workspaces
 */
export default async function dataAccessGenerator(
  tree: Tree,
  schema: DataAccessGeneratorSchema,
) {
  const adapter = createTreeAdapter(tree);

  const coreOptions: Parameters<typeof generateDataAccessCore>[1] = {
    name: schema.name,
    ...(schema.description && { description: schema.description }),
    ...(schema.directory && { directory: schema.directory }),
    workspaceRoot: tree.root,
  };

  const result: GeneratorResult = await Effect.runPromise(
    generateDataAccessCore(adapter, coreOptions) as Effect.Effect<GeneratorResult, never>
  );

  // Generate Nx-specific tsconfig files
  const tsconfigLib = {
    extends: './tsconfig.json',
    compilerOptions: {
      outDir: '../../dist/out-tsc',
      declaration: true,
      types: ['node'],
    },
    include: ['src/**/*.ts'],
    exclude: ['jest.config.ts', 'src/**/*.spec.ts', 'src/**/*.test.ts'],
  };

  tree.write(
    `${result.projectRoot}/tsconfig.lib.json`,
    JSON.stringify(tsconfigLib, null, 2)
  );

  const tsconfigSpec = {
    extends: './tsconfig.json',
    compilerOptions: {
      outDir: '../../dist/out-tsc',
      types: ['vitest/globals', 'node'],
    },
    include: ['vite.config.ts', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
  };

  tree.write(
    `${result.projectRoot}/tsconfig.spec.json`,
    JSON.stringify(tsconfigSpec, null, 2)
  );

  // Register project with Nx
  addProjectConfiguration(tree, result.projectName, {
    root: result.projectRoot,
    projectType: 'library',
    sourceRoot: result.sourceRoot,
    targets: {
      build: {
        executor: '@nx/js:tsc',
        outputs: ['{options.outputPath}'],
        options: {
          outputPath: `dist/${result.projectRoot}`,
          tsConfig: `${result.projectRoot}/tsconfig.json`,
          packageJson: `${result.projectRoot}/package.json`,
          main: `${result.projectRoot}/src/index.ts`,
        },
      },
      test: {
        executor: '@nx/vite:test',
        outputs: ['{options.reportsDirectory}'],
        options: {
          passWithNoTests: true,
          reportsDirectory: `../../coverage/${result.projectRoot}`,
        },
      },
    },
    tags: coreOptions.tags?.split(',').map(t => t.trim()).filter(Boolean) || [],
  });

  await formatFiles(tree);

  return () => {
    console.log(`
✅ Data Access library created: ${result.packageName}

📁 Location: ${result.projectRoot}
📦 Package: ${result.packageName}

Next steps:
1. Customize repository implementation
2. Build: pnpm exec nx build ${result.projectName} --batch
3. Test: pnpm exec nx test ${result.projectName}
    `);
  };
}
