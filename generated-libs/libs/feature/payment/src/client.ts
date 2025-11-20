/**
 * Client-side exports
 *
 * Browser-safe exports. No server-only dependencies.
 * NO secrets, NO environment variables, NO server logic.
 */

// Export only types and client-safe utilities
export type * from './lib/shared/types';
export type * from './lib/shared/errors';

// Client-side implementation
export * from './lib/client/hooks';
export * from './lib/client/atoms';
