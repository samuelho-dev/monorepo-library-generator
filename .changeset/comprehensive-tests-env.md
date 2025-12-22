---
"monorepo-library-generator": minor
---

## Comprehensive Test Coverage for All Library Types

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
