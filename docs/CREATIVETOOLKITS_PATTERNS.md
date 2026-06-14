# CreativeToolkits Library Patterns

## Research Baseline

The current reference is CreativeToolkits commit `c5fa3ae728015cc55429b3c06e9bf59f0557e4af`, dated June 11, 2026. The historical comparison point used while auditing the original generator is `d1b52db8f3afd8537b7eebeb9afb711a98958de5`, dated October 12, 2025.

The important changes are architectural, not cosmetic:

- May 22, 2026: `b3b540b70` migrated the monorepo to Effect v4, including `Context.Service`, Schema, and RPC.
- May 31, 2026: `9398e0e28` introduced Nx-canonical TypeScript project references.
- June 1, 2026: `f108b4748` standardized `tsgo --build` for composite dependency builds.
- June 1, 2026: `ed95d0876` reconciled exact library exports and removed RPC service export leaks.
- June 2, 2026: `595e132d0` synchronized package dependencies and project references.
- June 10, 2026: `1be5494ef` moved feature composition into `router.ts` and deleted the server `layers.ts` split.
- June 10, 2026: `2b78a5ee2` removed contract/data-access micro-barrels and pointed exports at concrete files.

At the reference commit, 247 library source files use `Context.Service`, 124 feature files expose `DefaultWithoutDependencies`, 49 data-access files define a `TestHarness`, and 70 data-access/provider/infra files expose an `Auto` layer. There are no data-access `operations/` directories. The two remaining `layers.ts` files are specialized client/queue implementation files, not the former universal feature composition convention.

## Stable Invariants

1. Service tags use Effect v4 `Context.Service`.
2. Feature services expose `DefaultWithoutDependencies` and a dependency-provided `Default`.
3. Provider and infrastructure services expose `Live`, `Test`, and `Auto`.
4. Data-access modules expose `Live`, closure-backed `Test`, `Auto`, and a harness tag when mutable test state matters.
5. Every concrete data-access leaf owns one `service.ts`, one colocated `service.spec.ts`, and one `index.ts`.
6. Nested paths such as `marketing/campaign` preserve hierarchy without generating a duplicate service for `marketing`.
7. Feature-wide composition belongs in `router.ts`.
8. Specs are colocated with implementation files.
9. Package exports point to concrete files and do not expose accidental internals.
10. Workspace imports in `package.json` and references in `tsconfig.lib.json` describe the same dependency graph.
11. Typechecking uses `tsgo --build` against composite projects.
12. Vitest uses process isolation with the `forks` pool.

## Archetypes

### Contract

Contracts own boundary types: Schema entities, tagged errors, events, service ports, and RPC schemas. They do not import data-access, feature, provider, or infrastructure packages.

Contract roles are explicit blueprint capabilities. A flat contract exports concrete role files such as `./errors` and `./ports`. Multi-module contracts expose top-level subdomain boundaries. Nested capabilities are declarations inside the parent subdomain role files rather than additional directory trees or micro-barrels.

RPC is one domain-level boundary rather than three implementation-oriented roles. When the `rpc` capability is present, the generator creates `src/lib/rpc.ts` with wire schemas, `Schema.TaggedErrorClass` errors, `Rpc.make` definitions, and the domain `RpcGroup`. The package exposes that file through `./rpc`; root and subdomain barrels do not re-export RPC services. Legacy `rpc-definitions.ts`, `rpc-errors.ts`, and `rpc-group.ts` files should be consolidated into this entrypoint.

### Data Access

Data-access implements contract ports. A module is centered on `service.ts`, not a directory of one-method operation files. The generated baseline contains:

- a production `Live` layer
- a fresh closure-backed `Test` layer
- an environment-selected `Auto` layer
- a `Context.Service` test harness for reset/snapshot behavior

The scaffold deliberately leaves domain-specific database operations for implementation after generation.

Module paths are recursive. For example, `form-state,marketing/campaign,marketing/subscriber` produces three leaf services. The `marketing` directory only groups its two children; it does not receive another service or barrel.

### Feature

Each capability is a `Context.Service` under `src/lib/server/services/<capability>/service.ts`.

