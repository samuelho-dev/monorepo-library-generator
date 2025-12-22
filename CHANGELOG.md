# @samuelho-dev/monorepo-library-generator

## 1.6.0

### Minor Changes

- a8c57ee: ## Comprehensive Test Coverage for All Library Types

  ### Provider Libraries
  - Added 8 comprehensive tests per provider library matching infra pattern
  - Tests cover: Service Interface, Layer Composition, Layer Types (sync/effect/scoped), Layer Isolation
  - Fixed Live layer to use lazy dynamic import for `env` - loads only when layer is built, not at module parse time
  - Tests can now import service.ts without triggering env validation

  ### Template Fixes
  - Provider service template now uses `Layer.effect` with `Effect.promise(() => import("@myorg/env"))` for lazy env loading
  - Added `Redacted` import back for proper API key handling
  - Configuration properly reads from `env.{PROVIDER}_API_KEY` and `env.{PROVIDER}_TIMEOUT`

  ### Infrastructure Libraries
  - All infra libraries have 8 tests covering Effect layer patterns
  - Tests verify Layer.succeed, Layer.effect, Layer.scoped, and Layer.fresh isolation

  ### Data Access Libraries
  - Repository tests (9 tests) + Layer composition tests (8 tests) = 17 tests per library

  ### Feature Libraries
  - 5 service tests per library covering business logic patterns

  ### Contract Libraries
  - Correctly configured as types-only (no tests, no vitest config)

  ### Test Results
  - 17 projects pass TypeScript check
  - 17 projects pass all tests (146+ total tests)
  - Full NX dependency graph validation

- 089816e: Remove includeRPC and includeCache flags - RPC and cache are now always generated
  - RPC layer is always generated for feature libraries
  - Cache integration is always included in data-access libraries
  - Removed conditional flags and CLI options for these features
  - Simplified domain generation with consistent output
  - Removed explicit return types and type assertions from generators

### Patch Changes

- 85c8889: Fix layer architecture to use upstream infrastructure test layers
  - Repository templates now only expose `Live` layer (no duplicate `Test` layer)
  - Service templates include `TestLayer` that composes with `DatabaseService.Test`
  - Tests use `Service.TestLayer` instead of duplicating test infrastructure
  - Fixed biome.json folder ignore patterns for Biome v2.2+
  - Generated output now included as example reference

- f7ed757: fix: detect workspace scope dynamically instead of caching at module load
  - Changed workspace scope detection to run dynamically on each access instead of caching at module load time
  - This fixes an issue where the CLI would use the wrong scope when running from a different workspace than where the CLI was installed
  - Previously, running `mlg init` from `generated/` would use the parent project's scope (`@samuelho-dev`) instead of the target workspace's scope (`@myorg`)
  - Generated libraries now correctly use the scope from the target workspace's package.json

## 1.5.2

### Patch Changes

- **Remove unnecessary type coercions and assertions**

  This patch demonstrates TypeScript's type inference capabilities by removing all unnecessary type coercions, assertions, and type narrowing from generated code templates.

  **Changes:**
  1. **Repository Interface Template** - Replaced test layer `as any` assertions with honest placeholder implementations using `Effect.dieMessage`. Test layers now guide developers to provide their own mocks.

  2. **Repository Template** - Removed non-null assertions and type casts:
     - Replaced `store.get(id)!` with `Option.fromNullable(store.get(id))`
     - Replaced `Effect.fail(...) as Effect.Effect<T, never, never>` with `Effect.dieMessage(...)`

  3. **Provider Service Interface Template** - Replaced test layer type assertions with placeholder implementations. No more `as Resource` or `as PaginatedResult` assertions.

  4. **Provider Service Template** - Improved config pattern:
     - Replaced `||` with `??` for default values (properly handles falsy values like 0)
     - Removed `!` non-null assertions on retry config (nullish coalescing ensures values are never undefined)
     - Removed `as const` type narrowing on health check status

  5. **TypeScript Builder** - Replaced `targetMap.get(from)!` with proper undefined check that throws descriptive error.

  **Architecture Improvement:**

  Test layers now use honest placeholder implementations instead of creating mock entities with type assertions. This approach:
  - Achieves zero type assertions without compromising branded type safety
  - Guides developers to provide their own test implementations
  - Demonstrates proper type-driven design where TypeScript infers types from schemas and interfaces

  **Breaking Changes:** None - this is a patch release focusing on internal code quality improvements.

