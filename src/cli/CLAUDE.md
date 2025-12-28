---
scope: src/cli/
updated: 2025-12-28
relates_to:
  - ../../CLAUDE.md
  - ../../docs/GENERATOR.md
---

# CLI Module

Command-line interface for the monorepo library generator.

## Purpose

Provides both interactive TUI and non-interactive command-line interfaces for generating Effect-based libraries. Built with @effect/cli for commands and React Ink for the terminal UI.

## Architecture Overview

```
src/cli/
+-- index.ts              # CLI entry point, command definitions
+-- commands/             # Command implementations
|   +-- init.ts           # Workspace initialization
+-- core/                 # Core CLI logic
|   +-- config/           # Library type configurations
|   +-- operations/       # Generation operations
|   +-- types/            # Type definitions
+-- generators/           # Generator implementations
|   +-- contract.ts       # Contract library generator
|   +-- data-access.ts    # Data-access library generator
|   +-- feature.ts        # Feature library generator
|   +-- infra.ts          # Infrastructure library generator
|   +-- provider.ts       # Provider library generator
|   +-- domain.ts         # Domain slice generator
+-- tui/                  # Terminal UI (React Ink)
|   +-- App.tsx           # Main TUI application
|   +-- components/       # Reusable UI components
|   +-- hooks/            # React hooks
|   +-- layouts/          # Panel layout orchestration
|   +-- panels/           # UI panels (Types, Options, Preview)
|   +-- state/            # State management (reducer pattern)
|   +-- theme/            # Colors and styling
+-- help/                 # Help text generation
+-- progress/             # Progress indicators
+-- shared/               # Shared utilities
```

## Key Patterns

| Pattern | Location | Purpose |
|---------|----------|---------|
| @effect/cli Commands | index.ts | Type-safe CLI parsing |
| React Ink | tui/ | Terminal UI rendering |
| Reducer Pattern | tui/state/ | TUI state management |
| Panel Architecture | tui/panels/ | Modular UI components |
| Effect.gen | generators/ | Generator composition |

## Module Reference

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| index.ts | CLI entry | Command definitions |
| tui/App.tsx | TUI root | App component |
| tui/state/types.ts | State types | TUIState, TUIAction |
| core/config/ | Library configs | LIBRARY_TYPES |
| generators/* | Generator commands | generate* functions |

## Adding/Modifying

### Adding a new library type:

1. Add type config to `core/config/library-types.ts`
2. Create generator in `generators/{type}.ts`
3. Add command to `index.ts`
4. Update TUI panels if needed

### Modifying TUI:

1. State changes go in `tui/state/reducer.ts`
2. New panels in `tui/panels/`
3. Shared components in `tui/components/`
4. Keyboard shortcuts in `tui/layouts/PanelLayout.tsx`

## For Future Claude Code Instances

- [ ] CLI uses @effect/cli for command parsing
- [ ] TUI uses React Ink with reducer pattern
- [ ] Panels: Types (1), Options (2), Preview (3)
- [ ] G (capital) to generate, q to quit
- [ ] Library types defined in `core/config/library-types.ts`
- [ ] Each generator is a separate file in `generators/`
