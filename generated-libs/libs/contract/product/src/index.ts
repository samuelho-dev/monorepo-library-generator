/**
 * Product Contract Library
 *
 * Domain interfaces, ports, entities, errors, and events for Product.

This library defines the contract between layers:
- Entities: Domain models with runtime validation
- Errors: Domain and repository errors
- Ports: Repository and service interfaces
- Events: Domain events for event-driven architecture
- Commands: CQRS write operations
- Queries: CQRS read operations
- Projections: CQRS read models
 *
 */

// ============================================================================
// Core Exports
// ============================================================================


// Errors

export * from "./lib/errors";

// Entities

export * from "./lib/entities";

// Ports (Repository and Service interfaces)

export * from "./lib/ports";

// Events

export * from "./lib/events";


// ============================================================================
// CQRS Exports
// ============================================================================


// Commands (Write operations)

export * from "./lib/commands";

// Queries (Read operations)

export * from "./lib/queries";

// Projections (Read models)

export * from "./lib/projections";
