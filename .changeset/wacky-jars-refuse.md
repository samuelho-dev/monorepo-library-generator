---
"@samuelho-dev/monorepo-library-generator": patch
---

Fix Schema patterns and add resilient npm publish script

- Remove redundant parseX/encodeX helpers from contract entity templates
- Fix client-hook template to use @effect-atom/atom instead of @effect-rx
- Add typed SDK patterns for Supabase and Redis providers
- Add publish script that skips already-published versions
- Update EFFECT_PATTERNS.md with Schema pattern selection guide
