/**
 * RPC Templates Index
 *
 * Exports all RPC template functions for the feature generator.
 *
 * Contract-First Architecture:
 * - RPC definitions are in contract library (with RouteTag)
 * - Feature library implements handlers
 * - Middleware is from infra-rpc (applied based on RouteTag)
 *
 * @module monorepo-library-generator/feature/templates/rpc
 */

// Contract-First RPC templates (unified handlers, no external/internal split)
export { generateHandlersFile } from "./handlers.template"
export { generateRouterFile } from "./router.template"
export { generateRpcBarrelFile } from "./rpc-barrel.template"
