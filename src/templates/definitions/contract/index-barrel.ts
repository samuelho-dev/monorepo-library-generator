/**
 * Contract Index Template Definition
 *
 * Declarative template for generating index.ts barrel export in contract libraries.
 * Uses named exports to comply with biome noReExportAll and noBarrelFile rules.
 *
 * @module monorepo-library-generator/templates/definitions/contract/index-barrel
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Contract Index Template Definition
 *
 * Generates a complete index.ts file with named exports for:
 * - Errors (domain and repository)
 * - Entity types (from database schema)
 * - Ports (repository and service interfaces)
 * - Events (domain events)
 * - RPC definitions (always included)
 * - CQRS exports (conditional: commands, queries, projections)
 */
export const contractIndexTemplate: TemplateDefinition = {
  id: "contract/index",
  meta: {
    title: "{className} Contract Library",
    description: `Domain interfaces, ports, entities, errors, and events for {className}.

This library defines the contract between layers:
- Entities: Domain models with runtime validation
- Errors: Domain and repository errors
- Ports: Repository and service interfaces
- Events: Domain events for event-driven architecture
- RPC: Request/Response schemas for network boundaries`,
    module: "{scope}/contract-{fileName}"
  },
  imports: [],
  sections: [
    // Core Exports
    {
      title: "Core Exports",
      content: {
        type: "raw",
        value: `// Errors
export {
  {className}NotFoundError,
  {className}ValidationError,
  {className}AlreadyExistsError,
  {className}PermissionError,
  {className}NotFoundRepositoryError,
  {className}ValidationRepositoryError,
  {className}ConflictRepositoryError,
  {className}DatabaseRepositoryError,
  type {className}DomainError,
  type {className}RepositoryError,
  type {className}Error
} from "./lib/errors"`
      }
    },
    {
      content: {
        type: "raw",
        value: `// Entity types from database schema
export type {
  {className}Table,
  {className},
  {className}Select,
  {className}Insert,
  {className}Update,
  DB,
  Json
} from "{entityTypeSource}"`
      }
    },
    {
      content: {
        type: "raw",
        value: `// Ports (Repository and Service interfaces)
export {
  {className}Repository,
  {className}Service,
  type {className}Filters,
  type OffsetPaginationParams,
  type SortOptions,
  type PaginatedResult
} from "./lib/ports"`
      }
    },
    {
      content: {
        type: "raw",
        value: `// Events
export {
  EventMetadata,
  AggregateMetadata,
  {className}CreatedEvent,
  {className}UpdatedEvent,
  {className}DeletedEvent,
  type {className}DomainEvent
} from "./lib/events"`
      }
    },
    // RPC Exports Section
    {
      title: "RPC Exports (Contract-First - Always Prewired)",
      content: {
        type: "raw",
        value: `// RPC Errors (Schema.TaggedError for network serialization)
export {
  {className}NotFoundRpcError,
  {className}ValidationRpcError,
  {className}PermissionRpcError,
  {className}RpcError
} from "./lib/rpc-errors"`
      }
    },
    {
      content: {
        type: "raw",
        value: `// RPC Definitions (Rpc.make with RouteTag)
export {
  {className}Id,
  RouteTag,
  type RouteType,
  {className}Schema,
  type {className}Entity,
  PaginationParams,
  PaginatedResponse,
  Create{className}Input,
  Update{className}Input,
  Validate{className}Input,
  ValidationResponse,
  BulkGet{className}Input,
  Get{className},
  List{className}s,
  Create{className},
  Update{className},
  Delete{className},
  Validate{className},
  BulkGet{className}s
} from "./lib/rpc-definitions"`
      }
    },
    {
      content: {
        type: "raw",
        value: `// RPC Group (RpcGroup.make composition)
export {
  {className}Rpcs,
  type {className}RpcDefinitions,
  getRouteType,
  isProtectedRoute,
  isServiceRoute,
  isPublicRoute,
  {className}RpcsByRoute
} from "./lib/rpc-group"`
      }
    },
    // Sub-Module Namespace Section
    {
      title: "Sub-Module Namespace Exports (Hybrid DDD Pattern)",
      content: {
        type: "raw",
        value: `// Sub-modules are imported as namespaces to preserve module boundaries
// Import specific items: import { Authentication } from "@scope/contract-name"
// Then use: Authentication.AuthenticationNotFoundError`
      }
    }
  ],
  conditionals: {
    includeCQRS: {
      imports: [],
      sections: [
        {
          title: "CQRS Exports",
          content: {
            type: "raw",
            value: `// Commands (Write operations)
export {
  Create{className}Command,
  Update{className}Command,
  Delete{className}Command,
  type {className}Command
} from "./lib/commands"`
          }
        },
        {
          content: {
            type: "raw",
            value: `// Queries (Read operations)
export {
  Get{className}Query,
  List{className}sQuery,
  type {className}Query
} from "./lib/queries"`
          }
        },
        {
          content: {
            type: "raw",
            value: `// Projections (Read models)
export {
  {className}Projection,
  {className}ListProjection,
  type {className}ProjectionState
} from "./lib/projections"`
          }
        }
      ]
    }
  }
}

export default contractIndexTemplate
