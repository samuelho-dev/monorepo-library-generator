import type { Tree } from '@nx/devkit';
import { readProjectConfiguration } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { infraGenerator } from './infra';

// ============================================================================
// PHASE 1: Foundation Tests (Schema & Base Files)
// ============================================================================

describe('Infra Generator - Foundation', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  describe('Base File Generation - Generic Concern', () => {
    // Use "myservice" for generic infrastructure (not a primitive concern)
    it('should generate all base files for generic infrastructure', async () => {
      await infraGenerator(tree, { name: 'myservice' });

      expect(tree.exists('libs/infra/myservice/src/lib/service/service.ts')).toBe(true);
      expect(tree.exists('libs/infra/myservice/src/lib/service/errors.ts')).toBe(true);
      expect(tree.exists('libs/infra/myservice/src/lib/service/config.ts')).toBe(true);
      expect(tree.exists('libs/infra/myservice/src/lib/providers/memory.ts')).toBe(true);
      expect(tree.exists('libs/infra/myservice/src/lib/layers/server-layers.ts')).toBe(true);
      expect(tree.exists('libs/infra/myservice/src/index.ts')).toBe(true);
    });

    it('should generate project.json with correct configuration', async () => {
      await infraGenerator(tree, { name: 'myservice' });

      const config = readProjectConfiguration(tree, 'infra-myservice');
      expect(config).toBeDefined();
      expect(config.projectType).toBe('library');
      expect(config.sourceRoot).toBe('libs/infra/myservice/src');
    });

    it('should generate package.json with workspace dependencies', async () => {
      await infraGenerator(tree, { name: 'myservice' });

      const packageJsonContent = tree.read('libs/infra/myservice/package.json', 'utf-8');
      // Check for package name (npm scope may vary based on workspace config)
      expect(packageJsonContent).toContain('infra-myservice');
      expect(packageJsonContent).toContain('effect');
    });

    it('should generate README.md with service documentation', async () => {
      await infraGenerator(tree, { name: 'myservice' });

      expect(tree.exists('libs/infra/myservice/README.md')).toBe(true);
      const readmeContent = tree.read('libs/infra/myservice/README.md', 'utf-8');
      expect(readmeContent).toContain('Myservice');
    });

    it('should generate CLAUDE.md with AI reference', async () => {
      await infraGenerator(tree, { name: 'myservice' });

      expect(tree.exists('libs/infra/myservice/CLAUDE.md')).toBe(true);
    });

    it('should generate config.ts for generic concerns', async () => {
      await infraGenerator(tree, { name: 'myservice' });

      expect(tree.exists('libs/infra/myservice/src/lib/service/config.ts')).toBe(true);
      const configContent = tree.read('libs/infra/myservice/src/lib/service/config.ts', 'utf-8');
      expect(configContent).toContain('MyserviceConfig');
    });

    it('should export service and layers from index.ts for generic concerns', async () => {
      await infraGenerator(tree, {
        name: 'myservice',
        includeClientServer: false,
      });

      const indexContent = tree.read('libs/infra/myservice/src/index.ts', 'utf-8');
      expect(indexContent).toContain("from './lib/service/service'");
      expect(indexContent).toContain("from './lib/layers/server-layers'");
      expect(indexContent).toContain("from './lib/service/errors'");
    });
  });

  describe('Base File Generation - Primitive Concern (Cache)', () => {
    // Cache is a primitive concern - uses specialized template with static layers
    it('should generate primitive template files for cache', async () => {
      await infraGenerator(tree, { name: 'cache' });

      // Primitive concerns generate service.ts with embedded static layers
      expect(tree.exists('libs/infra/cache/src/lib/service/service.ts')).toBe(true);
      // Redis layer for external provider integration
      expect(tree.exists('libs/infra/cache/src/lib/layers/redis-layer.ts')).toBe(true);
      expect(tree.exists('libs/infra/cache/src/index.ts')).toBe(true);
    });

    it('should NOT generate generic files for primitive concerns', async () => {
      await infraGenerator(tree, { name: 'cache' });

      // Primitive concerns generate errors.ts but NOT these other generic files
      expect(tree.exists('libs/infra/cache/src/lib/service/errors.ts')).toBe(true); // errors ARE generated
      expect(tree.exists('libs/infra/cache/src/lib/service/config.ts')).toBe(false);
      expect(tree.exists('libs/infra/cache/src/lib/providers/memory.ts')).toBe(false);
      // server-layers.ts is not generated - layers are static on the service class
      expect(tree.exists('libs/infra/cache/src/lib/layers/server-layers.ts')).toBe(false);
    });

    it('should generate service with static Memory/Live/Test layers', async () => {
      await infraGenerator(tree, { name: 'cache' });

      const serviceContent = tree.read('libs/infra/cache/src/lib/service/service.ts', 'utf-8');
      // Primitive template has static layers on the class
      expect(serviceContent).toContain('static readonly Memory');
      expect(serviceContent).toContain('static readonly Live');
      expect(serviceContent).toContain('static readonly Test');
    });
  });

  describe('Schema Options', () => {
    it('should accept includeClientServer flag for generic concerns', async () => {
      await infraGenerator(tree, {
        name: 'storage',
        includeClientServer: true,
      });

      expect(tree.exists('libs/infra/storage/src/index.ts')).toBe(true);
      expect(tree.exists('libs/infra/storage/src/lib/client/hooks')).toBe(true);
    });

    it('should accept includeEdge flag for generic concerns', async () => {
      await infraGenerator(tree, { name: 'auth', includeEdge: true });

      expect(tree.exists('libs/infra/auth/src/index.ts')).toBe(true);
      expect(tree.exists('libs/infra/auth/src/lib/layers/edge-layers.ts')).toBe(true);
    });

    it('should accept both includeClientServer and includeEdge flags', async () => {
      await infraGenerator(tree, {
        name: 'webhook',
        includeClientServer: true,
        includeEdge: true,
      });

      expect(tree.exists('libs/infra/webhook/src/index.ts')).toBe(true);
      expect(tree.exists('libs/infra/webhook/src/lib/client/hooks')).toBe(true);
      expect(tree.exists('libs/infra/webhook/src/lib/layers/edge-layers.ts')).toBe(true);
    });
  });
});

