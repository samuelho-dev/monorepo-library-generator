/**
 * Contract Index Template
 *
 * Generates index.ts file for contract libraries with barrel exports
 * of all contract types and schemas.
 *
 * @module monorepo-library-generator/contract/index-template
 */

import { TypeScriptBuilder } from '../../../utils/code-builder';
import {
  addConditionalExports,
  type ConditionalExport,
  type ExportSection,
  generateExportSections,
} from '../../../utils/templates';
import type { ContractTemplateOptions } from '../../../utils/types';

/**
 * Generate index.ts file for contract library
 *
 * Creates barrel exports for:
 * - Errors
 * - Entities
 * - Ports (Repository and Service)
 * - Events
 * - Commands (if CQRS enabled)
 * - Queries (if CQRS enabled)
 * - Projections (if CQRS enabled)
 * - RPC schemas (if RPC enabled)
 */
export function generateIndexFile(options: ContractTemplateOptions) {
  const { className, includeCQRS, includeRPC } = options;
  const builder = new TypeScriptBuilder();

  // File header
  let headerDesc = `Domain interfaces, ports, entities, errors, and events for ${className}.\n\nThis library defines the contract between layers:\n- Entities: Domain models with runtime validation\n- Errors: Domain and repository errors\n- Ports: Repository and service interfaces\n- Events: Domain events for event-driven architecture`;

  if (includeCQRS) {
    headerDesc +=
      '\n- Commands: CQRS write operations\n- Queries: CQRS read operations\n- Projections: CQRS read models';
  }

  if (includeRPC) {
    headerDesc += '\n- RPC: Request/Response schemas for network boundaries';
  }

  builder.addFileHeader({
    title: `${className} Contract Library`,
    description: headerDesc,
  });

  // Core exports section
  const coreExports: Array<ExportSection> = [
    {
      title: 'Core Exports',
      items: [
        { comment: 'Errors', exports: 'export * from "./lib/errors";' },
        {
          comment: 'Entity types from database schema',
          exports: 'export * from "./lib/types/database";',
        },
        {
          comment: 'Ports (Repository and Service interfaces)',
          exports: 'export * from "./lib/ports";',
        },
        { comment: 'Events', exports: 'export * from "./lib/events";' },
      ],
    },
  ];

  generateExportSections(builder, coreExports);

  // Conditional exports (CQRS and RPC)
  const conditionalExports: Array<ConditionalExport> = [
    {
      condition: includeCQRS,
      sectionTitle: 'CQRS Exports',
      exports: [
        {
          comment: 'Commands (Write operations)',
          exports: 'export * from "./lib/commands";',
        },
        {
          comment: 'Queries (Read operations)',
          exports: 'export * from "./lib/queries";',
        },
        {
          comment: 'Projections (Read models)',
          exports: 'export * from "./lib/projections";',
        },
      ],
    },
    {
      condition: includeRPC,
      sectionTitle: 'RPC Exports',
      exports: [
        {
          comment: 'RPC Request/Response schemas',
          exports: 'export * from "./lib/rpc";',
        },
      ],
    },
  ];

  addConditionalExports(builder, conditionalExports);

  return builder.toString();
}
