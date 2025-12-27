/**
 * Contract Sub-Module Index Template Definition
 *
 * Declarative template for generating index.ts barrel export in contract sub-modules.
 * Part of the Hybrid DDD pattern for sub-module support.
 *
 * @module monorepo-library-generator/templates/definitions/contract/submodule-index
 */

import type { TemplateDefinition } from '../../core/types'

/**
 * Contract Sub-Module Index Template Definition
 *
 * Generates an index.ts barrel export for sub-modules with:
 * - Parent entity re-export
 * - Error exports (contract-first)
 * - Entity exports
 * - Event exports
 * - RPC exports
 */
export const contractSubmoduleIndexTemplate: TemplateDefinition = {
  id: 'contract/submodule-index',
  meta: {
    title: '{parentClassName} {subModuleClassName} Sub-Module',
    description: `Contract definitions for the {subModuleName} sub-module of the {parentName} domain.

This sub-module contains:
- Errors: {subModuleClassName}-specific domain errors (SINGLE SOURCE OF TRUTH)
- Entities: {subModuleClassName}-specific domain entities
- Events: {subModuleClassName}-specific domain events
- RPC: {subModuleClassName}-specific RPC definitions with prefixed operations

CONTRACT-FIRST ARCHITECTURE:
Errors defined here are the SINGLE SOURCE OF TRUTH.
Data-access and feature layers should import these errors.

Usage:
\`\`\`typescript
import {
  {subModuleClassName}NotFoundError,
  {subModuleClassName}Item,
  {subModuleClassName}AddItem
} from "{scope}/contract-{parentName}/{subModuleName}";
\`\`\``,
    module: '{scope}/contract-{parentName}/{subModuleName}'
  },
  imports: [],
  sections: [
    // Parent Entity Re-Export
    {
      title: 'Parent Entity Re-Export',
      content: {
        type: 'raw',
        value: `// Sub-modules use parent entity type - re-export for convenience
export type { {parentClassName}Entity } from "../lib/rpc-definitions"`
      }
    },
    // Error Exports
    {
      title: 'Error Exports (Contract-First)',
      content: {
        type: 'raw',
        value: `// Errors are the SINGLE SOURCE OF TRUTH - data-access and feature layers import these
export {
  {subModuleClassName}NotFoundError,
  {subModuleClassName}ValidationError,
  {subModuleClassName}OperationError,
  type {subModuleClassName}DomainError,
  type {subModuleClassName}RepositoryError,
  type {subModuleClassName}Error
} from "./errors"`
      }
    },
    // Entity Exports
    {
      title: 'Entity Exports',
      content: {
        type: 'raw',
        value: `export {
  {subModuleClassName}Id,
  {subModuleClassName},
  {subModuleClassName}Item,
  parse{subModuleClassName},
  encode{subModuleClassName},
  parse{subModuleClassName}Item
} from "./entities"`
      }
    },
    // Event Exports
    {
      title: 'Event Exports',
      content: {
        type: 'raw',
        value: `export {
  {subModuleClassName}Created,
  {subModuleClassName}Updated,
  {subModuleClassName}Deleted,
  {subModuleClassName}Events,
  type {subModuleClassName}Event
} from "./events"`
      }
    },
    // RPC Exports
    {
      title: 'RPC Exports',
      content: {
        type: 'raw',
        value: `// Note: RouteTag/RouteType are NOT re-exported to avoid duplicates
// Import them from the parent contract: @scope/contract-{parentName}
export {
  Create{subModuleClassName}Input,
  Update{subModuleClassName}Input,
  {subModuleClassName}Get,
  {subModuleClassName}List,
  {subModuleClassName}Create,
  {subModuleClassName}Update,
  {subModuleClassName}Delete,
  {subModuleClassName}Rpcs,
  {subModuleClassName}RpcsByRoute
} from "./rpc-definitions"

export {
  {subModuleClassName}NotFoundRpcError,
  {subModuleClassName}ValidationRpcError,
  {subModuleClassName}PermissionRpcError,
  {subModuleClassName}RpcError
} from "./rpc-errors"`
      }
    }
  ]
}

export default contractSubmoduleIndexTemplate