## 1.5.1

### Patch Changes

- 379a2b1: Fix version reporting in CLI and MCP binaries - now dynamically reads from package.json instead of hardcoded values. Adds automatic version.ts generation during build process.

## 1.5.0

### Minor Changes

- 694a8f3: **Dotfiles Architecture Fix & Workspace Initialization**

  #### Breaking Changes
  - Removed `includeVSCodeSettings` option from all generator schemas
  - Libraries no longer generate workspace-level dotfiles (`.editorconfig`, `.vscode/*`)

  #### New Features

  **CLI Command: `init-workspace`**
  Initialize workspace-level dotfiles at repository root:

  ```bash
  npx mlg init-workspace
  ```

  Creates:
  - `.editorconfig` - Editor formatting rules
  - `.vscode/settings.json` - VSCode workspace settings
  - `.vscode/extensions.json` - Recommended extensions

  **MCP Tool: `init_workspace`**
  AI agents can now initialize workspace dotfiles via MCP protocol with dry-run support.

  #### Architectural Improvements

  **Workspace-Level Dotfiles (created once at root):**
  - `.editorconfig` - Editor configuration
  - `.vscode/settings.json` - VSCode settings
  - `.vscode/extensions.json` - Recommended extensions

  **Library-Level Dotfiles (created per library):**
  - `eslint.config.mjs` - Library-specific linting rules
  - `tsconfig.json` - Library-specific TypeScript config

  #### Migration Guide

  **Before (v1.3.0)**
  Libraries incorrectly included workspace-level dotfiles:

  ```
  libs/contract/product/
  ├── .editorconfig          ❌ Workspace file (duplicated)
  ├── .vscode/               ❌ Workspace directory (duplicated)
  ├── eslint.config.mjs      ✅ Library file
  └── tsconfig.json          ✅ Library file
  ```

  **After (v1.4.0)**
  Clean separation of concerns:

  ```
  # Workspace root
  .editorconfig              ✅ Workspace-level (create with init-workspace)
  .vscode/                   ✅ Workspace-level (create with init-workspace)

  # Library
  libs/contract/product/
  ├── eslint.config.mjs      ✅ Library-level (auto-generated)
  └── tsconfig.json          ✅ Library-level (auto-generated)
  ```

  **For Existing Projects:**
  1. Initialize workspace dotfiles once:

     ```bash
     npx mlg init-workspace
     ```

  2. Clean up existing library dotfiles (optional):

     ```bash
     find libs -name ".editorconfig" -delete
     find libs -name ".vscode" -type d -exec rm -rf {} +
     ```

  3. New libraries will automatically have correct dotfiles

  #### Research

  Based on research, Nx does NOT manage workspace-level dotfiles - developers must create them manually. This feature automates that process while maintaining proper separation of concerns.

  #### Documentation
  - `docs/DOTFILES_ARCHITECTURE_FIX.md` - Complete architectural details
  - `docs/WORKSPACE_INITIALIZATION.md` - Usage guide and best practices

  #### Test Coverage

  ✅ All 205 tests passing
  ✅ Manual verification of generated libraries
  ✅ Workspace initialization tested

- 9cd97ac: feat: comprehensive Effect.ts patterns audit implementation

  **Phase 1: Documentation & Decision Guides**
  - Added control flow decision matrix (Effect.if/when/unless) to EFFECT_PATTERNS.md
  - Added Effect.all batch operations guide with concurrency patterns
  - Expanded Effect running patterns section with clear decision matrix
  - Added Effect.all examples to feature service template

  **Phase 2: Production Patterns - Stream & Templates**

  **Phase 2.1: Stream Patterns**
  - Added `streamAll` method to repository interface template
  - Implemented `streamAll` in Live, Test, and Dev layers with Stream.paginateEffect
  - Added comprehensive streamAll test examples to repository spec template
  - Fixed test mocks to use DatabaseService abstraction (not Kysely internals)

  **Phase 2.2: Queue Patterns**
  - Queue patterns already comprehensive in infrastructure template and EFFECT_PATTERNS.md
  - No changes needed (already production-ready)

  **Phase 2.3: Observability**
  - Added comprehensive Effect.tap success-path observability section to feature service template
  - Includes 4 patterns: logging, chaining observability, conditional observability, analytics
  - Clear guidance on when to use Effect.tap vs Effect.tapError

  **Phase 2.4: Decision Matrices**
  - Added 400+ line "Decision Matrices & Quick Reference" section to EFFECT_PATTERNS.md
  - Master decision trees for 6 categories (single values, multiple values, conditionals, resources, concurrency, data)
  - Quick reference tables for all Effect operators
  - Pattern selection flowchart
  - Anti-pattern recognition guide with 9 common examples
  - Decision matrices for Stream/Array/Queue and Layer patterns
  - Common use case → pattern mapping table

  **Impact:**
  - Developers can now quickly find the right Effect pattern for any use case
  - Generated repositories include Stream support for large datasets out of the box
  - Comprehensive test examples for all new patterns
  - Production-ready Queue patterns documented and ready to use

