/**
 * Contract Sub-Module Errors Template
 *
 * Generates errors.ts for contract sub-module with Data.TaggedError definitions.
 * Part of the Hybrid DDD pattern for sub-module support.
 *
 * These errors are the SINGLE SOURCE OF TRUTH for the sub-module.
 * Data-access and feature layers should import these errors rather than
 * defining their own.
 *
 * @module monorepo-library-generator/contract/submodule-errors-template
 */

import { createTaggedErrorPattern, TypeScriptBuilder } from '../../../utils/code-builder'
import { WORKSPACE_CONFIG } from '../../../utils/workspace-config'

export interface SubModuleErrorsOptions {
  /** Parent domain name (e.g., 'order') */
  parentName: string
  /** Parent class name (e.g., 'Order') */
  parentClassName: string
  /** Sub-module name (e.g., 'cart') */
  subModuleName: string
  /** Sub-module class name (e.g., 'Cart') */
  subModuleClassName: string
}

/**
 * Generate errors.ts for a contract sub-module
 *
 * Creates domain error definitions specific to this sub-module
 * using Data.TaggedError pattern.
 */
export function generateSubModuleErrorsFile(options: SubModuleErrorsOptions) {
  const builder = new TypeScriptBuilder()
  const { parentClassName, parentName, subModuleClassName, subModuleName } = options
  const scope = WORKSPACE_CONFIG.getScope()

  builder.addFileHeader({
    title: `${parentClassName} ${subModuleClassName} Errors`,
    description: `Domain errors specific to the ${subModuleName} sub-module.

These errors use Data.TaggedError for proper Effect integration:
- Discriminated unions (_tag property for pattern matching)
- Effect.catchTag support
- Type safety (no instanceof checks needed)

CONTRACT-FIRST ARCHITECTURE:
This file is the SINGLE SOURCE OF TRUTH for ${subModuleName} errors.
Data-access and feature layers should import and re-export these errors
rather than defining their own.

@see https://effect.website/docs/other/data/tagged-error`,
    module: `${scope}/contract-${parentName}/${subModuleName}/errors`
  })

  builder.addImports([{ from: 'effect', imports: ['Data'] }])

  builder.addSectionComment('Domain Errors (Data.TaggedError)')

  // NotFoundError
  builder.addClass(
    createTaggedErrorPattern({
      className: `${subModuleClassName}NotFoundError`,
      tagName: `${subModuleClassName}NotFoundError`,
      fields: [
        { name: 'message', type: 'string', readonly: true },
        { name: 'id', type: 'string', readonly: true }
      ],
      staticMethods: [
        {
          name: 'create',
          params: [{ name: 'id', type: 'string' }],
          returnType: `${subModuleClassName}NotFoundError`,
          body: `return new ${subModuleClassName}NotFoundError({
  message: \`${subModuleClassName} not found: \${id}\`,
  id
})`
        }
      ],
      jsdoc: `Error thrown when ${subModuleName} entity is not found`
    })
  )

  // ValidationError
  builder.addClass(
    createTaggedErrorPattern({
      className: `${subModuleClassName}ValidationError`,
      tagName: `${subModuleClassName}ValidationError`,
      fields: [
        { name: 'message', type: 'string', readonly: true },
        { name: 'field', type: 'string', readonly: true },
        { name: 'value', type: 'unknown', readonly: true, optional: true }
      ],
      staticMethods: [
        {
          name: 'create',
          params: [
            { name: 'field', type: 'string' },
            { name: 'message', type: 'string' },
            { name: 'value', type: 'unknown', optional: true }
          ],
          returnType: `${subModuleClassName}ValidationError`,
          body: `return new ${subModuleClassName}ValidationError({
  message,
  field,
  ...(value !== undefined && { value })
})`
        },
        {
          name: 'required',
          params: [{ name: 'field', type: 'string' }],
          returnType: `${subModuleClassName}ValidationError`,
          body: `return new ${subModuleClassName}ValidationError({
  message: \`\${field} is required\`,
  field
})`
        }
      ],
      jsdoc: `Error thrown when ${subModuleName} validation fails`
    })
  )

  // OperationError - for infrastructure/operation failures
  builder.addClass(
    createTaggedErrorPattern({
      className: `${subModuleClassName}OperationError`,
      tagName: `${subModuleClassName}OperationError`,
      fields: [
        { name: 'message', type: 'string', readonly: true },
        { name: 'operation', type: 'string', readonly: true },
        { name: 'cause', type: 'unknown', readonly: true, optional: true }
      ],
      staticMethods: [
        {
          name: 'create',
          params: [
            { name: 'operation', type: 'string' },
            { name: 'message', type: 'string' },
            { name: 'cause', type: 'unknown', optional: true }
          ],
          returnType: `${subModuleClassName}OperationError`,
          body: `return new ${subModuleClassName}OperationError({
  message,
  operation,
  ...(cause !== undefined && { cause })
})`
        }
      ],
      jsdoc: `Error thrown when ${subModuleName} operation fails (e.g., database, network)`
    })
  )

  // Add sub-module specific errors based on common patterns
  const additionalErrors = getSubModuleSpecificErrors(subModuleName, subModuleClassName)
  if (additionalErrors) {
    builder.addSectionComment('Sub-Module Specific Errors')
    builder.addRaw(additionalErrors)
  }

  builder.addSectionComment('Error Union Types')

  // Domain error union type
  builder.addTypeAlias({
    name: `${subModuleClassName}DomainError`,
    type: `
  | ${subModuleClassName}NotFoundError
  | ${subModuleClassName}ValidationError`,
    exported: true,
    jsdoc: `Union of ${subModuleName} domain errors (business logic)`
  })

  // Repository/Operation error union type
  builder.addTypeAlias({
    name: `${subModuleClassName}RepositoryError`,
    type: `${subModuleClassName}OperationError`,
    exported: true,
    jsdoc: `Union of ${subModuleName} repository/infrastructure errors`
  })

  // All errors union type
  builder.addTypeAlias({
    name: `${subModuleClassName}Error`,
    type: `
  | ${subModuleClassName}DomainError
  | ${subModuleClassName}RepositoryError`,
    exported: true,
    jsdoc: `All possible ${subModuleName} errors`
  })

  builder.addComment('TODO: Add domain-specific errors here')
  builder.addComment(
    `Example: ${subModuleClassName}InsufficientFundsError, ` +
      `${subModuleClassName}ExpiredError, etc.`
  )

  return builder.toString()
}

