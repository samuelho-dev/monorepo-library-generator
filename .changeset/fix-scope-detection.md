---
"@samuelho-dev/monorepo-library-generator": patch
---

fix: detect workspace scope dynamically instead of caching at module load

- Changed workspace scope detection to run dynamically on each access instead of caching at module load time
- This fixes an issue where the CLI would use the wrong scope when running from a different workspace than where the CLI was installed
- Previously, running `mlg init` from `generated/` would use the parent project's scope (`@samuelho-dev`) instead of the target workspace's scope (`@myorg`)
- Generated libraries now correctly use the scope from the target workspace's package.json
