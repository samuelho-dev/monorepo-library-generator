/**
 * User Services
 *
 * Services barrel exports for User domain.

Import options:

1. Main service:
   import { UserService } from '@samuelho-dev/feature-user/server/services'

2. Type-only:
   import type { UserServiceInterface } from '@samuelho-dev/feature-user/server/services'

3. Sub-modules:
   import { AuthenticationService, ProfileService } from '@samuelho-dev/feature-user/server/services'
 *
 * @module @samuelho-dev/feature-user/server/services
 */


// ============================================================================
// Main Service
// ============================================================================


export { UserService } from "./service";
export type { UserServiceInterface } from "./service";

// ============================================================================
// Sub-Module Services
// ============================================================================


export { AuthenticationService, AuthenticationLive, AuthenticationTest } from "./authentication";
export { ProfileService, ProfileLive, ProfileTest } from "./profile";
