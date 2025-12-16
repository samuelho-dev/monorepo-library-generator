/**
 * Infrastructure Module
 *
 * Unified infrastructure for all generator interfaces (MCP, CLI, Nx)
 *
 * This module provides:
 * - Workspace context detection and management
 * - Filesystem adapter factory
 * - Metadata computation (Phase 2)
 * - Validation registry (Phase 2)
 * - Execution layer (Phase 3)
 * - Output formatters (Phase 3)
 *
 * @module monorepo-library-generator/infrastructure
 */

// Workspace infrastructure
export * from "./workspace"

// Adapter infrastructure
export * from "./adapters"

// Metadata infrastructure (Phase 2)
export * from "./metadata"
export * from "./validation"

// Execution infrastructure (Phase 3)
export * from "./execution"
export * from "./output"
