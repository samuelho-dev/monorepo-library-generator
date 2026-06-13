# Generator Architecture V2

## Objective

The CLI exists to make a library standard repeatable. It is not a collection of unrelated templates. Every public interface must produce the same result for the same blueprint and workspace policy.

## Pipeline

```text
CLI / Nx / MCP
      |
      v
decode LibraryBlueprint
      |
      v
load WorkspacePolicy
      |
      v
create GenerationPlan
      |
      +--> ts-morph source renderers
      +--> import graph classification
      +--> package exports
      +--> package dependency sections
      +--> tsconfig project references
      +--> Nx and Vitest configuration
      |
      v
shared filesystem executor
```

The plan is sorted and hashed before execution. Dry runs expose the same plan without writing files.

## Workspace Policy

`mlg.config.json` is the workspace-owned policy boundary. Version 1 controls:

- npm scope and library root
- Effect and `@effect/vitest` dependency versions
- lint, formatter, typecheck, and test commands
- known workspace package names
- default contract roles
- default entrypoints by library kind
- default test mode by library kind

Defaults target the current CreativeToolkits conventions: Effect v4 catalog versions, Biome, `tsgo --build`, and Vitest forks.

## Blueprint

`LibraryBlueprint` is a versioned discriminated union over `contract`, `data-access`, `feature`, `provider`, and `infra`. Shared fields declare entrypoints, dependencies, tags, output directory, and test mode. Module-capable kinds add a recursive module tree; providers deliberately do not. Kind-specific fields declare relationships such as a data-access contract, feature data-access inputs, contract RPC capabilities, or a provider's external service. Feature router composition is part of the standard shape rather than an optional flag.

The shared generation implementation lives in `src/core`. CLI, Nx, and MCP are adapters into that core. Existing-library auditing lives separately in `src/standardize`.

Module nodes form a tree. Data-access and feature leaves generate services. A data-access leaf owns exactly `service.ts`, `service.spec.ts`, and `index.ts`; intermediate grouping directories only preserve hierarchy. Client-enabled features declare a contract, then generate one domain AtomRpc client and typed query hooks for matching contract RPC capabilities. Contracts turn top-level nodes into exported subdomains and fold nested capability declarations into the subdomain role files. Providers always generate one root SDK service.

No interface has private generation flags. CLI arguments, Nx schemas, and MCP JSON schemas are adapters into this type.

## Rendering

All generated TypeScript is constructed through ts-morph source-file APIs. Renderer functions own one architectural concept each: contract role, data-access service, feature service, router, Pattern B service, entrypoint, test, or Vitest configuration.

JSON files are structured objects serialized after planning. Package metadata is not copied from a static template.

## Dependency Derivation

The planner parses generated imports and exports with ts-morph.

- `effect` is a peer dependency.
- `@effect/vitest` and test-only imports are dev dependencies.
- workspace packages use `workspace:*`.
- explicitly declared dependencies can override section and version.
- workspace runtime dependencies produce matching `tsconfig.lib.json` references.

Package exports are generated only for declared entrypoints and concrete contract module/role files.

## Standardization

`mlg standardize <project>` keeps source code intact and normalizes managed metadata:

- `package.json`
- `project.json`
- `tsconfig.json`
- `tsconfig.lib.json`
- `tsconfig.spec.json`
- `vitest.config.ts`

It scans existing TypeScript imports to rebuild dependency sections and references, preserves valid concrete exports, and reports source diagnostics for retired patterns or invalid dependency direction. `--check` performs the same comparison without writes and is suitable for CI.

## Extension Rules

1. Add a blueprint field only when it represents an architectural choice shared by all interfaces.
2. Add generated TypeScript through a ts-morph renderer, not a full-file string template.
3. Derive metadata from the planned source graph instead of adding parallel package or tsconfig templates.
4. Add a plan-level test for every new invariant.
5. Compile representative output against the target Effect toolchain before changing a default pattern.
6. Do not add implicit companion libraries; model multi-library generation as an explicit set of blueprints.

## Migration From V1

Legacy flags such as `includeCQRS`, `includeCache`, `includeClientServer`, and platform presets are intentionally unsupported. Replace them with explicit modules, capabilities, dependencies, and entrypoints. Existing libraries should be audited with `mlg standardize --check` before normalization.