// ============================================================================
// PHASE 2: Server-Only Structure Tests (Generic Concerns)
// ============================================================================

describe('Infra Generator - Server-Only Structure (Generic)', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  describe('Service Definition', () => {
    it('should use Context.Tag with inline interface (Effect 3.0+ pattern)', async () => {
      await infraGenerator(tree, { name: 'myservice' });

      const serviceContent = tree.read('libs/infra/myservice/src/lib/service/service.ts', 'utf-8');
      // Modern Effect 3.0+ pattern: Context.Tag with inline interface
      expect(serviceContent).toContain('export class MyserviceService');
      expect(serviceContent).toContain('extends Context.Tag');
      expect(serviceContent).toContain('readonly get:');
    });

    it('should generate service errors with Data.TaggedError', async () => {
      await infraGenerator(tree, { name: 'myservice' });

      const errorsContent = tree.read('libs/infra/myservice/src/lib/service/errors.ts', 'utf-8');
      expect(errorsContent).toContain('extends Data.TaggedError');
      expect(errorsContent).toContain('MyserviceError');
    });

    it('should generate server-layers.ts with Live/Test layers', async () => {
      await infraGenerator(tree, { name: 'myservice' });

      const layersContent = tree.read(
        'libs/infra/myservice/src/lib/layers/server-layers.ts',
        'utf-8',
      );
      // Modern Effect 3.0+ pattern: static members
      expect(layersContent).toContain('MyserviceService.Live');
      expect(layersContent).toContain('MyserviceService.Test');
    });

    it('should generate server layers by default for generic concerns', async () => {
      await infraGenerator(tree, { name: 'myservice' });

      expect(tree.exists('libs/infra/myservice/src/lib/layers/server-layers.ts')).toBe(true);
    });

    it('should NOT create client/ directory when no flags', async () => {
      await infraGenerator(tree, { name: 'myservice' });

      expect(tree.exists('libs/infra/myservice/src/lib/client')).toBe(false);
    });
  });
});

// ============================================================================
// PHASE 3: Primitive Concerns Tests (Cache, Queue, PubSub, Logging, Metrics, RPC)
// ============================================================================

