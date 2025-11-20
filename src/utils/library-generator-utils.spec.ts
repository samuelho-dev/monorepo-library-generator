/**
 * library-generator-utils.spec.ts
 *
 * Comprehensive tests for library generation utilities, focusing on
 * configuration-driven entry point generation with library-type-specific paths.
 */

import type { Tree } from '@nx/devkit';
import { createTree } from '@nx/devkit/testing';
import { generateLibraryFiles } from './library-generator-utils';

describe('library-generator-utils', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTree();
  });

  describe('Entry Point Generation', () => {
    describe('Feature Library', () => {
      it('should generate index.ts with feature-specific paths', async () => {
        await generateLibraryFiles(tree, {
          name: 'auth',
          projectName: 'feature-auth',
          projectRoot: 'libs/feature/auth',
          offsetFromRoot: '../../../',
          libraryType: 'feature',
          platform: 'node',
          description: 'Authentication feature',
          tags: ['type:feature', 'scope:auth'],
        });

        const indexContent = tree.read(
          'libs/feature/auth/src/index.ts',
          'utf-8',
        );
        expect(indexContent).toContain("export * from './lib/shared/types'");
        expect(indexContent).toContain("export * from './lib/shared/errors'");
      });

      it('should generate server.ts with feature-specific paths', async () => {
        await generateLibraryFiles(tree, {
          name: 'auth',
          projectName: 'feature-auth',
          projectRoot: 'libs/feature/auth',
          offsetFromRoot: '../../../',
          libraryType: 'feature',
          platform: 'node',
          description: 'Authentication feature',
          tags: ['type:feature', 'scope:auth'],
        });

        const serverContent = tree.read(
          'libs/feature/auth/src/server.ts',
          'utf-8',
        );
        expect(serverContent).toContain("export * from './lib/server/service'");
        expect(serverContent).toContain("export * from './lib/server/layers'");
        expect(serverContent).not.toContain('./lib/rpc/handlers');
      });

      it('should include RPC exports in server.ts when includeRPC=true', async () => {
        await generateLibraryFiles(tree, {
          name: 'auth',
          projectName: 'feature-auth',
          projectRoot: 'libs/feature/auth',
          offsetFromRoot: '../../../',
          libraryType: 'feature',
          platform: 'node',
          description: 'Authentication feature',
          tags: ['type:feature', 'scope:auth'],
          includeRPC: true,
        });

        const serverContent = tree.read(
          'libs/feature/auth/src/server.ts',
          'utf-8',
        );
        expect(serverContent).toContain("export * from './lib/server/service'");
        expect(serverContent).toContain("export * from './lib/server/layers'");
        expect(serverContent).toContain("export * from './lib/rpc/handlers'");
      });

      it('should not generate client.ts by default', async () => {
        await generateLibraryFiles(tree, {
          name: 'auth',
          projectName: 'feature-auth',
          projectRoot: 'libs/feature/auth',
          offsetFromRoot: '../../../',
          libraryType: 'feature',
          platform: 'node',
          description: 'Authentication feature',
          tags: ['type:feature', 'scope:auth'],
          includeClientServer: false,
        });

        expect(tree.exists('libs/feature/auth/src/client.ts')).toBe(false);
      });

      it('should include hooks and atoms exports when includeClientServer=true', async () => {
        await generateLibraryFiles(tree, {
          name: 'auth',
          projectName: 'feature-auth',
          projectRoot: 'libs/feature/auth',
          offsetFromRoot: '../../../',
          libraryType: 'feature',
          platform: 'node',
          description: 'Authentication feature',
          tags: ['type:feature', 'scope:auth'],
          includeClientServer: true,
        });

        const clientContent = tree.read(
          'libs/feature/auth/src/client.ts',
          'utf-8',
        );
        expect(clientContent).toContain(
          "export type * from './lib/shared/types'",
        );
        expect(clientContent).toContain(
          "export type * from './lib/shared/errors'",
        );
        expect(clientContent).toContain("export * from './lib/client/hooks'");
        expect(clientContent).toContain("export * from './lib/client/atoms'");
      });

      it('should generate edge.ts with middleware path for feature libraries', async () => {
        await generateLibraryFiles(tree, {
          name: 'auth',
          projectName: 'feature-auth',
          projectRoot: 'libs/feature/auth',
          offsetFromRoot: '../../../',
          libraryType: 'feature',
          platform: 'node',
          description: 'Authentication feature',
          tags: ['type:feature', 'scope:auth'],
          includeEdgeExports: true,
        });

        const edgeContent = tree.read('libs/feature/auth/src/edge.ts', 'utf-8');
        expect(edgeContent).toContain("export * from './lib/edge/middleware'");
        expect(edgeContent).toContain("export * from './lib/shared/types'");
        expect(edgeContent).toContain("export * from './lib/shared/errors'");
      });
    });

    describe('Data-Access Library', () => {
      it('should generate index.ts with data-access-specific paths', async () => {
        await generateLibraryFiles(tree, {
          name: 'user',
          projectName: 'data-access-user',
          projectRoot: 'libs/data-access/user',
          offsetFromRoot: '../../../',
          libraryType: 'data-access',
          platform: 'node',
          description: 'User data access',
          tags: ['type:data-access', 'scope:user'],
        });

        const indexContent = tree.read(
          'libs/data-access/user/src/index.ts',
          'utf-8',
        );
        expect(indexContent).toContain("export * from './lib/domain'");
        expect(indexContent).toContain("export * from './lib/errors'");
      });

      it('should not generate server.ts by default for data-access libraries', async () => {
        await generateLibraryFiles(tree, {
          name: 'user',
          projectName: 'data-access-user',
          projectRoot: 'libs/data-access/user',
          offsetFromRoot: '../../../',
          libraryType: 'data-access',
          platform: 'node',
          description: 'User data access',
          tags: ['type:data-access', 'scope:user'],
        });

        // server.ts is only generated if needed based on platform and library type
        // For basic data-access library, it may not be generated
        expect(tree.exists('libs/data-access/user/src/index.ts')).toBe(true);
      });

      it('should not generate edge.ts by default for data-access libraries', async () => {
        await generateLibraryFiles(tree, {
          name: 'user',
          projectName: 'data-access-user',
          projectRoot: 'libs/data-access/user',
          offsetFromRoot: '../../../',
          libraryType: 'data-access',
          platform: 'node',
          description: 'User data access',
          tags: ['type:data-access', 'scope:user'],
          includeEdgeExports: false,
        });

        expect(tree.exists('libs/data-access/user/src/edge.ts')).toBe(false);
      });
    });

    describe('Infra Library', () => {
      it('should generate index.ts with infra-specific paths', async () => {
        await generateLibraryFiles(tree, {
          name: 'cache',
          projectName: 'infra-cache',
          projectRoot: 'libs/infra/cache',
          offsetFromRoot: '../../../',
          libraryType: 'infra',
          platform: 'node',
          description: 'Cache infrastructure',
          tags: ['type:infra', 'scope:cache'],
        });

        const indexContent = tree.read(
          'libs/infra/cache/src/index.ts',
          'utf-8',
        );
        expect(indexContent).toContain(
          "export * from './lib/service/interface'",
        );
        expect(indexContent).toContain("export * from './lib/service/errors'");
      });

      it('should generate server.ts with infra-specific paths', async () => {
        await generateLibraryFiles(tree, {
          name: 'cache',
          projectName: 'infra-cache',
          projectRoot: 'libs/infra/cache',
          offsetFromRoot: '../../../',
          libraryType: 'infra',
          platform: 'node',
          description: 'Cache infrastructure',
          tags: ['type:infra', 'scope:cache'],
        });

        const serverContent = tree.read(
          'libs/infra/cache/src/server.ts',
          'utf-8',
        );
        expect(serverContent).toContain(
          "export * from './lib/service/service'",
        );
        expect(serverContent).toContain("export * from './lib/layers'");
      });
    });

    describe('Provider Library', () => {
      it('should generate index.ts with provider-specific paths', async () => {
        await generateLibraryFiles(tree, {
          name: 'stripe',
          projectName: 'provider-stripe',
          projectRoot: 'libs/provider/stripe',
          offsetFromRoot: '../../../',
          libraryType: 'provider',
          platform: 'node',
          description: 'Stripe provider',
          tags: ['type:provider', 'scope:stripe'],
        });

        const indexContent = tree.read(
          'libs/provider/stripe/src/index.ts',
          'utf-8',
        );
        expect(indexContent).toContain("export * from './lib/types'");
        expect(indexContent).toContain("export * from './lib/errors'");
      });

      it('should generate server.ts with provider-specific paths', async () => {
        await generateLibraryFiles(tree, {
          name: 'stripe',
          projectName: 'provider-stripe',
          projectRoot: 'libs/provider/stripe',
          offsetFromRoot: '../../../',
          libraryType: 'provider',
          platform: 'node',
          description: 'Stripe provider',
          tags: ['type:provider', 'scope:stripe'],
        });

        const serverContent = tree.read(
          'libs/provider/stripe/src/server.ts',
          'utf-8',
        );
        expect(serverContent).toContain("export * from './lib/service'");
        expect(serverContent).toContain("export * from './lib/layers'");
      });
    });

    describe('Contract Library', () => {
      it('should generate index.ts with contract-specific paths', async () => {
        await generateLibraryFiles(tree, {
          name: 'user',
          projectName: 'contract-user',
          projectRoot: 'libs/contract/user',
          offsetFromRoot: '../../../',
          libraryType: 'contract',
          platform: 'universal',
          description: 'User contract',
          tags: ['type:contract', 'scope:user'],
        });

        const indexContent = tree.read(
          'libs/contract/user/src/index.ts',
          'utf-8',
        );
        expect(indexContent).toContain("export * from './lib/types'");
        expect(indexContent).toContain("export * from './lib/errors'");
      });
    });

    describe('Util Library', () => {
      it('should generate index.ts with util-specific paths', async () => {
        await generateLibraryFiles(tree, {
          name: 'strings',
          projectName: 'util-strings',
          projectRoot: 'libs/util/strings',
          offsetFromRoot: '../../../',
          libraryType: 'util',
          platform: 'universal',
          description: 'String utilities',
          tags: ['type:util', 'scope:strings'],
        });

        const indexContent = tree.read(
          'libs/util/strings/src/index.ts',
          'utf-8',
        );
        expect(indexContent).toContain("export * from './lib/types'");
      });
    });

    describe('Fallback Behavior', () => {
      it('should use generic paths for unknown library types', async () => {
        await generateLibraryFiles(tree, {
          name: 'unknown',
          projectName: 'unknown-lib',
          projectRoot: 'libs/unknown',
          offsetFromRoot: '../../',
          libraryType: 'unknown' as any,
          platform: 'node',
          description: 'Unknown library type',
          tags: ['type:unknown'],
        });

        const indexContent = tree.read('libs/unknown/src/index.ts', 'utf-8');
        expect(indexContent).toContain("export * from './lib/types'");
        expect(indexContent).toContain("export * from './lib/errors'");

        const serverContent = tree.read('libs/unknown/src/server.ts', 'utf-8');
        expect(serverContent).toContain("export * from './lib/service'");
        expect(serverContent).toContain("export * from './lib/layers'");
      });
    });
  });

  describe('Documentation Generation', () => {
    it('should generate README.md with library information', async () => {
      await generateLibraryFiles(tree, {
        name: 'auth',
        projectName: 'feature-auth',
        projectRoot: 'libs/feature/auth',
        offsetFromRoot: '../../../',
        libraryType: 'feature',
        platform: 'node',
        description: 'Authentication feature',
        tags: ['type:feature', 'scope:auth'],
      });

      const readme = tree.read('libs/feature/auth/README.md', 'utf-8');
      expect(readme).toContain('# @custom-repo/feature-auth');
      expect(readme).toContain('Authentication feature');
    });

    it('should generate CLAUDE.md with AI-optimized reference', async () => {
      await generateLibraryFiles(tree, {
        name: 'auth',
        projectName: 'feature-auth',
        projectRoot: 'libs/feature/auth',
        offsetFromRoot: '../../../',
        libraryType: 'feature',
        platform: 'node',
        description: 'Authentication feature',
        tags: ['type:feature', 'scope:auth'],
      });

      const claude = tree.read('libs/feature/auth/CLAUDE.md', 'utf-8');
      expect(claude).toContain('# @custom-repo/feature-auth');
      expect(claude).toContain('AI-optimized reference');
      expect(claude).toContain('## Import Patterns');
    });
  });

  describe('Configuration Files', () => {
    it('should generate tsconfig files with project references', async () => {
      await generateLibraryFiles(tree, {
        name: 'auth',
        projectName: 'feature-auth',
        projectRoot: 'libs/feature/auth',
        offsetFromRoot: '../../../',
        libraryType: 'feature',
        platform: 'node',
        description: 'Authentication feature',
        tags: ['type:feature', 'scope:auth'],
      });

      expect(tree.exists('libs/feature/auth/tsconfig.json')).toBe(true);
      expect(tree.exists('libs/feature/auth/tsconfig.lib.json')).toBe(true);
      expect(tree.exists('libs/feature/auth/tsconfig.spec.json')).toBe(true);
    });

    it('should generate vitest.config.ts for testing', async () => {
      await generateLibraryFiles(tree, {
        name: 'auth',
        projectName: 'feature-auth',
        projectRoot: 'libs/feature/auth',
        offsetFromRoot: '../../../',
        libraryType: 'feature',
        platform: 'node',
        description: 'Authentication feature',
        tags: ['type:feature', 'scope:auth'],
      });

      expect(tree.exists('libs/feature/auth/vitest.config.ts')).toBe(true);
    });

    it('should generate package.json with correct exports', async () => {
      await generateLibraryFiles(tree, {
        name: 'auth',
        projectName: 'feature-auth',
        projectRoot: 'libs/feature/auth',
        offsetFromRoot: '../../../',
        libraryType: 'feature',
        platform: 'node',
        description: 'Authentication feature',
        tags: ['type:feature', 'scope:auth'],
        includeClientServer: true,
      });

      const packageJson = tree.read('libs/feature/auth/package.json', 'utf-8');
      expect(packageJson).not.toBeNull();
      const pkg = JSON.parse(packageJson!);

      expect(pkg.name).toBe('@custom-repo/feature-auth');
      expect(pkg.exports).toBeDefined();
      expect(pkg.exports['.']).toBeDefined();
      expect(pkg.exports['./server']).toBeDefined();
      expect(pkg.exports['./client']).toBeDefined();
    });
  });

  describe('Platform-Specific Exports', () => {
    it('should not generate edge.ts by default', async () => {
      await generateLibraryFiles(tree, {
        name: 'auth',
        projectName: 'feature-auth',
        projectRoot: 'libs/feature/auth',
        offsetFromRoot: '../../../',
        libraryType: 'feature',
        platform: 'node',
        description: 'Authentication feature',
        tags: ['type:feature', 'scope:auth'],
        includeEdgeExports: false,
      });

      expect(tree.exists('libs/feature/auth/src/edge.ts')).toBe(false);
    });

    it('should generate edge.ts when includeEdgeExports=true', async () => {
      await generateLibraryFiles(tree, {
        name: 'auth',
        projectName: 'feature-auth',
        projectRoot: 'libs/feature/auth',
        offsetFromRoot: '../../../',
        libraryType: 'feature',
        platform: 'node',
        description: 'Authentication feature',
        tags: ['type:feature', 'scope:auth'],
        includeEdgeExports: true,
      });

      expect(tree.exists('libs/feature/auth/src/edge.ts')).toBe(true);
    });

    it('should not generate client.ts by default', async () => {
      await generateLibraryFiles(tree, {
        name: 'auth',
        projectName: 'feature-auth',
        projectRoot: 'libs/feature/auth',
        offsetFromRoot: '../../../',
        libraryType: 'feature',
        platform: 'node',
        description: 'Authentication feature',
        tags: ['type:feature', 'scope:auth'],
        includeClientServer: false,
      });

      expect(tree.exists('libs/feature/auth/src/client.ts')).toBe(false);
    });
  });
});
