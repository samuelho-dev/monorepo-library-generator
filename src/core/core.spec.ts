/* eslint-disable no-restricted-syntax -- test helpers inspect structured JSON fixtures */

import { Effect } from "effect"
import { execFileSync } from "node:child_process"
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Project } from "ts-morph"
import { standardizeProject } from "../standardize"
import { createBlueprint, decodeLibraryBlueprint } from "./blueprint"
import { executeBlueprint } from "./executor"
import { createGenerationPlan } from "./planner"
import { DEFAULT_WORKSPACE_POLICY } from "./policy"
import type { LibraryBlueprint } from "./types"

const policy = {
  ...DEFAULT_WORKSPACE_POLICY,
  scope: "@creativetoolkits"
}

function planFor(blueprint: LibraryBlueprint) {
  return createGenerationPlan(blueprint, policy)
}

function file(plan: ReturnType<typeof planFor>, path: string) {
  const generated = plan.files.find((candidate) => candidate.path === path)
  expect(generated, `Expected ${path} to be generated`).toBeDefined()
  return generated!.content
}

function packageJson(plan: ReturnType<typeof planFor>) {
  return JSON.parse(file(plan, `${plan.projectRoot}/package.json`)) as {
    description: string
    exports: Record<string, { import: string; types: string }>
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    peerDependencies?: Record<string, string>
  }
}

function projectJson(plan: ReturnType<typeof planFor>) {
  return JSON.parse(file(plan, `${plan.projectRoot}/project.json`)) as {
    name: string
    projectType: string
    sourceRoot: string
    tags: ReadonlyArray<string>
    targets: Record<
      string,
      {
        executor: string
        options: { command: string; cwd?: string }
        cache?: boolean
        outputs?: ReadonlyArray<string>
      }
    >
  }
}

