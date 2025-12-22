/**
 * User Types
 *
 * Shared type definitions for user domain.
 *
 * @module @myorg/feature-user/shared/types
 */

/**
 * Service configuration
 *
 * Add configuration fields as needed for your service
 */
export type UserConfig = Record<string, never>;

// Types are inferred from service implementation.
// The repository's return types flow through naturally.
// See server/service/service.ts for the implementation.