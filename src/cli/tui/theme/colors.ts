/**
 * TUI Color Theme
 *
 * Color definitions for the TUI components.
 *
 * @module monorepo-library-generator/cli/tui/theme/colors
 */

/**
 * Primary colors
 */
export const colors = {
  // Panel states
  panelActive: 'cyan',
  panelInactive: 'gray',
  panelBorder: 'gray',

  // Text colors
  primary: 'cyan',
  secondary: 'white',
  muted: 'gray',
  highlight: 'yellow',

  // Status colors
  success: 'green',
  error: 'red',
  warning: 'yellow',
  info: 'blue',

  // Library type colors
  libraryType: 'magenta',
  libraryName: 'green',
  root: 'blue',

  // Input states
  inputActive: 'cyan',
  inputInactive: 'gray',
  placeholder: 'gray'
} as const

/**
 * Status icons for display
 */
export const icons = {
  // Selection
  selected: '>',
  unselected: ' ',
  chevron: '>',

  // Checkboxes
  checked: '[x]',
  unchecked: '[ ]',

  // Status
  success: '✓',
  error: '✗',
  warning: '!',
  info: 'i',
  spinner: '◐',

  // Tree
  treeBranch: '├─',
  treeLast: '└─',
  treeVertical: '│',

  // Arrows
  arrowRight: '→',
  arrowDown: '↓'
} as const

/**
 * Panel IDs
 */
export type PanelId = 'types' | 'options' | 'preview'

/**
 * Panel configuration
 */
export const panelConfig: Record<PanelId, { title: string; shortcut: string }> = {
  types: { title: 'Types', shortcut: '1' },
  options: { title: 'Options', shortcut: '2' },
  preview: { title: 'Preview', shortcut: '3' }
}
