export const generateSubServiceTemplate = (options: {
  serviceName: string
  className: string
  packageName: string
}) =>
  `/**
 * ${options.className} Sub-Service
 *
 * Part of the ${options.packageName} feature
 *
 * @module services/${options.serviceName}
 */

import { Context, Effect } from "effect"

/**
 * ${options.className} service interface
 *
 * Encapsulates ${options.serviceName} business logic
 */
export interface ${options.className} {
  /**
   * Execute ${options.serviceName} operation
   */
  readonly execute: Effect.Effect<void, ${options.className}Error, never>

  /**
   * Validate ${options.serviceName} configuration
   */
  readonly validate: Effect.Effect<boolean, ${options.className}Error, never>
}

/**
 * ${options.className} service tag for dependency injection
 */
export const ${options.className} = Context.GenericTag<${options.className}>("@services/${options.className}")

/**
 * ${options.className} service error
 */
export class ${options.className}Error {
  readonly _tag = "${options.className}Error"
  constructor(readonly message: string, readonly cause?: unknown) {}
}

/**
 * ${options.className} service implementation
 */
export const make${options.className} = Effect.gen(function* () {
  yield* Effect.logInfo(\`Initializing ${options.className} service\`)

  return ${options.className}.of({
    execute: Effect.gen(function* () {
      // TODO: Implement ${options.serviceName} business logic
      yield* Effect.logInfo(\`Executing ${options.serviceName}\`)
    }),

    validate: Effect.gen(function* () {
      // TODO: Implement ${options.serviceName} validation
      yield* Effect.logInfo(\`Validating ${options.serviceName}\`)
      return true
    })
  })
})
`
