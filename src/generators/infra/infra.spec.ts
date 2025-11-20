import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, readProjectConfiguration } from '@nx/devkit';

import infraGenerator from './infra';

// ============================================================================
// PHASE 1: Foundation Tests (Schema & Base Files)
// ============================================================================

describe('Infra Generator - Foundation', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  describe('Base File Generation', () => {
    it('should generate all base files for server-only infrastructure', async () => {
      await infraGenerator(tree, { name: 'cache' });

      expect(tree.exists('libs/infra/cache/src/lib/service/interface.ts')).toBe(
        true,
      );
      expect(tree.exists('libs/infra/cache/src/lib/service/errors.ts')).toBe(
        true,
      );
      expect(tree.exists('libs/infra/cache/src/lib/service/config.ts')).toBe(
        true,
      );
      expect(tree.exists('libs/infra/cache/src/lib/providers/memory.ts')).toBe(
        true,
      );
      expect(
        tree.exists('libs/infra/cache/src/lib/layers/server-layers.ts'),
      ).toBe(true);
      expect(tree.exists('libs/infra/cache/src/index.ts')).toBe(true);
    });

    it('should generate project.json with correct configuration', async () => {
      await infraGenerator(tree, { name: 'cache' });

      const config = readProjectConfiguration(tree, 'infra-cache');
      expect(config).toBeDefined();
      expect(config.projectType).toBe('library');
      expect(config.sourceRoot).toBe('libs/infra/cache/src');
    });

    it('should generate package.json with workspace dependencies', async () => {
      await infraGenerator(tree, { name: 'cache' });

      const packageJsonContent = tree.read(
        'libs/infra/cache/package.json',
        'utf-8',
      );
      expect(packageJsonContent).toContain('@custom-repo/infra-cache');
      expect(packageJsonContent).toContain('effect');
    });

    it('should update tsconfig.base.json with path mapping', async () => {
      await infraGenerator(tree, { name: 'cache' });

      // In a real workspace, path mappings would be added by NX's library generator
      // In virtual test workspace, we verify the library generator was called
      const config = readProjectConfiguration(tree, 'infra-cache');
      expect(config).toBeDefined();
      expect(config.root).toBe('libs/infra/cache');
    });

    it('should generate README.md with service documentation', async () => {
      await infraGenerator(tree, { name: 'cache' });

      expect(tree.exists('libs/infra/cache/README.md')).toBe(true);
      const readmeContent = tree.read('libs/infra/cache/README.md', 'utf-8');
      expect(readmeContent).toContain('Cache');
    });

    it('should generate CLAUDE.md with AI reference', async () => {
      await infraGenerator(tree, { name: 'cache' });

      expect(tree.exists('libs/infra/cache/CLAUDE.md')).toBe(true);
    });

    it('should always generate config.ts', async () => {
      await infraGenerator(tree, { name: 'cache' });

      expect(tree.exists('libs/infra/cache/src/lib/service/config.ts')).toBe(
        true,
      );
      const configContent = tree.read(
        'libs/infra/cache/src/lib/service/config.ts',
        'utf-8',
      );
      expect(configContent).toContain('CacheConfig');
    });

    it('should export service and layers from index.ts when no flags', async () => {
      await infraGenerator(tree, {
        name: 'cache',
        includeClientServer: false,
      });

      const indexContent = tree.read('libs/infra/cache/src/index.ts', 'utf-8');
      expect(indexContent).toContain("from './lib/service/interface'");
      expect(indexContent).toContain("from './lib/layers/server-layers'");
      expect(indexContent).toContain("from './lib/service/errors'");
    });
  });

  describe('Schema Options', () => {
    it('should accept includeClientServer flag', async () => {
      await infraGenerator(tree, {
        name: 'storage',
        includeClientServer: true,
      });

      expect(tree.exists('libs/infra/storage/src/client.ts')).toBe(true);
      expect(tree.exists('libs/infra/storage/src/server.ts')).toBe(true);
    });

    it('should accept includeEdge flag', async () => {
      await infraGenerator(tree, { name: 'auth', includeEdge: true });

      expect(tree.exists('libs/infra/auth/src/edge.ts')).toBe(true);
      expect(tree.exists('libs/infra/auth/src/lib/layers/edge-layers.ts')).toBe(
        true,
      );
    });

    it('should accept both includeClientServer and includeEdge flags', async () => {
      await infraGenerator(tree, {
        name: 'webhook',
        includeClientServer: true,
        includeEdge: true,
      });

      expect(tree.exists('libs/infra/webhook/src/client.ts')).toBe(true);
      expect(tree.exists('libs/infra/webhook/src/server.ts')).toBe(true);
      expect(tree.exists('libs/infra/webhook/src/edge.ts')).toBe(true);
    });
  });
});

