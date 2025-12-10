export const generateSubServiceLayersTemplate = (options: {
  className: string
}) =>
  `/**
 * ${options.className} Effect Layers
 */

import { Layer } from "effect"
import { ${options.className}, make${options.className} } from "./service"

/**
 * ${options.className} live layer
 *
 * Provides ${options.className} service implementation
 */
export const ${options.className}Live = Layer.effect(
  ${options.className},
  make${options.className}
)

/**
 * ${options.className} test layer
 *
 * Provides mock ${options.className} for testing
 */
export const ${options.className}Test = Layer.succeed(
  ${options.className},
  ${options.className}.of({
    execute: Effect.logInfo("Mock ${options.className} execute"),
    validate: Effect.succeed(true)
  })
)
`