describe('Infra Generator - Primitive Concerns', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  describe('Cache Primitive', () => {
    it('should generate cache service with Effect.Cache wrapper', async () => {
      await infraGenerator(tree, { name: 'cache' });

      const serviceContent = tree.read('libs/infra/cache/src/lib/service/service.ts', 'utf-8');
      expect(serviceContent).toContain('CacheService');
      expect(serviceContent).toContain('Context.Tag');
      // Cache-specific operations
      expect(serviceContent).toContain('make');
    });

    it('should generate redis-layer.ts for Redis integration', async () => {
      await infraGenerator(tree, { name: 'cache' });

      expect(tree.exists('libs/infra/cache/src/lib/layers/redis-layer.ts')).toBe(true);
      const redisContent = tree.read('libs/infra/cache/src/lib/layers/redis-layer.ts', 'utf-8');
      expect(redisContent).toContain('Redis');
    });
  });

  describe('Queue Primitive', () => {
    it('should generate queue service with Effect.Queue wrapper', async () => {
      await infraGenerator(tree, { name: 'queue' });

      const serviceContent = tree.read('libs/infra/queue/src/lib/service/service.ts', 'utf-8');
      expect(serviceContent).toContain('QueueService');
      expect(serviceContent).toContain('Context.Tag');
    });

    it('should generate redis-layer.ts for Redis backing', async () => {
      await infraGenerator(tree, { name: 'queue' });

      expect(tree.exists('libs/infra/queue/src/lib/layers/redis-layer.ts')).toBe(true);
    });
  });

  describe('PubSub Primitive', () => {
    it('should generate pubsub service with Effect.PubSub wrapper', async () => {
      await infraGenerator(tree, { name: 'pubsub' });

      const serviceContent = tree.read('libs/infra/pubsub/src/lib/service/service.ts', 'utf-8');
      expect(serviceContent).toContain('PubsubService');
      expect(serviceContent).toContain('Context.Tag');
    });

    it('should generate redis-layer.ts for distributed messaging', async () => {
      await infraGenerator(tree, { name: 'pubsub' });

      expect(tree.exists('libs/infra/pubsub/src/lib/layers/redis-layer.ts')).toBe(true);
    });
  });

  describe('Logging Primitive', () => {
    it('should generate logging service with Effect Logger wrapper', async () => {
      await infraGenerator(tree, { name: 'logging' });

      const serviceContent = tree.read('libs/infra/logging/src/lib/service/service.ts', 'utf-8');
      expect(serviceContent).toContain('LoggingService');
      expect(serviceContent).toContain('Context.Tag');
    });

    it('should generate otel-layer.ts for OpenTelemetry export', async () => {
      await infraGenerator(tree, { name: 'logging' });

      expect(tree.exists('libs/infra/logging/src/lib/layers/otel-layer.ts')).toBe(true);
    });
  });

  describe('Metrics Primitive', () => {
    it('should generate metrics service with Effect.Metric wrapper', async () => {
      await infraGenerator(tree, { name: 'metrics' });

      const serviceContent = tree.read('libs/infra/metrics/src/lib/service/service.ts', 'utf-8');
      expect(serviceContent).toContain('MetricsService');
      expect(serviceContent).toContain('Context.Tag');
    });

    it('should generate otel-layer.ts for OpenTelemetry export', async () => {
      await infraGenerator(tree, { name: 'metrics' });

      expect(tree.exists('libs/infra/metrics/src/lib/layers/otel-layer.ts')).toBe(true);
    });
  });

  describe('RPC Primitive', () => {
    it('should generate RPC infrastructure files', async () => {
      await infraGenerator(tree, { name: 'rpc' });

      expect(tree.exists('libs/infra/rpc/src/lib/service/core.ts')).toBe(true);
      expect(tree.exists('libs/infra/rpc/src/lib/service/middleware.ts')).toBe(true);
      expect(tree.exists('libs/infra/rpc/src/lib/service/transport.ts')).toBe(true);
      expect(tree.exists('libs/infra/rpc/src/lib/service/client.ts')).toBe(true);
      expect(tree.exists('libs/infra/rpc/src/lib/service/errors.ts')).toBe(true);
      expect(tree.exists('libs/infra/rpc/src/lib/service/router.ts')).toBe(true);
    });

    it('should generate core.ts with RPC utilities', async () => {
      await infraGenerator(tree, { name: 'rpc' });

      const coreContent = tree.read('libs/infra/rpc/src/lib/service/core.ts', 'utf-8');
      // Core provides RPC utilities and re-exports from @effect/rpc
      expect(coreContent).toContain('defineRpc');
      expect(coreContent).toContain('RpcGroup');
    });

    it('should generate middleware.ts with native RpcMiddleware.Tag pattern', async () => {
      await infraGenerator(tree, { name: 'rpc' });

      const middlewareContent = tree.read('libs/infra/rpc/src/lib/service/middleware.ts', 'utf-8');
      // Uses native @effect/rpc RpcMiddleware.Tag pattern
      expect(middlewareContent).toContain('CurrentUser');
      expect(middlewareContent).toContain('AuthMiddleware');
      expect(middlewareContent).toContain('RpcMiddleware.Tag');
      // Interface Segregation: AuthVerifier interface defined here, implemented elsewhere
      expect(middlewareContent).toContain('AuthVerifier');
      // DX helper for handlers
      expect(middlewareContent).toContain('getHandlerContext');
    });
  });
});

