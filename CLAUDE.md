---
scope: /
updated: 2025-12-27
relates_to:
  - docs/ARCHITECTURE_OVERVIEW.md
  - docs/EFFECT_PATTERNS.md
  - docs/NX_STANDARDS.md
---

# Monorepo Library Generator

Architectural guidance for Claude Code working with this Effect-based library generator.

## Purpose

This is a **code generator** that creates production-ready TypeScript libraries for Effect-native monorepos. It generates 5 library types following Effect 3.0+ best practices and works with any monorepo tool (Nx, pnpm, Yarn, Turborepo).

## Architecture Overview

```
monorepo-library-generator/
+-- src/                      # Generator source code
|   +-- cli/                  # CLI commands and interactive UI
|   +-- generators/           # 5 library type generators
|   |   +-- contract/         # Domain boundaries generator
|   |   +-- data-access/      # Repository pattern generator
|   |   +-- feature/          # Business logic generator
|   |   +-- infra/            # Infrastructure services generator
|   |   +-- provider/         # External SDK wrapper generator
|   |   +-- shared/           # Shared utilities across generators
|   |   +-- core/             # Core generation infrastructure
|   |   +-- env/              # Environment library generator
|   +-- templates/            # Template system
|   |   +-- ast/              # AST-based code generation
|   |   +-- definitions/      # Template definitions per type
|   |   +-- fragments/        # Reusable code fragments
|   |   +-- registry/         # Template registry
|   +-- infrastructure/       # Code validation, file operations
|   +-- mcp/                  # MCP server for AI integration
|   +-- utils/                # Naming, metadata utilities
+-- libs/                     # Generated example libraries
|   +-- contract/             # Contract libraries (auth, user)
|   +-- data-access/          # Data-access libraries (user)
|   +-- feature/              # Feature libraries (user)
|   +-- infra/                # Infrastructure libraries
|   +-- provider/             # Provider libraries
|   +-- types/                # Type libraries (database)
|   +-- env/                  # Environment configuration
+-- docs/                     # Architecture documentation
+-- prisma/                   # Database schema
```

## Key Patterns

| Pattern | Location | Purpose |
|---------|----------|---------|
| Context.Tag services | generators/*/templates/ | Dependency injection |
| Layer.scoped | All providers | Resource cleanup |
| Data.TaggedError | All error types | Type-safe errors |
| Schema.TaggedError | RPC errors | Serializable errors |
| Effect.gen | All services | Generator syntax |
| Static layers | Service classes | Live, Test, Dev, Auto |

## Library Type Quick Reference

| Type | Purpose | Depends On |
|------|---------|------------|
| contract | Domain interfaces, entities, errors | None (pure domain) |
| data-access | Repository implementations | contract, infra-database, provider-kysely |
| feature | Business logic, RPC handlers | data-access, contract, infra-*, provider-* |
| infra | Cross-cutting services | provider-* |
| provider | External SDK wrappers | External packages |

## Generator Commands

```bash
# Generate libraries
mlg contract <name> [--includeCQRS] [--includeRPC]
mlg data-access <name>
mlg feature <name> [--platform universal] [--includeRPC] [--includeCQRS]
mlg infra <name> [--platform node]
mlg provider <name> --externalService <service>

# Development
pnpm test                     # Run tests
pnpm build                    # Build CLI
pnpm typecheck                # Type check
```

## Critical Conventions

1. **Effect Patterns**:
   - Use `yield*` in Effect.gen (not `yield`)
   - Use Data.TaggedError for domain errors
   - Use Schema.TaggedError for RPC errors (serializable)
   - Use Layer.scoped with Effect.addFinalizer for resources

2. **Import Organization**:
   - Type-only imports: `import type { X } from '...'`
   - Group by: effect -> external -> internal -> types
   - Use `/types` subpath for zero-runtime imports

3. **Naming Conventions**:
   - Libraries: `@scope/{type}-{name}` (e.g., `@scope/contract-user`)
   - Services: `{Name}Service` with Context.Tag
   - Layers: `{Name}Live`, `{Name}Test`, `{Name}Dev`, `{Name}Auto`
   - Errors: `{Name}Error` with Data.TaggedError

4. **File Structure**:
   - `index.ts` - Public exports
   - `types.ts` - Type-only exports
   - `lib/` - Implementation files
   - `lib/shared/` - Shared utilities

## Testing

```bash
pnpm test                     # All tests
pnpm vitest run src/          # Generator tests only
pnpm vitest run libs/         # Generated library tests
```

## For Future Claude Code Instances

- [ ] Read `docs/EFFECT_PATTERNS.md` for Effect conventions
- [ ] Check `docs/NX_STANDARDS.md` for naming rules
- [ ] Review `libs/` examples before modifying generators
- [ ] Run `pnpm typecheck` after template changes
- [ ] Generated CLAUDE.md files are in each `libs/*/*/` directory
- [ ] Template definitions are in `src/templates/definitions/`
- [ ] AST transformations are in `src/templates/ast/`
