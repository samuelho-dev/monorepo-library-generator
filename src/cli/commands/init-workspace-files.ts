/**
 * Workspace File Generation
 *
 * Generates workspace configuration files for monorepo setup:
 * - package.json with workspaces and scripts
 * - pnpm-workspace.yaml
 * - .npmrc
 *
 * This enables users to install dependencies and build all libraries.
 *
 * @module cli/commands/init-workspace-files
 */

import { FileSystem } from '@effect/platform';
import { Console, Effect } from 'effect';
import { WORKSPACE_CONFIG } from '../../utils/workspace-config';

/**
 * Workspace setup options
 */
export interface WorkspaceOptions {
  /**
   * Workspace name (defaults to directory name)
   */
  readonly name?: string | undefined;

  /**
   * Include Nx configuration
   * @default true
   */
  readonly includeNx?: boolean | undefined;

  /**
   * Package manager (pnpm, npm, yarn)
   * @default "pnpm"
   */
  readonly packageManager?: 'pnpm' | 'npm' | 'yarn' | undefined;
}

/**
 * Generate workspace configuration files
 *
 * Creates:
 * - package.json - Root package with workspaces, scripts, and dependencies
 * - pnpm-workspace.yaml - Workspace package patterns
 * - .npmrc - Package manager configuration
 *
 * These files enable:
 * - Dependency installation across all libraries
 * - Monorepo build and test scripts
 * - Consistent package manager behavior
 */
