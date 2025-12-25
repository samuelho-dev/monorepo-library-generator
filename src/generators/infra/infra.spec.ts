import type { Tree } from "@nx/devkit"
import { readProjectConfiguration } from "@nx/devkit"
import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing"

import { infraGenerator } from "./infra"

// ============================================================================
// PHASE 1: Foundation Tests (Schema & Base Files)
// ============================================================================

describe("Infra Generator - Foundation", () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  describe("Base File Generation - Generic Concern", () => {
    // Use "myservice" for generic infrastructure (not a primitive concern)
    it("should generate all base files for generic infrastructure", async () => {
      await infraGenerator(tree, { name: "myservice" })

      // Non-primitive concerns generate flat structure in lib/
      expect(tree.exists("libs/infra/myservice/src/lib/service.ts")).toBe(true)
      expect(tree.exists("libs/infra/myservice/src/lib/errors.ts")).toBe(true)
      expect(tree.exists("libs/infra/myservice/src/lib/layers.ts")).toBe(true)
      expect(tree.exists("libs/infra/myservice/src/index.ts")).toBe(true)
    })

    it("should generate project.json with correct configuration", async () => {
      await infraGenerator(tree, { name: "myservice" })

      const config = readProjectConfiguration(tree, "infra-myservice")
      expect(config).toBeDefined()
      expect(config.projectType).toBe("library")
      expect(config.sourceRoot).toBe("libs/infra/myservice/src")
    })

    it("should generate package.json with workspace dependencies", async () => {
      await infraGenerator(tree, { name: "myservice" })

      const packageJsonContent = tree.read("libs/infra/myservice/package.json", "utf-8")
      // Check for package name (npm scope may vary based on workspace config)
      expect(packageJsonContent).toContain("infra-myservice")
      expect(packageJsonContent).toContain("effect")
    })

    it("should generate README.md with service documentation", async () => {
      await infraGenerator(tree, { name: "myservice" })

      expect(tree.exists("libs/infra/myservice/README.md")).toBe(true)
      const readmeContent = tree.read("libs/infra/myservice/README.md", "utf-8")
      expect(readmeContent).toContain("Myservice")
    })

    it("should generate CLAUDE.md with AI reference", async () => {
      await infraGenerator(tree, { name: "myservice" })

      expect(tree.exists("libs/infra/myservice/CLAUDE.md")).toBe(true)
    })

    it("should export service and layers from index.ts for generic concerns", async () => {
      await infraGenerator(tree, { name: "myservice" })

      const indexContent = tree.read("libs/infra/myservice/src/index.ts", "utf-8")
      // New structure exports from lib/ directly
      expect(indexContent).toContain("from './lib/service'")
      expect(indexContent).toContain("from './lib/errors'")
    })
  })

  describe("Base File Generation - Primitive Concern (Cache)", () => {
    // Cache is a primitive concern - uses specialized template with static layers
    it("should generate primitive template files for cache", async () => {
      await infraGenerator(tree, { name: "cache" })

      // Primitive concerns generate flat structure in lib/
      expect(tree.exists("libs/infra/cache/src/lib/service.ts")).toBe(true)
      expect(tree.exists("libs/infra/cache/src/lib/errors.ts")).toBe(true)
      expect(tree.exists("libs/infra/cache/src/lib/layers.ts")).toBe(true)
      expect(tree.exists("libs/infra/cache/src/index.ts")).toBe(true)
    })

    it("should NOT generate generic subdirectory files for primitive concerns", async () => {
      await infraGenerator(tree, { name: "cache" })

      // Primitive concerns use flat structure - no subdirectories
      expect(tree.exists("libs/infra/cache/src/lib/service/service.ts")).toBe(false)
      expect(tree.exists("libs/infra/cache/src/lib/service/config.ts")).toBe(false)
      expect(tree.exists("libs/infra/cache/src/lib/providers/memory.ts")).toBe(false)
      expect(tree.exists("libs/infra/cache/src/lib/layers/server-layers.ts")).toBe(false)
    })

    it("should generate service with static Live/Test/Memory layers", async () => {
      await infraGenerator(tree, { name: "cache" })

      const serviceContent = tree.read("libs/infra/cache/src/lib/service.ts", "utf-8")
      // Cache service has Memory, Test, and Live static layers
      expect(serviceContent).toContain("static readonly Memory")
      expect(serviceContent).toContain("static readonly Test")
      expect(serviceContent).toContain("static readonly Live")
    })
  })

  describe("Schema Options", () => {
    it("should always generate client hooks for generic concerns (prewired)", async () => {
      // Non-primitive concerns always get client/server (prewired integration)
      await infraGenerator(tree, { name: "custom-service" })

      expect(tree.exists("libs/infra/custom-service/src/index.ts")).toBe(true)
      // Client hooks always generated for non-primitive concerns (prewired)
      expect(tree.exists("libs/infra/custom-service/src/lib/client/hooks")).toBe(true)
    })

    it("should NOT generate client hooks for primitive concerns", async () => {
      // Storage is a primitive concern - client hooks not generated
      await infraGenerator(tree, { name: "storage" })

      expect(tree.exists("libs/infra/storage/src/index.ts")).toBe(true)
      // Primitives don't get client hooks
      expect(tree.exists("libs/infra/storage/src/lib/client/hooks")).toBe(false)
    })

    it("should generate client/server integration for generic concerns by default", async () => {
      // Prewired: generic concerns always get client/server
      await infraGenerator(tree, { name: "webhook-service" })

      expect(tree.exists("libs/infra/webhook-service/src/index.ts")).toBe(true)
      expect(tree.exists("libs/infra/webhook-service/src/lib/client/hooks")).toBe(true)
    })
  })
})

