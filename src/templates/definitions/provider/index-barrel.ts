/**
 * Provider Index Barrel Template Definition
 *
 * Declarative template for generating index.ts in provider libraries.
 * Main library entry point with Effect-based adapter exports.
 *
 * @module monorepo-library-generator/templates/definitions/provider/index-barrel
 */

import type { TemplateDefinition } from '../../core/types'

/**
 * Provider Index Barrel Template Definition
 *
 * Generates the main index.ts file with:
 * - Error type exports
 * - Type definition exports
 * - Service implementation export
 * - Validation utility exports
 */
export const providerIndexTemplate: TemplateDefinition = {
  id: 'provider/index-barrel',
  meta: {
    title: '{className} Provider Library',
    description: `External service adapter for {className}.

This library provides an Effect-based adapter for the {className} external service.
It wraps the external SDK in Effect types for composable error handling.

Effect 3.0+ Pattern:
  - {className} extends Context.Tag
  - Access layers via static members: {className}.Live, {className}.Test

Usage:
  import { {className} } from '{packageName}';
  const layer = {className}.Live;`,
    module: '{packageName}'
  },
  imports: [],
  sections: [
    // Error Types
    {
      title: 'Error Types',
      content: {
        type: 'raw',
        value: `export {
  {className}Error,
  {className}NotFoundError,
  {className}TimeoutError,
  {className}AuthenticationError,
  {className}RateLimitError,
  {className}ValidationError,
  type {className}ServiceError
} from "./lib/errors"`
      }
    },
    // Type Definitions
    {
      title: 'Type Definitions',
      content: {
        type: 'raw',
        value: `// Service types and interfaces
export type * from "./lib/types"`
      }
    },
    // Service Implementation
    {
      title: 'Service Implementation',
      content: {
        type: 'raw',
        value: `// {className} - External service adapter
//
// Effect 3.0+ Pattern: Context.Tag with static layer members
// Access layers via static members:
//   - {className}.Live  (production - wraps real SDK)
//   - {className}.Test  (testing - mock implementation)
//
// Migration from pre-3.0 pattern:
//   OLD: import { {className}Live } from '...';
//   NEW: import { {className} } from '...';
//        const layer = {className}.Live;

export { {className} } from "./lib/service"`
      }
    },
    // Validation Utilities
    {
      title: 'Validation Utilities',
      content: {
        type: 'raw',
        value: `// Input validation functions
export {
  validate{className}Config,
  validate{className}Input
} from "./lib/validation"`
      }
    },
    // Usage Example
    {
      title: 'Usage Example',
      content: {
        type: 'raw',
        value: `// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Usage Example
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// import { Effect } from 'effect';
// import { {className} } from '{packageName}';
//
// const program = Effect.gen(function*() {
//   const service = yield* {className}
//   // Use service methods...
// })
//
// // Layers are static members on the service class:
// const runnable = program.pipe(Effect.provide({className}.Live))
// // Also available: {className}.Test, {className}.Dev, {className}.Auto
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      }
    }
  ]
}

export default providerIndexTemplate
