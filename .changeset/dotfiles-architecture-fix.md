---
"@samuelho-dev/monorepo-library-generator": minor
---

**Dotfiles Architecture Fix & Workspace Initialization**

## Breaking Changes

- Removed `includeVSCodeSettings` option from all generator schemas
- Libraries no longer generate workspace-level dotfiles (`.editorconfig`, `.vscode/*`)

## New Features

### CLI Command: `init-workspace`
Initialize workspace-level dotfiles at repository root:
```bash
npx mlg init-workspace
```

Creates:
- `.editorconfig` - Editor formatting rules
- `.vscode/settings.json` - VSCode workspace settings
- `.vscode/extensions.json` - Recommended extensions

### MCP Tool: `init_workspace`
AI agents can now initialize workspace dotfiles via MCP protocol with dry-run support.

## Architectural Improvements

**Workspace-Level Dotfiles (created once at root):**
- `.editorconfig` - Editor configuration
- `.vscode/settings.json` - VSCode settings
- `.vscode/extensions.json` - Recommended extensions

**Library-Level Dotfiles (created per library):**
- `eslint.config.mjs` - Library-specific linting rules
- `tsconfig.json` - Library-specific TypeScript config

## Migration Guide

### Before (v1.3.0)
Libraries incorrectly included workspace-level dotfiles:
```
libs/contract/product/
├── .editorconfig          ❌ Workspace file (duplicated)
├── .vscode/               ❌ Workspace directory (duplicated)
├── eslint.config.mjs      ✅ Library file
└── tsconfig.json          ✅ Library file
```

### After (v1.3.1+)
Clean separation of concerns:
```
# Workspace root
.editorconfig              ✅ Workspace-level (create with init-workspace)
.vscode/                   ✅ Workspace-level (create with init-workspace)

# Library
libs/contract/product/
├── eslint.config.mjs      ✅ Library-level (auto-generated)
└── tsconfig.json          ✅ Library-level (auto-generated)
```

### For Existing Projects

1. Initialize workspace dotfiles once:
   ```bash
   npx mlg init-workspace
   ```

2. Clean up existing library dotfiles (optional):
   ```bash
   find libs -name ".editorconfig" -delete
   find libs -name ".vscode" -type d -exec rm -rf {} +
   ```

3. New libraries will automatically have correct dotfiles

## Research

Based on research, Nx does NOT manage workspace-level dotfiles - developers must create them manually. This feature automates that process while maintaining proper separation of concerns.

## Documentation

- `docs/DOTFILES_ARCHITECTURE_FIX.md` - Complete architectural details
- `docs/WORKSPACE_INITIALIZATION.md` - Usage guide and best practices

## Test Coverage

✅ All 205 tests passing
✅ Manual verification of generated libraries
✅ Workspace initialization tested
