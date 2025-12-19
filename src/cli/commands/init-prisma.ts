/**
 * Prisma Directory Scaffolding
 *
 * Scaffolds the Prisma directory structure with multi-file schema organization.
 * This provides a foundation for schema-driven development with prisma-effect-kysely.
 *
 * @module cli/commands/init-prisma
 */

import { FileSystem } from "@effect/platform"
import * as Path from "@effect/platform/Path"
import { Console, Effect } from "effect"

/**
 * Scaffold Prisma directory structure for multi-file schema organization
 *
 * Creates:
 * - prisma/schema.prisma - Base configuration with prisma-effect-kysely generator
 * - prisma/schemas/ - Directory for domain-specific schema files
 * - prisma/migrations/ - Directory for migration history
 * - prisma/README.md - Documentation for Prisma usage
 */
export function scaffoldPrismaStructure() {
  return Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    yield* Console.log("🗄️  Scaffolding Prisma directory structure...")

    // Create directories
    const basePath = "prisma"
    yield* fs.makeDirectory(path.join(basePath, "schemas"), { recursive: true })
    yield* fs.makeDirectory(path.join(basePath, "migrations"), { recursive: true })

    // Create schema.prisma with multi-domain configuration
    const schemaContent = `// Prisma Schema
// Learn more: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

generator effectSchemas {
  provider = "prisma-effect-kysely"
  output   = "../libs/contract"
  multiFileDomains = "true"
  scaffoldLibraries = "true"
  libraryGenerator = "../node_modules/monorepo-library-generator"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Define your models in prisma/schemas/ directory
// Example: prisma/schemas/user.prisma
`

    yield* fs.writeFileString(path.join(basePath, "schema.prisma"), schemaContent)

    // Create .gitkeep files for empty directories
    yield* fs.writeFileString(path.join(basePath, "schemas", ".gitkeep"), "")
    yield* fs.writeFileString(path.join(basePath, "migrations", ".gitkeep"), "")

    // Create comprehensive README
    const readmeContent = `# Prisma Schemas

This directory contains your Prisma schema files organized by domain.

## Structure

\`\`\`
prisma/
├── schema.prisma       # Base configuration
├── schemas/           # Domain-specific models
│   ├── user.prisma   # User domain
│   ├── product.prisma # Product domain
│   └── ...
└── migrations/        # Migration history
\`\`\`

## Usage

### 1. Define Models

Create a new schema file per domain:

\`\`\`prisma
// prisma/schemas/user.prisma
model User {
  id String @id @default(uuid())
  email String @unique
  name String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
\`\`\`

### 2. Generate Effect Schemas

\`\`\`bash
pnpm run prisma:generate
\`\`\`

This will:
- Generate Effect schemas in \`libs/contract/{domain}/src/generated/\`
- Scaffold contract libraries if they don't exist
- Create type-safe Kysely interfaces

### 3. Create Migration

\`\`\`bash
pnpm run prisma:migrate
\`\`\`

### 4. Open Studio

\`\`\`bash
pnpm run prisma:studio
\`\`\`

## Multi-Domain Organization

The generator is configured with \`multiFileDomains = "true"\`, which means:

1. **Domain Detection**: Schemas are detected based on file names
   - \`prisma/schemas/user.prisma\` → domain: "user"
   - \`prisma/schemas/product.prisma\` → domain: "product"

2. **Contract Library Generation**: Each domain gets its own contract library
   - User domain → \`libs/contract/user/\`
   - Product domain → \`libs/contract/product/\`

3. **Automatic Scaffolding**: If \`scaffoldLibraries = "true"\`, contract libraries are created automatically

## Resources

- [Prisma Multi-File Schemas](https://www.prisma.io/blog/organize-your-prisma-schema-with-multi-file-support)
- [Effect Schema](https://effect.website/docs/schema/introduction)
- [Kysely](https://kysely.dev/)
`

    yield* fs.writeFileString(path.join(basePath, "README.md"), readmeContent)

    // Create .env file with DATABASE_URL and provider variables
    const envContent = `# Node Environment
NODE_ENV="development"

# Database Connection
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"

# Uncomment for other databases:
# DATABASE_URL="mysql://user:password@localhost:3306/mydb"
# DATABASE_URL="sqlite:./dev.db"

# Provider Configuration (Built-in Providers)
# Kysely Provider
KYSELY_API_KEY="your-kysely-api-key"
KYSELY_TIMEOUT=20000

# Effect.Cache Provider
EFFECT_CACHE_API_KEY="your-cache-api-key"
EFFECT_CACHE_TIMEOUT=20000

# Effect.Logger Provider
EFFECT_LOGGER_API_KEY="your-logger-api-key"
EFFECT_LOGGER_TIMEOUT=20000

# Effect.Metrics Provider
EFFECT_METRICS_API_KEY="your-metrics-api-key"
EFFECT_METRICS_TIMEOUT=20000

# Effect.Queue Provider
EFFECT_QUEUE_API_KEY="your-queue-api-key"
EFFECT_QUEUE_TIMEOUT=20000

# Effect.PubSub Provider
EFFECT_PUBSUB_API_KEY="your-pubsub-api-key"
EFFECT_PUBSUB_TIMEOUT=20000
`

    yield* fs.writeFileString(".env", envContent)

    yield* Console.log("  ✓ Created prisma/schema.prisma")
    yield* Console.log("  ✓ Created prisma/schemas/ directory")
    yield* Console.log("  ✓ Created prisma/migrations/ directory")
    yield* Console.log("  ✓ Created prisma/README.md")
    yield* Console.log("  ✓ Created .env with DATABASE_URL and provider variables")
  })
}
