/**
 * Contract Index Template
 *
 * Generates index.ts file for contract libraries with named exports
 * of all contract types and schemas.
 *
 * Uses named exports instead of `export *` to comply with
 * biome noReExportAll and noBarrelFile rules.
 *
 * @module monorepo-library-generator/contract/index-template
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import type { ContractTemplateOptions } from "../../../utils/types"

/**
 * Generate index.ts file for contract library
 *
 * Creates named exports for:
 * - Errors
 * - Entities
 * - Ports (Repository and Service)
 * - Events
 * - RPC schemas (always - prewired integration)
 * - Commands (if CQRS enabled)
 * - Queries (if CQRS enabled)
 * - Projections (if CQRS enabled)
 */
export function generateIndexFile(options: ContractTemplateOptions) {
  const { className, includeCQRS, typesDatabasePackage } = options
  const builder = new TypeScriptBuilder()

  // File header - RPC is always included
  let headerDesc =
    `Domain interfaces, ports, entities, errors, and events for ${className}.\n\nThis library defines the contract between layers:\n- Entities: Domain models with runtime validation\n- Errors: Domain and repository errors\n- Ports: Repository and service interfaces\n- Events: Domain events for event-driven architecture\n- RPC: Request/Response schemas for network boundaries`

  if (includeCQRS) {
    headerDesc +=
      "\n- Commands: CQRS write operations\n- Queries: CQRS read operations\n- Projections: CQRS read models"
  }

  builder.addFileHeader({
    title: `${className} Contract Library`,
    description: headerDesc
  })

  builder.addSectionComment("Core Exports")
  builder.addBlankLine()

  // Errors - named exports
  builder.addComment("Errors")
  builder.addRaw(`export {
  ${className}NotFoundError,
  ${className}ValidationError,
  ${className}AlreadyExistsError,
  ${className}PermissionError,
  ${className}NotFoundRepositoryError,
  ${className}ValidationRepositoryError,
  ${className}ConflictRepositoryError,
  ${className}DatabaseRepositoryError,
  type ${className}DomainError,
  type ${className}RepositoryError,
  type ${className}Error
} from "./lib/errors"`)
  builder.addBlankLine()

  // Entity types - use type-only re-exports
  const typeSource = typesDatabasePackage || "./lib/types/database"
  const entityComment = typesDatabasePackage
    ? `Entity types re-exported from ${typesDatabasePackage}`
    : "Entity types from database schema"
  builder.addComment(entityComment)
  builder.addRaw(`export type {
  ${className}Table,
  ${className},
  ${className}Select,
  ${className}Insert,
  ${className}Update,
  DB,
  Json
} from "${typeSource}"`)
  builder.addBlankLine()

  // Ports - named exports
  builder.addComment("Ports (Repository and Service interfaces)")
  builder.addRaw(`export {
  ${className}Repository,
  ${className}Service,
  type ${className}Filters,
  type OffsetPaginationParams,
  type SortOptions,
  type PaginatedResult
} from "./lib/ports"`)
  builder.addBlankLine()

  // Events - named exports
  builder.addComment("Events")
  builder.addRaw(`export {
  EventMetadata,
  ${className}AggregateMetadata,
  ${className}CreatedEvent,
  ${className}UpdatedEvent,
  ${className}DeletedEvent,
  ${className}EventSchema,
  createEventMetadata,
  createAggregateMetadata,
  type ${className}Event
} from "./lib/events"`)
  builder.addBlankLine()

  // RPC Exports - named exports (directly from source files, no barrel)
  builder.addSectionComment("RPC Exports (Contract-First - Always Prewired)")
  builder.addBlankLine()

  // RPC Errors from rpc-errors.ts
  builder.addComment("RPC Errors (Schema.TaggedError for network serialization)")
  builder.addRaw(`export {
  ${className}NotFoundRpcError,
  ${className}ValidationRpcError,
  ${className}PermissionRpcError,
  ${className}RpcError
} from "./lib/rpc-errors"`)
  builder.addBlankLine()

  // RPC Definitions from rpc-definitions.ts
  builder.addComment("RPC Definitions (Rpc.make with RouteTag)")
  builder.addRaw(`export {
  ${className}Id,
  RouteTag,
  type RouteType,
  ${className}Schema,
  type ${className}Entity,
  PaginationParams,
  PaginatedResponse,
  Create${className}Input,
  Update${className}Input,
  Validate${className}Input,
  ValidationResponse,
  BulkGet${className}Input,
  Get${className},
  List${className}s,
  Create${className},
  Update${className},
  Delete${className},
  Validate${className},
  BulkGet${className}s
} from "./lib/rpc-definitions"`)
  builder.addBlankLine()

  // RPC Group from rpc-group.ts
  builder.addComment("RPC Group (RpcGroup.make composition)")
  builder.addRaw(`export {
  ${className}Rpcs,
  type ${className}RpcDefinitions,
  getRouteType,
  isProtectedRoute,
  isServiceRoute,
  isPublicRoute,
  ${className}RpcsByRoute
} from "./lib/rpc-group"`)
  builder.addBlankLine()

  // CQRS exports (conditional)
  if (includeCQRS) {
    builder.addSectionComment("CQRS Exports")
    builder.addBlankLine()

    builder.addComment("Commands (Write operations)")
    builder.addRaw(`export {
  Create${className}Command,
  Update${className}Command,
  Delete${className}Command,
  type ${className}Command
} from "./lib/commands"`)
    builder.addBlankLine()

    builder.addComment("Queries (Read operations)")
    builder.addRaw(`export {
  Get${className}Query,
  List${className}sQuery,
  type ${className}Query
} from "./lib/queries"`)
    builder.addBlankLine()

    builder.addComment("Projections (Read models)")
    builder.addRaw(`export {
  ${className}Projection,
  ${className}ListProjection,
  type ${className}ProjectionState
} from "./lib/projections"`)
    builder.addBlankLine()
  }

  // Sub-module namespace exports use namespace imports to avoid barrel issues
  builder.addSectionComment("Sub-Module Namespace Exports (Hybrid DDD Pattern)")
  builder.addBlankLine()
  builder.addComment("Sub-modules are imported as namespaces to preserve module boundaries")
  builder.addComment("Import specific items: import { Authentication } from \"@scope/contract-name\"")
  builder.addComment("Then use: Authentication.AuthenticationNotFoundError")
  builder.addBlankLine()

  return builder.toString()
}