/**
 * Get sub-module specific errors based on common patterns
 */
function getSubModuleSpecificErrors(subModuleName: string, subModuleClassName: string) {
  const name = subModuleName.toLowerCase()

  if (name === 'cart') {
    return `/**
 * Error thrown when cart item limit is exceeded
 */
export class ${subModuleClassName}ItemLimitError extends Data.TaggedError("${subModuleClassName}ItemLimitError")<{
  readonly message: string
  readonly currentCount: number
  readonly maxAllowed: number
}> {
  static create(currentCount: number, maxAllowed: number) {
    return new ${subModuleClassName}ItemLimitError({
      message: \`Cart item limit exceeded: \${currentCount}/\${maxAllowed}\`,
      currentCount,
      maxAllowed
    })
  }
}

/**
 * Error thrown when cart is empty
 */
export class ${subModuleClassName}EmptyError extends Data.TaggedError("${subModuleClassName}EmptyError")<{
  readonly message: string
  readonly cartId: string
}> {
  static create(cartId: string) {
    return new ${subModuleClassName}EmptyError({
      message: "Cart is empty",
      cartId
    })
  }
}`
  }

  if (name === 'checkout') {
    return `/**
 * Error thrown when checkout session expires
 */
export class ${subModuleClassName}ExpiredError extends Data.TaggedError("${subModuleClassName}ExpiredError")<{
  readonly message: string
  readonly checkoutId: string
  readonly expiredAt: string
}> {
  static create(checkoutId: string, expiredAt: Date) {
    return new ${subModuleClassName}ExpiredError({
      message: "Checkout session has expired",
      checkoutId,
      expiredAt: expiredAt.toISOString()
    })
  }
}

/**
 * Error thrown when payment fails
 */
export class ${subModuleClassName}PaymentError extends Data.TaggedError("${subModuleClassName}PaymentError")<{
  readonly message: string
  readonly checkoutId: string
  readonly reason: string
  readonly code?: string
}> {
  static create(checkoutId: string, reason: string, code?: string) {
    return new ${subModuleClassName}PaymentError({
      message: \`Payment failed: \${reason}\`,
      checkoutId,
      reason,
      ...(code !== undefined && { code })
    })
  }
}`
  }

  if (name === 'management' || name === 'order-management') {
    return `/**
 * Error thrown when order state transition is invalid
 */
export class ${subModuleClassName}InvalidStateError extends Data.TaggedError("${subModuleClassName}InvalidStateError")<{
  readonly message: string
  readonly orderId: string
  readonly currentState: string
  readonly targetState: string
}> {
  static create(orderId: string, currentState: string, targetState: string) {
    return new ${subModuleClassName}InvalidStateError({
      message: \`Cannot transition order from \${currentState} to \${targetState}\`,
      orderId,
      currentState,
      targetState
    })
  }
}

/**
 * Error thrown when order cannot be cancelled
 */
export class ${subModuleClassName}CancellationError extends Data.TaggedError("${subModuleClassName}CancellationError")<{
  readonly message: string
  readonly orderId: string
  readonly reason: string
}> {
  static create(orderId: string, reason: string) {
    return new ${subModuleClassName}CancellationError({
      message: \`Order cannot be cancelled: \${reason}\`,
      orderId,
      reason
    })
  }
}`
  }

  return null
}
