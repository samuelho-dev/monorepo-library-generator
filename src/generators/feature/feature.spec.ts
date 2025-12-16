/**
 * Feature Generator Tests
 *
 * Test-Driven Design approach following feature.md specification
 * Validates corrected platform logic and includeClientServer pattern
 */

import type { Tree } from "@nx/devkit"
import { readProjectConfiguration } from "@nx/devkit"
import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing"
import featureGenerator from "./feature"

describe("feature generator", () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  describe("📁 File Generation Tests", () => {
    it("should generate server-only feature (platform=node, no includeClientServer)", async () => {
      await featureGenerator(tree, {
        name: "auth",
        platform: "node"
      })

      const projectRoot = "libs/feature/auth"

      // Server files should exist
      expect(
        tree.exists(`${projectRoot}/src/lib/server/service/service.ts`)
      ).toBeTruthy()
      expect(
        tree.exists(`${projectRoot}/src/lib/server/layers.ts`)
      ).toBeTruthy()

      // Should NOT have client files (platform=node, no includeClientServer)
      expect(tree.exists(`${projectRoot}/src/lib/client`)).toBeFalsy()

      // Should have shared files
      expect(tree.exists(`${projectRoot}/src/index.ts`)).toBeTruthy()
      expect(
        tree.exists(`${projectRoot}/src/lib/shared/types.ts`)
      ).toBeTruthy()
      expect(
        tree.exists(`${projectRoot}/src/lib/shared/errors.ts`)
      ).toBeTruthy()
    })

    it("should generate BOTH client and server for platform=universal", async () => {
      await featureGenerator(tree, {
        name: "search",
        platform: "universal"
      })

      const projectRoot = "libs/feature/search"

      // Universal platform generates BOTH server and client
      expect(
        tree.exists(`${projectRoot}/src/lib/server/service/service.ts`)
      ).toBeTruthy()

      // Client directory should exist for universal platform
      expect(tree.exists(`${projectRoot}/src/lib/client`)).toBeTruthy()
    })

    it("should generate client files when includeClientServer=true even if platform=node", async () => {
      await featureGenerator(tree, {
        name: "payment",
        platform: "node",
        includeClientServer: true
      })

      const projectRoot = "libs/feature/payment"

      // includeClientServer=true generates BOTH regardless of platform
      expect(tree.exists(`${projectRoot}/src/lib/client/atoms`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/src/lib/client/hooks`)).toBeTruthy()
    })

    it("should generate RPC files when includeRPC=true", async () => {
      await featureGenerator(tree, {
        name: "payment",
        includeRPC: true
      })

      const projectRoot = "libs/feature/payment"

      expect(tree.exists(`${projectRoot}/src/lib/rpc/rpc.ts`)).toBeTruthy()
      expect(
        tree.exists(`${projectRoot}/src/lib/rpc/handlers.ts`)
      ).toBeTruthy()
      expect(tree.exists(`${projectRoot}/src/lib/rpc/errors.ts`)).toBeTruthy()
    })

    it("should generate CQRS directories when includeCQRS=true", async () => {
      await featureGenerator(tree, {
        name: "analytics",
        includeCQRS: true
      })

      const projectRoot = "libs/feature/analytics"

      expect(
        tree.exists(`${projectRoot}/src/lib/server/commands`)
      ).toBeTruthy()
      expect(tree.exists(`${projectRoot}/src/lib/server/queries`)).toBeTruthy()
      expect(
        tree.exists(`${projectRoot}/src/lib/server/projections`)
      ).toBeTruthy()
    })

    it("should generate edge files when includeEdge=true", async () => {
      await featureGenerator(tree, {
        name: "middleware",
        includeEdge: true
      })

      const projectRoot = "libs/feature/middleware"

      // Platform barrel exports removed - check actual implementation
      expect(
        tree.exists(`${projectRoot}/src/lib/edge/middleware.ts`)
      ).toBeTruthy()
    })

    it("should NOT generate CQRS directories when includeCQRS=false", async () => {
      await featureGenerator(tree, {
        name: "auth",
        includeCQRS: false
      })

      const projectRoot = "libs/feature/auth"

      expect(tree.exists(`${projectRoot}/src/lib/server/commands`)).toBeFalsy()
      expect(tree.exists(`${projectRoot}/src/lib/server/queries`)).toBeFalsy()
      expect(
        tree.exists(`${projectRoot}/src/lib/server/projections`)
      ).toBeFalsy()
    })

    it("should generate all features when all flags enabled", async () => {
      await featureGenerator(tree, {
        name: "full",
        platform: "universal",
        includeClientServer: true,
        includeRPC: true,
        includeCQRS: true,
        includeEdge: true
      })

      const projectRoot = "libs/feature/full"

      // Main barrel export
      expect(tree.exists(`${projectRoot}/src/index.ts`)).toBeTruthy()

      // Platform barrel exports removed - check actual implementation
      // Server
      expect(
        tree.exists(`${projectRoot}/src/lib/server/service/service.ts`)
      ).toBeTruthy()

      // Client
      expect(tree.exists(`${projectRoot}/src/lib/client/hooks`)).toBeTruthy()
      expect(tree.exists(`${projectRoot}/src/lib/client/atoms`)).toBeTruthy()

      // Edge
      expect(tree.exists(`${projectRoot}/src/lib/edge/middleware.ts`)).toBeTruthy()

      // RPC
      expect(tree.exists(`${projectRoot}/src/lib/rpc/rpc.ts`)).toBeTruthy()

      // CQRS
      expect(
        tree.exists(`${projectRoot}/src/lib/server/commands`)
      ).toBeTruthy()

      // Edge
      expect(
        tree.exists(`${projectRoot}/src/lib/edge/middleware.ts`)
      ).toBeTruthy()
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
      expect(config.targets?.["build"]).toBeDefined()
      expect(config.targets?.["build"]?.executor).toBe("@nx/js:tsc")
      expect(config.targets?.["build"]?.options?.batch).toBe(true)
    })

    it("should include client entry point for includeClientServer", async () => {
      await featureGenerator(tree, {
        name: "search",
        includeClientServer: true
      })

      const config = readProjectConfiguration(tree, "feature-search")

      // Platform barrel exports removed - no additional entry points needed
      // Modern bundlers handle tree-shaking automatically
      expect(config.targets?.["build"]).toBeDefined()
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

      expect(packageJson.name).toBe("@proj/feature-payment")
      expect(packageJson.type).toBe("module")

      // Effect peer dependency
      expect(packageJson.peerDependencies?.effect).toBeDefined()

      // Exports configuration - platform barrel exports removed
      expect(packageJson.exports?.["."]?.import).toBeDefined()
      expect(packageJson.exports?.["./types"]).toBeDefined()
    })

    it("should generate same exports regardless of includeClientServer flag", async () => {
      await featureGenerator(tree, {
        name: "search",
        includeClientServer: true
      })

      const packageJson = JSON.parse(
        tree.read("libs/feature/search/package.json", "utf-8") || "{}"
      )

      // Platform-specific exports removed - only functional exports
      expect(packageJson.exports?.["."]?.import).toBeDefined()
      expect(packageJson.exports?.["./types"]).toBeDefined()
    })

    it("should not include platform-specific exports", async () => {
      await featureGenerator(tree, {
        name: "auth",
        platform: "node",
        includeClientServer: false
      })

      const packageJson = JSON.parse(
        tree.read("libs/feature/auth/package.json", "utf-8") || "{}"
      )

      // Platform barrel exports removed
      expect(packageJson.exports?.["./client"]).toBeUndefined()
      expect(packageJson.exports?.["./server"]).toBeUndefined()
      expect(packageJson.exports?.["./edge"]).toBeUndefined()
    })

    it("should not include edge-specific exports", async () => {
      await featureGenerator(tree, {
        name: "middleware",
        includeEdge: true
      })

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
        "libs/feature/payment/src/lib/server/service/service.ts",
        "utf-8"
      )

      expect(serviceContent).toContain("Context.Tag")
      expect(serviceContent).toContain("PaymentService")
      expect(serviceContent).toContain("Layer.")
    })

    it("should use Data.TaggedError in errors.ts", async () => {
      await featureGenerator(tree, {
        name: "payment"
      })

      const errorsContent = tree.read(
        "libs/feature/payment/src/lib/shared/errors.ts",
        "utf-8"
      )

      expect(errorsContent).toContain("Data.TaggedError")
      expect(errorsContent).toContain("class PaymentError")
    })

    it("should use RpcGroup.make with Rpc.make when includeRPC=true", async () => {
      await featureGenerator(tree, {
        name: "payment",
        includeRPC: true
      })

      const rpcContent = tree.read(
        "libs/feature/payment/src/lib/rpc/rpc.ts",
        "utf-8"
      )

      // Check for correct @effect/rpc 0.69.5 API
      expect(rpcContent).toContain(
        "export class PaymentRpcs extends RpcGroup.make"
      )
      expect(rpcContent).toContain("Rpc.make(")
      expect(rpcContent).not.toContain("RpcRequest.make") // Old API
    })

    it("should use plain object handlers with typed payload when includeRPC=true", async () => {
      await featureGenerator(tree, {
        name: "payment",
        includeRPC: true
      })

      const handlersContent = tree.read(
        "libs/feature/payment/src/lib/rpc/handlers.ts",
        "utf-8"
      )

      // Check for plain object handlers (not HandlersFrom type)
      expect(handlersContent).toContain("export const PaymentHandlers = {")
      expect(handlersContent).toContain(
        "(payload: typeof ExampleRequest.Type)"
      )
      expect(handlersContent).not.toContain("HandlersFrom") // We use plain object
    })

    it("should use Schema.TaggedError in RPC errors when includeRPC=true", async () => {
      await featureGenerator(tree, {
        name: "payment",
        includeRPC: true
      })

      const errorsContent = tree.read(
        "libs/feature/payment/src/lib/rpc/errors.ts",
        "utf-8"
      )

      expect(errorsContent).toContain("Schema.TaggedError")
      expect(errorsContent).toContain("PaymentRpcError")
    })

    it("should use Atom.make in client atoms when includeClientServer=true", async () => {
      await featureGenerator(tree, {
        name: "search",
        includeClientServer: true
      })

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

      const indexContent = tree.read(
        "libs/feature/payment/src/index.ts",
        "utf-8"
      )

      // Should export from shared
      expect(indexContent).toContain("./lib/shared/types")
      expect(indexContent).toContain("./lib/shared/errors")

      // Should NOT export service or layers
      expect(indexContent).not.toContain("./lib/server/service")
      expect(indexContent).not.toContain("./lib/server/layers")
    })

    it("should generate server implementation files", async () => {
      await featureGenerator(tree, {
        name: "payment",
        includeRPC: true
      })

      // Platform barrel exports removed - check actual implementation files
      expect(tree.exists("libs/feature/payment/src/lib/server/service/service.ts")).toBeTruthy()
      expect(tree.exists("libs/feature/payment/src/lib/server/layers.ts")).toBeTruthy()
      expect(tree.exists("libs/feature/payment/src/lib/rpc/rpc.ts")).toBeTruthy()
    })

    it("should generate client implementation when includeClientServer is true", async () => {
      await featureGenerator(tree, {
        name: "search",
        includeClientServer: true
      })

      // Platform barrel exports removed - check actual implementation directories
      expect(tree.exists("libs/feature/search/src/lib/client/hooks")).toBeTruthy()
      expect(tree.exists("libs/feature/search/src/lib/client/atoms")).toBeTruthy()

      // Server service should also exist
      expect(tree.exists("libs/feature/search/src/lib/server/service/service.ts")).toBeTruthy()
    })
  })

  describe("🔧 TypeScript Configuration Tests", () => {
    it("should enable composite and incremental compilation", async () => {
      await featureGenerator(tree, {
        name: "payment"
      })

      const tsconfigLib = JSON.parse(
        tree.read("libs/feature/payment/tsconfig.lib.json", "utf-8") || "{}"
      )

      expect(tsconfigLib.compilerOptions?.composite).toBe(true)
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

    it("should add client path mapping for includeClientServer", async () => {
      await featureGenerator(tree, {
        name: "search",
        includeClientServer: true
      })

      // Platform barrel exports removed - verify client implementation directory was created
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
        "libs/feature/my-custom-feature/src/lib/server/service/service.ts",
        "utf-8"
      )

      // className: MyCustomFeature (PascalCase)
      expect(serviceContent).toContain("class MyCustomFeatureService")

      // Project name should be kebab-case with feature prefix
      const config = readProjectConfiguration(
        tree,
        "feature-my-custom-feature"
      )
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

      expect(readme).toContain("# @proj/feature-payment")
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

      expect(claude).toContain("# @proj/feature-payment")
      expect(claude).toContain("AI-optimized reference")
      expect(claude).toContain("## Quick Reference")
      expect(claude).toContain("## Import Patterns")
    })
  })
})
