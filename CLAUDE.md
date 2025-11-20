# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Nx plugin for generating standardized Effect-based library architectures in monorepos. It provides five core generators (contract, data-access, feature, infra, provider) that create libraries following Effect.ts patterns with type-safe service definitions, layers, and error handling.

## Build and Test Commands

### Building
```bash
# Build the plugin
pnpm exec nx build workspace-plugin
```

### Testing
```bash
# Run fast unit tests (default, excludes slow generator tests)
pnpm test

# Run all tests including generators (comprehensive, for CI)
pnpm test:ci

# Run only generator tests
pnpm test:generators

# Watch mode for development
pnpm test:watch

# Coverage report
pnpm coverage
```

### Linting
```bash
# Check for linting errors
pnpm lint

# Auto-fix linting errors
pnpm lint-fix

# TypeScript type checking
pnpm check
```

### Running Generators
```bash
# Generate a contract library (domain types and interfaces)
pnpm exec nx g @tools/workspace-plugin:contract <name>

# Generate a data-access library (repositories and database logic)
pnpm exec nx g @tools/workspace-plugin:data-access <name>

# Generate a feature library (business logic and orchestration)
pnpm exec nx g @tools/workspace-plugin:feature <name>

# Generate an infrastructure library (shared services)
pnpm exec nx g @tools/workspace-plugin:infra <name>

# Generate a provider library (external service integration)
pnpm exec nx g @tools/workspace-plugin:provider <name> --externalService="ServiceName"
```

## Architecture Overview

### Code Generation Philosophy

The plugin uses **programmatic template generation** rather than EJS file templates. This means templates are TypeScript functions that return code strings, allowing for:
- Type-safe template construction
- Better IDE support and refactoring
- Centralized code generation utilities
- Easier testing and validation

### Key Architectural Patterns

1. **Contract-First Architecture**: Contract libraries define domain types and interfaces. Data-access and feature libraries depend on these contracts. This enforces separation between interface and implementation.

2. **Effect.ts Patterns**: All generated code follows Effect.ts conventions:
   - `Context.Tag` for service definitions
   - `Layer` for dependency injection
   - `Data.TaggedError` for domain errors
   - `Schema.Struct` for runtime validation
   - `Effect.gen` for composing effectful operations

3. **Platform-Aware Exports**: Libraries export different entry points based on platform:
   - `index.ts` - Main universal export
   - `server.ts` - Node.js-specific (platform:node or platform:universal)
   - `client.ts` - Browser-specific (platform:browser or platform:universal)
   - `edge.ts` - Edge runtime (platform:edge)

4. **Layer-Based Dependency Management**: Each library type organizes code by layers:
   - `lib/shared/` - Platform-agnostic types and errors
   - `lib/server/` - Server-side services and layers
   - `lib/client/` - React hooks and browser state
   - `lib/edge/` - Edge runtime middleware

### Generator-Specific Patterns

**Contract Generator** (`src/generators/contract/`)
- Generates domain types, errors, and interfaces
- No platform-specific code (type-only libraries)
- Optional CQRS patterns (commands/queries/projections)
- Optional RPC schemas for network boundaries
- Key files: entities.ts, errors.ts, ports.ts, events.ts

**Data-Access Generator** (`src/generators/data-access/`)
- Repository pattern for database operations
- Validates contract library exists first (Contract-First Architecture)
- Server-side only (platform:server tag)
- Key files: repository.ts, layers.ts, queries.ts, validation.ts
- Always includes test files for repository and layers

**Feature Generator** (`src/generators/feature/`)
- Business logic orchestration and services
- Platform defaults to 'universal' (can run both server and client)
- Optional RPC router and handlers
- Optional React hooks and Atom state management
- Optional edge middleware
- Key files: service.ts, layers.ts, types.ts, errors.ts

**Infra Generator** (`src/generators/infra/`)
- Shared infrastructure services (cache, storage, webhooks)
- Platform-agnostic by default
- Can generate separate client/server variants
- Optional edge runtime support
- Key files: interface.ts, service.ts, layers.ts, config.ts

