/**
 * Auth Infrastructure Templates
 *
 * Generates core auth infrastructure files that consume provider-supabase.
 * Provides session verification, user lookup, and RPC middleware integration.
 *
 * @module monorepo-library-generator/infra-templates/auth
 */

export { generateAuthIndexFile } from './auth-index.template';
export { generateAuthErrorsFile } from './errors.template';
export { generateAuthMiddlewareFile } from './middleware.template';
export { generateAuthServiceFile } from './service.template';
export { generateAuthTypesFile } from './types.template';
