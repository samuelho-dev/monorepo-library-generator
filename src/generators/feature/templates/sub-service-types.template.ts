export const generateSubServiceTypesTemplate = (options: { className: string }) =>
  `/**
 * ${options.className} Type Definitions
 */

import { Schema } from "effect"

/**
 * ${options.className} configuration schema
 */
export const ${options.className}Config = Schema.Struct({
  enabled: Schema.Boolean,
  options: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown }))
})

/**
 * ${options.className} configuration type
 */
export type ${options.className}Config = typeof ${options.className}Config.Type

/**
 * ${options.className} result schema
 */
export const ${options.className}Result = Schema.Struct({
  success: Schema.Boolean,
  message: Schema.optional(Schema.String),
  data: Schema.optional(Schema.Unknown)
})

/**
 * ${options.className} result type
 */
export type ${options.className}Result = typeof ${options.className}Result.Type
`;
