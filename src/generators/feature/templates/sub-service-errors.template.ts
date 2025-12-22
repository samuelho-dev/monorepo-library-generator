export const generateSubServiceErrorsTemplate = (options: { className: string }) =>
  `/**
 * ${options.className} Error Types
 */

import { Data } from "effect"

/**
 * ${options.className} validation error
 */
export class ${options.className}ValidationError extends Data.TaggedError("${options.className}ValidationError")<{
  message: string
  field?: string
}> {}

/**
 * ${options.className} execution error
 */
export class ${options.className}ExecutionError extends Data.TaggedError("${options.className}ExecutionError")<{
  message: string
  cause?: unknown
}> {}

/**
 * ${options.className} configuration error
 */
export class ${options.className}ConfigError extends Data.TaggedError("${options.className}ConfigError")<{
  message: string
  configKey?: string
}> {}
`;
