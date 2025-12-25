/**
 * Contract Index Template
 *
 * Generates index.ts file for contract libraries with barrel exports
 * of all contract types and schemas.
 *
 * @module monorepo-library-generator/contract/index-template
 */

import { TypeScriptBuilder } from "../../../utils/code-builder"
import {
  addConditionalExports,
  type ConditionalExport,
  type ExportSection,
  generateExportSections
} from "../../../utils/templates"
import type { ContractTemplateOptions } from "../../../utils/types"

/**
 * Generate index.ts file for contract library
 *
 * Creates barrel exports for:
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

  // Determine entity type export source
  const entityTypeExport = typesDatabasePackage
    ? `export * from "${typesDatabasePackage}";`
    : "export * from \"./lib/types/database\";"

  const entityTypeComment = typesDatabasePackage
    ? `Entity types re-exported from ${typesDatabasePackage}`
    : "Entity types from database schema"

  // Core exports section (includes RPC - always prewired)
  const coreExports: Array<ExportSection> = [
    {
      title: "Core Exports",
      items: [
        { comment: "Errors", exports: "export * from \"./lib/errors\";" },
        {
          comment: entityTypeComment,
          exports: entityTypeExport
        },
        {
          comment: "Ports (Repository and Service interfaces)",
          exports: "export * from \"./lib/ports\";"
        },
        { comment: "Events", exports: "export * from \"./lib/events\";" }
      ]
    },
    {
      title: "RPC Exports (Contract-First - Always Prewired)",
      items: [
        {
          comment: "RPC definitions, errors, and group (single source of truth)",
          exports: "export * from \"./lib/rpc\";"
        }
      ]
    }
  ]

  generateExportSections(builder, coreExports)

  // Conditional exports (CQRS only - RPC is always included)
  const conditionalExports: Array<ConditionalExport> = [
    {
      condition: includeCQRS,
      sectionTitle: "CQRS Exports",
      exports: [
        {
          comment: "Commands (Write operations)",
          exports: "export * from \"./lib/commands\";"
        },
        {
          comment: "Queries (Read operations)",
          exports: "export * from \"./lib/queries\";"
        },
        {
          comment: "Projections (Read models)",
          exports: "export * from \"./lib/projections\";"
        }
      ]
    }
  ]

  addConditionalExports(builder, conditionalExports)

  return builder.toString()
}