- 9cd97ac: feat: add provider type specialization - support for CLI, HTTP, and GraphQL providers

  **Breaking Changes**: None - 100% backward compatible

  **New Feature: Provider Type Specialization**

  Adds support for four provider integration patterns, each optimized for different external service types:

  **Phase 1: Schema Enhancement**
  - Added `providerType` enum field (sdk/cli/http/graphql) with "sdk" default for backward compatibility
  - Added conditional required fields: `cliCommand` for CLI, `baseUrl` for HTTP/GraphQL
  - Added `authType` enum for HTTP/GraphQL authentication (bearer/apikey/oauth/basic/none)
  - Updated TypeScript interfaces: ProviderGeneratorSchema, ProviderTemplateOptions, ProviderCoreOptions

  **Phase 2: Validation Logic**
  - Added TypeScript validation in provider.ts for conditional required fields
  - CLI providers require `cliCommand` parameter
  - HTTP/GraphQL providers require `baseUrl` parameter
  - Smart defaults: providerType="sdk", authType="bearer"

  **Phase 3: Template Updates with Conditional Logic**
  - **errors.template.ts**: Provider-type-specific error classes
    - CLI: CommandError, NotFoundError
    - HTTP: HttpError, NetworkError, RateLimitError
    - GraphQL: GraphQLError + HTTP errors
    - SDK: Original ApiError, AuthenticationError, etc.

  - **types.template.ts**: Provider-type-specific type definitions
    - CLI: CommandResult, CommandOptions, Config (commandPath, timeout)
    - HTTP/GraphQL: Config (baseUrl, apiKey), ResourceSchema (Effect.Schema), ListParams
    - SDK: Original types with pagination

  - **service/interface.template.ts**: CRITICAL - Provider-type-specific implementations
    - Conditional imports: Command for CLI, HttpClient for HTTP/GraphQL
    - Conditional interface definitions for each provider type
    - **Conditional Live layer implementations** (production-ready):
      - CLI: Uses `Command.make()` + `Command.string` (validated against Effect docs)
      - HTTP: Uses `HttpClient` with `HttpClientRequest.bearerToken()` authentication
      - GraphQL: Uses `HttpClient.post()` with complete query/mutation support
      - SDK: Original dynamic import pattern for tree-shaking

  **Phase 4: Core Generator Logic**
  - Added provider type fields to templateOptions in provider-generator-core.ts
  - **Conditional operations directory**: Only SDK providers generate `operations/` directory
    - SDK: Generates operations/create.ts, query.ts, update.ts, delete.ts
    - CLI/HTTP/GraphQL: Operations defined in interface.ts (no separate files)
    - Saves ~10-15 unnecessary files for non-SDK providers
  - **Conditional CLAUDE.md documentation**: Four different versions
    - CLI: Command API patterns, execute/version methods
    - HTTP: HttpClient patterns, CRUD operations, authentication
    - GraphQL: Query/mutation patterns, schema validation
    - SDK: Granular operations, tree-shaking optimization

  **Phase 5: Documentation**
  - Updated docs/PROVIDER.md with comprehensive "Provider Types" section (277 lines)
    - Detailed explanation of all four provider types
    - Generator commands with examples for each type
    - Directory structure comparison
    - Usage examples and patterns for each type
    - Decision matrix for choosing provider type
    - When to use each type (clear guidelines)

  **Phase 6: Testing & Validation**
  - TypeScript compilation passes (no errors)
  - Conditional logic verified for all provider types
  - Proper Effect patterns for each type validated against documentation
  - Backward compatibility maintained (existing SDK providers unchanged)

  **New Generator Usage Examples:**

  ```bash
  # SDK Wrapper (default, backward compatible)
  pnpm exec nx g @workspace:provider stripe --externalService="Stripe" --providerType=sdk

  # CLI Wrapper
  pnpm exec nx g @workspace:provider docker --externalService="Docker" --providerType=cli --cliCommand="docker"

  # HTTP/REST API
  pnpm exec nx g @workspace:provider acme-api --externalService="Acme API" --providerType=http --baseUrl="https://api.acme.com" --authType=bearer

  # GraphQL API
  pnpm exec nx g @workspace:provider hasura --externalService="Hasura" --providerType=graphql --baseUrl="https://api.hasura.io/v1/graphql" --authType=bearer
  ```

  **Impact:**
  - Developers can now generate providers for CLI tools, HTTP APIs, and GraphQL endpoints (not just SDKs)
  - Production-ready code generation for all four patterns (no placeholders or TODOs)
  - Conditional file generation reduces unnecessary files for non-SDK providers
  - Clear documentation helps developers choose the right provider type
  - 100% backward compatible - existing SDK provider generation unchanged

