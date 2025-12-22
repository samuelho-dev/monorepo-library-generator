/**
 * User Feature Library
 *
 * Public API for User feature.

This is the main entry point for the feature library.
It exports only universal types and errors that are safe for all platforms.

Platform-specific exports:
  - import { ... } from '@myorg/feature-{name}/server'  # Server-side service
  - import { ... } from '@myorg/feature-{name}/client'  # Client-side hooks/atoms
  - import { ... } from '@myorg/feature-{name}/edge'    # Edge middleware

Best Practice: Use explicit platform imports to ensure proper tree-shaking
and avoid bundling server code in client bundles.
 *
 */

// ============================================================================
// Shared Types
// ============================================================================

// Domain types (universal)

export type * from "./lib/shared/types";

// ============================================================================
// Error Types
// ============================================================================

// Error definitions (universal)

export type * from "./lib/shared/errors";

// ============================================================================
// RPC Definitions (Universal)
// ============================================================================

// RPC schemas are universal and can be used on any platform

export type * from "./lib/rpc/rpc";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Platform-Specific Imports

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

//

// For platform-specific code, use explicit imports:

//

// SERVER (Node.js):

//   import { UserService } from '@myorg/feature-user/server';

//

// CLIENT (Browser):

//   import { useUser } from '@myorg/feature-user/client';

//

// EDGE (Cloudflare Workers, Vercel Edge):

//   import { userMiddleware } from '@myorg/feature-user/edge';

//

// This pattern ensures:

//   ✓ No server code in client bundles

//   ✓ Optimal tree-shaking

//   ✓ Clear platform boundaries

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