// ============================================================================
// PHASE 2: Server-Only Structure Tests (Generic Concerns)
// ============================================================================

describe("Infra Generator - Server-Only Structure (Generic)", () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  describe("Service Definition", () => {
    it("should use Context.Tag with inline interface (Effect 3.0+ pattern)", async () => {
      await infraGenerator(tree, { name: "myservice" })

      const serviceContent = tree.read("libs/infra/myservice/src/lib/service.ts", "utf-8")
      // Modern Effect 3.0+ pattern: Context.Tag with inline interface
      expect(serviceContent).toContain("export class MyserviceService")
      expect(serviceContent).toContain("extends Context.Tag")
    })

    it("should generate service errors with Data.TaggedError", async () => {
      await infraGenerator(tree, { name: "myservice" })

      const errorsContent = tree.read("libs/infra/myservice/src/lib/errors.ts", "utf-8")
      expect(errorsContent).toContain("extends Data.TaggedError")
      expect(errorsContent).toContain("MyserviceError")
    })

    it("should generate layers.ts with Live/Test/Dev layers for generic concerns", async () => {
      await infraGenerator(tree, { name: "myservice" })

      expect(tree.exists("libs/infra/myservice/src/lib/layers.ts")).toBe(true)
      const layersContent = tree.read("libs/infra/myservice/src/lib/layers.ts", "utf-8")
      expect(layersContent).toContain("Live")
      expect(layersContent).toContain("Test")
    })

    it("should ALWAYS create client/ directory for generic concern (prewired)", async () => {
      // Prewired: client/server is always enabled for non-primitive concerns
      await infraGenerator(tree, { name: "myservice" })

      expect(tree.exists("libs/infra/myservice/src/lib/client/hooks")).toBe(true)
    })
  })
})

// ============================================================================
// PHASE 3: Primitive Concerns Tests (Cache, Queue, PubSub, Logging, Metrics, RPC)
// ============================================================================