- `DefaultWithoutDependencies` constructs the feature while leaving dependencies open for focused tests.
- `Default` provides the production dependency layers.
- `router.ts` composes feature services and owns library-level `Live`, `Test`, and `Auto` selection.

Feature policy defaults declare `root` and `server`; client and edge are opt-in. A client-enabled feature names its RPC contract and generates `src/lib/client/rpc.ts`, `src/lib/client/hooks/`, and `src/client.ts`. Components, atoms, contexts, and routing remain domain-owned additions because a generic blueprint cannot infer meaningful UI behavior.

### Provider And Infrastructure

Both use the same service-layer shape: a `Context.Service` with `Live`, `Test`, and `Auto`. A provider is one external SDK boundary rooted at `src/lib/service.ts`, named for the SDK (`Stripe`, `Resend`, or similar); it does not expose generator-level modules. Infra means an application-wide technical capability and may contain explicit capability modules. Neither creates a public `Dev` layer.

## Reference Infrastructure Stack

The regenerated reference workspace includes the portable parts of the current CreativeToolkits database, auth, and storage stack. These packages are implementation references for future generator capabilities, not generic placeholder services.

### Kysely Provider

- `provider-kysely` owns postgres.js dialect construction, connection lifecycle, ping, query execution, and transaction execution.
- Driver failures are translated into tagged provider errors while preserving the original cause.
- Transactions preserve typed Effect failures and defects so Kysely rolls back instead of committing an encoded failure value.
- The provider remains generic in the database schema and exposes both production and `DummyDriver`-backed test factories.

### Supabase Provider

- Root services cover client creation, auth, storage, and realtime subscriptions.
- `client`, `server`, and `edge` entrypoints prevent server-only dependencies from leaking into browser or edge bundles.
- Browser support includes a cached client and resumable TUS uploads; server support includes cookie-aware and service-role clients.
- Auth, storage, connection, token, session, bucket, and file failures use distinct tagged errors.

### Auth Contract And Infrastructure

- `contract-auth` owns provider-neutral schemas, branded user IDs, tagged errors, verification ports, route policy metadata, and request/service context tags.
- It does not depend on RPC implementation files or a generated application database schema.
- `infra-auth` adapts Supabase auth into session/token verification, admin API-key verification, and `Live`, `Test`, and `Auto` layers.

### Storage Infrastructure

- `infra-storage` coordinates the Supabase storage provider and maps provider failures into infrastructure errors.
- It includes upload/download/remove/list/signed URL/public URL operations, runtime validation, test storage, and a browser upload hook.
- Client exports live behind `./client`; server services remain on the root entrypoint.

### Database Contract And Infrastructure

- `contract-database` owns count decoding, database errors, and pagination schemas.
- `infra-database` owns the Effect service, a lazy direct Kysely client for non-Effect server code, query helpers, repository combinators, generic realtime subscriptions, and reusable in-memory test repositories.
- The database schema boundary is generic and application-owned. The reference stack does not copy CreativeToolkits' generated application schema.
- Typesense queue integration, order-specific realtime methods, marketplace snapshots, and application IDs are intentionally excluded because they depend on CreativeToolkits domain contracts rather than database infrastructure.

### Environment Boundary

- Shared infrastructure reads environment values lazily.
- Database and server-side Supabase secrets are `Redacted`; browser-safe `NEXT_PUBLIC_*` values remain plain strings.
- Importing a package does not open a database connection or eagerly require every environment variable.

## Rejected Legacy Patterns

The standardizer diagnoses these because they encode the old architecture:

- `Context.Tag`, `Context.GenericTag`, or `Effect.Service` as generated service declarations
- public `Dev` layers
- feature server composition in `layers.ts`
- data-access `operations/` directories
- specs in `__tests__/`
- broad package exports that point at non-existent or internal files
- package dependencies without matching TypeScript project references
- generated provider/infra/cache libraries that were not requested by the blueprint

## Generator Implications

Patterns are represented as data in `mlg.config.json` and the versioned blueprint. A deterministic planner derives the complete file graph. TypeScript source is rendered through ts-morph. Package metadata is derived from actual generated imports, so source, exports, dependency sections, and project references cannot be maintained as independent templates.
