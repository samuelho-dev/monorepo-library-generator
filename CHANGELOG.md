# @samuelho-dev/monorepo-library-generator

## 1.3.0

### Minor Changes

- **Phase 3: Intelligent Dotfile Merging & Code Quality Improvements**

  ## New Features

  ### Intelligent Dotfile Merging

  - **Added intelligent merge system** for dotfiles with existing user configurations
  - Effect.ts code quality rules now merge with (rather than replace) user configs
  - File-type specific merge strategies:
    - `.editorconfig`: Override (Effect.ts replaces)
    - `tsconfig.json`: Deep merge with Effect.ts precedence
    - `eslint.config.mjs`: Append strategy with duplicate detection
    - `.vscode/settings.json`: Deep merge
    - `.vscode/extensions.json`: Array union (deduplicated)
  - Graceful error handling with automatic fallback to Effect.ts templates
  - Merge statistics logging for transparency

  ### New Modules

  - `src/utils/dotfile-merge.ts`: Core merge logic (~400 lines)
    - Pure functions for testability
    - Comment stripping for JSON files
    - Effect.ts rule counting
  - `test/dotfile-merge.test.ts`: Comprehensive test suite
    - 38 unit tests (all passing)
    - Pure function tests + Effect integration tests
    - Edge case coverage

  ### Generator Enhancements

  All 5 generators now support merge options:

  - `addDotfiles`: Enable/disable dotfile generation (default: true)
  - `includeVSCodeSettings`: Include .vscode/\* files (default: true)
  - `overwriteDotfiles`: Force overwrite existing files (default: false)
  - Implicit merge: true by default

  ## Code Quality Improvements

  ### Anti-Pattern Elimination

  - **Removed all underscore-prefixed unused variables** from codebase
  - Properly fixed unused parameters instead of suppressing warnings
  - Updated all function signatures and call sites

  ### ESLint Configuration

  - **Added anti-pattern prevention rule**: Underscore prefixes now forbidden
  - Updated `@typescript-eslint/no-unused-vars` to disallow `_` prefix workarounds
  - Forces proper code fixes instead of warning suppression

  ### Type Safety

  - Removed explicit return type annotations (TypeScript infers better types)
  - Replaced `as const` with `satisfies` where appropriate
  - Eliminated `as any` type assertions
  - Better handling of `exactOptionalPropertyTypes`

  ### Infrastructure

  - Re-exported `FileSystemAdapter` type from `tree-adapter.ts` for external use
  - Updated `dotfiles.ts` to use `FileSystemAdapter` interface
  - Fixed parameter types throughout dotfile system

  ## Breaking Changes

  None - all changes are backward compatible. Existing generator invocations continue to work unchanged.

  ## Migration Guide

  ### For New Projects

  No action required - dotfiles are automatically generated with Effect.ts rules.

  ### For Existing Projects

  First run will intelligently merge user configs with Effect.ts templates:

  ```typescript
  await generateLibrary(tree, {
    name: "my-lib",
    addDotfiles: true, // Enable dotfile generation
    includeVSCodeSettings: true, // Include .vscode/* files
  });

  // Logs:
  // ✓ Merged tsconfig.json (3 Effect.ts rules applied)
  // ✓ Merged eslint.config.mjs (5 Effect.ts rules applied)
  // ✓ Copied .editorconfig
  ```

  ### For Force Overwrite

  ```typescript
  await generateLibrary(tree, {
    name: "my-lib",
    overwriteDotfiles: true, // Force overwrite existing files
  });
  ```

  ## Documentation

  - Added `docs/PHASE_3_DOTFILE_MERGE_SUMMARY.md`: Complete implementation documentation
  - Updated all generator documentation with new options
  - Added inline JSDoc comments for all new functions

  ## Testing

  - 38 new unit tests (all passing)
  - Pure function tests for merge logic
  - Effect integration tests with `it.scoped()`
  - Edge case coverage (empty files, malformed JSON, etc.)
  - All existing tests continue to pass

  ## Build & Lint

  - ✅ Build succeeds with no errors
  - ✅ Lint succeeds (0 errors in production code)
  - TypeScript strict mode fully supported

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