describe("Infra Generator - Primitive Concerns", () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  describe("Cache Primitive", () => {
    it("should generate cache service with Effect.Cache wrapper", async () => {
      await infraGenerator(tree, { name: "cache" })

      const serviceContent = tree.read("libs/infra/cache/src/lib/service.ts", "utf-8")
      expect(serviceContent).toContain("CacheService")
      expect(serviceContent).toContain("Context.Tag")
      // Cache-specific operations
      expect(serviceContent).toContain("make")
    })

    it("should generate layers.ts with Redis layer implementation", async () => {
      await infraGenerator(tree, { name: "cache" })

      expect(tree.exists("libs/infra/cache/src/lib/layers.ts")).toBe(true)
      const layersContent = tree.read("libs/infra/cache/src/lib/layers.ts", "utf-8")
      // Cache layers provides Redis backing via provider-redis
      expect(layersContent).toContain("Redis")
      expect(layersContent).toContain("CacheRedisLayer")
    })
  })

  describe("Queue Primitive", () => {
    it("should generate queue service with Effect.Queue wrapper", async () => {
      await infraGenerator(tree, { name: "queue" })

      const serviceContent = tree.read("libs/infra/queue/src/lib/service.ts", "utf-8")
      expect(serviceContent).toContain("QueueService")
      expect(serviceContent).toContain("Context.Tag")
    })

    it("should generate layers.ts for queue", async () => {
      await infraGenerator(tree, { name: "queue" })

      expect(tree.exists("libs/infra/queue/src/lib/layers.ts")).toBe(true)
    })
  })

  describe("PubSub Primitive", () => {
    it("should generate pubsub service with Effect.PubSub wrapper", async () => {
      await infraGenerator(tree, { name: "pubsub" })

      const serviceContent = tree.read("libs/infra/pubsub/src/lib/service.ts", "utf-8")
      expect(serviceContent).toContain("PubsubService")
      expect(serviceContent).toContain("Context.Tag")
    })

    it("should generate layers.ts for pubsub", async () => {
      await infraGenerator(tree, { name: "pubsub" })

      expect(tree.exists("libs/infra/pubsub/src/lib/layers.ts")).toBe(true)
    })
  })

  describe("Observability Primitive", () => {
    it("should generate observability SDK with OTEL layers", async () => {
      await infraGenerator(tree, { name: "observability" })

      // Should generate all observability files
      expect(tree.exists("libs/infra/observability/src/lib/sdk.ts")).toBe(true)
      expect(tree.exists("libs/infra/observability/src/lib/supervisor.ts")).toBe(true)
      expect(tree.exists("libs/infra/observability/src/lib/config.ts")).toBe(true)
      expect(tree.exists("libs/infra/observability/src/lib/presets.ts")).toBe(true)
      expect(tree.exists("libs/infra/observability/src/lib/errors.ts")).toBe(true)
      expect(tree.exists("libs/infra/observability/src/lib/constants.ts")).toBe(true)
    })

    it("should generate logging service as part of observability", async () => {
      await infraGenerator(tree, { name: "observability" })

      const loggingContent = tree.read("libs/infra/observability/src/lib/logging.ts", "utf-8")
      expect(loggingContent).toContain("LoggingService")
      expect(loggingContent).toContain("Context.Tag")
    })

    it("should generate metrics service as part of observability", async () => {
      await infraGenerator(tree, { name: "observability" })

      const metricsContent = tree.read("libs/infra/observability/src/lib/metrics.ts", "utf-8")
      expect(metricsContent).toContain("MetricsService")
      expect(metricsContent).toContain("Context.Tag")
    })

    it("should detect logging keyword as observability concern", async () => {
      await infraGenerator(tree, { name: "logging" })

      // logging keyword now maps to observability
      expect(tree.exists("libs/infra/logging/src/lib/sdk.ts")).toBe(true)
      expect(tree.exists("libs/infra/logging/src/lib/logging.ts")).toBe(true)
      expect(tree.exists("libs/infra/logging/src/lib/metrics.ts")).toBe(true)
    })

    it("should detect metrics keyword as observability concern", async () => {
      await infraGenerator(tree, { name: "metrics" })

      // metrics keyword now maps to observability
      expect(tree.exists("libs/infra/metrics/src/lib/sdk.ts")).toBe(true)
      expect(tree.exists("libs/infra/metrics/src/lib/logging.ts")).toBe(true)
      expect(tree.exists("libs/infra/metrics/src/lib/metrics.ts")).toBe(true)
    })
  })

  describe("RPC Primitive", () => {
    it("should generate RPC infrastructure files", async () => {
      await infraGenerator(tree, { name: "rpc" })

      // RPC files are directly in lib/ (flat structure)
      expect(tree.exists("libs/infra/rpc/src/lib/core.ts")).toBe(true)
      expect(tree.exists("libs/infra/rpc/src/lib/transport.ts")).toBe(true)
      expect(tree.exists("libs/infra/rpc/src/lib/client.ts")).toBe(true)
      expect(tree.exists("libs/infra/rpc/src/lib/errors.ts")).toBe(true)
      expect(tree.exists("libs/infra/rpc/src/lib/router.ts")).toBe(true)
      // Middleware is in subdirectory (Contract-First architecture)
      expect(tree.exists("libs/infra/rpc/src/lib/middleware/index.ts")).toBe(true)
      expect(tree.exists("libs/infra/rpc/src/lib/middleware/auth.ts")).toBe(true)
    })

    it("should generate core.ts with RPC utilities", async () => {
      await infraGenerator(tree, { name: "rpc" })

      const coreContent = tree.read("libs/infra/rpc/src/lib/core.ts", "utf-8")
      // Core provides RPC utilities and re-exports from @effect/rpc
      expect(coreContent).toContain("defineRpc")
      expect(coreContent).toContain("RpcGroup")
    })

    it("should generate middleware with auth patterns", async () => {
      await infraGenerator(tree, { name: "rpc" })

      const authContent = tree.read("libs/infra/rpc/src/lib/middleware/auth.ts", "utf-8")
      expect(authContent).toContain("CurrentUser")
      expect(authContent).toContain("AuthMiddleware")
    })
  })
})

