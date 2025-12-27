/**
 * Feature Index Barrel Template Definition
 *
 * Declarative template for generating index.ts in feature libraries.
 * Main library entry point with platform-specific guidance.
 *
 * @module monorepo-library-generator/templates/definitions/feature/index-barrel
 */

import type { TemplateDefinition } from "../../core/types"

/**
 * Feature Index Barrel Template Definition
 *
 * Generates the main index.ts file with:
 * - Shared type exports
 * - Error exports
 * - Platform-specific import guidance
 */
export const featureIndexTemplate: TemplateDefinition = {
  id: "feature/index-barrel",
  meta: {
    title: "{className} Feature Library",
    description: `{className} feature library entry point.

PLATFORM-SPECIFIC IMPORTS:
- Server: import { {className}Service } from "{scope}/feature-{fileName}/server"
- Client: import { use{className} } from "{scope}/feature-{fileName}/client"
- Edge: import { ... } from "{scope}/feature-{fileName}/edge"

This root export only includes shared types and errors.`,
    module: "{scope}/feature-{fileName}"
  },
  imports: [],
  sections: [
    // Shared Types
    {
      title: "Shared Types (from shared/)",
      content: {
        type: "raw",
        value: `export type {
  {className}ServiceConfig,
  {className}PaginatedResult
} from "./lib/shared/types"`
      }
    },
    // Shared Schemas
    {
      content: {
        type: "raw",
        value: `export {
  {className}ResultSchema,
  {className}BulkResultSchema,
  {className}ConfigSchema,
  PaginationSchema,
  SortDirectionSchema,
  createSortSchema,
  type {className}Result,
  type {className}BulkResult,
  type {className}Config,
  type Pagination,
  type SortDirection
} from "./lib/shared/schemas"`
      }
    },
    // Error Types
    {
      title: "Error Types (from shared/)",
      content: {
        type: "raw",
        value: `export {
  // Domain errors (re-exported from contract)
  {className}NotFoundError,
  {className}ValidationError,
  {className}AlreadyExistsError,
  {className}PermissionError,
  // Service errors
  {className}ServiceErrorCode,
  {className}DependencyError,
  {className}OrchestrationError,
  {className}InternalError,
  // Error unions
  type {className}DomainError,
  type {className}ServiceError,
  type {className}FeatureError
} from "./lib/shared/errors"`
      }
    },
    // Platform Guidance
    {
      title: "Platform-Specific Imports",
      content: {
        type: "raw",
        value: `/**
 * PLATFORM-SPECIFIC IMPORTS
 *
 * Server-side (Node.js):
 * @example
 * \`\`\`typescript
 * import {
 *   {className}Service,
 *   {className}FeatureLive,
 *   {className}FeatureTest
 * } from "{scope}/feature-{fileName}/server"
 * \`\`\`
 *
 * Client-side (Browser/React):
 * @example
 * \`\`\`typescript
 * import { use{className} } from "{scope}/feature-{fileName}/client"
 * import { {propertyName}Atom } from "{scope}/feature-{fileName}/client/atoms"
 * \`\`\`
 *
 * Edge runtime:
 * @example
 * \`\`\`typescript
 * import { ... } from "{scope}/feature-{fileName}/edge"
 * \`\`\`
 */`
      }
    }
  ]
}

export default featureIndexTemplate
