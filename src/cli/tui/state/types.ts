/**
 * TUI State Types
 *
 * Type definitions for the panel-based TUI state.
 *
 * @module monorepo-library-generator/cli/tui/state/types
 */

import type {
  FilePreview,
  GeneratorOptions,
  LibraryType,
  SingleLibraryType,
  WizardAction,
  WizardSelection,
  WorkspaceContext
} from "../../core"
import type { PanelId } from "../theme/colors"

/**
 * TUI application mode
 */
export type TUIMode = "browse" | "configure" | "generating" | "complete" | "error"

/**
 * Generation status
 */
export type GenerationStatus = "idle" | "generating" | "success" | "error"

/**
 * Complete TUI state
 */
export interface TUIState {
  // Application mode
  readonly mode: TUIMode

  // Panel navigation
  readonly activePanel: PanelId
  readonly panelHistory: ReadonlyArray<PanelId>

  // Workspace context
  readonly workspace: WorkspaceContext | null

  // Type selection (hover for preview, selected for configuration)
  readonly hoveredType: WizardSelection | null
  readonly selectedType: WizardSelection | null

  // Library configuration
  readonly libraryName: string
  readonly externalService: string
  readonly options: GeneratorOptions

  // Preview
  readonly filesToCreate: ReadonlyArray<FilePreview>

  // Generation
  readonly generationStatus: GenerationStatus
  readonly error: string | null

  // UI state
  readonly typesSelectedIndex: number
  readonly optionsSelectedIndex: number
}

/**
 * Initial state
 */
export const initialState: TUIState = {
  mode: "browse",
  activePanel: "types",
  panelHistory: [],
  workspace: null,
  hoveredType: null,
  selectedType: null,
  libraryName: "",
  externalService: "",
  options: {},
  filesToCreate: [],
  generationStatus: "idle",
  error: null,
  typesSelectedIndex: 0,
  optionsSelectedIndex: 0
}

/**
 * TUI Actions
 */
export type TUIAction =
  // Initialization
  | { readonly type: "SET_WORKSPACE"; readonly payload: WorkspaceContext }
  // Panel navigation
  | { readonly type: "SET_ACTIVE_PANEL"; readonly payload: PanelId }
  | { readonly type: "NEXT_PANEL" }
  | { readonly type: "PREVIOUS_PANEL" }
  // Type selection
  | { readonly type: "SET_HOVERED_TYPE"; readonly payload: WizardSelection | null }
  | { readonly type: "SELECT_TYPE"; readonly payload: WizardSelection }
  | { readonly type: "SET_TYPES_INDEX"; readonly payload: number }
  // Configuration
  | { readonly type: "SET_LIBRARY_NAME"; readonly payload: string }
  | { readonly type: "SET_EXTERNAL_SERVICE"; readonly payload: string }
  | { readonly type: "SET_OPTION"; readonly payload: { key: keyof GeneratorOptions; value: unknown } }
  | { readonly type: "SET_OPTIONS_INDEX"; readonly payload: number }
  // Preview
  | { readonly type: "SET_FILES_TO_CREATE"; readonly payload: ReadonlyArray<FilePreview> }
  // Generation
  | { readonly type: "START_GENERATION" }
  | { readonly type: "GENERATION_SUCCESS" }
  | { readonly type: "GENERATION_ERROR"; readonly payload: string }
  // Reset
  | { readonly type: "RESET_FOR_NEW" }

/**
 * Panel navigation order
 */
export const PANEL_ORDER: ReadonlyArray<PanelId> = ["types", "options", "preview"]

/**
 * Get next panel in order
 */
export function getNextPanel(current: PanelId): PanelId {
  const currentIndex = PANEL_ORDER.indexOf(current)
  const nextIndex = (currentIndex + 1) % PANEL_ORDER.length
  return PANEL_ORDER[nextIndex]
}

/**
 * Get previous panel in order
 */
export function getPreviousPanel(current: PanelId): PanelId {
  const currentIndex = PANEL_ORDER.indexOf(current)
  const prevIndex = (currentIndex - 1 + PANEL_ORDER.length) % PANEL_ORDER.length
  return PANEL_ORDER[prevIndex]
}

/**
 * Check if we can navigate to options panel
 */
export function canNavigateToOptions(state: TUIState): boolean {
  return state.selectedType !== null
}

/**
 * Check if we can generate
 */
export function canGenerate(state: TUIState): boolean {
  if (!state.selectedType) return false
  if (!state.libraryName.trim()) return false
  if (state.generationStatus === "generating") return false
  return true
}

/**
 * Get library type for generation (converts WizardAction to LibraryType)
 */
export function getLibraryTypeForGeneration(selection: WizardSelection): LibraryType | null {
  if (selection === "init") return null // Init is handled separately
  if (selection === "domain") return "domain"
  return selection as SingleLibraryType
}
