/**
 * Version information
 *
 * This constant is replaced at build time by esbuild with the actual version
 * from package.json using the define option.
 */

declare const __VERSION__: string

export const VERSION = typeof __VERSION__ !== "undefined" ? __VERSION__ : "0.0.0-dev"
