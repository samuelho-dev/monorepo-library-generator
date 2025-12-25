/**
 * Auth Contract Types
 *
 * Type-only exports for zero runtime overhead.

Import from this file when you only need types:
```typescript
import type { CurrentUserData, AuthError } from "@samuelho-dev/contract-auth/types"
```
 *
 * @module @samuelho-dev/contract-auth/types
 */

// ============================================================================
// Schema Types
// ============================================================================

export type {
  AuthenticatedUserData,
  AuthMethod,
  AuthSession,
  CurrentUserData,
  KnownService,
  ServiceIdentity
} from "./lib/schemas"

// ============================================================================
// Error Types
// ============================================================================

export type { AuthContractError, AuthErrorCode, ServiceAuthErrorCode } from "./lib/errors"

// Note: AuthError and ServiceAuthError are classes, not just types
// Import from main entry point if you need the class

// ============================================================================
// Port Types
// ============================================================================

export type { AuthProviderInterface, AuthVerifierInterface, ServiceAuthVerifierInterface } from "./lib/ports"

// ============================================================================
// Middleware Types
// ============================================================================

export type {
  HandlerContext,
  RequestMetadata,
  RouteType,
  RpcWithRouteTag,
  ServiceHandlerContext
} from "./lib/middleware"
