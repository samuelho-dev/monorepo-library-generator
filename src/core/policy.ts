/* eslint-disable no-restricted-syntax -- external policy JSON is validated before typed normalization */
import { Effect } from "effect"
import { createWorkspaceContext, type WorkspaceContext } from "../infrastructure/workspace"
import { createAdapterFromContext, type FileSystemAdapter } from "../utils/filesystem"
import { CONTRACT_ROLES, ENTRYPOINT_NAMES, LIBRARY_KINDS, type WorkspacePolicy } from "./types"

export const POLICY_FILE = "mlg.config.json"

export const DEFAULT_WORKSPACE_POLICY: WorkspacePolicy = {
  schemaVersion: 1,
  librariesRoot: "libs",
  effect: {
    version: "catalog:",
    testVersion: "catalog:"
  },
  commands: {
    lint: "pnpm exec biome lint {projectRoot}",
    formatter: "pnpm exec biome check --write {projectRoot}",
    typecheck: "pnpm exec tsgo --build {projectRoot}/tsconfig.lib.json",
    test: "pnpm exec vitest run --config {projectRoot}/vitest.config.ts --pool=forks --passWithNoTests"
  },
  packages: {},
  defaults: {
    contractRoles: ["errors", "ports"],
    entrypoints: {
      contract: ["root"],
      "data-access": ["root"],
      feature: ["root", "server"],
      provider: ["root"],
      infra: ["root"]
    },
    testMode: {
      contract: "none",
      "data-access": "unit",
      feature: "unit",
      provider: "unit",
      infra: "unit"
    }
  }
}

function decodePolicy(input: unknown, context: WorkspaceContext): WorkspacePolicy {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error(`${POLICY_FILE} must contain an object`)
  }
  const value = input as Record<string, unknown>
  if (value.schemaVersion !== 1) throw new Error(`${POLICY_FILE} schemaVersion must be 1`)

  const effect = typeof value.effect === "object" && value.effect !== null
    ? (value.effect as Record<string, unknown>)
    : {}
  const commands = typeof value.commands === "object" && value.commands !== null
    ? (value.commands as Record<string, unknown>)
    : {}
  const packages = typeof value.packages === "object" && value.packages !== null
    ? (value.packages as WorkspacePolicy["packages"])
    : {}
  const defaults = typeof value.defaults === "object" && value.defaults !== null
    ? (value.defaults as Record<string, unknown>)
    : {}
  const entrypoints = typeof defaults.entrypoints === "object" && defaults.entrypoints !== null
    ? (defaults.entrypoints as Record<string, unknown>)
    : {}
  const testMode = typeof defaults.testMode === "object" && defaults.testMode !== null
    ? (defaults.testMode as Record<string, unknown>)
    : {}

  const decodedEntrypoints = Object.fromEntries(
    LIBRARY_KINDS.map((kind) => {
      const configured = Array.isArray(entrypoints[kind])
        ? entrypoints[kind].filter((item): item is string => typeof item === "string")
        : DEFAULT_WORKSPACE_POLICY.defaults.entrypoints[kind]
      for (const item of configured) {
        if (!ENTRYPOINT_NAMES.some((name) => name === item)) {
          throw new Error(`Invalid ${kind} entrypoint: ${item}`)
        }
      }
      if (
        (kind === "contract" || kind === "data-access") &&
        configured.some((item) => item !== "root")
      ) {
        throw new Error(`${kind} libraries support only the root entrypoint`)
      }
      return [kind, configured]
    })
  ) as WorkspacePolicy["defaults"]["entrypoints"]

  const decodedTestMode = Object.fromEntries(
    LIBRARY_KINDS.map((kind) => {
      const configured = testMode[kind]
      const mode = configured === "none" || configured === "unit" || configured === "integration"
        ? configured
        : DEFAULT_WORKSPACE_POLICY.defaults.testMode[kind]
      return [kind, mode]
    })
  ) as WorkspacePolicy["defaults"]["testMode"]

  const contractRoles = Array.isArray(defaults.contractRoles)
    ? defaults.contractRoles.filter((item): item is string => typeof item === "string")
    : DEFAULT_WORKSPACE_POLICY.defaults.contractRoles
  for (const role of contractRoles) {
    if (!CONTRACT_ROLES.some((name) => name === role)) {
      throw new Error(`Invalid default contract role: ${role}`)
    }
  }

  const librariesRoot = typeof value.librariesRoot === "string" ? value.librariesRoot : context.librariesRoot
  if (
    librariesRoot.startsWith("/") ||
    librariesRoot.includes("\\") ||
    librariesRoot
      .split("/")
      .some((segment) => segment.length === 0 || segment === "." || segment === "..")
  ) {
    throw new Error(`${POLICY_FILE} librariesRoot must be a workspace-relative POSIX path`)
  }

  return {
    schemaVersion: 1,
    scope: typeof value.scope === "string" ? value.scope : context.scope,
    librariesRoot,
    effect: {
      version: typeof effect.version === "string"
        ? effect.version
        : DEFAULT_WORKSPACE_POLICY.effect.version,
      testVersion: typeof effect.testVersion === "string"
        ? effect.testVersion
        : DEFAULT_WORKSPACE_POLICY.effect.testVersion
    },
    commands: {
      lint: typeof commands.lint === "string" ? commands.lint : DEFAULT_WORKSPACE_POLICY.commands.lint,
      formatter: typeof commands.formatter === "string"
        ? commands.formatter
        : DEFAULT_WORKSPACE_POLICY.commands.formatter,
      typecheck: typeof commands.typecheck === "string"
        ? commands.typecheck
        : DEFAULT_WORKSPACE_POLICY.commands.typecheck,
      test: typeof commands.test === "string" ? commands.test : DEFAULT_WORKSPACE_POLICY.commands.test
    },
    packages,
    defaults: {
      contractRoles: contractRoles as WorkspacePolicy["defaults"]["contractRoles"],
      entrypoints: decodedEntrypoints,
      testMode: decodedTestMode
    }
  }
}

export function loadWorkspacePolicy(adapter: FileSystemAdapter, context: WorkspaceContext) {
  const path = `${context.root}/${POLICY_FILE}`
  return Effect.gen(function*() {
    const exists = yield* adapter.exists(path)
    if (!exists) return decodePolicy(DEFAULT_WORKSPACE_POLICY, context)
    const content = yield* adapter.readFile(path)
    return decodePolicy(JSON.parse(content), context)
  })
}

export function policyJson(context: WorkspaceContext) {
  return `${JSON.stringify(decodePolicy(DEFAULT_WORKSPACE_POLICY, context), null, 2)}\n`
}

export function initializeWorkspacePolicy(workspaceRoot?: string) {
  return Effect.gen(function*() {
    const context = yield* createWorkspaceContext(workspaceRoot, "cli")
    const adapter = yield* createAdapterFromContext(context)
    const path = `${context.root}/${POLICY_FILE}`
    const exists = yield* adapter.exists(path)
    if (!exists) yield* adapter.writeFile(path, policyJson(context))
    return { path, created: !exists }
  })
}
