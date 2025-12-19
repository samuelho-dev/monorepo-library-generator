---
"@samuelho-dev/monorepo-library-generator": patch
---

Fix mlg CLI packaging for npm distribution

- Generate dist/package.json with proper bin field and dependencies
- Update flake.nix to use Bun runtime and published npm package
- Fix release workflow to use correct repository owner
- Include all required dependencies (effect, @effect/*, @nx/devkit, nx)
