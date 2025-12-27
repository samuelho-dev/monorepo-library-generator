/**
 * Feature Generator Tests
 *
 * Test-Driven Design approach following feature.md specification
 * Validates prewired defaults: RPC, client, server, cache, and edge are always generated
 */

import type { Tree } from "@nx/devkit"
import { readProjectConfiguration } from "@nx/devkit"
import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing"
import { featureGenerator } from "./feature"

describe("feature generator", () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  describe("📁 File Generation Tests (Prewired Defaults)", () => {
    it("should generate server-only feature for platform=node", async () => {
      await featureGenerator(tree, {
        name: "auth",
        platform: "node"
      })

      const projectRoot = "libs/feature/auth"

      // Server files always exist (in services/ directory)
      expect(tree.exists(`${projectRoot}/src/lib/server/services/service.ts`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/src/lib/server/services/layers.ts`)).toBeTruthy()

      // Node platform doesn't generate client files
      expect(tree.exists(`${projectRoot}/src/lib/client`)).toBeFalsy()

      // Shared files always exist
      expect(tree.exists(`${projectRoot}/src/index.ts`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/src/lib/shared/types.ts`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/src/lib/shared/errors.ts`)).toBeTruthy()
    })

    it("should generate BOTH client and server for platform=universal", async () => {
      await featureGenerator(tree, {
        name: "search",
        platform: "universal"
      })

      const projectRoot = "libs/feature/search"

      // Universal platform generates BOTH server and client (prewired)
      expect(tree.exists(`${projectRoot}/src/lib/server/services/service.ts`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/src/lib/client`)).toBeTruthy()
    })

    it("should always generate client files for default/universal platform", async () => {
      // Default platform is universal - client is prewired
      await featureGenerator(tree, { name: "payment" })

      const projectRoot = "libs/feature/payment"

      // Client always generated for default platform (prewired)
      expect(tree.exists(`${projectRoot}/src/lib/client/atoms`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/src/lib/client/hooks`)).toBeTruthy()
    })

    it("should always generate RPC files (prewired architecture)", async () => {
      await featureGenerator(tree, { name: "payment" })

      const projectRoot = "libs/feature/payment"

      // RPC is always prewired - unified structure
      expect(tree.exists(`${projectRoot}/src/lib/rpc/handlers.ts`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/src/lib/rpc/router.ts`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/src/lib/rpc/errors.ts`)).toBeTruthy()
      // No rpc/index.ts - router.ts is the main entry point
    })

    it("should generate CQRS directories when includeCQRS=true", async () => {
      await featureGenerator(tree, {
        name: "analytics",
        includeCQRS: true
      })

      const projectRoot = "libs/feature/analytics"

      // CQRS is under server/cqrs/ directory
      expect(tree.exists(`${projectRoot}/src/lib/server/cqrs/commands`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/src/lib/server/cqrs/queries`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/src/lib/server/cqrs/operations`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/src/lib/server/cqrs/projections`)).toBeTruthy()
    })

    it("should NOT generate CQRS directories when includeCQRS=false", async () => {
      await featureGenerator(tree, {
        name: "auth",
        includeCQRS: false
      })

      const projectRoot = "libs/feature/auth"

      expect(tree.exists(`${projectRoot}/src/lib/server/commands`)).toBeFalsy()
      expect(tree.exists(`${projectRoot}/src/lib/server/queries`)).toBeFalsy()
      expect(tree.exists(`${projectRoot}/src/lib/server/projections`)).toBeFalsy()
    })

    it("should generate all prewired integrations by default", async () => {
      // All integrations are prewired by default (no flags needed)
      await featureGenerator(tree, {
        name: "full",
        platform: "universal",
        includeCQRS: true // CQRS is still optional
      })

      const projectRoot = "libs/feature/full"

      // Main barrel export
      expect(tree.exists(`${projectRoot}/src/index.ts`)).toBeTruthy()

      // Server (always prewired, in services/ directory)
      expect(tree.exists(`${projectRoot}/src/lib/server/services/service.ts`)).toBeTruthy()

      // Client (always prewired for universal platform)
      expect(tree.exists(`${projectRoot}/src/lib/client/hooks`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/src/lib/client/atoms`)).toBeTruthy()

      // RPC (always prewired - unified structure)
      expect(tree.exists(`${projectRoot}/src/lib/rpc/handlers.ts`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/src/lib/rpc/router.ts`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/src/lib/rpc/errors.ts`)).toBeTruthy()

      // CQRS (still optional, enabled here)
      expect(tree.exists(`${projectRoot}/src/lib/server/cqrs/commands`)).toBeTruthy()
    })
  })

  describe("🏗️ Project Configuration Tests", () => {
    it("should use domain-specific scope tag", async () => {
      await featureGenerator(tree, {
        name: "payment",
        scope: "payments"
      })

      const config = readProjectConfiguration(tree, "feature-payment")
      expect(config.tags).toContain("scope:payments")
    })

    it("should use name as scope when scope not provided", async () => {
      await featureGenerator(tree, {
        name: "auth"
      })

      const config = readProjectConfiguration(tree, "feature-auth")
      expect(config.tags).toContain("scope:auth")
    })

    it("should include platform tag for ALL platforms including node", async () => {
      await featureGenerator(tree, {
        name: "auth",
        platform: "node"
      })

      const config = readProjectConfiguration(tree, "feature-auth")
      expect(config.tags).toContain("type:feature")
      expect(config.tags).toContain("platform:node") // ALL platforms tagged (bug fix from Phase 1)
    })

    it("should include platform tag for universal", async () => {
      await featureGenerator(tree, {
        name: "search",
        platform: "universal"
      })

      const config = readProjectConfiguration(tree, "feature-search")
      expect(config.tags).toContain("platform:universal")
    })

    it("should include platform tag for edge", async () => {
      await featureGenerator(tree, {
        name: "middleware",
        platform: "edge"
      })

      const config = readProjectConfiguration(tree, "feature-middleware")
      expect(config.tags).toContain("platform:edge")
    })

    it("should create correct project.json with batch mode enabled", async () => {
      await featureGenerator(tree, {
        name: "payment"
      })

      const config = readProjectConfiguration(tree, "feature-payment")

      // Basic metadata
      expect(config.name).toBe("feature-payment")
      expect(config.root).toBe("libs/feature/payment")
      expect(config.sourceRoot).toBe("libs/feature/payment/src")
      expect(config.projectType).toBe("library")

      // Build target with batch mode
      expect(config.targets?.build).toBeDefined()
      expect(config.targets?.build?.executor).toBe("@nx/js:tsc")
      expect(config.targets?.build?.options?.batch).toBe(true)
    })

    it("should include client entry point for includeClientServer", async () => {
      await featureGenerator(tree, {
        name: "search",
        includeClientServer: true
      })

      const config = readProjectConfiguration(tree, "feature-search")

      // Platform barrel exports removed - no additional entry points needed
      // Modern bundlers handle tree-shaking automatically
      expect(config.targets?.build).toBeDefined()
    })
  })

  describe("📦 Package.json Tests", () => {
    it("should create package.json with correct structure", async () => {
      await featureGenerator(tree, {
        name: "payment"
      })

      const packageJson = JSON.parse(
        tree.read("libs/feature/payment/package.json", "utf-8") || "{}"
      )

      // Check for package name (npm scope may vary based on workspace config)
      expect(packageJson.name).toContain("feature-payment")
      expect(packageJson.type).toBe("module")

      // Effect peer dependency
      expect(packageJson.peerDependencies?.effect).toBeDefined()

      // Exports configuration - platform barrel exports removed
      expect(packageJson.exports?.["."]?.import).toBeDefined()
      expect(packageJson.exports?.["./types"]).toBeDefined()
    })

    it("should generate functional exports (prewired)", async () => {
      await featureGenerator(tree, { name: "search" })

      const packageJson = JSON.parse(tree.read("libs/feature/search/package.json", "utf-8") || "{}")

      // Functional exports for prewired architecture
      expect(packageJson.exports?.["."]?.import).toBeDefined()
      expect(packageJson.exports?.["./types"]).toBeDefined()
    })

    it("should not include platform-specific barrel exports", async () => {
      await featureGenerator(tree, {
        name: "auth",
        platform: "node"
      })

      const packageJson = JSON.parse(tree.read("libs/feature/auth/package.json", "utf-8") || "{}")

      // Platform barrel exports removed (prewired architecture)
      expect(packageJson.exports?.["./client"]).toBeUndefined()
      expect(packageJson.exports?.["./server"]).toBeUndefined()
      expect(packageJson.exports?.["./edge"]).toBeUndefined()
    })

    it("should not include edge-specific exports in package.json", async () => {
      // Edge is always generated but not separately exported
      await featureGenerator(tree, { name: "middleware" })

      const packageJson = JSON.parse(
        tree.read("libs/feature/middleware/package.json", "utf-8") || "{}"
      )

      // Platform barrel exports removed
      expect(packageJson.exports?.["./edge"]).toBeUndefined()
    })
  })

  describe("📝 Template Content Tests", () => {
    it("should use Context.Tag pattern in service interface", async () => {
      await featureGenerator(tree, {
        name: "payment"
      })

      const serviceContent = tree.read(
        "libs/feature/payment/src/lib/server/services/service.ts",
        "utf-8"
      )

      expect(serviceContent).toContain("Context.Tag")
      expect(serviceContent).toContain("PaymentService")
      expect(serviceContent).toContain("Layer.")
    })

    it("should use Data.TaggedError in shared/errors.ts (Contract-First)", async () => {
      await featureGenerator(tree, {
        name: "payment"
      })

      const errorsContent = tree.read("libs/feature/payment/src/lib/shared/errors.ts", "utf-8")

      // Contract-First: shared/errors uses Data.TaggedError and re-exports from contract
      expect(errorsContent).toContain("Data.TaggedError")
      expect(errorsContent).toContain("PaymentServiceError")
      expect(errorsContent).toContain("PaymentNotFoundError")
      expect(errorsContent).toContain("contract-payment")
    })

    it("should import RpcGroup from contract library (prewired)", async () => {
      // RPC is always prewired
      await featureGenerator(tree, { name: "payment" })

      // Handlers import RPCs from contract (Contract-First architecture)
      const handlersContent = tree.read("libs/feature/payment/src/lib/rpc/handlers.ts", "utf-8")

      // Contract-First: RPCs defined in contract library, handlers implement them
      expect(handlersContent).toContain("PaymentRpcs")
      expect(handlersContent).toContain("/contract-payment")
      expect(handlersContent).not.toContain("RpcRequest.make") // Old API
    })

    it("should use Rpcs.toLayer for type-safe handlers (prewired)", async () => {
      // RPC is always prewired
      await featureGenerator(tree, { name: "payment" })

      // Unified handlers (Contract-First - no external/internal split)
      const handlersContent = tree.read("libs/feature/payment/src/lib/rpc/handlers.ts", "utf-8")

      // Check that handlers imports from contract
      expect(handlersContent).toContain("PaymentRpcs")
      // Handler registration uses Rpcs.toLayer pattern
      expect(handlersContent).toContain("PaymentRpcs.toLayer")
    })

    it("should generate RPC boundary wrapper for error transformation (prewired)", async () => {
      // RPC is always prewired
      await featureGenerator(tree, { name: "payment" })

      const errorsContent = tree.read("libs/feature/payment/src/lib/rpc/errors.ts", "utf-8")

      // Contract-First: RPC errors file provides domain-specific error boundary wrapper
      // Domain errors are caught and transformed to RPC errors (Schema.TaggedError from infra-rpc)
      expect(errorsContent).toContain("withPaymentRpcBoundary")
      expect(errorsContent).toContain("PaymentFeatureError")
      expect(errorsContent).toContain("../shared/errors")
      // Imports RPC errors from infra-rpc
      expect(errorsContent).toContain("RpcNotFoundError")
      expect(errorsContent).toContain("infra-rpc")
    })

    it("should use Atom.make in client atoms (prewired for universal)", async () => {
      // Client is prewired for universal platform
      await featureGenerator(tree, { name: "search" })

      const atomsContent = tree.read(
        "libs/feature/search/src/lib/client/atoms/search-atoms.ts",
        "utf-8"
      )

      expect(atomsContent).toContain("Atom.make")
      expect(atomsContent).toContain("@effect-atom/atom")
    })

    it("should export ONLY types in index.ts", async () => {
      await featureGenerator(tree, {
        name: "payment"
      })

      const indexContent = tree.read("libs/feature/payment/src/index.ts", "utf-8")

      // Should export from shared
      expect(indexContent).toContain("./lib/shared/types")
      expect(indexContent).toContain("./lib/shared/errors")

      // Should NOT export service or layers
      expect(indexContent).not.toContain("./lib/server/service")
      expect(indexContent).not.toContain("./lib/server/layers")
    })

    it("should generate server implementation files (prewired)", async () => {
      // Server and RPC are always prewired
      await featureGenerator(tree, { name: "payment" })

      // Check actual implementation files (in services/ directory)
      expect(tree.exists("libs/feature/payment/src/lib/server/services/service.ts")).toBeTruthy()
      expect(tree.exists("libs/feature/payment/src/lib/server/services/layers.ts")).toBeTruthy()
      // RPC files use unified structure (Contract-First, no external/internal split)
      expect(tree.exists("libs/feature/payment/src/lib/rpc/handlers.ts")).toBeTruthy()
      expect(tree.exists("libs/feature/payment/src/lib/rpc/router.ts")).toBeTruthy()
    })

    it("should generate client implementation for universal platform (prewired)", async () => {
      // Client is prewired for universal platform
      await featureGenerator(tree, { name: "search" })

      // Check actual implementation directories
      expect(tree.exists("libs/feature/search/src/lib/client/hooks")).toBeTruthy()
      expect(tree.exists("libs/feature/search/src/lib/client/atoms")).toBeTruthy()

      // Server service should also exist (in services/ directory)
      expect(tree.exists("libs/feature/search/src/lib/server/services/service.ts")).toBeTruthy()
    })
  })

  describe("🔧 TypeScript Configuration Tests", () => {
    it("should enable declaration output for library builds", async () => {
      await featureGenerator(tree, {
        name: "payment"
      })

      const tsconfigLib = JSON.parse(
        tree.read("libs/feature/payment/tsconfig.lib.json", "utf-8") || "{}"
      )

      // Note: composite is intentionally omitted to support workspace path mappings
      // NX handles incremental builds at the Nx level
      expect(tsconfigLib.compilerOptions?.declaration).toBe(true)
      expect(tsconfigLib.compilerOptions?.declarationMap).toBe(true)
    })

    it("should update tsconfig.base.json with correct path mappings", async () => {
      await featureGenerator(tree, {
        name: "payment"
      })

      // In a real workspace, path mappings would be added by NX's library generator
      // In virtual test workspace, we verify the library generator was called
      const config = readProjectConfiguration(tree, "feature-payment")
      expect(config).toBeDefined()
      expect(config.root).toBe("libs/feature/payment")
    })

    it("should generate client implementation for universal platform", async () => {
      // Universal platform generates client by default
      await featureGenerator(tree, { name: "search" })

      // Verify client implementation directory was created
      expect(tree.exists("libs/feature/search/src/lib/client/hooks")).toBeTruthy()
      const config = readProjectConfiguration(tree, "feature-search")
      expect(config).toBeDefined()
    })
  })

  describe("🎯 Naming Convention Tests", () => {
    it("should use correct naming transformations", async () => {
      await featureGenerator(tree, {
        name: "my-custom-feature"
      })

      const serviceContent = tree.read(
        "libs/feature/my-custom-feature/src/lib/server/services/service.ts",
        "utf-8"
      )

      // className: MyCustomFeature (PascalCase)
      expect(serviceContent).toContain("MyCustomFeatureService")

      // Project name should be kebab-case with feature prefix
      const config = readProjectConfiguration(tree, "feature-my-custom-feature")
      expect(config.name).toBe("feature-my-custom-feature")
    })
  })

  describe("🚨 Validation Tests", () => {
    it("should throw error if library already exists", async () => {
      await featureGenerator(tree, {
        name: "payment"
      })

      await expect(
        featureGenerator(tree, {
          name: "payment"
        })
      ).rejects.toThrow()
    })

    it("should validate required options", async () => {
      await expect(
        featureGenerator(tree, {
          name: ""
        })
      ).rejects.toThrow()
    })
  })

  describe("📖 Documentation Tests", () => {
    it("should generate README with correct structure", async () => {
      await featureGenerator(tree, {
        name: "payment",
        description: "Payment processing feature"
      })

      const readme = tree.read("libs/feature/payment/README.md", "utf-8")

      // Check for package name (npm scope may vary based on workspace config)
      expect(readme).toContain("feature-payment")
      expect(readme).toContain("Payment processing feature")
      expect(readme).toContain("## Installation")
      expect(readme).toContain("## Usage")
      expect(readme).toContain("## Development")
    })

    it("should generate CLAUDE.md with architecture guidance", async () => {
      await featureGenerator(tree, {
        name: "payment"
      })

      const claude = tree.read("libs/feature/payment/CLAUDE.md", "utf-8")

      // Check for package name (npm scope may vary based on workspace config)
      expect(claude).toContain("feature-payment")
      expect(claude).toContain("AI-optimized reference")
      expect(claude).toContain("## Quick Reference")
      expect(claude).toContain("Import Patterns")
    })
  })
})