// ============================================================================
// PHASE 4: Client-Server Separation Tests (Generic Concerns Only)
// ============================================================================

describe("Infra Generator - Client-Server Separation", () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  describe("Platform Separation (Prewired for Non-Primitives)", () => {
    it("should always generate client and server implementation for generic concerns", async () => {
      // Prewired: Non-primitive concerns always get client-server separation
      await infraGenerator(tree, { name: "myservice" })

      // Client hooks directory for non-primitive concerns (prewired)
      expect(tree.exists("libs/infra/myservice/src/lib/client/hooks")).toBe(true)
      // Layers at flat lib/layers.ts
      expect(tree.exists("libs/infra/myservice/src/lib/layers.ts")).toBe(true)
      // Client layers in subdirectory
      expect(tree.exists("libs/infra/myservice/src/lib/layers/client-layers.ts")).toBe(true)
    })

    it("should generate client/hooks/ directory by default for generic concerns", async () => {
      // Prewired: generic concern gets client hooks
      await infraGenerator(tree, { name: "myservice" })

      expect(tree.exists("libs/infra/myservice/src/lib/client/hooks/use-myservice.ts")).toBe(true)
    })

    it("should generate client-layers.ts by default for generic concerns", async () => {
      // Prewired: generic concern gets client layers
      await infraGenerator(tree, { name: "myservice" })

      // Main layers file is flat
      expect(tree.exists("libs/infra/myservice/src/lib/layers.ts")).toBe(true)
      // Client layers in subdirectory (prewired)
      expect(tree.exists("libs/infra/myservice/src/lib/layers/client-layers.ts")).toBe(true)
    })

    it("should export service and config from index.ts", async () => {
      await infraGenerator(tree, { name: "myservice" })

      const indexContent = tree.read("libs/infra/myservice/src/index.ts", "utf-8")
      // Index exports from flat lib structure (single quotes)
      expect(indexContent).toContain("from './lib/service'")
      expect(indexContent).toContain("from './lib/config'")
    })

    it("should export client layers from client-layers.ts (prewired for generic concerns)", async () => {
      // Prewired: client/server generated by default for generic concerns
      await infraGenerator(tree, { name: "myservice" })

      const clientLayersContent = tree.read(
        "libs/infra/myservice/src/lib/layers/client-layers.ts",
        "utf-8"
      )
      expect(clientLayersContent).toContain("MyserviceService")
    })

    it("should generate layers.ts with layer variants (prewired)", async () => {
      // Layers are always generated
      await infraGenerator(tree, { name: "myservice" })

      const layersContent = tree.read("libs/infra/myservice/src/lib/layers.ts", "utf-8")
      // layers.ts exports Dev, Auto, and Custom variants (Live is static on service class)
      expect(layersContent).toContain("MyserviceServiceDev")
      expect(layersContent).toContain("MyserviceServiceAuto")
    })

    it("should NOT generate client for primitive concerns (specialized templates)", async () => {
      // Primitive concerns use specialized templates with static layers
      await infraGenerator(tree, { name: "cache" })

      // Client is NOT generated for primitive concerns
      expect(tree.exists("libs/infra/cache/src/lib/client")).toBe(false)
      // Primitives have layers.ts at flat path
      expect(tree.exists("libs/infra/cache/src/lib/layers.ts")).toBe(true)
    })
  })
})

