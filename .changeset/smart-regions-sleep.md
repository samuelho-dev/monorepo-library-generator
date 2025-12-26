---
"@samuelho-dev/monorepo-library-generator": patch
---

fix: centralize naming conventions and fix linter false positives

- Changed `name` in createNamingVariants to be camelCase for JavaScript identifiers
- Updated metadata computation to use nameVariants.name instead of raw input
- Fixed templates to use `fileName` for package paths and `name`/`propertyName` for JS identifiers
- Fixed projections-builder.template.ts syntax error (missing newlines between interface properties)
- Fixed linter to skip comment lines for yield-star-required check (was triggering on doc comments)
- Updated test expectations for observability file structure (sdk.ts removed, presets.ts added)
- Updated test expectations for RPC file split (rpc.ts → rpc-errors.ts, rpc-definitions.ts)
