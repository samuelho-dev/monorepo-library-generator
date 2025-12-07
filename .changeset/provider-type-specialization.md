---
"@samuelho-dev/monorepo-library-generator": minor
---

feat: add provider type specialization - support for CLI, HTTP, and GraphQL providers

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
