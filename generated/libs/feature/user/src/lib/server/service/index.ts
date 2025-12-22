/**
 * User Service
 *
 * Service barrel exports with granular operation support.

Import options (from most optimal to most convenient):

1. Full service:
   import { UserService } from '@myorg/feature-user/server/service'

2. Type-only:
   import type { UserServiceInterface } from '@myorg/feature-user/server/service'

3. Package barrel (largest):
   import { UserService } from '@myorg/feature-user/server'
 *
 * @module @myorg/feature-user/server/service
 */


// ============================================================================
// Re-export service interface and tag
// ============================================================================


export { UserService } from "./service";
export type { UserServiceInterface } from "./service";