**Provider Generator** (`src/generators/provider/`)
- Wraps external service SDKs (Redis, Stripe, Postgres)
- Platform-specific (node, browser, universal, edge)
- Includes health checks, circuit breaker, retry logic
- Key files: service.ts, types.ts, errors.ts, layers.ts, validation.ts

### Core Utilities

**`src/utils/code-generation/`**
- `typescript-builder.ts` - Type-safe TypeScript AST builder with automatic import management
- `effect-patterns.ts` - Builders for Effect.ts patterns (TaggedError, Context.Tag, Layer, Schema)
- `file-writer.ts` - Writes generated code to the Nx tree with validation

**`src/utils/library-generator-utils.ts`**
- `generateLibraryFiles()` - Central function for creating all library infrastructure (project.json, package.json, tsconfig files, entry points)
- Eliminates need for EJS templates for infrastructure files
- Handles platform-aware entry point generation

**`src/utils/build-config-utils.ts`**
- Creates standardized Nx targets (build, test, lint, check)
- Maps library types to build configurations
- Manages platform-specific build settings

**`src/utils/platform-utils.ts`**
- `determinePlatformExports()` - Decides which entry points (index/server/client/edge) to generate based on library type and platform

**`src/utils/normalization-utils.ts`**
- `normalizeBaseOptions()` - Converts generator schemas to normalized options with computed naming variants (className, fileName, propertyName, constantName)

### Template System

Templates are TypeScript functions in `src/generators/*/templates/*.template.ts` that:
1. Accept a typed options object
2. Use `TypeScriptBuilder` and `EffectPatterns` to construct code
3. Return a string of generated TypeScript code
4. Are called by the main generator function

Example pattern:
```typescript
export function generateServiceFile(options: TemplateOptions): string {
  const builder = new TypeScriptBuilder()

  builder
    .addImports([...])
    .addClass(EffectPatterns.createContextTag({...}))
    .addRaw(EffectPatterns.createLiveLayer({...}))

  return builder.toString()
}
```

## Testing Notes

- Unit tests are fast and run by default (`pnpm test`)
- Generator tests create virtual file trees and are slower, run with `pnpm test:ci` or `pnpm test:generators`
- Tests use Vitest with `@effect/vitest` for Effect-specific matchers
- **Nx devkit testing utilities** must be imported from `@nx/devkit/testing` (NOT `@nx/devkit`):
  - `createTree()` - Creates a minimal virtual file tree
  - `createTreeWithEmptyWorkspace()` - Creates a virtual tree with workspace configuration
  - `createTreeWithEmptyV1Workspace()` - Creates a virtual tree with v1 workspace format
- Test files use `.spec.ts` extension for generator tests and `.test.ts` for unit tests
- The `Tree` type itself comes from `@nx/devkit`, only the creation utilities come from `@nx/devkit/testing`

## Important Constraints

1. **Module Type**: Package uses `"type": "module"` - all files must use ESM imports with `.js` extensions for local imports
2. **TypeScript Config**: Uses `"moduleResolution": "NodeNext"` and `"module": "NodeNext"` - requires `.js` extensions
3. **Effect Version**: Peer dependencies lock to specific Effect.ts versions (effect ^3.17.7, @effect/platform ^0.93.2)
4. **Nx Compatibility**: Tested with Nx 22.x
5. **File Extensions**: When importing local files, use `.js` extension even for `.ts` files (e.g., `import { foo } from './bar.js'`)

## Code Style

- Use `readonly` for all array and object parameters
- Prefer `Array<T>` over `T[]` for consistency with Effect.ts
- Use `interface` for public APIs, `type` for unions and internal types
- All generators must call `formatFiles(tree)` before completion
- JSDoc comments required for all public functions and classes
- Follow Effect.ts naming conventions: `ServiceName`, `ServiceLive`, `ServiceTest` for layers
