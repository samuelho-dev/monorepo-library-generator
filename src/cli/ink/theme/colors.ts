/**
 * Theme Colors for Ink TUI
 *
 * Color palette and semantic colors for the wizard interface.
 *
 * @module monorepo-library-generator/cli/ink/theme/colors
 */

/**
 * Base color palette
 */
export const palette = {
  // Primary colors
  cyan: "cyan",
  blue: "blue",
  green: "green",
  yellow: "yellow",
  red: "red",
  magenta: "magenta",
  white: "white",
  gray: "gray"
} as const

/**
 * Semantic colors for the wizard UI
 */
export const colors = {
  // Status colors
  success: palette.green,
  error: palette.red,
  warning: palette.yellow,
  info: palette.cyan,

  // UI element colors
  primary: palette.cyan,
  secondary: palette.blue,
  muted: palette.gray,

  // Wizard-specific colors
  librariesRoot: palette.blue,
  libraryType: palette.yellow,
  libraryName: palette.cyan,

  // Progress colors
  progressActive: palette.cyan,
  progressComplete: palette.green,
  progressPending: palette.gray,

  // File tree colors
  directory: palette.blue,
  file: palette.white,
  fileOptional: palette.gray
} as const

/**
 * Status indicator characters
 */
export const statusIcons = {
  pending: "\u25CB", // ○
  inProgress: "\u25D0", // ◐
  completed: "\u2713", // ✓
  error: "\u2717", // ✗
  arrow: "\u2192", // →
  bullet: "\u2022", // •
  chevronRight: "\u203A", // ›
  chevronDown: "\u2304" // ⌄
} as const

/**
 * Box drawing characters
 */
export const boxChars = {
  horizontal: "\u2500", // ─
  vertical: "\u2502", // │
  topLeft: "\u250C", // ┌
  topRight: "\u2510", // ┐
  bottomLeft: "\u2514", // └
  bottomRight: "\u2518", // ┘
  teeRight: "\u251C", // ├
  teeLeft: "\u2524", // ┤
  cross: "\u253C" // ┼
} as const
