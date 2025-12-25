/**
 * User RPC
 *
 * Barrel export for all RPC-related types and definitions.
 * This is the main entry point for RPC consumers.
 *
 * @module @samuelho-dev/contract-user/rpc
 */

// RPC Errors (Schema.TaggedError for network serialization)
export * from "./rpc-errors";

// RPC Definitions (Rpc.make with RouteTag)
export * from "./rpc-definitions";

// RPC Group (RpcGroup.make composition)
export * from "./rpc-group";
