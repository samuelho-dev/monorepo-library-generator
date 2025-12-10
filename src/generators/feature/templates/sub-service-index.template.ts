export const generateSubServiceIndexTemplate = (options: {
  className: string
}) =>
  `/**
 * ${options.className} Service Exports
 */

export * from "./service"
export * from "./errors"
export * from "./types"
export * from "./layers"
`
