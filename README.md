# @samuelho-dev/monorepo-library-generator

Standardizes Effect libraries from one versioned blueprint. CLI, Nx, and MCP all call the same policy, planner, ts-morph renderer, and executor.

## What It Generates

- `contract`: schemas, errors, events, ports, consolidated Effect RPC contracts, and shared types
- `data-access`: contract-backed services with `Live`, `Test`, `Auto`, and a colocated test harness
- `feature`: server feature services plus optional contract-derived RPC clients and React query hooks
- `provider`: external integration services with `Live`, `Test`, and `Auto`
- `infra`: infrastructure services with `Live`, `Test`, and `Auto`

Generated libraries use exact package exports, TypeScript project references, import-derived dependency sections, colocated specs, and Vitest's `forks` pool. Feature libraries default to `root` and `server`. Declaring `client` requires a contract and generates a domain-scoped AtomRpc client plus typed query hooks without re-exporting server implementations. The generator does not emit `Context.Tag`, `Effect.Service`, `Dev` layers, public `layers.ts` composition, data-access `operations/` directories, or micro-barrel trees.

## CLI

```bash
mlg init
mlg generate contract --capabilities entities,errors,events,ports order
mlg generate data-access --contract order order
mlg generate data-access --contract form --modules form-state,marketing/campaign,marketing/subscriber form
mlg generate feature --modules cart,payment --data-access order checkout
mlg generate provider --entrypoints root,server stripe
mlg generate infra queue
```

Generate from a committed blueprint:

```bash
mlg generate blueprint ./blueprints/order.json
```

Audit or normalize an existing library:

```bash
mlg standardize --check libs/feature/checkout
mlg standardize libs/feature/checkout
```

`mlg init` creates `mlg.config.json`. It does not generate sample libraries or implicit provider/infra packages.

## Blueprint

```json
{
  "schemaVersion": 1,
  "kind": "feature",
  "name": "checkout",
  "modules": [{ "name": "cart" }, { "name": "payment" }],
  "contract": "checkout",
  "dataAccess": ["order"],
  "entrypoints": ["root", "client", "server"],
  "testMode": "unit"
}
```

The same blueprint is accepted by every interface. Planning is deterministic and produces a hash, file set, package manifest, exports, dependencies, and project references before files are written.

Data-access module paths are recursive. `marketing/campaign` generates
`src/lib/marketing/campaign/{service.ts,service.spec.ts,index.ts}`; grouping directories do not receive duplicate services.

Contracts use the same paths to describe capabilities, but expose only top-level subdomain boundaries. For example, `marketing/campaign` and `marketing/subscriber` are both declared in `src/lib/marketing/ports.ts`. Providers are a single external SDK boundary and do not accept modules.

Committed blueprint files may express the same hierarchy structurally:

```json
{
  "modules": [
    { "name": "form-state" },
    {
      "name": "marketing",
      "modules": [{ "name": "campaign" }, { "name": "subscriber" }]
    }
  ]
}
```

## Nx

```bash
pnpm nx g @samuelho-dev/monorepo-library-generator:contract order \
  --capabilities=entities,errors,events,ports
```

## Documentation

- [CreativeToolkits patterns](./docs/CREATIVETOOLKITS_PATTERNS.md)
- [Generator architecture](./docs/GENERATOR_ARCHITECTURE_V2.md)

## Development

```bash
pnpm test
pnpm typecheck
pnpm build
```
