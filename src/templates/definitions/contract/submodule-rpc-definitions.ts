/**
 * Contract Sub-Module RPC Definitions Template Definition
 *
 * Declarative template for generating rpc-definitions.ts in contract sub-modules.
 * Sub-module RPCs use prefixed names for unified router routing.
 *
 * @module monorepo-library-generator/templates/definitions/contract/submodule-rpc-definitions
 */

import type { TemplateDefinition } from '../../core/types'

/**
 * Contract Sub-Module RPC Definitions Template Definition
 *
 * Generates an rpc-definitions.ts file for sub-modules with:
 * - Request/Response schemas (Create/Update inputs)
 * - CRUD RPC definitions with prefixed names
 * - RpcGroup composition
 * - RPCs organized by route type
 *
 * All operations are prefixed with "{subModuleClassName}." for unified router routing.
 * Example: "Cart.Get", "Cart.AddItem", etc.
 */
export const contractSubmoduleRpcDefinitionsTemplate: TemplateDefinition = {
  id: 'contract/submodule-rpc-definitions',
  meta: {
    title: '{subModuleClassName} RPC Definitions',
    description: `Contract-first RPC definitions for the {subModuleName} sub-module.
All operations are prefixed with "{subModuleClassName}." for unified router routing.

Route Types:
- "public": No authentication required
- "protected": User authentication required (CurrentUser)
- "service": Service-to-service authentication (ServiceContext)

Usage in feature handlers:
\`\`\`typescript
import { {subModuleClassName}Rpcs } from "{scope}/contract-{parentName}/{subModuleName}";
import { {subModuleClassName}Service } from "./service";

export const {subModuleClassName}Handlers = {subModuleClassName}Rpcs.toLayer({
  "{subModuleClassName}.Get": (input) =>
    Effect.flatMap({subModuleClassName}Service, s => s.get(input.id)),
})
\`\`\``,
    module: '{scope}/contract-{parentName}/{subModuleName}/rpc'
  },
  imports: [
    { from: '@effect/rpc', items: ['Rpc', 'RpcGroup'] },
    { from: 'effect', items: ['Schema'] },
    { from: '../lib/rpc-definitions', items: ['RouteTag'] },
    { from: '../lib/rpc-definitions', items: ['RouteType'], isTypeOnly: true },
    { from: './entities', items: ['{subModuleClassName}', '{subModuleClassName}Id'] },
    { from: './rpc-errors', items: ['{subModuleClassName}RpcError'] }
  ],
  sections: [
    // Request/Response Schemas
    {
      title: 'Request/Response Schemas',
      content: {
        type: 'raw',
        value: `/**
 * Create input schema
 */
export const Create{subModuleClassName}Input = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255))
  // TODO: Add domain-specific fields for {subModuleClassName}
}).pipe(Schema.annotations({
  identifier: "Create{subModuleClassName}Input",
  title: "Create {subModuleClassName} Input"
}))

export type Create{subModuleClassName}Input = Schema.Schema.Type<typeof Create{subModuleClassName}Input>

/**
 * Update input schema
 */
export const Update{subModuleClassName}Input = Schema.Struct({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)))
  // TODO: Add domain-specific update fields for {subModuleClassName}
}).pipe(Schema.annotations({
  identifier: "Update{subModuleClassName}Input",
  title: "Update {subModuleClassName} Input"
}))

export type Update{subModuleClassName}Input = Schema.Schema.Type<typeof Update{subModuleClassName}Input>`
      }
    },
    // RPC Definitions
    {
      title: 'RPC Definitions',
      content: {
        type: 'raw',
        value: `/**
 * Get {subModuleClassName} by ID
 *
 * @route public - No authentication required
 */
export class {subModuleClassName}Get extends Rpc.make("{subModuleClassName}.Get", {
  payload: Schema.Struct({
    id: {subModuleClassName}Id
  }),
  success: {subModuleClassName},
  error: {subModuleClassName}RpcError
}) {
  static readonly [RouteTag]: RouteType = "public"
}`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * List {subModuleClassName}s with pagination
 *
 * @route public - No authentication required
 */
export class {subModuleClassName}List extends Rpc.make("{subModuleClassName}.List", {
  payload: Schema.Struct({
    page: Schema.optionalWith(Schema.Number.pipe(Schema.int(), Schema.positive()), {
      default: () => 1
    }),
    pageSize: Schema.optionalWith(Schema.Number.pipe(Schema.int(), Schema.positive()), {
      default: () => 20
    })
  }),
  success: Schema.Struct({
    items: Schema.Array({subModuleClassName}),
    total: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
    page: Schema.Number.pipe(Schema.int(), Schema.positive()),
    pageSize: Schema.Number.pipe(Schema.int(), Schema.positive())
  }),
  error: {subModuleClassName}RpcError
}) {
  static readonly [RouteTag]: RouteType = "public"
}`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * Create {subModuleClassName}
 *
 * @route protected - Requires user authentication
 */
export class {subModuleClassName}Create extends Rpc.make("{subModuleClassName}.Create", {
  payload: Create{subModuleClassName}Input,
  success: {subModuleClassName},
  error: {subModuleClassName}RpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * Update {subModuleClassName}
 *
 * @route protected - Requires user authentication
 */
export class {subModuleClassName}Update extends Rpc.make("{subModuleClassName}.Update", {
  payload: Schema.Struct({
    id: {subModuleClassName}Id,
    data: Update{subModuleClassName}Input
  }),
  success: {subModuleClassName},
  error: {subModuleClassName}RpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}`
      }
    },
    {
      content: {
        type: 'raw',
        value: `/**
 * Delete {subModuleClassName}
 *
 * @route protected - Requires user authentication
 */
export class {subModuleClassName}Delete extends Rpc.make("{subModuleClassName}.Delete", {
  payload: Schema.Struct({
    id: {subModuleClassName}Id
  }),
  success: Schema.Struct({
    success: Schema.Literal(true),
    deletedAt: Schema.DateTimeUtc
  }),
  error: {subModuleClassName}RpcError
}) {
  static readonly [RouteTag]: RouteType = "protected"
}`
      }
    },
    // RPC Group
    {
      title: 'RPC Group',
      content: {
        type: 'raw',
        value: `/**
 * {subModuleClassName} RPC Group
 *
 * All {subModuleClassName} operations for router registration.
 */
export const {subModuleClassName}Rpcs = RpcGroup.make(
  {subModuleClassName}Get,
  {subModuleClassName}List,
  {subModuleClassName}Create,
  {subModuleClassName}Update,
  {subModuleClassName}Delete
)

export type {subModuleClassName}Rpcs = typeof {subModuleClassName}Rpcs

/**
 * RPCs organized by route type
 */
export const {subModuleClassName}RpcsByRoute = {
  public: [{subModuleClassName}Get, {subModuleClassName}List] as const,
  protected: [{subModuleClassName}Create, {subModuleClassName}Update, {subModuleClassName}Delete] as const,
  service: [] as const
}`
      }
    }
  ]
}

export default contractSubmoduleRpcDefinitionsTemplate