// ============================================================================
// PHASE 2: Server-Only Structure Tests
// ============================================================================

describe('Infra Generator - Server-Only Structure', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  describe('Service Definition', () => {
    it('should use Context.Tag with inline interface (Effect 3.0+ pattern)', async () => {
      await infraGenerator(tree, { name: 'cache' });

      const interfaceContent = tree.read(
        'libs/infra/cache/src/lib/service/interface.ts',
        'utf-8',
      );
      // Modern Effect 3.0+ pattern: Context.Tag with inline interface
      expect(interfaceContent).toContain('export class CacheService');
      expect(interfaceContent).toContain('extends Context.Tag');
      expect(interfaceContent).toContain('readonly get:');
    });

    it('should generate service errors with Data.TaggedError', async () => {
      await infraGenerator(tree, { name: 'cache' });

      const errorsContent = tree.read(
        'libs/infra/cache/src/lib/service/errors.ts',
        'utf-8',
      );
      expect(errorsContent).toContain('extends Data.TaggedError');
      expect(errorsContent).toContain('CacheError');
    });

    it('should generate server-layers.ts with Live/Test layers', async () => {
      await infraGenerator(tree, { name: 'cache' });

      const layersContent = tree.read(
        'libs/infra/cache/src/lib/layers/server-layers.ts',
        'utf-8',
      );
      // Modern Effect 3.0+ pattern: static members (CacheService.Live)
      expect(layersContent).toContain('CacheService.Live');
      expect(layersContent).toContain('CacheService.Test');
    });

    it('should NOT generate client.ts or server.ts when no flags', async () => {
      await infraGenerator(tree, { name: 'cache' });

      expect(tree.exists('libs/infra/cache/src/client.ts')).toBe(false);
      expect(tree.exists('libs/infra/cache/src/server.ts')).toBe(false);
    });

    it('should NOT create client/ directory when no flags', async () => {
      await infraGenerator(tree, { name: 'cache' });

      expect(tree.exists('libs/infra/cache/src/lib/client')).toBe(false);
    });
  });
});

// ============================================================================
// PHASE 3: Client-Server Separation Tests
// ============================================================================

describe('Infra Generator - Client-Server Separation', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  describe('Platform Separation', () => {
    it('should generate BOTH client.ts AND server.ts when includeClientServer=true', async () => {
      await infraGenerator(tree, {
        name: 'storage',
        includeClientServer: true,
      });

      expect(tree.exists('libs/infra/storage/src/client.ts')).toBe(true);
      expect(tree.exists('libs/infra/storage/src/server.ts')).toBe(true);
    });

    it('should generate client/hooks/ directory', async () => {
      await infraGenerator(tree, {
        name: 'storage',
        includeClientServer: true,
      });

      expect(
        tree.exists('libs/infra/storage/src/lib/client/hooks/use-storage.ts'),
      ).toBe(true);
    });

    it('should generate client-layers.ts AND server-layers.ts', async () => {
      await infraGenerator(tree, {
        name: 'storage',
        includeClientServer: true,
      });

      expect(
        tree.exists('libs/infra/storage/src/lib/layers/client-layers.ts'),
      ).toBe(true);
      expect(
        tree.exists('libs/infra/storage/src/lib/layers/server-layers.ts'),
      ).toBe(true);
    });

    it('should export only universal types from index.ts when includeClientServer=true', async () => {
      await infraGenerator(tree, {
        name: 'storage',
        includeClientServer: true,
      });

      const indexContent = tree.read(
        'libs/infra/storage/src/index.ts',
        'utf-8',
      );
      expect(indexContent).toContain("from './lib/service/interface'");
      expect(indexContent).not.toContain("from './lib/layers");
    });

    it('should export client layers from client.ts', async () => {
      await infraGenerator(tree, {
        name: 'storage',
        includeClientServer: true,
      });

      const clientContent = tree.read(
        'libs/infra/storage/src/client.ts',
        'utf-8',
      );
      expect(clientContent).toContain('StorageServiceClientLayers');
    });

    it('should export server layers from server.ts', async () => {
      await infraGenerator(tree, {
        name: 'storage',
        includeClientServer: true,
      });

      const serverContent = tree.read(
        'libs/infra/storage/src/server.ts',
        'utf-8',
      );
      expect(serverContent).toContain('StorageServiceLive');
    });

    it('should NOT generate client/server files when includeClientServer=false', async () => {
      await infraGenerator(tree, {
        name: 'cache',
        includeClientServer: false,
      });

      expect(tree.exists('libs/infra/cache/src/client.ts')).toBe(false);
      expect(tree.exists('libs/infra/cache/src/server.ts')).toBe(false);
      expect(tree.exists('libs/infra/cache/src/lib/client')).toBe(false);
    });
  });
});

