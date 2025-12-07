# Dotfiles for Effect.ts Code Quality Enforcement

> **Auto-generated**: This document describes the dotfile system for enforcing Effect.ts code quality standards across all generated libraries.

## Overview

This monorepo uses a comprehensive dotfile system to enforce **Effect.ts code style guidelines** across:

1. **Current codebase** - Generator implementation
2. **Generated libraries** - User-created contract, feature, data-access, infra, and provider libraries
3. **Developer environments** - Consistent settings across all IDEs

## Available Dotfiles

### 1. `.editorconfig`

**Purpose**: Cross-IDE editor configuration

**Enforces**:
- UTF-8 encoding
- LF line endings
- 2-space indentation for TypeScript
- 120 character line width
- Trailing whitespace removal
- Final newline insertion

**Required**: ✅ Yes

### 2. `eslint.config.mjs`

**Purpose**: ESLint configuration with Effect.ts-specific rules

**Enforces**:
- Effect.gen with yield* syntax (not yield)
- No deprecated Effect.Do
- Branded types for ID fields
- No explicit return type annotations
- No type assertions (as/angle-bracket)
- Effect dprint formatting rules

**Required**: ✅ Yes

**Key Rules**:
```javascript
// Deprecated Effect.Do
"Effect.Do is deprecated. Use Effect.gen with yield* syntax"

// Missing yield*
"Use yield* (not yield) for Effect operations in Effect.gen"

// Unbranded IDs
"Use branded types for ID fields: type FooId = string & Brand.Brand<'FooId'>"

// Plain Schema.UUID
"Use Schema.String.pipe(Schema.uuid(), Schema.brand('FooId')) for branded ID types"
```

### 3. `tsconfig.json`

**Purpose**: TypeScript strict type checking for Effect.ts

**Enforces**:
- All strict mode flags enabled
- `noUncheckedIndexedAccess` - Prevent undefined access bugs
- `exactOptionalPropertyTypes` - Distinguish undefined vs missing
- `noImplicitReturns` - All code paths return
- `noFallthroughCasesInSwitch` - Prevent switch fallthrough
- `noUnusedLocals` / `noUnusedParameters` - Clean code
- `noImplicitOverride` - Explicit override keyword
- `noPropertyAccessFromIndexSignature` - Type-safe property access

**Required**: ✅ Yes

**Example**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    // ... more strict options
  }
}
```

### 4. `.vscode/settings.json`

**Purpose**: VSCode workspace settings optimized for Effect.ts

**Enforces**:
- Format on save with ESLint
- TypeScript workspace version usage
- Type-only auto imports
- 120 character ruler
- Consistent file encoding (UTF-8, LF)

**Required**: ❌ No (optional, but recommended)

### 5. `.vscode/extensions.json`

**Purpose**: Recommended VSCode extensions

**Includes**:
- ESLint
- Prettier
- Effect.ts language service
- Jest runner
- GitLens
- Path intellisense
- EditorConfig

**Required**: ❌ No (optional, but recommended)

## Usage in Generators

### Automatic Inclusion

All generators automatically include dotfiles when creating new libraries:

```bash
# Contract generator
pnpm nx g @samuelho-dev/monorepo-library-generator:contract my-feature

# Dotfiles are automatically added to libs/my-feature/contract/
```

### CLI Options

Control dotfile behavior with CLI flags:

```bash
# Skip dotfiles entirely
pnpm nx g ... --no-add-dotfiles

# Skip VSCode settings (keep required files only)
pnpm nx g ... --no-include-vscode-settings

# Overwrite existing dotfiles
pnpm nx g ... --overwrite-dotfiles
```

### Programmatic Usage

```typescript
import { addDotfilesToLibrary } from "./utils/shared/dotfile-generation"

// In your generator
export default async function (tree: Tree, options: Schema) {
  // ... create library files ...

  // Add dotfiles
  await Effect.runPromise(
    addDotfilesToLibrary(adapter, {
      projectRoot: options.projectRoot,
      includeVSCodeSettings: true,
      overwrite: false
    })
  )
}
```

## Validation

### Check Dotfile Presence

Use the validation utility to ensure all required dotfiles exist:

```typescript
import { validateDotfiles } from "./utils/dotfiles"

const result = await Effect.runPromise(
  validateDotfiles(fs, "./libs/my-feature/contract")
)

if (!result.valid) {
  console.error("Missing required dotfiles:", result.missing)
}
```

### Generate Dotfile Report

Get a comprehensive report of dotfile status:

```typescript
import { generateDotfileReport } from "./utils/dotfiles"

const report = await Effect.runPromise(
  generateDotfileReport(fs, "./libs/my-feature/contract")
)

