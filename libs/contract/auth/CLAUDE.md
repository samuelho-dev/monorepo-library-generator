---
scope: libs/contract/auth/
updated: 2025-12-27
relates_to:
  - ../../CLAUDE.md
  - ../../../docs/CONTRACT.md
  - ../../../docs/EFFECT_PATTERNS.md
---

# @samuelho-dev/contract-auth

Auth contract - single source of truth for auth types

## AI Agent Reference

This is a **contract library** defining auth types that are shared across the entire monorepo.

### CRITICAL: Single Source of Truth

This library defines the canonical auth types. Other libraries MUST import from here:

- **infra-rpc**: Imports `CurrentUserData`, `CurrentUser`, `AuthError`, `RouteTag`
- **infra-auth**: Imports `AuthVerifier` port and implements it
- **provider-supabase**: Maps to `CurrentUserData` at boundaries

### Structure

- **lib/schemas.ts**: `CurrentUserData`, `AuthMethod`, `AuthSession`, `ServiceIdentity`
- **lib/errors.ts**: `AuthError`, `ServiceAuthError` (Schema.TaggedError)
- **lib/ports.ts**: `AuthVerifier`, `AuthProvider`, `ServiceAuthVerifier`
- **lib/middleware.ts**: `RouteTag`, `RouteType`, `CurrentUser`, `ServiceContext`

### Usage

```typescript
// In RPC handlers (protected routes):
import { CurrentUser } from "@samuelho-dev/contract-auth"

const handler = Effect.gen(function*() {
  const user = yield* CurrentUser
  // user.id, user.email, user.roles available
})

// In contract RPC definitions:
import { RouteTag, RouteType } from "@samuelho-dev/contract-auth"

export class GetCurrentUser extends Rpc.make("GetCurrentUser", { ... }) {
  static readonly [RouteTag]: RouteType = "protected"
}

// In infra-auth:
import { AuthVerifier, CurrentUserDataSchema } from "@samuelho-dev/contract-auth"

export const AuthVerifierLive = Layer.effect(AuthVerifier, Effect.gen(function*() {
  // Implement verification...
}))
```

## For Future Claude Code Instances

- [ ] This is the SINGLE SOURCE OF TRUTH for auth types
- [ ] Other libraries MUST import from here, never redefine
- [ ] Use Schema.TaggedError for RPC-serializable errors
- [ ] Use Data.TaggedError for domain errors
- [ ] Check `infra-rpc` and `infra-auth` for integration patterns
