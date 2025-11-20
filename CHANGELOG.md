# @samuelho-dev/monorepo-library-generator

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
