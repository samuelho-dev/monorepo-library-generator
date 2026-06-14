import type { Tree } from "@nx/devkit"
import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing"
import { Effect } from "effect"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { generateDomain } from "../cli/generators/domain"
import { createBlueprint } from "../core/blueprint"
import { createGenerationPlan } from "../core/planner"
import { DEFAULT_WORKSPACE_POLICY } from "../core/policy"
import { contractGenerator } from "./contract/contract"
import { dataAccessGenerator } from "./data-access/data-access"
import { featureGenerator } from "./feature/feature"
import { infraGenerator } from "./infra/infra"
import { providerGenerator } from "./provider/provider"

describe("Nx blueprint adapters", () => {
  const cases: ReadonlyArray<{
    root: string
    run: (tree: Tree) => Promise<unknown>
    service: string
  }> = [
    {
      root: "libs/contract/order",
      run: (tree) =>
        contractGenerator(tree, {
          name: "order",
          capabilities: "entities,errors,events,ports"
        }),
      service: "src/lib/ports.ts"
    },
    {
      root: "libs/data-access/order",
      run: (tree) => dataAccessGenerator(tree, { name: "order", contract: "order" }),
      service: "src/lib/service.ts"
    },
    {
      root: "libs/feature/checkout",
      run: (tree) =>
        featureGenerator(tree, {
          name: "checkout",
          contract: "checkout",
          dataAccess: "order",
          entrypoints: "root,client,server"
        }),
      service: "src/lib/server/services/checkout/service.ts"
    },
    {
      root: "libs/provider/stripe",
      run: (tree) => providerGenerator(tree, { name: "stripe", externalService: "stripe" }),
      service: "src/lib/service.ts"
    },
    {
      root: "libs/infra/queue",
      run: (tree) => infraGenerator(tree, { name: "queue" }),
      service: "src/lib/service.ts"
    }
  ]

  for (const testCase of cases) {
    it(`generates ${testCase.root} through the shared plan`, async () => {
      const tree = createTreeWithEmptyWorkspace()
      await testCase.run(tree)

      expect(tree.exists(`${testCase.root}/package.json`)).toBe(true)
      expect(tree.exists(`${testCase.root}/project.json`)).toBe(true)
      expect(tree.exists(`${testCase.root}/tsconfig.lib.json`)).toBe(true)
      expect(tree.exists(`${testCase.root}/${testCase.service}`)).toBe(true)

      const manifest = JSON.parse(tree.read(`${testCase.root}/package.json`, "utf8") ?? "{}")
      expect(manifest.peerDependencies.effect).toBeDefined()
    })
  }

  it("generates an organized feature client boundary", async () => {
    const tree = createTreeWithEmptyWorkspace()
    await featureGenerator(tree, {
      name: "user",
      modules: "authentication,profile",
      contract: "user",
      dataAccess: "user",
      entrypoints: "root,client,server"
    })

    expect(tree.exists("libs/feature/user/src/client.ts")).toBe(true)
    expect(tree.exists("libs/feature/user/src/lib/client/rpc.ts")).toBe(true)
    expect(tree.exists("libs/feature/user/src/lib/client/hooks/index.ts")).toBe(true)
    expect(tree.exists("libs/feature/user/src/lib/client/hooks/use-authentication.ts")).toBe(true)
    expect(tree.exists("libs/feature/user/src/lib/client/hooks/use-profile.ts")).toBe(true)

    const client = tree.read("libs/feature/user/src/client.ts", "utf8") ?? ""
    const clientRpc = tree.read("libs/feature/user/src/lib/client/rpc.ts", "utf8") ?? ""
    expect(client).toContain("./lib/client/hooks")
    expect(client).toContain("./lib/client/rpc")
    expect(clientRpc).not.toContain("server")

    const manifest = JSON.parse(tree.read("libs/feature/user/package.json", "utf8") ?? "{}")
    expect(manifest.exports["./client"].import).toBe("./src/client.ts")
    expect(Object.keys(manifest.dependencies)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\/contract-user$/),
        expect.stringMatching(/\/infra-rpc$/)
      ])
    )
  })

  it("preserves nested data-access module paths through the Nx adapter", async () => {
    const tree = createTreeWithEmptyWorkspace()
    await dataAccessGenerator(tree, {
      name: "form",
      contract: "form",
      modules: "form-state,marketing/campaign,marketing/subscriber"
    })

    for (const module of ["form-state", "marketing/campaign", "marketing/subscriber"]) {
      expect(tree.exists(`libs/data-access/form/src/lib/${module}/service.ts`)).toBe(true)
      expect(tree.exists(`libs/data-access/form/src/lib/${module}/service.spec.ts`)).toBe(true)
      expect(tree.exists(`libs/data-access/form/src/lib/${module}/index.ts`)).toBe(true)
    }
    expect(tree.exists("libs/data-access/form/src/lib/marketing/service.ts")).toBe(false)
  })

  it("groups nested contract capabilities under top-level subdomains", async () => {
    const tree = createTreeWithEmptyWorkspace()
    await contractGenerator(tree, {
      name: "form",
      modules: "form-state,marketing/campaign,marketing/subscriber",
      capabilities: "ports"
    })

    expect(tree.exists("libs/contract/form/src/lib/form-state/ports.ts")).toBe(true)
    expect(tree.exists("libs/contract/form/src/lib/marketing/ports.ts")).toBe(true)
    expect(tree.exists("libs/contract/form/src/lib/marketing/campaign/ports.ts")).toBe(false)
    const marketing = tree.read("libs/contract/form/src/lib/marketing/ports.ts", "utf8") ?? ""
    expect(marketing).toContain("FormMarketingCampaignDataAccess")
    expect(marketing).toContain("FormMarketingSubscriberDataAccess")
  })

  it("generates one domain RPC entrypoint through the contract adapter", async () => {
    const tree = createTreeWithEmptyWorkspace()
    await contractGenerator(tree, {
      name: "form",
      modules: "form-state,marketing/campaign,marketing/subscriber",
      capabilities: "ports,rpc"
    })

    expect(tree.exists("libs/contract/form/src/lib/rpc.ts")).toBe(true)
    expect(tree.exists("libs/contract/form/src/lib/marketing/rpc.ts")).toBe(false)
    expect(tree.exists("libs/contract/form/src/lib/rpc-definitions.ts")).toBe(false)
    expect(tree.exists("libs/contract/form/src/lib/rpc-errors.ts")).toBe(false)
    expect(tree.exists("libs/contract/form/src/lib/rpc-group.ts")).toBe(false)

    const manifest = JSON.parse(tree.read("libs/contract/form/package.json", "utf8") ?? "{}")
    expect(manifest.exports["./rpc"].import).toBe("./src/lib/rpc.ts")
  })

  it("generates providers as a single named SDK service", async () => {
    const tree = createTreeWithEmptyWorkspace()
    await providerGenerator(tree, { name: "stripe", externalService: "Stripe" })

    const service = tree.read("libs/provider/stripe/src/lib/service.ts", "utf8") ?? ""
    expect(service).toContain("export class Stripe extends Context.Service")
    expect(service).not.toContain("StripeProvider")
  })

  it("keeps Nx output byte-for-byte identical to the shared plan", async () => {
    const tree = createTreeWithEmptyWorkspace()
    await contractGenerator(tree, { name: "parity", capabilities: "errors,ports" })
    const plan = createGenerationPlan(
      createBlueprint({ kind: "contract", name: "parity", capabilities: "errors,ports" }),
      { ...DEFAULT_WORKSPACE_POLICY, scope: "@samuelho-dev" }
    )

    for (const generated of plan.files) {
      expect(tree.read(generated.path, "utf8")).toBe(generated.content)
    }
  })

  it("reconciles Nx output and protects edited generated files", async () => {
    const tree = createTreeWithEmptyWorkspace()
    const errorsPath = "libs/contract/orders/src/lib/errors.ts"
    const portsPath = "libs/contract/orders/src/lib/ports.ts"

    await contractGenerator(tree, { name: "orders", capabilities: "errors,ports" })
    expect(tree.exists("libs/contract/orders/.mlg-manifest.json")).toBe(true)
    expect(tree.exists(portsPath)).toBe(true)

    await contractGenerator(tree, { name: "orders", capabilities: "errors" })
    expect(tree.exists(portsPath)).toBe(false)

    tree.write(errorsPath, "// user implementation\n")
    await expect(contractGenerator(tree, { name: "orders", capabilities: "errors" })).rejects
      .toMatchObject({
        message: expect.stringContaining("Refusing to overwrite modified generated files")
      })
    expect(tree.read(errorsPath, "utf8")).toBe("// user implementation\n")
  })

  it("forwards shared domain options to every generated blueprint", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "mlg-domain-options-"))
    try {
      writeFileSync(
        join(workspace, "package.json"),
        JSON.stringify({ name: "@samuelho-dev/workspace", workspaces: ["libs/**"] })
      )
      const result = await Effect.runPromise(
        generateDomain({
          name: "orders",
          workspaceRoot: workspace,
          dependencies: "left-pad",
          testMode: "none",
          dryRun: true
        })
      )

      for (const generated of [result.contract, result.dataAccess, result.feature]) {
        expect(generated.plan.blueprint.testMode).toBe("none")
        expect(generated.plan.blueprint.dependencies).toEqual([{ name: "left-pad" }])
        expect(generated.plan.files.some((file) => file.path.endsWith(".spec.ts"))).toBe(false)
        expect(generated.plan.files.some((file) => file.path.endsWith("vitest.config.ts"))).toBe(
          false
        )
      }
      expect(result.contract.plan.files.some((file) => file.path.endsWith("/lib/rpc.ts"))).toBe(true)
      expect(result.feature.plan.blueprint).toMatchObject({ contract: "orders" })
      expect(result.feature.plan.files.some((file) => file.path.endsWith("/client.ts"))).toBe(true)
      expect(
        result.feature.plan.files.some((file) => file.path.endsWith("/client/hooks/use-orders.ts"))
      ).toBe(true)
    } finally {
      rmSync(workspace, { force: true, recursive: true })
    }
  })
})