// ============================================================================
// PHASE 5: Platform Tests - Always Prewired (Generic Concerns Only)
// ============================================================================

describe("Infra Generator - Platform Integration", () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  describe("Client-Server Integrations (Prewired for Non-Primitives)", () => {
    it("should always generate client/server for generic concerns (prewired)", async () => {
      // Prewired: Generic concerns always get client/server integration
      await infraGenerator(tree, { name: "webhook" })

      // Client integration is prewired for non-primitive concerns
      expect(tree.exists("libs/infra/webhook/src/lib/client/hooks")).toBe(true)
      // Layers at flat path
      expect(tree.exists("libs/infra/webhook/src/lib/layers.ts")).toBe(true)
    })

    it("should still skip platform files for primitive concerns", async () => {
      // Primitive concerns have their own specialized templates
      await infraGenerator(tree, { name: "cache" })

      // Primitives don't get client hooks
      expect(tree.exists("libs/infra/cache/src/lib/client")).toBe(false)
      // But they do have layers
      expect(tree.exists("libs/infra/cache/src/lib/layers.ts")).toBe(true)
    })
  })
})

// ============================================================================
// PHASE 6: File Structure Tests (Prewired Defaults)
// ============================================================================

describe("Infra Generator - File Structure", () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  describe("Generic Concern File Structure (Prewired)", () => {
    it("should generate layers for generic concerns", async () => {
      // Generic concerns get layers by default
      await infraGenerator(tree, { name: "universal-service" })

      // Layers are at lib/ level
      expect(tree.exists("libs/infra/universal-service/src/lib/layers.ts")).toBe(true)
    })

    it("should always generate client hooks for generic concerns (prewired)", async () => {
      // Prewired: Client/server integration is default for non-primitive concerns
      await infraGenerator(tree, { name: "custom-service" })

      // Client hooks generated by default (prewired)
      expect(tree.exists("libs/infra/custom-service/src/lib/client/hooks")).toBe(true)
      expect(tree.exists("libs/infra/custom-service/src/lib/layers.ts")).toBe(true)
    })
  })
})

// ============================================================================
// PHASE 7: Database Concern Tests (Uses Generic Template with Kysely)
// ============================================================================

describe("Infra Generator - Database Concern", () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  describe("Database Infrastructure", () => {
    it("should generate database-specific files (delegates to Kysely)", async () => {
      await infraGenerator(tree, { name: "database" })

      // Database generates service and errors but delegates to Kysely provider
      // It does NOT generate config.ts, memory.ts, or server-layers.ts
      expect(tree.exists("libs/infra/database/src/lib/service.ts")).toBe(true)
      expect(tree.exists("libs/infra/database/src/lib/errors.ts")).toBe(true)
      expect(tree.exists("libs/infra/database/src/lib/config.ts")).toBe(false)
      expect(tree.exists("libs/infra/database/src/lib/providers/memory.ts")).toBe(false)
      expect(tree.exists("libs/infra/database/src/lib/layers/server-layers.ts")).toBe(false)
    })

    it("should generate database service with Context.Tag", async () => {
      await infraGenerator(tree, { name: "database" })

      const serviceContent = tree.read("libs/infra/database/src/lib/service.ts", "utf-8")
      expect(serviceContent).toContain("DatabaseService")
      expect(serviceContent).toContain("extends Context.Tag")
    })
  })
})
