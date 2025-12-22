---
"@samuelho-dev/monorepo-library-generator": patch
---

Fix layer architecture to use upstream infrastructure test layers

- Repository templates now only expose `Live` layer (no duplicate `Test` layer)
- Service templates include `TestLayer` that composes with `DatabaseService.Test`
- Tests use `Service.TestLayer` instead of duplicating test infrastructure
- Fixed biome.json folder ignore patterns for Biome v2.2+
- Generated output now included as example reference
