# Documentation Index

Central catalog of all documentation in the Monorepo Library Generator.

## Quick Navigation

| Component | README | CLAUDE | Description |
|-----------|--------|--------|-------------|
| Root | [README](../README.md) | [CLAUDE](../CLAUDE.md) | Repository overview and AI guidance |
| docs/ | [README](./README.md) | - | Documentation hub |

### Generated Libraries (libs/)

| Library | README | CLAUDE | Description |
|---------|--------|--------|-------------|
| contract-auth | - | [CLAUDE](../libs/contract/auth/CLAUDE.md) | Auth contract - single source of truth |
| contract-user | [README](../libs/contract/user/README.md) | [CLAUDE](../libs/contract/user/CLAUDE.md) | User domain contract |
| data-access-user | [README](../libs/data-access/user/README.md) | [CLAUDE](../libs/data-access/user/CLAUDE.md) | User repository implementation |
| feature-user | [README](../libs/feature/user/README.md) | [CLAUDE](../libs/feature/user/CLAUDE.md) | User feature service |
| infra-auth | [README](../libs/infra/auth/README.md) | [CLAUDE](../libs/infra/auth/CLAUDE.md) | Auth infrastructure |
| infra-cache | [README](../libs/infra/cache/README.md) | [CLAUDE](../libs/infra/cache/CLAUDE.md) | Cache orchestration |
| infra-database | [README](../libs/infra/database/README.md) | [CLAUDE](../libs/infra/database/CLAUDE.md) | Database orchestration |
| infra-observability | [README](../libs/infra/observability/README.md) | [CLAUDE](../libs/infra/observability/CLAUDE.md) | Logging and metrics |
| infra-pubsub | [README](../libs/infra/pubsub/README.md) | [CLAUDE](../libs/infra/pubsub/CLAUDE.md) | PubSub orchestration |
| infra-queue | [README](../libs/infra/queue/README.md) | [CLAUDE](../libs/infra/queue/CLAUDE.md) | Queue orchestration |
| infra-rpc | [README](../libs/infra/rpc/README.md) | [CLAUDE](../libs/infra/rpc/CLAUDE.md) | RPC infrastructure |
| infra-storage | [README](../libs/infra/storage/README.md) | [CLAUDE](../libs/infra/storage/CLAUDE.md) | Storage infrastructure |
| provider-kysely | [README](../libs/provider/kysely/README.md) | [CLAUDE](../libs/provider/kysely/CLAUDE.md) | Kysely database provider |
| provider-opentelemetry | [README](../libs/provider/opentelemetry/README.md) | [CLAUDE](../libs/provider/opentelemetry/CLAUDE.md) | OpenTelemetry provider |
| provider-redis | [README](../libs/provider/redis/README.md) | [CLAUDE](../libs/provider/redis/CLAUDE.md) | Redis provider |
| provider-supabase | [README](../libs/provider/supabase/README.md) | [CLAUDE](../libs/provider/supabase/CLAUDE.md) | Supabase provider |
| types-database | - | [CLAUDE](../libs/types/database/CLAUDE.md) | Generated database types |
| env | [README](../libs/env/README.md) | - | Environment configuration |

### Generators (src/generators/)

| Generator | README | Description |
|-----------|--------|-------------|
| contract | [README](../src/generators/contract/README.md) | Contract library generator |
| data-access | [README](../src/generators/data-access/README.md) | Data-access library generator |
| feature | [README](../src/generators/feature/README.md) | Feature library generator |
| infra | [README](../src/generators/infra/README.md) | Infrastructure library generator |
| provider | [README](../src/generators/provider/README.md) | Provider library generator |

## By Category

### Architecture & Patterns

- [Architecture Overview](./ARCHITECTURE_OVERVIEW.md) - System architecture and design
- [Effect Patterns](./EFFECT_PATTERNS.md) - Effect-TS patterns and best practices
- [Export Patterns](./EXPORT_PATTERNS.md) - Platform-aware export conventions
- [Nx Standards](./NX_STANDARDS.md) - Naming conventions and workspace organization
- [Layer Naming Standards](./LAYER_NAMING_STANDARDS.md) - Official layer naming conventions

### Library Type Guides

- [Contract Libraries](./CONTRACT.md) - Domain interfaces and ports
- [Data-Access Libraries](./DATA-ACCESS.md) - Repository implementations
- [Feature Libraries](./FEATURE.md) - Business logic and services
- [Infrastructure Libraries](./INFRA.md) - Cross-cutting concerns
- [Provider Libraries](./PROVIDER.md) - External service adapters

### Testing & Validation

- [Testing Patterns](./TESTING_PATTERNS.md) - @effect/vitest testing guide
- [Library Validation](./LIBRARY_VALIDATION.md) - Validation and compliance

### Guides

- [Examples](./EXAMPLES.md) - End-to-end usage examples
- [MCP Usage Guide](./MCP_USAGE_GUIDE.md) - MCP server integration
- [Generator Guide](./GENERATOR.md) - Generator development

## Statistics

| Metric | Count |
|--------|-------|
| Total README.md files | 23 |
| Total CLAUDE.md files | 18 |
| Libraries with full docs | 17 |
| Generator docs | 5 |

---

*Last updated: 2025-12-27*
