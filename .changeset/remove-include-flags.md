---
"@samuelho-dev/monorepo-library-generator": minor
---

Remove includeRPC and includeCache flags - RPC and cache are now always generated

- RPC layer is always generated for feature libraries
- Cache integration is always included in data-access libraries
- Removed conditional flags and CLI options for these features
- Simplified domain generation with consistent output
- Removed explicit return types and type assertions from generators