console.log(report.summary)
// {
//   requiredPresent: 3,
//   requiredCount: 3,
//   optionalPresent: 2,
//   optionalCount: 2,
//   totalPresent: 5,
//   totalCount: 5
// }
```

## Enforcement Levels

### Level 1: Editor (Soft Enforcement)

**.editorconfig** ensures consistent formatting across all editors automatically.

**Benefit**: Developers see warnings/errors in real-time while coding.

### Level 2: Linting (Medium Enforcement)

**eslint.config.mjs** catches violations during:
- Save (with editor integration)
- Pre-commit hooks (if configured)
- CI/CD pipelines

**Benefit**: Prevents committing non-compliant code.

### Level 3: Type Checking (Strong Enforcement)

**tsconfig.json** with strict flags catches:
- Type safety violations
- Missing return statements
- Unhandled undefined cases
- Unused variables

**Benefit**: Compile-time guarantees of code quality.

### Level 4: CI/CD (Absolute Enforcement)

GitHub Actions runs:
- `pnpm lint` - ESLint checks
- `pnpm type-check` - TypeScript checks
- `pnpm test` - Unit tests

**Benefit**: No non-compliant code reaches main branch.

## Effect.ts Guidelines Enforced

Each dotfile enforces specific Effect.ts guidelines:

| Guideline | Dotfile | Rule |
|-----------|---------|------|
| [General Guidelines](https://effect.website/docs/code-style/guidelines/) | eslint.config.mjs | Explicit lambdas, no point-free for complex functions |
| [Do Notation](https://effect.website/docs/code-style/do/) | eslint.config.mjs | Effect.gen with yield*, no Effect.Do |
| [Branded Types](https://effect.website/docs/code-style/branded-types/) | eslint.config.mjs | Branded IDs, no plain UUID |
| Type Safety | tsconfig.json | noUncheckedIndexedAccess, exactOptionalPropertyTypes |
| Code Quality | tsconfig.json | noImplicitReturns, noUnusedLocals |

## Migration Guide

### Existing Libraries Without Dotfiles

Add dotfiles to existing libraries:

```bash
# From monorepo root
cd libs/my-feature/contract

# Run dotfile generator
pnpm nx g @samuelho-dev/monorepo-library-generator:add-dotfiles .

# Or manually copy from templates
cp src/dotfiles/.editorconfig.template .editorconfig
cp src/dotfiles/eslint.config.template.mjs eslint.config.mjs
cp src/dotfiles/tsconfig.template.json tsconfig.json
mkdir -p .vscode
cp src/dotfiles/.vscode-settings.template.json .vscode/settings.json
cp src/dotfiles/.vscode-extensions.template.json .vscode/extensions.json
```

### Updating Existing Dotfiles

Overwrite with latest templates:

```bash
pnpm nx g @samuelho-dev/monorepo-library-generator:add-dotfiles . --overwrite-dotfiles
```

## Troubleshooting

### ESLint Reports "Effect.Do is deprecated"

**Solution**: Replace with Effect.gen:

```typescript
// ❌ Old (deprecated)
Effect.Do.pipe(
  Effect.bind("user", () => getUser()),
  Effect.map(({ user }) => user)
)

// ✅ New (correct)
Effect.gen(function* () {
  const user = yield* getUser()
  return user
})
```

### ESLint Reports "Use yield* not yield"

**Solution**: Add asterisk to yield:

```typescript
// ❌ Wrong
Effect.gen(function* () {
  const user = yield getUser()  // Missing *
})

// ✅ Correct
Effect.gen(function* () {
  const user = yield* getUser()  // Has *
})
```

### ESLint Reports "Use branded types for ID fields"

**Solution**: Create branded type:

```typescript
// ❌ Wrong
export class User extends Schema.Class<User>("User")({
  id: Schema.UUID,  // Plain string
}) {}

// ✅ Correct
export type UserId = string & Brand.Brand<"UserId">

export const UserId = Schema.String.pipe(
  Schema.uuid(),
  Schema.brand("UserId")
)

export class User extends Schema.Class<User>("User")({
  id: UserId,  // Branded type
}) {}
```

### TypeScript Reports "Property ... may be undefined"

**Reason**: `noUncheckedIndexedAccess` is enabled

**Solution**: Handle undefined case:

```typescript
// ❌ Error: Object is possibly 'undefined'
const user = users[0]

// ✅ Handle undefined
const user = users[0]
if (user === undefined) {
  return Effect.fail(new NotFoundError())
}

// ✅ Use Option
import { Option } from "effect"
const user = Option.fromNullable(users[0])
```

## Customization

### Project-Specific Rules

Extend the base eslint.config.mjs:

```javascript
// eslint.config.mjs in your library
import baseConfig from "../../eslint.config.mjs"

export default [
  ...baseConfig,
  {
    rules: {
      // Add project-specific rules
      "no-console": "error"
    }
  }
]
```

### Disable Specific Rules (Not Recommended)

```javascript
{
  rules: {
    // Disable branded type enforcement (NOT RECOMMENDED)
    "no-restricted-syntax": ["error",
      /* remove branded type rules */
    ]
  }
}
```

## Maintenance

### Updating Templates

When Effect.ts guidelines change:

1. Update templates in `src/dotfiles/`
2. Bump generator version
3. Regenerate libraries or run migration

### Versioning

Dotfiles follow the generator version:

```json
{
  "generator": {
    "name": "@samuelho-dev/monorepo-library-generator",
    "version": "1.2.4",
    "dotfilesVersion": "1.2.4"
  }
}
```

## Related Documentation

- [Effect Code Quality Audit](./EFFECT_CODE_QUALITY_AUDIT.md)
- [Effect Patterns](./EFFECT_PATTERNS.md)
- [Architecture Overview](./ARCHITECTURE_OVERVIEW.md)

## External Resources

- [Effect.ts Code Style Guidelines](https://effect.website/docs/code-style/guidelines/)
- [Effect.ts Dual APIs](https://effect.website/docs/code-style/dual/)
- [Effect.ts Branded Types](https://effect.website/docs/code-style/branded-types/)
- [Effect.ts Pattern Matching](https://effect.website/docs/code-style/pattern-matching/)
- [Effect.ts Do Notation](https://effect.website/docs/code-style/do/)
