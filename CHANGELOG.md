# @samuelho-dev/monorepo-library-generator

## 1.2.4

### Patch Changes

- Fix build system reliability and resolve all linting errors across generator templates

  - Add prebuild cleanup script for consistent 130-file compilation
  - Fix Effect.orDie type inference (remove unnecessary type assertions)
  - Remove explicit return type annotations from all templates
  - Fix unused parameter naming across all generators
  - Update vitest config for @effect/dprint compliance
  - Fix infrastructure generation issues
  - All 159 tests passing, 0 linting errors
