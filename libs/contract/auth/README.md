# @samuelho-dev/contract-auth

Auth domain contracts - single source of truth for authentication types.

## Overview

This contract library defines the canonical auth types shared across the entire monorepo. Other libraries MUST import from here rather than redefining auth types.

## Contents

- **Schemas**: `CurrentUserData`, `AuthMethod`, `AuthSession`, `ServiceIdentity`
- **Errors**: `AuthError`, `ServiceAuthError` (Schema.TaggedError for RPC)
- **Ports**: `AuthVerifier`, `AuthProvider`, `ServiceAuthVerifier`
- **Middleware**: `RouteTag`, `RouteType`, `CurrentUser`, `ServiceContext`

## Usage

```typescript
// In RPC handlers (protected routes)
import { CurrentUser } from "@samuelho-dev/contract-auth"

const handler = Effect.gen(function*() {
  const user = yield* CurrentUser
  // user.id, user.email, user.roles available
})

// In contract RPC definitions
import { RouteTag, RouteType } from "@samuelho-dev/contract-auth"

export class GetCurrentUser extends Rpc.make("GetCurrentUser", { ... }) {
  static readonly [RouteTag]: RouteType = "protected"
}
```

## Development

```bash
# Build
nx build contract-auth

# Typecheck
nx typecheck contract-auth
```

## Related Documentation

- [CLAUDE.md](./CLAUDE.md) - Architecture details
- [Effect Patterns](../../../docs/EFFECT_PATTERNS.md) - Effect conventions
