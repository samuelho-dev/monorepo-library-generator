import type { LibraryKind } from "../../core"

const commonProperties = {
  name: {
    type: "string",
    pattern: "^[a-z][a-z0-9-]*[a-z0-9]$",
    description: "Kebab-case library name"
  },
  workspaceRoot: { type: "string" },
  description: { type: "string" },
  directory: { type: "string" },
  tags: { type: ["string", "array"], items: { type: "string" } },
  dependencies: { type: ["string", "array"], items: { type: "string" } },
  entrypoints: {
    type: ["string", "array"],
    items: { type: "string", enum: ["root", "client", "server", "edge"] }
  },
  testMode: { type: "string", enum: ["none", "unit", "integration"] },
  dryRun: { type: "boolean", default: false }
} as const

const kindProperties = {
  contract: {
    modules: { type: ["string", "array"], items: { type: "string" } },
    capabilities: {
      type: ["string", "array"],
      items: { type: "string", enum: ["entities", "errors", "events", "ports", "rpc", "types"] }
    }
  },
  "data-access": {
    modules: { type: ["string", "array"], items: { type: "string" } },
    contract: { type: "string" }
  },
  feature: {
    modules: { type: ["string", "array"], items: { type: "string" } },
    contract: { type: "string" },
    dataAccess: { type: ["string", "array"], items: { type: "string" } }
  },
  provider: { externalService: { type: "string" } },
  infra: { modules: { type: ["string", "array"], items: { type: "string" } } }
} as const

export function createToolDefinition(kind: LibraryKind, name: string, description: string) {
  return {
    name,
    description,
    inputSchema: {
      type: "object",
      properties: { ...commonProperties, ...kindProperties[kind] },
      required: ["name"],
      additionalProperties: false
    }
  }
}
