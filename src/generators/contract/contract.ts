/**
 * Contract Library Generator (Nx Wrapper)
 *
 * Thin wrapper around the shared contract generator core.
 * Uses Nx Tree API via TreeAdapter.
 */

import { Tree, formatFiles, addProjectConfiguration } from "@nx/devkit";
import { Effect } from "effect";
import type { ContractGeneratorSchema } from "./schema";
import { createTreeAdapter } from "../../utils/tree-adapter";
import { generateContractCore, type GeneratorResult } from "../core/contract-generator-core";

/**
 * Contract generator for Nx workspaces
 *
 * Generates a contract library following Effect-based architecture patterns.
 * Creates entities, errors, events, and ports for a domain.
 *
 * @param tree - Nx Tree API for virtual file system
 * @param schema - Generator options from user
 * @returns Callback function for post-generation console output
 */
export default async function contractGenerator(
  tree: Tree,
  schema: ContractGeneratorSchema
) {
  // 1. Create Tree adapter
  const adapter = createTreeAdapter(tree);

  // 2. Map schema to core options
  const coreOptions: Parameters<typeof generateContractCore>[1] = {
    name: schema.name,
    ...(schema.description && { description: schema.description }),
    ...(schema.tags && { tags: schema.tags }),
    ...(schema.directory && { directory: schema.directory }),
    includeCQRS: schema.includeCQRS ?? false,
    includeRPC: schema.includeRPC ?? false,
    workspaceRoot: tree.root,
  };

  // 3. Run core generator with Effect runtime
  const result: GeneratorResult = await Effect.runPromise(
    generateContractCore(adapter, coreOptions) as Effect.Effect<GeneratorResult, never>
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

  // 4. Register project with Nx
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

  // 5. Nx-specific post-processing
  await formatFiles(tree);

  // 6. Return Nx callback for console output
  return () => {
    console.log(`
✅ Contract library created: ${result.packageName}

📁 Location: ${result.projectRoot}
📦 Package: ${result.packageName}

🎯 IMPORTANT - Customization Required:
This library was generated with minimal scaffolding.
Follow the TODO comments in each file to customize for your domain.

Next steps:
1. Customize domain files (see TODO comments in each file):
   - ${result.sourceRoot}/lib/entities.ts   - Add your domain fields
   - ${result.sourceRoot}/lib/errors.ts     - Add domain-specific errors
   - ${result.sourceRoot}/lib/events.ts     - Add custom events
   - ${result.sourceRoot}/lib/ports.ts      - Add repository/service methods

2. Build and test:
   - pnpm exec nx build ${result.projectName} --batch
   - pnpm exec nx test ${result.projectName}

3. Auto-sync TypeScript project references:
   - pnpm exec nx sync

📚 Documentation:
   - See /libs/ARCHITECTURE.md for repository patterns
   - See ${result.projectRoot}/README.md for customization examples
    `);
  };
}


