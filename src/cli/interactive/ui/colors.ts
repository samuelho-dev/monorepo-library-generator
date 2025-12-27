/**
 * ANSI Color Utilities
 *
 * Simple ANSI escape code utilities for terminal output styling
 *
 * @module monorepo-library-generator/cli/interactive/ui/colors
 */

/**
 * ANSI escape codes for terminal colors and styles
 */
const ANSI: Readonly<{
  reset: string
  bold: string
  dim: string
  black: string
  red: string
  green: string
  yellow: string
  blue: string
  magenta: string
  cyan: string
  white: string
  brightBlack: string
  brightRed: string
  brightGreen: string
  brightYellow: string
  brightBlue: string
  brightMagenta: string
  brightCyan: string
  brightWhite: string
}> = Object.freeze({
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Bright foreground colors
  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m'
})

/**
 * Apply color formatting to text
 */
const colorize = (code: string) => (text: string) => `${code}${text}${ANSI.reset}`

/**
 * Color formatting functions
 */
export const colors: Readonly<{
  bold: (text: string) => string
  dim: (text: string) => string
  blue: (text: string) => string
  yellow: (text: string) => string
  cyan: (text: string) => string
  green: (text: string) => string
  red: (text: string) => string
  magenta: (text: string) => string
  white: (text: string) => string
  brightBlue: (text: string) => string
  brightYellow: (text: string) => string
  brightCyan: (text: string) => string
  brightGreen: (text: string) => string
  brightWhite: (text: string) => string
  root: (text: string) => string
  type: (text: string) => string
  name: (text: string) => string
  success: (text: string) => string
  error: (text: string) => string
  info: (text: string) => string
  warning: (text: string) => string
  muted: (text: string) => string
}> = Object.freeze({
  // Basic styles
  bold: colorize(ANSI.bold),
  dim: colorize(ANSI.dim),

  // Colors for wizard UI
  blue: colorize(ANSI.blue),
  yellow: colorize(ANSI.yellow),
  cyan: colorize(ANSI.cyan),
  green: colorize(ANSI.green),
  red: colorize(ANSI.red),
  magenta: colorize(ANSI.magenta),
  white: colorize(ANSI.white),

  // Bright variants
  brightBlue: colorize(ANSI.brightBlue),
  brightYellow: colorize(ANSI.brightYellow),
  brightCyan: colorize(ANSI.brightCyan),
  brightGreen: colorize(ANSI.brightGreen),
  brightWhite: colorize(ANSI.brightWhite),

  // Semantic colors for wizard
  root: colorize(ANSI.blue), // Workspace root
  type: colorize(ANSI.yellow), // Library type
  name: colorize(ANSI.cyan), // Library name
  success: colorize(ANSI.green),
  error: colorize(ANSI.red),
  info: colorize(ANSI.brightBlue),
  warning: colorize(ANSI.yellow),
  muted: colorize(ANSI.brightBlack)
})

/**
 * Format a file path with semantic colors
 *
 * @example
 * formatPath("libs", "contract", "product")
 * // Returns: "libs/contract/product" with each part colored differently
 */
export function formatPath(librariesRoot: string, libraryType: string, libraryName: string) {
  return `${colors.root(librariesRoot)}/${colors.type(libraryType)}/${colors.name(libraryName)}`
}

/**
 * Format a full path with workspace root
 */
export function formatFullPath(
  workspaceRoot: string,
  librariesRoot: string,
  libraryType: string,
  libraryName: string
) {
  return `${colors.muted(workspaceRoot)}/${formatPath(librariesRoot, libraryType, libraryName)}`
}

/**
 * Unicode box-drawing characters for wizard UI
 */
export const box: Readonly<{
  horizontal: string
  vertical: string
  topLeft: string
  topRight: string
  bottomLeft: string
  bottomRight: string
  teeRight: string
  teeLeft: string
  cross: string
}> = Object.freeze({
  horizontal: '─',
  vertical: '│',
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  teeRight: '├',
  teeLeft: '┤',
  cross: '┼'
})

/**
 * Status indicators
 */
export const status: Readonly<{
  pending: string
  inProgress: string
  completed: string
  error: string
  arrow: string
  bullet: string
}> = Object.freeze({
  pending: colors.muted('○'),
  inProgress: colors.yellow('◐'),
  completed: colors.green('✓'),
  error: colors.red('✗'),
  arrow: colors.cyan('→'),
  bullet: colors.muted('•')
})
