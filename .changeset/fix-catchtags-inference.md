---
"@samuelho-dev/monorepo-library-generator": patch
---

Fix catchTags type inference for Effect error channels

**Problem**: TypeScript was inferring `never` for catchTags handlers because errors weren't properly in the Effect error channel.

**Solution**:
- Service template now adds existence checks before update/delete that explicitly throw `NotFoundError`
- Handlers template now catches `DatabaseInternalError` in addition to domain errors
- Removed unused error imports (catchTags uses string literals, not runtime types)
- Uses centralized `env` module instead of direct `process.env` access

**Breaking Changes**: None - this is a fix for generated code that was previously not type-safe.
