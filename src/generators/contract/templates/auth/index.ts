/**
 * Contract Auth Templates
 *
 * Templates for generating the contract-auth library which is the
 * single source of truth for auth types across the monorepo.
 *
 * @module monorepo-library-generator/contract/auth
 */

export { generateAuthErrorsFile } from './errors.template'
export { generateAuthIndexFile } from './index.template'
export { generateAuthMiddlewareFile } from './middleware.template'
export { generateAuthPortsFile } from './ports.template'
export { generateAuthSchemasFile } from './schemas.template'
export { generateAuthTypesFile } from './types.template'