// ============================================================================
// PHASE 4: Client-Server Separation Tests (Generic Concerns Only)
// ============================================================================

describe('Infra Generator - Client-Server Separation', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  describe('Platform Separation', () => {
    it('should generate client and server implementation when includeClientServer=true', async () => {
      await infraGenerator(tree, {
        name: 'storage',
        includeClientServer: true,
      });

      expect(tree.exists('libs/infra/storage/src/lib/client/hooks')).toBe(true);
      expect(tree.exists('libs/infra/storage/src/lib/layers/server-layers.ts')).toBe(true);
    });

    it('should generate client/hooks/ directory', async () => {
      await infraGenerator(tree, {
        name: 'storage',
        includeClientServer: true,
      });

      expect(tree.exists('libs/infra/storage/src/lib/client/hooks/use-storage.ts')).toBe(true);
    });

    it('should generate client-layers.ts AND server-layers.ts', async () => {
      await infraGenerator(tree, {
        name: 'storage',
        includeClientServer: true,
      });

      expect(tree.exists('libs/infra/storage/src/lib/layers/client-layers.ts')).toBe(true);
      expect(tree.exists('libs/infra/storage/src/lib/layers/server-layers.ts')).toBe(true);
    });

    it('should export only universal types from index.ts when includeClientServer=true', async () => {
      await infraGenerator(tree, {
        name: 'storage',
        includeClientServer: true,
      });

      const indexContent = tree.read('libs/infra/storage/src/index.ts', 'utf-8');
      expect(indexContent).toContain("from './lib/service/service'");
      expect(indexContent).not.toContain("from './lib/layers");
    });

    it('should export client layers from client-layers.ts', async () => {
      await infraGenerator(tree, {
        name: 'storage',
        includeClientServer: true,
      });

      const clientLayersContent = tree.read(
        'libs/infra/storage/src/lib/layers/client-layers.ts',
        'utf-8',
      );
      expect(clientLayersContent).toContain('StorageService.ClientLive');
    });

    it('should export server layers from server-layers.ts', async () => {
      await infraGenerator(tree, {
        name: 'storage',
        includeClientServer: true,
      });

      const serverLayersContent = tree.read(
        'libs/infra/storage/src/lib/layers/server-layers.ts',
        'utf-8',
      );
      expect(serverLayersContent).toContain('StorageService.Live');
    });

    it('should NOT create client implementation when includeClientServer=false', async () => {
      await infraGenerator(tree, {
        name: 'storage',
        includeClientServer: false,
      });

      expect(tree.exists('libs/infra/storage/src/lib/client')).toBe(false);
      // Server layers should still exist for generic concerns
      expect(tree.exists('libs/infra/storage/src/lib/layers/server-layers.ts')).toBe(true);
    });

    it('should NOT generate client/edge for primitive concerns regardless of flags', async () => {
      // Primitive concerns use static layers, not separate layer files
      await infraGenerator(tree, {
        name: 'cache',
        includeClientServer: true,
        includeEdge: true,
      });

      // Client and edge are NOT generated for primitive concerns
      expect(tree.exists('libs/infra/cache/src/lib/client')).toBe(false);
      expect(tree.exists('libs/infra/cache/src/lib/layers/edge-layers.ts')).toBe(false);
      // But the primitive-specific layer should exist
      expect(tree.exists('libs/infra/cache/src/lib/layers/redis-layer.ts')).toBe(true);
    });
  });
});

// ============================================================================
// PHASE 5: Edge Platform Tests (Generic Concerns Only)
// ============================================================================

