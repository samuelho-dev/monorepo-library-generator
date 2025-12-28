/**
 * TUI State Module
 *
 * Re-exports state types and reducer.
 *
 * @module monorepo-library-generator/cli/tui/state
 */

export { tuiReducer } from './reducer'

export type {
  GenerationStatus,
  TUIAction,
  TUIMode,
  TUIState
} from './types'
export {
  canGenerate,
  canNavigateToOptions,
  getLibraryTypeForGeneration,
  getNextPanel,
  getPreviousPanel,
  initialState,
  PANEL_ORDER
} from './types'
