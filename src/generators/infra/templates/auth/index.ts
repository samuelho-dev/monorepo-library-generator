/**
 * Auth Infrastructure Templates
 *
 * Generates core auth infrastructure files that consume provider-supabase.
 * Provides session verification, user lookup, and AuthVerifier implementation.
 *
 * Contract-First Architecture:
 * - infra-rpc provides AuthVerifier interface (Interface Segregation)
 * - infra-auth implements AuthVerifier via Layer
 * - Middleware is consolidated in infra-rpc (not here)
 *
 * @module monorepo-library-generator/infra-templates/auth
 */

export { generateAuthIndexFile } from "./auth-index.template"
export { generateAuthErrorsFile } from "./errors.template"
export { generateAuthServiceFile } from "./service.template"
export { generateAuthTypesFile } from "./types.template"
