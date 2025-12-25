/**
 * RPC Infrastructure Templates
 *
 * Generates core RPC infrastructure files for Effect/RPC integration.
 * This provides shared middleware, transport, and client utilities
 * that feature libraries can use.
 *
 * Contract-First Architecture:
 * - Contract library defines RPCs with RouteTag
 * - infra-rpc provides ALL middleware (auth, service-auth, request-meta, route-selector)
 * - Feature library imports from contract and implements handlers
 *
 * @module monorepo-library-generator/infra-templates/rpc
 */

export { generateRpcClientHooksFile } from "./client-hook.template"
export { generateRpcClientFile } from "./client.template"
export { generateRpcCoreFile } from "./core.template"
export { generateRpcErrorsFile } from "./errors.template"
export { generateRpcRouterFile } from "./router.template"
export { generateRpcIndexFile } from "./rpc-index.template"
export { generateRpcTransportFile } from "./transport.template"

// Middleware module (Contract-First architecture)
export { generateAuthMiddlewareFile } from "./middleware/auth.template"
export { generateMiddlewareIndexFile } from "./middleware/index.template"
export { generateRequestMetaMiddlewareFile } from "./middleware/request-meta.template"
export { generateRouteSelectorMiddlewareFile } from "./middleware/route-selector.template"
export { generateServiceAuthMiddlewareFile } from "./middleware/service-auth.template"