## 1.4.0

### Minor Changes

**Dotfiles Architecture Fix & Workspace Initialization**

#### Breaking Changes

- Removed `includeVSCodeSettings` option from all generator schemas
- Libraries no longer generate workspace-level dotfiles (`.editorconfig`, `.vscode/*`)

#### New Features

**CLI Command: `init-workspace`**
Initialize workspace-level dotfiles at repository root:

```bash
npx mlg init-workspace
```

Creates:

- `.editorconfig` - Editor formatting rules
- `.vscode/settings.json` - VSCode workspace settings
- `.vscode/extensions.json` - Recommended extensions

**MCP Tool: `init_workspace`**
AI agents can now initialize workspace dotfiles via MCP protocol with dry-run support.

#### Architectural Improvements

**Workspace-Level Dotfiles (created once at root):**

- `.editorconfig` - Editor configuration
- `.vscode/settings.json` - VSCode settings
- `.vscode/extensions.json` - Recommended extensions

**Library-Level Dotfiles (created per library):**

- `eslint.config.mjs` - Library-specific linting rules
- `tsconfig.json` - Library-specific TypeScript config

#### Migration Guide

**Before (v1.3.0)**
Libraries incorrectly included workspace-level dotfiles:

```
libs/contract/product/
├── .editorconfig          ❌ Workspace file (duplicated)
├── .vscode/               ❌ Workspace directory (duplicated)
├── eslint.config.mjs      ✅ Library file
└── tsconfig.json          ✅ Library file
```

**After (v1.4.0)**
Clean separation of concerns:

```
# Workspace root
.editorconfig              ✅ Workspace-level (create with init-workspace)
.vscode/                   ✅ Workspace-level (create with init-workspace)

# Library
libs/contract/product/
├── eslint.config.mjs      ✅ Library-level (auto-generated)
└── tsconfig.json          ✅ Library-level (auto-generated)
```

**For Existing Projects:**

1. Initialize workspace dotfiles once:

   ```bash
   npx mlg init-workspace
   ```

2. Clean up existing library dotfiles (optional):

   ```bash
   find libs -name ".editorconfig" -delete
   find libs -name ".vscode" -type d -exec rm -rf {} +
   ```

3. New libraries will automatically have correct dotfiles

#### Research

Based on research, Nx does NOT manage workspace-level dotfiles - developers must create them manually. This feature automates that process while maintaining proper separation of concerns.

#### Documentation

- `docs/DOTFILES_ARCHITECTURE_FIX.md` - Complete architectural details
- `docs/WORKSPACE_INITIALIZATION.md` - Usage guide and best practices

#### Test Coverage

✅ All 205 tests passing
✅ Manual verification of generated libraries
✅ Workspace initialization tested

## 1.3.0

### Minor Changes

- Phase 3 intelligent dotfile merging
- Granular bundle optimization
- Platform-aware feature generation
- Provider type specialization

### Patch Changes

- Fixed generator templates to use proper Effect.gen patterns
- Fixed eslint config to ignore managed files