export function generateWorkspaceFiles(options: WorkspaceOptions = {}) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const name = options.name ?? 'my-effect-monorepo';
    const includeNx = options.includeNx ?? true;
    const packageManager = options.packageManager ?? 'pnpm';

    yield* Console.log('📦 Setting up workspace configuration...');

    // 1. Generate package.json
    const packageJson = {
      name,
      version: '0.0.1',
      private: true,
      type: 'module',
      workspaces: packageManager === 'pnpm' ? undefined : ['libs/**'],
      engines: {
        node: '>=20.0.0',
        pnpm: '>=9.0.0',
      },
      scripts: {
        // Build scripts
        build: includeNx
          ? 'nx run-many --target=build --all'
          : 'pnpm -r --workspace-concurrency=10 run build',
        'build:affected': includeNx
          ? 'nx affected --target=build'
          : "pnpm -r --filter='...[HEAD^]' run build",

        // Test scripts
        test: includeNx ? 'nx run-many --target=test --all' : 'pnpm -r run test',
        'test:affected': includeNx
          ? 'nx affected --target=test'
          : "pnpm -r --filter='...[HEAD^]' run test",
        'test:watch': 'vitest --watch',

        // Lint scripts
        lint: 'biome check .',
        'lint:fix': 'biome check --write .',
        format: 'biome format --write .',

        // Type checking
        typecheck: includeNx ? 'nx run-many --target=typecheck --all' : 'pnpm -r run typecheck',

        // Prisma scripts
        'prisma:generate': 'prisma generate',
        'prisma:migrate': 'prisma migrate dev',
        'prisma:studio': 'prisma studio',
        'prisma:reset': 'prisma migrate reset',

        // Utility scripts
        clean: includeNx
          ? 'nx reset && rm -rf node_modules dist .nx'
          : 'rm -rf node_modules dist libs/**/node_modules libs/**/dist',
        'format:check': 'biome format .',
      },
      devDependencies: {
        // Nx (if included)
        ...(includeNx && {
          '@nx/js': '^22.3.1',
          '@nx/vite': '^22.3.1',
          nx: '^22.3.1',
        }),

        // TypeScript
        '@types/node': '^25.0.3',
        typescript: '^5.9.3',

        // Testing
        '@effect/vitest': '^0.16.0',
        vitest: '^3.2.4',
        '@vitest/ui': '^3.2.4',

        // Linting & Formatting
        '@biomejs/biome': '^2.3.10',

        // Prisma
        prisma: '^7.2.0',
        'prisma-effect-kysely': 'latest',
      },
      dependencies: {
        // Effect runtime
        effect: '^3.19.12',
        '@effect/platform': '^0.93.8',
        '@effect/platform-node': '^0.103.0',
        // Prisma client
        '@prisma/client': '^7.2.0',
      },
      packageManager: packageManager === 'pnpm' ? 'pnpm@9.15.0' : undefined,
    };

    yield* fs.writeFileString('package.json', `${JSON.stringify(packageJson, null, 2)}\n`);

    yield* Console.log('  ✓ Created package.json');

    // 2. Generate pnpm-workspace.yaml (if using pnpm)
    if (packageManager === 'pnpm') {
      const workspaceYaml = `# pnpm workspace configuration
# See: https://pnpm.io/workspaces

packages:
  # All libraries
  - 'libs/**'

  # Example apps (if you create any)
  - 'apps/**'
`;

      yield* fs.writeFileString('pnpm-workspace.yaml', workspaceYaml);
      yield* Console.log('  ✓ Created pnpm-workspace.yaml');
    }

    // 3. Generate .npmrc
    const npmrcContent =
      packageManager === 'pnpm'
        ? `# pnpm configuration
# See: https://pnpm.io/npmrc

# Workspace settings
auto-install-peers=true
strict-peer-dependencies=false

# Hoist dependencies to root node_modules
# This allows Effect runtime to be shared across all libraries
shamefully-hoist=true

# Use workspace protocol for internal dependencies
link-workspace-packages=true

# Parallel execution
workspace-concurrency=10
`
        : `# npm/yarn configuration

# Use workspace protocol for internal dependencies
link-workspace-packages=true
`;

    yield* fs.writeFileString('.npmrc', npmrcContent);
    yield* Console.log('  ✓ Created .npmrc');

    // 4. Generate tsconfig.base.json
    const scope = WORKSPACE_CONFIG.getScope();
    const tsconfigBase = {
      compilerOptions: {
        // Required for path mappings
        baseUrl: '.',

        // Module system
        module: 'ESNext',
        moduleResolution: 'bundler',
        target: 'ES2022',

        // Type checking
        strict: true,
        exactOptionalPropertyTypes: true,
        noFallthroughCasesInSwitch: true,
        noImplicitOverride: true,
        noImplicitReturns: true,
        noPropertyAccessFromIndexSignature: true,
        noUncheckedIndexedAccess: true,
        noUnusedLocals: true,
        noUnusedParameters: true,

        // JavaScript support
        allowJs: false,
        checkJs: false,

        // Module detection
        moduleDetection: 'force',

        // Output
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        removeComments: false,
        importHelpers: false,

        // Interop
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        forceConsistentCasingInFileNames: true,
        verbatimModuleSyntax: true,

        // Advanced
        skipLibCheck: true,
        resolveJsonModule: true,
        isolatedModules: true,

        // Library
        lib: ['ES2022'],

        // TypeScript path mappings for monorepo
        // Enables imports like: import { User } from '@custom-repo/contract-user'
        paths: {
          [`${scope}/contract-*`]: ['libs/contract/*/src/index.ts'],
          [`${scope}/data-access-*`]: ['libs/data-access/*/src/index.ts'],
          [`${scope}/feature-*`]: ['libs/feature/*/src/index.ts'],
          [`${scope}/infra-*`]: ['libs/infra/*/src/index.ts'],
          [`${scope}/provider-*`]: ['libs/provider/*/src/index.ts'],
          [`${scope}/env`]: ['libs/env/src/index.ts'],
        },
      },
      exclude: ['node_modules', 'dist', 'build', '.nx'],
    };

    yield* fs.writeFileString('tsconfig.base.json', `${JSON.stringify(tsconfigBase, null, 2)}\n`);
    yield* Console.log('  ✓ Created tsconfig.base.json');

    // 5. Generate nx.json (if includeNx is true)
    if (includeNx) {
      const nxJson = {
        $schema: './node_modules/nx/schemas/nx-schema.json',
        targetDefaults: {
          build: {
            cache: true,
            dependsOn: ['^build'],
            inputs: ['production', '^production'],
          },
          test: {
            cache: true,
            inputs: ['default', '^production', '{workspaceRoot}/vitest.config.ts'],
          },
          lint: {
            cache: true,
            inputs: ['default', '{workspaceRoot}/biome.json'],
          },
          typecheck: {
            cache: true,
            inputs: ['default', '^production'],
          },
        },
        namedInputs: {
          default: ['{projectRoot}/**/*', 'sharedGlobals'],
          production: [
            'default',
            '!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)',
            '!{projectRoot}/tsconfig.spec.json',
          ],
          sharedGlobals: [],
        },
        plugins: [
          {
            plugin: '@nx/vite/plugin',
            options: {
              buildTargetName: 'build',
              testTargetName: 'test',
            },
          },
        ],
      };

      yield* fs.writeFileString('nx.json', `${JSON.stringify(nxJson, null, 2)}\n`);
      yield* Console.log('  ✓ Created nx.json');
    }

    // 6. Generate biome.json (workspace-level linting & formatting)
    // Uses Biome v2 configuration format
    const biomeConfig = {
      $schema: 'https://biomejs.dev/schemas/2.3.10/schema.json',
      vcs: {
        enabled: true,
        clientKind: 'git',
        useIgnoreFile: true,
      },
      files: {
        ignoreUnknown: true,
        // In Biome v2.2+, folder ignores don't need trailing /**
        includes: [
          '**/*',
          '!**/node_modules',
          '!**/dist',
          '!**/build',
          '!**/.nx',
          '!**/coverage',
          '!**/*.generated.ts',
        ],
      },
      formatter: {
        enabled: true,
        indentStyle: 'space',
        indentWidth: 2,
        lineWidth: 100,
      },
      // In Biome v2, organizeImports moved to assist.actions.source
      assist: {
        actions: {
          source: {
            organizeImports: 'on',
          },
        },
      },
      linter: {
        enabled: true,
        rules: {
          recommended: true,
          correctness: {
            noUnusedVariables: 'error',
            noUnusedImports: 'error',
          },
          style: {
            noNonNullAssertion: 'warn',
            useConst: 'error',
            useImportType: 'error',
            useTemplate: 'error',
          },
          suspicious: {
            noExplicitAny: 'error',
          },
        },
      },
      javascript: {
        formatter: {
          quoteStyle: 'double',
          trailingCommas: 'all',
          semicolons: 'always',
        },
      },
    };

    yield* fs.writeFileString('biome.json', `${JSON.stringify(biomeConfig, null, 2)}\n`);
    yield* Console.log('  ✓ Created biome.json');

    // 7. Generate .gitignore if it doesn't exist
    const gitignoreExists = yield* fs.exists('.gitignore');
    if (!gitignoreExists) {
      const gitignore = `# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/
out/
.next/
.turbo/

# Nx
.nx/

# Test coverage
coverage/
.nyc_output/

# Environment variables
.env
.env.local
.env.*.local

# Editor directories
.vscode/
.idea/
*.swp
*.swo
*~

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Temporary files
*.tmp
.cache/

# Prisma
prisma/dev.db
prisma/dev.db-journal
`;

      yield* fs.writeFileString('.gitignore', gitignore);
      yield* Console.log('  ✓ Created .gitignore');
    }

    yield* Console.log('');
  });
}