describe("core blueprint pipeline", () => {
  it("validates the versioned discriminated blueprint", () => {
    expect(() =>
      decodeLibraryBlueprint({
        schemaVersion: 1,
        kind: "cache",
        name: "order"
      })
    ).toThrow("Blueprint kind is invalid")
    expect(() =>
      decodeLibraryBlueprint({
        schemaVersion: 1,
        kind: "contract",
        name: "Order"
      })
    ).toThrow("name must be kebab-case")

    expect(
      createBlueprint({
        kind: "feature",
        name: "order-checkout",
        modules: "cart,payment"
      })
    ).toMatchObject({
      schemaVersion: 1,
      kind: "feature",
      name: "order-checkout",
      modules: [{ name: "cart" }, { name: "payment" }]
    })
    expect(
      createBlueprint({
        kind: "data-access",
        name: "form",
        modules: "form-state,marketing/campaign,marketing/subscriber"
      })
    ).toMatchObject({
      modules: [
        { name: "form-state" },
        {
          name: "marketing",
          modules: [{ name: "campaign" }, { name: "subscriber" }]
        }
      ]
    })
    expect(() =>
      createBlueprint({
        kind: "contract",
        name: "order",
        entrypoints: "root,server"
      })
    ).toThrow("contract libraries support only the root entrypoint")
    expect(() =>
      createBlueprint({
        kind: "data-access",
        name: "order",
        entrypoints: "client"
      })
    ).toThrow("data-access libraries support only the root entrypoint")
    expect(() =>
      createBlueprint({
        kind: "feature",
        name: "checkout",
        entrypoints: "root,client,server"
      })
    ).toThrow("feature client entrypoints require a contract")
    expect(() =>
      createBlueprint({
        kind: "provider",
        name: "stripe",
        modules: "payments"
      })
    ).toThrow("provider libraries expose one root service")
    expect(() =>
      createBlueprint({
        kind: "provider",
        name: "stripe",
        directory: "../outside"
      })
    ).toThrow("directory must be a workspace-relative POSIX path")
    expect(() =>
      createBlueprint({
        kind: "feature",
        name: "billing",
        modules: "billing-invoice,billing/invoice"
      })
    ).toThrow("generate the same TypeScript identifier BillingInvoice")
  })

  it("produces deterministic plans", () => {
    const blueprint = createBlueprint({
      kind: "contract",
      name: "order",
      capabilities: "entities,errors,events,ports,rpc,types"
    })
    const first = planFor(blueprint)
    const second = planFor(blueprint)

    expect(first.hash).toBe(second.hash)
    expect(first.files).toEqual(second.files)
    expect(first.files.map((generated) => generated.path)).toEqual(
      expect.arrayContaining([
        `${first.sourceRoot}/lib/entities.ts`,
        `${first.sourceRoot}/lib/errors.ts`,
        `${first.sourceRoot}/lib/events.ts`,
        `${first.sourceRoot}/lib/ports.ts`,
        `${first.sourceRoot}/lib/rpc.ts`,
        `${first.sourceRoot}/lib/types.ts`
      ])
    )
  })

  it("reconciles unchanged generated files and protects user edits", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "mlg-regeneration-"))
    const projectRoot = join(workspace, "libs/feature/orders")
    const paymentService = join(projectRoot, "src/lib/server/services/payment/service.ts")
    const cartService = join(projectRoot, "src/lib/server/services/cart/service.ts")

    try {
      writeFileSync(
        join(workspace, "package.json"),
        JSON.stringify({ name: "@creativetoolkits/workspace", workspaces: ["libs/**"] })
      )
      const run = (modules: string) =>
        Effect.runPromise(
          executeBlueprint({
            blueprint: createBlueprint({
              kind: "feature",
              name: "orders",
              modules,
              testMode: "none"
            }),
            workspaceRoot: workspace,
            interfaceType: "cli"
          })
        )

      await run("cart,payment")
      expect(existsSync(paymentService)).toBe(true)
      expect(existsSync(join(projectRoot, ".mlg-manifest.json"))).toBe(true)

      await run("cart")
      expect(existsSync(paymentService)).toBe(false)

      writeFileSync(cartService, "// user implementation\n")
      await expect(run("cart")).rejects.toMatchObject({
        message: expect.stringContaining("Refusing to overwrite modified generated files")
      })
      expect(readFileSync(cartService, "utf8")).toBe("// user implementation\n")
    } finally {
      rmSync(workspace, { force: true, recursive: true })
    }
  })

  it("generates standardized Nx project targets", () => {
    const testless = planFor(createBlueprint({ kind: "contract", name: "auth", testMode: "none" }))
    const tested = planFor(createBlueprint({ kind: "provider", name: "kysely", testMode: "unit" }))

    expect(projectJson(testless)).toMatchObject({
      name: "contract-auth",
      projectType: "library",
      sourceRoot: "libs/contract/auth/src",
      tags: ["type:contract", "scope:auth"],
      targets: {
        lint: {
          executor: "nx:run-commands",
          options: { command: "pnpm exec biome lint libs/contract/auth" }
        },
        format: {
          executor: "nx:run-commands",
          options: {
            command: "pnpm exec biome check --write libs/contract/auth"
          }
        },
        typecheck: {
          executor: "nx:run-commands",
          options: {
            command: "pnpm exec tsgo --build libs/contract/auth/tsconfig.lib.json"
          },
          cache: true,
          outputs: ["{projectRoot}/dist"]
        }
      }
    })
    expect(projectJson(testless).targets.test).toBeUndefined()

    expect(projectJson(tested).targets.test).toEqual({
      executor: "nx:run-commands",
      outputs: ["{projectRoot}/coverage"],
      options: {
        command: "pnpm exec vitest run --config libs/provider/kysely/vitest.config.ts --pool=forks --passWithNoTests",
        cwd: "{workspaceRoot}"
      }
    })
  })

  it("renders every archetype as valid TypeScript without retired patterns", () => {
    const blueprints: ReadonlyArray<LibraryBlueprint> = [
      createBlueprint({
        kind: "contract",
        name: "order",
        capabilities: "entities,errors,events,ports,rpc,types"
      }),
      createBlueprint({
        kind: "data-access",
        name: "order",
        contract: "order"
      }),
      createBlueprint({
        kind: "feature",
        name: "checkout",
        modules: "checkout,payment",
        contract: "checkout",
        dataAccess: "order",
        entrypoints: "root,client,server"
      }),
      createBlueprint({ kind: "provider", name: "stripe" }),
      createBlueprint({ kind: "infra", name: "queue" })
    ]

    for (const blueprint of blueprints) {
      const plan = planFor(blueprint)
      const project = new Project({ useInMemoryFileSystem: true })
      const sourceFiles = plan.files.filter((generated) => generated.format === "typescript")

      for (const generated of sourceFiles) {
        project.createSourceFile(generated.path, generated.content, {
          overwrite: true
        })
        expect(generated.content).not.toMatch(/Context\.(Tag|GenericTag)/)
        expect(generated.content).not.toMatch(/Effect\.Service/)
        expect(generated.content).not.toMatch(/static readonly Dev\b/)
        expect(generated.path).not.toContain("/operations/")
        expect(generated.path).not.toMatch(/\/layers\.ts$/)
        expect(generated.path).not.toContain("/__tests__/")
      }

      expect(project.getProgram().compilerObject.getSyntacticDiagnostics()).toEqual([])
    }
  })

  it("renders every archetype as Biome-compliant output", () => {
    const workspace = mkdtempSync(join(tmpdir(), "mlg-biome-check-"))
    const plans = [
      planFor(createBlueprint({ kind: "contract", name: "orders", capabilities: "entities,errors,ports" })),
      planFor(createBlueprint({ kind: "data-access", name: "orders", contract: "orders" })),
      planFor(
        createBlueprint({
          kind: "feature",
          name: "orders",
          contract: "orders",
          dataAccess: "orders",
          entrypoints: "root,client,server"
        })
      ),
      planFor(createBlueprint({ kind: "infra", name: "cache" })),
      planFor(createBlueprint({ kind: "provider", name: "stripe", externalService: "Stripe" }))
    ]

    try {
      for (const plan of plans) {
        for (const generated of plan.files) {
          const target = join(workspace, generated.path)
          mkdirSync(join(target, ".."), { recursive: true })
          writeFileSync(target, generated.content)
        }
      }

      execFileSync(
        join(process.cwd(), "node_modules/.bin/biome"),
        [
          "check",
          "--config-path",
          join(process.cwd(), "biome.json"),
          join(workspace, "libs"),
          "--max-diagnostics=500"
        ],
        { cwd: process.cwd(), stdio: "pipe" }
      )
    } finally {
      rmSync(workspace, { force: true, recursive: true })
    }
  })

  it("semantically compiles freshly generated Effect 4 libraries", () => {
    const workspace = mkdtempSync(join(tmpdir(), "mlg-semantic-compile-"))
    const effectPath = realpathSync(join(process.cwd(), "libs/provider/redis/node_modules/effect"))
    const effectAtomReactPath = realpathSync(
      join(process.cwd(), "libs/infra/rpc/node_modules/@effect/atom-react")
    )
    const effectVitestPath = realpathSync(
      join(process.cwd(), "libs/provider/redis/node_modules/@effect/vitest")
    )
    const reactPath = realpathSync(join(process.cwd(), "libs/infra/rpc/node_modules/react"))
    const plans = [
      planFor(
        createBlueprint({ kind: "contract", name: "orders", capabilities: "errors,ports,rpc" })
      ),
      planFor(
        createBlueprint({
          kind: "data-access",
          name: "orders",
          contract: "orders",
          testMode: "none"
        })
      ),
      planFor(
        createBlueprint({
          kind: "feature",
          name: "orders",
          contract: "orders",
          dataAccess: "orders",
          entrypoints: "root,client,server",
          testMode: "none"
        })
      ),
      planFor(createBlueprint({ kind: "provider", name: "stripe", testMode: "unit" }))
    ]

    try {
      copyFileSync(join(process.cwd(), "tsconfig.base.json"), join(workspace, "tsconfig.base.json"))
      symlinkSync(join(process.cwd(), "node_modules"), join(workspace, "node_modules"), "dir")
      cpSync(join(process.cwd(), "libs/infra/rpc"), join(workspace, "libs/infra/rpc"), {
        filter: (source) => !/(?:^|\/)(?:dist|node_modules)(?:\/|$)/.test(source),
        recursive: true
      })
      const rpcModules = join(workspace, "libs/infra/rpc/node_modules")
      mkdirSync(join(rpcModules, "@effect"), { recursive: true })
      symlinkSync(effectPath, join(rpcModules, "effect"), "dir")
      symlinkSync(effectAtomReactPath, join(rpcModules, "@effect/atom-react"), "dir")
      symlinkSync(reactPath, join(rpcModules, "react"), "dir")
      for (const plan of plans) {
        for (const generated of plan.files) {
          const target = join(workspace, generated.path)
          mkdirSync(join(target, ".."), { recursive: true })
          writeFileSync(target, generated.content)
        }
        const projectModules = join(workspace, plan.projectRoot, "node_modules")
        mkdirSync(join(projectModules, "@effect"), { recursive: true })
        symlinkSync(effectPath, join(projectModules, "effect"), "dir")
        if (plan.blueprint.kind === "provider") {
          symlinkSync(effectVitestPath, join(projectModules, "@effect/vitest"), "dir")
        }
      }

      const scopedModules = (projectRoot: string) => {
        const scopeRoot = join(workspace, projectRoot, "node_modules/@creativetoolkits")
        mkdirSync(scopeRoot, { recursive: true })
        return scopeRoot
      }
      symlinkSync(
        join(workspace, "libs/contract/orders"),
        join(scopedModules("libs/data-access/orders"), "contract-orders"),
        "dir"
      )
      const featureModules = scopedModules("libs/feature/orders")
      symlinkSync(
        join(workspace, "libs/contract/orders"),
        join(featureModules, "contract-orders"),
        "dir"
      )
      symlinkSync(
        join(workspace, "libs/data-access/orders"),
        join(featureModules, "data-access-orders"),
        "dir"
      )
      symlinkSync(
        join(workspace, "libs/infra/rpc"),
        join(featureModules, "infra-rpc"),
        "dir"
      )

      execFileSync(
        process.execPath,
        [
          join(process.cwd(), "node_modules/typescript/bin/tsc"),
          "-b",
          "libs/feature/orders/tsconfig.lib.json",
          "libs/provider/stripe/tsconfig.json"
        ],
        { cwd: workspace, stdio: "pipe" }
      )
    } finally {
      rmSync(workspace, { force: true, recursive: true })
    }
  })

  it("derives dependencies and project references from generated imports", () => {
    const serverOnly = planFor(createBlueprint({ kind: "feature", name: "catalog" }))
    expect(serverOnly.files.some((generated) => generated.path.endsWith("/client.ts"))).toBe(false)
    expect(packageJson(serverOnly).exports["./client"]).toBeUndefined()

    const plan = planFor(
      createBlueprint({
        kind: "feature",
        name: "checkout",
        modules: "checkout",
        dataAccess: "order",
        entrypoints: "root,server"
      })
    )
    const manifest = packageJson(plan)
    const tsconfig = JSON.parse(file(plan, `${plan.projectRoot}/tsconfig.lib.json`)) as {
      references: ReadonlyArray<{ path: string }>
    }

    expect(manifest.peerDependencies).toEqual({ effect: "catalog:" })
    expect(manifest.dependencies).toEqual({
      "@creativetoolkits/contract-order": "workspace:*",
      "@creativetoolkits/data-access-order": "workspace:*"
    })
    expect(manifest.devDependencies).toEqual({ "@effect/vitest": "catalog:" })
    expect(tsconfig.references).toEqual([
      { path: "../../contract/order/tsconfig.lib.json" },
      { path: "../../data-access/order/tsconfig.lib.json" }
    ])
  })

  it("publishes only entrypoints backed by generated files", () => {
    const plans = [
      planFor(
        createBlueprint({
          kind: "contract",
          name: "order",
          capabilities: "entities,errors,events,ports"
        })
      ),
      planFor(
        createBlueprint({
          kind: "feature",
          name: "checkout",
          contract: "checkout",
          entrypoints: "root,client,server,edge"
        })
      )
    ]

    for (const plan of plans) {
      const paths = new Set(plan.files.map((generated) => generated.path))
      for (const target of Object.values(packageJson(plan).exports)) {
        expect(target.import).toBe(target.types)
        expect(paths.has(`${plan.projectRoot}/${target.import.replace(/^\.\//, "")}`)).toBe(true)
      }
    }
  })

  it("emits the current CreativeToolkits layer conventions", () => {
    const dataAccess = planFor(createBlueprint({ kind: "data-access", name: "order" }))
    const dataAccessService = file(dataAccess, `${dataAccess.sourceRoot}/lib/service.ts`)
    expect(dataAccessService).toContain("export const OrderLive")
    expect(dataAccessService).toContain("export const OrderTest")
    expect(dataAccessService).toContain("export const OrderAuto")
    expect(dataAccessService).toContain("export class OrderTestHarness extends Context.Service")

    const feature = planFor(
      createBlueprint({
        kind: "feature",
        name: "checkout",
        contract: "checkout",
        entrypoints: "root,client,server"
      })
    )
    const featureService = file(
      feature,
      `${feature.sourceRoot}/lib/server/services/checkout/service.ts`
    )
    expect(featureService).toContain("static readonly DefaultWithoutDependencies")
    expect(featureService).toContain("static readonly Default")

    const clientRpc = file(feature, `${feature.sourceRoot}/lib/client/rpc.ts`)
    expect(clientRpc).toContain("CheckoutRpcs")
    expect(clientRpc).toContain("export class CheckoutRpc extends AtomRpc.Service")
    expect(clientRpc).toContain("createProtocolLayer({ url: '/api/rpc' })")
    const hook = file(feature, `${feature.sourceRoot}/lib/client/hooks/use-checkout.ts`)
    expect(hook).toContain("useAtomQuery(CheckoutRpc.query('GetCheckout', { id }))")
    expect(file(feature, `${feature.sourceRoot}/client.ts`)).toContain("./lib/client/hooks")
    expect(file(feature, `${feature.sourceRoot}/client.ts`)).toContain("./lib/client/rpc")
    expect(packageJson(feature).exports["./client"]?.import).toBe("./src/client.ts")

    const provider = planFor(createBlueprint({ kind: "provider", name: "stripe" }))
    const providerService = file(provider, `${provider.sourceRoot}/lib/service.ts`)
    expect(providerService).toContain("static readonly Live")
    expect(providerService).toContain("static readonly Test")
    expect(providerService).toContain("static readonly Auto")
  })

  it("binds domain feature modules to matching contract and data-access modules", () => {
    const feature = planFor(
      createBlueprint({
        kind: "feature",
        name: "user",
        modules: "authentication,profile",
        contract: "user",
        dataAccess: "user",
        entrypoints: "root,client,server"
      })
    )

    const authentication = file(
      feature,
      `${feature.sourceRoot}/lib/server/services/authentication/service.ts`
    )
    expect(authentication).toContain("AuthenticationDataAccess")
    expect(authentication).toContain("UserAuthenticationLive")
    expect(authentication).not.toContain("UserDataAccess")
    expect(authentication).not.toContain("UserLive")

    const router = file(feature, `${feature.sourceRoot}/lib/server/router.ts`)
    expect(router).toContain("UserAuthenticationTest")
    expect(router).toContain("UserProfileTest")
    expect(router).not.toContain("UserTest")

    const clientRpc = file(feature, `${feature.sourceRoot}/lib/client/rpc.ts`)
    expect(clientRpc).toContain("@creativetoolkits/contract-user/rpc")
    expect(clientRpc).toContain("@creativetoolkits/infra-rpc/client")
    expect(clientRpc).not.toContain("lib/server")
    const hooks = file(feature, `${feature.sourceRoot}/lib/client/hooks/index.ts`)
    expect(hooks).toContain("useAuthentication")
    expect(hooks).toContain("useProfile")
  })

  it("renders nested data-access leaves with one service, spec, and index each", () => {
    const modules = "form-state,marketing/campaign,marketing/subscriber"
    const contract = planFor(
      createBlueprint({
        kind: "contract",
        name: "form",
        modules,
        capabilities: "ports"
      })
    )
    const dataAccess = planFor(
      createBlueprint({
        kind: "data-access",
        name: "form",
        modules,
        contract: "form"
      })
    )
    const expectedLeaves = ["form-state", "marketing/campaign", "marketing/subscriber"]

    for (const leaf of expectedLeaves) {
      expect(file(dataAccess, `${dataAccess.sourceRoot}/lib/${leaf}/service.ts`)).toContain(
        "DataAccess"
      )
      expect(file(dataAccess, `${dataAccess.sourceRoot}/lib/${leaf}/service.spec.ts`)).toContain(
        "it.effect"
      )
      expect(file(dataAccess, `${dataAccess.sourceRoot}/lib/${leaf}/index.ts`)).toContain(
        "./service"
      )
    }

    expect(file(contract, `${contract.sourceRoot}/lib/form-state/ports.ts`)).toContain(
      "FormStateDataAccess"
    )
    const marketingPorts = file(contract, `${contract.sourceRoot}/lib/marketing/ports.ts`)
    expect(marketingPorts).toContain("FormMarketingCampaignDataAccess")
    expect(marketingPorts).toContain("FormMarketingSubscriberDataAccess")
    expect(
      contract.files.some((generated) => generated.path.includes("/lib/marketing/campaign/"))
    ).toBe(false)
    expect(
      file(dataAccess, `${dataAccess.sourceRoot}/lib/marketing/campaign/service.ts`)
    ).toContain("FormMarketingCampaignDataAccess")
    expect(
      file(dataAccess, `${dataAccess.sourceRoot}/lib/marketing/campaign/service.ts`)
    ).toContain("@creativetoolkits/contract-form/marketing")
    expect(
      file(dataAccess, `${dataAccess.sourceRoot}/lib/marketing/subscriber/service.ts`)
    ).toContain("FormMarketingSubscriberDataAccess")
    expect(file(dataAccess, `${dataAccess.sourceRoot}/index.ts`)).toContain(
      "./lib/marketing/campaign"
    )
    expect(
      dataAccess.files.some((generated) => generated.path.endsWith("/lib/marketing/service.ts"))
    ).toBe(false)
    expect(
      dataAccess.files.some((generated) => generated.path.endsWith("/lib/marketing/index.ts"))
    ).toBe(false)
    expect(packageJson(contract).exports["./marketing"]?.import).toBe(
      "./src/lib/marketing/index.ts"
    )
    expect(packageJson(contract).exports["./marketing/campaign"]).toBeUndefined()
  })

  it("consolidates contract RPC schemas, errors, definitions, and groups", () => {
    const flat = planFor(
      createBlueprint({
        kind: "contract",
        name: "order",
        capabilities: "errors,ports,rpc"
      })
    )
    const flatRpc = file(flat, `${flat.sourceRoot}/lib/rpc.ts`)

    expect(flatRpc).toContain("from 'effect/unstable/rpc'")
    expect(flatRpc).toContain("export class OrderNotFoundRpcError")
    expect(flatRpc).toContain("export class GetOrder extends Rpc.make")
    expect(flatRpc).toContain("export class OrderRpcs extends RpcGroup.make(GetOrder)")
    expect(file(flat, `${flat.sourceRoot}/index.ts`)).not.toContain("./lib/rpc")
    expect(packageJson(flat).exports["./rpc"]?.import).toBe("./src/lib/rpc.ts")
    expect(
      flat.files.some((generated) => /rpc-(definitions|errors|group)\.ts$/.test(generated.path))
    ).toBe(false)

    const nested = planFor(
      createBlueprint({
        kind: "contract",
        name: "form",
        modules: "form-state,marketing/campaign,marketing/subscriber",
        capabilities: "ports,rpc"
      })
    )
    const nestedRpc = file(nested, `${nested.sourceRoot}/lib/rpc.ts`)

    expect(nestedRpc).toContain("export class GetFormState extends Rpc.make")
    expect(nestedRpc).toContain("export class GetFormMarketingCampaign extends Rpc.make")
    expect(nestedRpc).toContain("export class GetFormMarketingSubscriber extends Rpc.make")
    expect(nestedRpc).toMatch(
      /export class FormRpcs extends RpcGroup\.make\(\s*GetFormState,\s*GetFormMarketingCampaign,\s*GetFormMarketingSubscriber\s*\)/
    )
    expect(file(nested, `${nested.sourceRoot}/lib/marketing/index.ts`)).not.toContain("./rpc")
    expect(packageJson(nested).exports["./rpc"]?.import).toBe("./src/lib/rpc.ts")

    const rpcOnly = planFor(
      createBlueprint({
        kind: "contract",
        name: "form",
        modules: "marketing/campaign,marketing/subscriber",
        capabilities: "rpc"
      })
    )
    expect(
      rpcOnly.files.some((generated) => generated.path.endsWith("/lib/marketing/index.ts"))
    ).toBe(false)
    expect(file(rpcOnly, `${rpcOnly.sourceRoot}/index.ts`).trim()).toBe("")
    expect(Object.keys(packageJson(rpcOnly).exports)).toEqual([".", "./rpc"])
  })

  it("renders providers as one root SDK boundary", () => {
    const provider = planFor(
      createBlueprint({
        kind: "provider",
        name: "stripe",
        externalService: "Stripe",
        entrypoints: "root,server"
      })
    )

    const service = file(provider, `${provider.sourceRoot}/lib/service.ts`)
    expect(service).toContain("export class Stripe extends Context.Service")
    expect(service).toContain("static readonly Live")
    expect(service).toContain("static readonly Test")
    expect(service).toContain("static readonly Auto")
    expect(service).not.toContain("StripeProvider")
    expect(file(provider, `${provider.sourceRoot}/index.ts`)).toContain("./lib/service")
    expect(file(provider, `${provider.sourceRoot}/server.ts`)).toContain("./lib/service")
    expect(packageJson(provider).description).toBe("Stripe provider")
    expect(Object.keys(packageJson(provider).exports)).toEqual([".", "./server"])
  })

  it("audits and normalizes managed files without rewriting source", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "mlg-standardize-"))
    const projectRoot = join(workspace, "libs/feature/checkout")
    const sourcePath = join(projectRoot, "src/lib/server/services/checkout/service.ts")
    const layersPath = join(projectRoot, "src/lib/server/layers.ts")

    try {
      mkdirSync(join(projectRoot, "src/lib/server/services/checkout"), {
        recursive: true
      })
      writeFileSync(
        join(workspace, "package.json"),
        JSON.stringify({
          name: "@creativetoolkits/workspace",
          workspaces: ["libs/**"]
        })
      )
      writeFileSync(join(projectRoot, "project.json"), JSON.stringify({ name: "feature-checkout" }))
      writeFileSync(
        join(projectRoot, "package.json"),
        JSON.stringify({
          name: "@creativetoolkits/feature-checkout",
          version: "1.2.3",
          exports: {
            ".": { import: "./src/index.ts", types: "./src/index.ts" }
          }
        })
      )
      writeFileSync(
        join(projectRoot, "src/index.ts"),
        "export * from './lib/server/services/checkout/service'\n"
      )
      writeFileSync(
        sourcePath,
        [
          "import { Context } from 'effect'",
          "export class CheckoutFeature extends Context.Tag('CheckoutFeature')<CheckoutFeature, {}>() {}",
          "export class Legacy { static readonly Dev = undefined }",
          ""
        ].join("\n")
      )
      writeFileSync(layersPath, "export const LegacyLayers = {}\n")

      const before = await Effect.runPromise(
        standardizeProject({
          project: "libs/feature/checkout",
          workspaceRoot: workspace,
          check: true
        })
      )
      expect(before.changedFiles).toContain("libs/feature/checkout/tsconfig.lib.json")
      expect(before.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
        expect.arrayContaining([
          "effect-v4-context-service",
          "no-dev-layer",
          "no-public-layers-file"
        ])
      )

      await Effect.runPromise(
        standardizeProject({
          project: "libs/feature/checkout",
          workspaceRoot: workspace
        })
      )
      const after = await Effect.runPromise(
        standardizeProject({
          project: "libs/feature/checkout",
          workspaceRoot: workspace,
          check: true
        })
      )

      expect(after.changedFiles).toEqual([])
      expect(readFileSync(sourcePath, "utf8")).toContain("Context.Tag")
      expect(JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8")).version).toBe(
        "1.2.3"
      )
    } finally {
      rmSync(workspace, { force: true, recursive: true })
    }
  })

  it("round-trips a generated provider through standardize", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "mlg-provider-standardize-"))
    const plan = planFor(
      createBlueprint({
        kind: "provider",
        name: "stripe",
        externalService: "Stripe"
      })
    )

    try {
      writeFileSync(
        join(workspace, "package.json"),
        JSON.stringify({
          name: "@creativetoolkits/workspace",
          workspaces: ["libs/**"]
        })
      )
      for (const generated of plan.files) {
        const target = join(workspace, generated.path)
        mkdirSync(join(target, ".."), { recursive: true })
        writeFileSync(target, generated.content)
      }

      const result = await Effect.runPromise(
        standardizeProject({
          project: plan.projectRoot,
          workspaceRoot: workspace,
          check: true
        })
      )
      expect(result.projectRoot).toBe("libs/provider/stripe")
    } finally {
      rmSync(workspace, { force: true, recursive: true })
    }
  })

  it("keeps runtime dependencies out of devDependencies when specs import them too", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "mlg-standardize-dependencies-"))
    const projectRoot = join(workspace, "libs/infra/auth")

    try {
      mkdirSync(join(projectRoot, "src/lib"), { recursive: true })
      writeFileSync(
        join(workspace, "package.json"),
        JSON.stringify({
          name: "@creativetoolkits/workspace",
          workspaces: ["libs/**"]
        })
      )
      writeFileSync(join(projectRoot, "project.json"), JSON.stringify({ name: "infra-auth" }))
      writeFileSync(
        join(projectRoot, "package.json"),
        JSON.stringify({
          name: "@creativetoolkits/infra-auth",
          version: "0.0.1",
          dependencies: { "@creativetoolkits/contract-auth": "workspace:*" },
          devDependencies: { "@effect/vitest": "catalog:" }
        })
      )
      writeFileSync(join(projectRoot, "src/index.ts"), "export * from './lib/service'\n")
      writeFileSync(
        join(projectRoot, "src/lib/service.ts"),
        "import { AuthProvider } from '@creativetoolkits/contract-auth'\nexport { AuthProvider }\n"
      )
      writeFileSync(
        join(projectRoot, "src/lib/service.spec.ts"),
        "import { AuthProvider } from '@creativetoolkits/contract-auth'\nimport { describe } from '@effect/vitest'\nvoid AuthProvider\nvoid describe\n"
      )

      await Effect.runPromise(
        standardizeProject({
          project: "libs/infra/auth",
          workspaceRoot: workspace
        })
      )

      const manifest = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8"))
      expect(manifest.dependencies).toEqual({
        "@creativetoolkits/contract-auth": "workspace:*"
      })
      expect(manifest.devDependencies).toEqual({
        "@effect/vitest": "catalog:"
      })
    } finally {
      rmSync(workspace, { force: true, recursive: true })
    }
  })

  it("retains dependencies referenced only by re-exports", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "mlg-standardize-reexports-"))
    const projectRoot = join(workspace, "libs/infra/reexport")

    try {
      mkdirSync(join(projectRoot, "src"), { recursive: true })
      writeFileSync(
        join(workspace, "package.json"),
        JSON.stringify({ name: "@creativetoolkits/workspace", workspaces: ["libs/**"] })
      )
      writeFileSync(join(projectRoot, "project.json"), JSON.stringify({ name: "infra-reexport" }))
      writeFileSync(
        join(projectRoot, "package.json"),
        JSON.stringify({
          name: "@creativetoolkits/infra-reexport",
          version: "1.0.0",
          dependencies: { "external-lib": "^1.2.3" },
          exports: { ".": { import: "./src/index.ts", types: "./src/index.ts" } }
        })
      )
      writeFileSync(join(projectRoot, "src/index.ts"), "export { value } from 'external-lib'\n")

      await Effect.runPromise(
        standardizeProject({ project: "libs/infra/reexport", workspaceRoot: workspace })
      )

      const manifest = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8"))
      expect(manifest.dependencies).toEqual({ "external-lib": "^1.2.3" })
    } finally {
      rmSync(workspace, { force: true, recursive: true })
    }
  })

  it("round-trips a generated feature through standardize", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "mlg-feature-standardize-"))
    const plan = planFor(
      createBlueprint({
        kind: "feature",
        name: "user",
        modules: "authentication,profile",
        contract: "user",
        dataAccess: "user",
        entrypoints: "root,client,server"
      })
    )

    try {
      writeFileSync(
        join(workspace, "package.json"),
        JSON.stringify({
          name: "@creativetoolkits/workspace",
          workspaces: ["libs/**"]
        })
      )
      for (const generated of plan.files) {
        const target = join(workspace, generated.path)
        mkdirSync(join(target, ".."), { recursive: true })
        writeFileSync(target, generated.content)
      }

      const result = await Effect.runPromise(
        standardizeProject({
          project: plan.projectRoot,
          workspaceRoot: workspace,
          check: true
        })
      )
      expect(result.changedFiles).toEqual([])
      expect(result.diagnostics).toEqual([])
    } finally {
      rmSync(workspace, { force: true, recursive: true })
    }
  })

  it("round-trips a nested RPC contract through standardize", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "mlg-contract-standardize-"))
    const plan = planFor(
      createBlueprint({
        kind: "contract",
        name: "form",
        modules: "form-state,marketing/campaign,marketing/subscriber",
        capabilities: "ports,rpc"
      })
    )

    try {
      writeFileSync(
        join(workspace, "package.json"),
        JSON.stringify({
          name: "@creativetoolkits/workspace",
          workspaces: ["libs/**"]
        })
      )
      for (const generated of plan.files) {
        const target = join(workspace, generated.path)
        mkdirSync(join(target, ".."), { recursive: true })
        writeFileSync(target, generated.content)
      }

      const result = await Effect.runPromise(
        standardizeProject({
          project: plan.projectRoot,
          workspaceRoot: workspace,
          check: true
        })
      )
      expect(result.projectRoot).toBe("libs/contract/form")
      expect(result.changedFiles).toEqual([])
      expect(result.diagnostics).toEqual([])
      expect(
        JSON.parse(readFileSync(join(workspace, plan.projectRoot, "package.json"), "utf8")).exports[
          "./rpc"
        ].import
      ).toBe("./src/lib/rpc.ts")
    } finally {
      rmSync(workspace, { force: true, recursive: true })
    }
  })
})
