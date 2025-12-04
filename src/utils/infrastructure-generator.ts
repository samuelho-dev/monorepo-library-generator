/**
 * Shared Infrastructure File Generator
 *
 * Consolidated utility for generating infrastructure files across all library types.
 * Eliminates duplication of package.json, tsconfig.json, and README.md generation
 * that was previously repeated in every core generator.
 *
 * @module monorepo-library-generator/infrastructure-generator
 */

import { Effect } from "effect"
import type { LibraryType } from "./build-config-utils"
import type { FileSystemAdapter } from "./filesystem-adapter"

/**
 * Options for infrastructure file generation
 */
export interface InfrastructureGeneratorOptions {
  /**
   * Workspace root directory (absolute path)
   */
  readonly workspaceRoot: string

  /**
   * Project root directory (relative to workspace root)
   */
  readonly projectRoot: string

  /**
   * Project name (e.g., "contract-product", "data-access-user")
   */
  readonly projectName: string

  /**
   * Package name with scope (e.g., "@myorg/contract-product")
   */
  readonly packageName: string

  /**
   * Human-readable description
   */
  readonly description: string

  /**
   * Library type (determines README content)
   */
  readonly libraryType: LibraryType

  /**
   * Offset from project root to workspace root (e.g., "../../")
   */
  readonly offsetFromRoot: string

  /**
   * Additional package.json exports (optional)
   */
  readonly additionalExports?: Record<string, { import: string; types: string }>
}

/**
 * Library-specific README content templates
 */
const README_TEMPLATES: Record<LibraryType, (options: InfrastructureGeneratorOptions) => string> = {
  contract: (options) =>
    `# ${options.packageName}

${options.description}

## Overview

This contract library defines the core domain model for ${options.projectName}.

## Contents

- **Entities**: Domain entities and value objects (Effect Schema)
- **Errors**: Domain-specific errors (Data.TaggedError)
- **Events**: Domain events
- **Ports**: Service interfaces (Context.Tag)

## Usage

\`\`\`typescript
import { /* entities, errors, ports */ } from '${options.packageName}';
\`\`\`

## Development

\`\`\`bash
# Build
nx build ${options.projectName}

# Test
nx test ${options.projectName}
\`\`\`
`,

  "data-access": (options) =>
    `# ${options.packageName}

${options.description}

## Overview

This data-access library implements the repository pattern for ${options.projectName}.

## Contents

- **Repository**: Data persistence implementation
- **Queries**: Database query builders (Kysely)
- **Types**: Domain types and filters
- **Validation**: Input validation helpers

## Usage

\`\`\`typescript
import { ${options.projectName.replace(/^data-access-/, "")}Repository } from '${options.packageName}';

const program = Effect.gen(function*() {
  const repo = yield* ${options.projectName.replace(/^data-access-/, "")}Repository;
  const result = yield* repo.findById("id");
  return result;
});
\`\`\`

## Development

\`\`\`bash
# Build
nx build ${options.projectName}

# Test
nx test ${options.projectName}
\`\`\`
`,

  feature: (options) =>
    `# ${options.packageName}

${options.description}

## Overview

This feature library orchestrates business logic for ${options.projectName}.

## Contents

- **Service**: Business logic orchestration (Context.Tag)
- **Layers**: Dependency injection layers
- **Types**: Feature-specific types
- **Errors**: Feature-specific errors

## Usage

\`\`\`typescript
import { ${options.projectName.replace(/^feature-/, "")}Service } from '${options.packageName}/server';

const program = Effect.gen(function*() {
  const service = yield* ${options.projectName.replace(/^feature-/, "")}Service;
  // Use service methods
});
\`\`\`

## Development

\`\`\`bash
# Build
nx build ${options.projectName}

# Test
nx test ${options.projectName}
\`\`\`
`,

  infra: (options) =>
    `# ${options.packageName}

${options.description}

## Overview

This infrastructure library provides cross-cutting services for ${options.projectName}.

## Contents

- **Service**: Infrastructure service interface (Context.Tag)
- **Providers**: Multiple implementations (e.g., Redis, Memory)
- **Configuration**: Type-safe configuration (Effect Config)
- **Layers**: Service layer compositions

## Usage

\`\`\`typescript
import { ${options.projectName.replace(/^infra-/, "")}Service } from '${options.packageName}/server';

const program = Effect.gen(function*() {
  const service = yield* ${options.projectName.replace(/^infra-/, "")}Service;
  // Use service methods
});
\`\`\`

## Development

\`\`\`bash
# Build
nx build ${options.projectName}

# Test
nx test ${options.projectName}
\`\`\`
`,

  provider: (options) =>
    `# ${options.packageName}

${options.description}

## Overview

This provider library wraps an external service SDK with Effect-based APIs.

## Contents

- **Service**: Effect-based service wrapper (Context.Tag)
- **Layers**: Service implementations (Live, Test, Dev, Auto)
- **Types**: Request/response types
- **Errors**: Service-specific errors

## Usage

\`\`\`typescript
import { ${options.projectName.replace(/^provider-/, "")}Service } from '${options.packageName}';

const program = Effect.gen(function*() {
  const service = yield* ${options.projectName.replace(/^provider-/, "")}Service;
  // Use service methods
}).pipe(Effect.provide(${options.projectName.replace(/^provider-/, "")}Service.Live));
\`\`\`

## Development

\`\`\`bash
# Build
nx build ${options.projectName}

# Test
nx test ${options.projectName}
\`\`\`
`,

  util: (options) =>
    `# ${options.packageName}

${options.description}

## Overview

This utility library provides shared helper functions and utilities.

## Contents

- **Utilities**: Reusable helper functions
- **Types**: Shared type definitions
- **Constants**: Common constants

## Usage

\`\`\`typescript
import { /* utilities */ } from '${options.packageName}';
\`\`\`

## Development

\`\`\`bash
# Build
nx build ${options.projectName}

# Test
nx test ${options.projectName}
\`\`\`
`
}

