# @custom-repo/feature-payment

> AI-optimized reference for Payment

## Quick Reference

**Purpose**: Payment
**Platform**: universal
**Library Type**: feature

## Import Patterns

```typescript
// Main exports
import { Payment } from '@custom-repo/feature-payment';

// Server exports
import { PaymentLive } from '@custom-repo/feature-payment/server';

// Client exports
import type { PaymentType } from '@custom-repo/feature-payment/client';

```

## Architecture

TODO: Document architecture patterns

## Common Commands

```bash
# Build
pnpm exec nx build feature-payment

# Test
pnpm exec nx test feature-payment

# Type check
pnpm exec nx typecheck feature-payment

# Lint
pnpm exec nx lint feature-payment
```

## Incremental Builds

This library uses TypeScript project references for incremental compilation:

```bash
# Build with incremental compilation (recommended)
pnpm exec nx build feature-payment --batch

# Build all projects with incremental compilation
pnpm exec nx run-many --target=build --all --batch

# Build affected projects with incremental compilation
pnpm exec nx affected --target=build --batch
```

**Why --batch?**
- Enables TypeScript's project references mode
- Only rebuilds changed files and their dependents
- Dramatically faster for large monorepos
- Preserves build cache between runs (clean: false)

**How it works:**
1. TypeScript reads tsconfig.lib.json with `composite: true`
2. Generates .tsbuildinfo file tracking compilation state
3. Follows `references` to dependent libraries
4. Only recompiles what changed

**See also:** [Nx TypeScript Batch Mode](https://nx.dev/recipes/tips-n-tricks/enable-tsc-batch-mode)

## Import Resolution

This library uses **pnpm workspace packages** for imports, not TypeScript path aliases:

```typescript
// ✅ Correct: Import via package name
import { PaymentService } from '@custom-repo/feature-payment/server';

// ❌ Wrong: Path aliases are NOT used
// import { PaymentService } from 'libs/...';
```

**How imports work:**
1. package.json defines exports via `exports` field
2. pnpm workspace resolves `@custom-repo/*` packages
3. TypeScript follows package.json exports for types
4. No tsconfig.base.json paths needed

**See also:** NX_STANDARDS.md for pnpm workspace conventions
