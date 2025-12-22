/**
 * RPC Infrastructure Templates
 *
 * Generates core RPC infrastructure files for Effect/RPC integration.
 * This provides shared middleware, transport, and client utilities
 * that feature libraries can use.
 *
 * @module monorepo-library-generator/infra-templates/rpc
 */

export { generateRpcClientFile } from './client.template';
export { generateRpcCoreFile } from './core.template';
export { generateRpcErrorsFile } from './errors.template';
export { generateRpcIndexFile } from './rpc-index.template';
export { generateRpcMiddlewareFile } from './middleware.template';
export { generateRpcRouterFile } from './router.template';
export { generateRpcTransportFile } from './transport.template';
