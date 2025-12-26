---
"@samuelho-dev/monorepo-library-generator": minor
---

Comprehensive type safety improvements for Effect templates

- Add explicit return type annotations to prevent TypeScript "cannot be named" errors
- Fix tsconfig.json generator to include `module: "ESNext"` and `moduleResolution: "bundler"` for verbatimModuleSyntax compatibility
- Fix Queue/PubSub Redis layers to use `Effect.orDie` for provider errors
- Fix Jobs Queue context leak by capturing DatabaseService at layer construction
- Fix Supabase provider type issues (AuthOperation type, Storage upload result)
- Update handlers template to use `Layer.mergeAll` for combined handlers (fixes Layer spread issue)
