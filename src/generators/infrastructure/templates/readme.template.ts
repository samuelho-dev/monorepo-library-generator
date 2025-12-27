/**
 * README Template
 *
 * Generates README.md content for each library type.
 *
 * @module monorepo-library-generator/infrastructure/readme-template
 */

import type { LibraryType } from "../../../utils/types"

export interface ReadmeOptions {
  readonly packageName: string
  readonly projectName: string
  readonly description: string
  readonly libraryType: LibraryType
}

/**
 * Generate README.md content based on library type
 */
export function generateReadme(options: ReadmeOptions) {
  const generators: Record<LibraryType, (opts: ReadmeOptions) => string> = {
    contract: generateContractReadme,
    "data-access": generateDataAccessReadme,
    feature: generateFeatureReadme,
    infra: generateInfraReadme,
    provider: generateProviderReadme,
    util: generateUtilReadme
  }

  return generators[options.libraryType](options)
}

function generateContractReadme(opts: ReadmeOptions) {
  return `# ${opts.packageName}

${opts.description}

## Overview

This contract library defines the core domain model and interfaces.

## Contents

- **Entities**: Domain entities with business logic
- **Events**: Domain events for event sourcing
- **Ports**: Service interfaces and contracts
- **Types**: Shared type definitions

## Usage

\`\`\`typescript
import { /* types */ } from '${opts.packageName}';
\`\`\`

## Development

\`\`\`bash
# Build
nx build ${opts.projectName}

# Typecheck
nx typecheck ${opts.projectName}
\`\`\`
`
}

function generateDataAccessReadme(opts: ReadmeOptions) {
  return `# ${opts.packageName}

${opts.description}

## Overview

This data-access library provides repository patterns for data persistence.

## Contents

- **Repository**: Data access layer with CRUD operations
- **Queries**: Pre-built database queries
- **Validation**: Data validation schemas

## Usage

\`\`\`typescript
import { /* repository */ } from '${opts.packageName}';
\`\`\`

## Development

\`\`\`bash
# Build
nx build ${opts.projectName}

# Test
nx test ${opts.projectName}
\`\`\`
`
}

function generateFeatureReadme(opts: ReadmeOptions) {
  return `# ${opts.packageName}

${opts.description}

## Overview

This feature library implements business logic with Effect-based patterns.

## Installation

\`\`\`bash
pnpm install ${opts.packageName}
\`\`\`

## Contents

- **Server**: Server-side business logic and services
- **Client**: Client-side hooks and state management (if applicable)
- **Types**: Shared type definitions

## Usage

\`\`\`typescript
import { /* service */ } from '${opts.packageName}/server';
\`\`\`

## Development

\`\`\`bash
# Build
nx build ${opts.projectName}

# Test
nx test ${opts.projectName}
\`\`\`
`
}

function generateInfraReadme(opts: ReadmeOptions) {
  return `# ${opts.packageName}

${opts.description}

## Overview

This infrastructure library provides service implementations.

## Contents

- **Service**: Core service implementation
- **Providers**: Service providers and adapters
- **Configuration**: Service configuration

## Usage

\`\`\`typescript
import { /* service */ } from '${opts.packageName}';
\`\`\`

## Development

\`\`\`bash
# Build
nx build ${opts.projectName}

# Test
nx test ${opts.projectName}
\`\`\`
`
}

function generateProviderReadme(opts: ReadmeOptions) {
  return `# ${opts.packageName}

${opts.description}

## Overview

This provider library integrates with external services.

## Installation

\`\`\`bash
pnpm install ${opts.packageName}
\`\`\`

## Contents

- **Service**: External service client
- **Types**: API types and schemas
- **Validation**: Request/response validation

## Usage

\`\`\`typescript
import { /* service */ } from '${opts.packageName}';
\`\`\`

## Development

\`\`\`bash
# Build
nx build ${opts.projectName}

# Test
nx test ${opts.projectName}
\`\`\`
`
}

function generateUtilReadme(opts: ReadmeOptions) {
  return `# ${opts.packageName}

${opts.description}

## Overview

This utility library provides shared helper functions and utilities.

## Contents

- **Utilities**: Reusable helper functions
- **Types**: Shared type definitions
- **Constants**: Common constants

## Usage

\`\`\`typescript
import { /* utilities */ } from '${opts.packageName}';
\`\`\`

## Development

\`\`\`bash
# Build
nx build ${opts.projectName}

# Test
nx test ${opts.projectName}
\`\`\`
`
}
