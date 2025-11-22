# @samuelho-dev/monorepo-library-generator

## 1.2.3

### Patch Changes

- **Dynamic Libraries Root Detection**: Generators now automatically detect where to create libraries based on your workspace configuration

  **Key Changes:**

  - Added `detectLibrariesRoot()` function with 4-tier detection strategy:
    1. User-provided `--directory` flag (highest priority)
    2. `nx.json` `workspaceLayout.libsDir` configuration
    3. Detect `packages/` directory (Effect monorepos)
    4. Detect `libs/` directory (Nx default)
    5. Default to `"libs"` as fallback

  - Removed hardcoded `"libs/"` defaults from all `schema.json` files
  - Updated `WorkspaceConfig` interface with `librariesRoot` field
  - All core generators now use dynamic `librariesRoot`

  **Usage:**

  ```bash
  # Uses detected libraries root (nx.json, packages/, or libs/)
  pnpm generate contract user

  # Override with custom directory
  pnpm generate contract user --directory=packages/libs
  ```

  **Benefits:**

  - Works with any monorepo structure (Nx, Effect, custom)
  - No configuration required - automatic detection
  - Fully configurable via flags when needed
  - All 24 tests passing

## 1.2.0

### Minor Changes

- Enable CLI support for feature, infra, and provider generators

  **New Features:**

  - ✨ Feature generator now available via standalone CLI
  - ✨ Infrastructure generator now available via standalone CLI
  - ✨ Provider generator now available via standalone CLI

  **Improvements:**

  - Extracted shared generator cores (~550 lines) to eliminate duplication
  - Unified FileSystemAdapter abstraction works with both Nx Tree and Effect FileSystem
  - Consolidated platform detection logic
  - Fixed client/server export generation (always generated together)

  **CLI Usage:**

  ```bash
  # Generate feature library
  pnpm generate feature my-feature --scope=user --includeRPC

  # Generate infrastructure library
  pnpm generate infra cache --includeClientServer

  # Generate provider library
  pnpm generate provider stripe-payments Stripe
  ```

  **Breaking Changes:**

  - None - all existing Nx generators remain fully compatible

  **Technical Details:**

  - Created `generateFeatureCore()`, `generateInfraCore()`, `generateProviderCore()`
  - All 167 tests passing (36 feature, 31 infra, 20 provider, 80 others)
  - Zero lint errors
  - Eliminated ~40% code duplication across generators

## 1.0.1

### Patch Changes

- Fix CLI bin command - the `mlg` command now works correctly

  - Fixed publishConfig.directory compatibility with npm/pnpm
  - Removed bin field from root package.json
  - Added bin field to dist/package.json via post-build script
  - CLI command `mlg` now works as expected

  Users can now use:

  ```bash
  npx @samuelho-dev/monorepo-library-generator contract product
  # or install globally
  npm install -g @samuelho-dev/monorepo-library-generator
  mlg contract product
  ```

## 1.0.0

### Major Changes

- Initial release of Effect-based monorepo library generator

  🚀 **Features:**

  - Generate 5 library types: Contract, Data Access, Feature, Infrastructure, Provider
  - Effect-first patterns: Context.Tag, Layer, Data.TaggedError, Schema.Class
  - Dual-mode support: Nx generator and standalone CLI (`mlg`)
  - TypeScript strict mode with project references
  - Vitest + @effect/vitest testing integration
  - Comprehensive documentation and examples

  📦 **Library Types:**

  - **Contract**: Domain boundaries with types, entities, errors, events, and ports
  - **Data Access**: Repository pattern with Kysely query builders
  - **Feature**: Business logic with optional React hooks
  - **Infrastructure**: Technical services (cache, logging, etc.)
  - **Provider**: External service integration with proper error handling

  🔧 **Technical Highlights:**

  - Batch compilation support for faster builds
  - TypeScript composite projects for incremental compilation
  - Effect 3.0+ best practices
  - Platform-aware code generation (node, edge, universal)
