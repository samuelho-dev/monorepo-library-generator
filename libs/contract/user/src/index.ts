/**
 * User Contract Library
 *
 * Domain interfaces, ports, entities, errors, and events for User.

This library defines the contract between layers:
- Entities: Domain models with runtime validation
- Errors: Domain and repository errors
- Ports: Repository and service interfaces
- Events: Domain events for event-driven architecture
- RPC: Request/Response schemas for network boundaries
 *
 */

// ============================================================================
// Core Exports
// ============================================================================


// Errors

export * from "./lib/errors";

// Entity types re-exported from @samuelho-dev/types-database

export * from "@samuelho-dev/types-database";

// Ports (Repository and Service interfaces)

export * from "./lib/ports";

// Events

export * from "./lib/events";


// ============================================================================
// RPC Exports (Contract-First - Always Prewired)
// ============================================================================


// RPC definitions, errors, and group (single source of truth)

export * from "./lib/rpc";


// ============================================================================
// Sub-Module Namespace Exports (Hybrid DDD Pattern)
// ============================================================================

export * as Authentication from "./authentication";
export * as Profile from "./profile";