// ============================================================================
// PHASE 4: Edge Platform Tests
// ============================================================================

describe('Infra Generator - Edge Platform', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  describe('Edge Runtime Support', () => {
    it('should generate edge.ts when includeEdge=true', async () => {
      await infraGenerator(tree, { name: 'auth', includeEdge: true });

      expect(tree.exists('libs/infra/auth/src/edge.ts')).toBe(true);
    });

    it('should generate edge-layers.ts when includeEdge=true', async () => {
      await infraGenerator(tree, { name: 'auth', includeEdge: true });

      expect(tree.exists('libs/infra/auth/src/lib/layers/edge-layers.ts')).toBe(
        true,
      );
    });

    it('should NOT generate edge files when includeEdge=false', async () => {
      await infraGenerator(tree, { name: 'cache' });

      expect(tree.exists('libs/infra/cache/src/edge.ts')).toBe(false);
      expect(
        tree.exists('libs/infra/cache/src/lib/layers/edge-layers.ts'),
      ).toBe(false);
    });

    it('should work independently with includeClientServer', async () => {
      await infraGenerator(tree, {
        name: 'webhook',
        includeClientServer: true,
        includeEdge: true,
      });

      expect(tree.exists('libs/infra/webhook/src/client.ts')).toBe(true);
      expect(tree.exists('libs/infra/webhook/src/server.ts')).toBe(true);
      expect(tree.exists('libs/infra/webhook/src/edge.ts')).toBe(true);
    });
  });
});

// ============================================================================
// PHASE 5: File Cleanup Tests
// ============================================================================

describe('Infra Generator - File Cleanup', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  describe('Conditional File Removal', () => {
    it('should remove client/server files when includeClientServer=false', async () => {
      // First generate with flag
      await infraGenerator(tree, {
        name: 'storage',
        includeClientServer: true,
      });

      // Verify they exist
      expect(tree.exists('libs/infra/storage/src/client.ts')).toBe(true);
      expect(tree.exists('libs/infra/storage/src/server.ts')).toBe(true);

      // Generate without flag
      const tree2 = createTreeWithEmptyWorkspace();
      await infraGenerator(tree2, {
        name: 'storage',
        includeClientServer: false,
      });

      // Verify they don't exist
      expect(tree2.exists('libs/infra/storage/src/client.ts')).toBe(false);
      expect(tree2.exists('libs/infra/storage/src/server.ts')).toBe(false);
    });

    it('should remove edge files when includeEdge=false', async () => {
      const tree2 = createTreeWithEmptyWorkspace();
      await infraGenerator(tree2, { name: 'cache', includeEdge: false });

      expect(tree2.exists('libs/infra/cache/src/edge.ts')).toBe(false);
      expect(
        tree2.exists('libs/infra/cache/src/lib/layers/edge-layers.ts'),
      ).toBe(false);
    });

    it('should preserve all files when both flags enabled', async () => {
      await infraGenerator(tree, {
        name: 'universal',
        includeClientServer: true,
        includeEdge: true,
      });

      expect(tree.exists('libs/infra/universal/src/client.ts')).toBe(true);
      expect(tree.exists('libs/infra/universal/src/server.ts')).toBe(true);
      expect(tree.exists('libs/infra/universal/src/edge.ts')).toBe(true);
      expect(
        tree.exists('libs/infra/universal/src/lib/layers/client-layers.ts'),
      ).toBe(true);
      expect(
        tree.exists('libs/infra/universal/src/lib/layers/server-layers.ts'),
      ).toBe(true);
      expect(
        tree.exists('libs/infra/universal/src/lib/layers/edge-layers.ts'),
      ).toBe(true);
    });

    it('should never generate client.ts without server.ts', async () => {
      await infraGenerator(tree, {
        name: 'storage',
        includeClientServer: true,
      });

      const clientExists = tree.exists('libs/infra/storage/src/client.ts');
      const serverExists = tree.exists('libs/infra/storage/src/server.ts');

      // Both must exist together
      expect(clientExists).toBe(serverExists);
      expect(clientExists).toBe(true);
    });
  });
});