/**
 * Generate all infrastructure files for a library
 *
 * Creates:
 * - package.json with exports configuration
 * - tsconfig.json extending workspace base
 * - README.md with library-specific content
 * - src/ directory
 *
 * @param adapter - File system adapter (Tree or Effect FileSystem)
 * @param options - Infrastructure generation options
 * @returns Effect that completes when all files are written
 *
 * @example
 * ```typescript
 * yield* generateInfrastructureFiles(adapter, {
 *   workspaceRoot: "/workspace",
 *   projectRoot: "libs/contract/product",
 *   projectName: "contract-product",
 *   packageName: "@myorg/contract-product",
 *   description: "Product domain contracts",
 *   libraryType: "contract",
 *   offsetFromRoot: "../../../"
 * })
 * ```
 */
export function generateInfrastructureFiles(
  adapter: FileSystemAdapter,
  options: InfrastructureGeneratorOptions
) {
  return Effect.gen(function*() {
    const {
      additionalExports,
      description,
      libraryType,
      offsetFromRoot,
      packageName,
      projectRoot,
      workspaceRoot
    } = options

    const fullProjectPath = `${workspaceRoot}/${projectRoot}`

    // 1. Create project directory
    yield* adapter.makeDirectory(fullProjectPath)

    // 2. Generate package.json
    const baseExports = {
      ".": {
        import: "./src/index.ts",
        types: "./src/index.ts"
      }
    }

    const packageJson = {
      name: packageName,
      version: "0.0.1",
      type: "module" as const,
      description,
      exports: additionalExports
        ? { ...baseExports, ...additionalExports }
        : baseExports,
      peerDependencies: {
        effect: "*"
      }
    }

    yield* adapter.writeFile(
      `${fullProjectPath}/package.json`,
      JSON.stringify(packageJson, null, 2) + "\n"
    )

    // 3. Generate tsconfig.json
    const tsConfig = {
      extends: `${offsetFromRoot}tsconfig.base.json`,
      compilerOptions: {
        outDir: "./dist",
        rootDir: "./src"
      },
      include: ["src/**/*.ts"],
      exclude: ["node_modules", "dist", "**/*.spec.ts"]
    }

    yield* adapter.writeFile(
      `${fullProjectPath}/tsconfig.json`,
      JSON.stringify(tsConfig, null, 2) + "\n"
    )

    // 4. Generate README.md (library-type specific)
    const readmeTemplate = README_TEMPLATES[libraryType]
    const readmeContent = readmeTemplate(options)

    yield* adapter.writeFile(
      `${fullProjectPath}/README.md`,
      readmeContent
    )

    // 5. Create src directory
    yield* adapter.makeDirectory(`${fullProjectPath}/src`)
  })
}