describe('Infra Generator - Edge Platform', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  describe('Edge Runtime Support', () => {
    it('should generate edge-layers.ts when includeEdge=true for generic concerns', async () => {
      await infraGenerator(tree, { name: 'auth', includeEdge: true });

      expect(tree.exists('libs/infra/auth/src/lib/layers/edge-layers.ts')).toBe(true);
    });

    it('should NOT generate edge files when includeEdge=false', async () => {
      await infraGenerator(tree, { name: 'myservice' });

      expect(tree.exists('libs/infra/myservice/src/lib/layers/edge-layers.ts')).toBe(false);
    });

    it('should work independently with includeClientServer', async () => {
      await infraGenerator(tree, {
        name: 'webhook',
        includeClientServer: true,
        includeEdge: true,
      });

      expect(tree.exists('libs/infra/webhook/src/lib/client/hooks')).toBe(true);
      expect(tree.exists('libs/infra/webhook/src/lib/layers/server-layers.ts')).toBe(true);
      expect(tree.exists('libs/infra/webhook/src/lib/layers/edge-layers.ts')).toBe(true);
    });
  });
});

// ============================================================================
// PHASE 6: File Cleanup Tests
// ============================================================================

describe('Infra Generator - File Cleanup', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  describe('Conditional File Removal', () => {
    it('should remove client implementation when includeClientServer=false', async () => {
      // First generate with flag
      await infraGenerator(tree, {
        name: 'storage',
        includeClientServer: true,
      });

      // Verify client implementation exists
      expect(tree.exists('libs/infra/storage/src/lib/client')).toBe(true);

      // Generate without flag in new tree
      const tree2 = createTreeWithEmptyWorkspace();
      await infraGenerator(tree2, {
        name: 'storage',
        includeClientServer: false,
      });

      // Client implementation directory should not exist
      expect(tree2.exists('libs/infra/storage/src/lib/client')).toBe(false);
      // But server layers should exist
      expect(tree2.exists('libs/infra/storage/src/lib/layers/server-layers.ts')).toBe(true);
    });

    it('should not generate edge files when includeEdge=false', async () => {
      const tree2 = createTreeWithEmptyWorkspace();
      await infraGenerator(tree2, { name: 'myservice', includeEdge: false });

      expect(tree2.exists('libs/infra/myservice/src/lib/layers/edge-layers.ts')).toBe(false);
    });

    it('should preserve all implementation layers when both flags enabled', async () => {
      await infraGenerator(tree, {
        name: 'universal',
        includeClientServer: true,
        includeEdge: true,
      });

      expect(tree.exists('libs/infra/universal/src/lib/layers/client-layers.ts')).toBe(true);
      expect(tree.exists('libs/infra/universal/src/lib/layers/server-layers.ts')).toBe(true);
      expect(tree.exists('libs/infra/universal/src/lib/layers/edge-layers.ts')).toBe(true);
    });

    it('should generate client and server implementation directories when includeClientServer is true', async () => {
      await infraGenerator(tree, {
        name: 'storage',
        includeClientServer: true,
      });

      const clientDirExists = tree.exists('libs/infra/storage/src/lib/client');
      const serverLayersExists = tree.exists('libs/infra/storage/src/lib/layers/server-layers.ts');

      // Both implementation directories should exist
      expect(clientDirExists).toBe(true);
      expect(serverLayersExists).toBe(true);
    });
  });
});

// ============================================================================
// PHASE 7: Database Concern Tests (Uses Generic Template with Kysely)
// ============================================================================

describe('Infra Generator - Database Concern', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  describe('Database Infrastructure', () => {
    it('should generate database-specific files (delegates to Kysely)', async () => {
      await infraGenerator(tree, { name: 'database' });

      // Database generates service and errors but delegates to Kysely provider
      // It does NOT generate config.ts, memory.ts, or server-layers.ts
      expect(tree.exists('libs/infra/database/src/lib/service/service.ts')).toBe(true);
      expect(tree.exists('libs/infra/database/src/lib/service/errors.ts')).toBe(true);
      expect(tree.exists('libs/infra/database/src/lib/service/config.ts')).toBe(false);
      expect(tree.exists('libs/infra/database/src/lib/providers/memory.ts')).toBe(false);
      expect(tree.exists('libs/infra/database/src/lib/layers/server-layers.ts')).toBe(false);
    });

    it('should generate database service with Context.Tag', async () => {
      await infraGenerator(tree, { name: 'database' });

      const serviceContent = tree.read('libs/infra/database/src/lib/service/service.ts', 'utf-8');
      expect(serviceContent).toContain('DatabaseService');
      expect(serviceContent).toContain('extends Context.Tag');
    });
  });
});
