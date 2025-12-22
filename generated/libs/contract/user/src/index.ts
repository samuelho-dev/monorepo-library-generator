/**
 * User Contract Library
 *
 * Domain interfaces, ports, entities, errors, and events for User.

This library defines the contract between layers:
- Entities: Domain models with runtime validation
- Errors: Domain and repository errors
- Ports: Repository and service interfaces
- Events: Domain events for event-driven architecture
 *
 */

// ============================================================================
// Core Exports
// ============================================================================


// Errors

export * from "./lib/errors";

// Entity types from database schema

export * from "./lib/types/database";

// Ports (Repository and Service interfaces)

export * from "./lib/ports";

// Events

export * from "./lib/events";
