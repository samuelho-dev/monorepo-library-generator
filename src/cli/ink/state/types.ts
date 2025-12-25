/**
 * Wizard State Types for React Ink TUI
 *
 * @module monorepo-library-generator/cli/ink/state/types
 */

import type { FilePreview, LibraryType, WizardOptions, WizardSelection } from "../../interactive/types"

/**
 * Wizard step identifiers
 */
export type WizardStep =
  | "select-type"
  | "enter-name"
  | "enter-external-service"
  | "configure-options"
  | "preview"
  | "confirm"
  | "generating"
  | "complete"
  | "error"

/**
 * Wizard state - single interface for reducer compatibility
 */
export interface WizardState {
  readonly currentStep: WizardStep
  readonly librariesRoot: string
  readonly selection: WizardSelection | null
  readonly libraryType: LibraryType | null
  readonly libraryName: string
  readonly externalService: string
  readonly options: WizardOptions
  readonly filesToCreate: ReadonlyArray<FilePreview>
  readonly generationStatus: "idle" | "running" | "success" | "error"
  readonly generatedFiles: ReadonlyArray<string>
  readonly error: string | null
}

/**
 * Create initial wizard state
 */
export function createInitialState(librariesRoot: string) {
  const initialState: WizardState = {
    currentStep: "select-type",
    librariesRoot,
    selection: null,
    libraryType: null,
    libraryName: "",
    externalService: "",
    options: {},
    filesToCreate: [],
    generationStatus: "idle",
    generatedFiles: [],
    error: null
  }
  return initialState
}

/**
 * Wizard action types for useReducer
 */
export type WizardAction =
  | { readonly type: "SET_SELECTION"; readonly payload: WizardSelection }
  | { readonly type: "SET_LIBRARY_TYPE"; readonly payload: LibraryType }
  | { readonly type: "SET_LIBRARY_NAME"; readonly payload: string }
  | { readonly type: "SET_EXTERNAL_SERVICE"; readonly payload: string }
  | { readonly type: "SET_OPTION"; readonly payload: { key: keyof WizardOptions; value: unknown } }
  | { readonly type: "SET_OPTIONS"; readonly payload: WizardOptions }
  | { readonly type: "SET_FILES_TO_CREATE"; readonly payload: ReadonlyArray<FilePreview> }
  | { readonly type: "NEXT_STEP" }
  | { readonly type: "PREVIOUS_STEP" }
  | { readonly type: "GO_TO_STEP"; readonly payload: WizardStep }
  | { readonly type: "START_GENERATION" }
  | { readonly type: "ADD_GENERATED_FILE"; readonly payload: string }
  | { readonly type: "GENERATION_COMPLETE" }
  | { readonly type: "GENERATION_ERROR"; readonly payload: string }
  | { readonly type: "RESET" }

/**
 * Step transition constants
 */
const STEP_TRANSITIONS: Record<WizardStep, WizardStep> = {
  "select-type": "enter-name",
  "enter-name": "configure-options",
  "enter-external-service": "configure-options",
  "configure-options": "preview",
  "preview": "confirm",
  "confirm": "generating",
  "generating": "complete",
  "complete": "complete",
  "error": "error"
}

const STEP_BACK_TRANSITIONS: Record<WizardStep, WizardStep> = {
  "select-type": "select-type",
  "enter-name": "select-type",
  "enter-external-service": "enter-name",
  "configure-options": "enter-name",
  "preview": "configure-options",
  "confirm": "preview",
  "generating": "generating",
  "complete": "complete",
  "error": "error"
}

/**
 * Get next step based on current step and state
 */
function getNextStep(state: WizardState) {
  // Init skips name/options and goes directly to preview
  if (state.currentStep === "select-type" && state.selection === "init") {
    return "preview"
  }
  // Provider type needs external service name
  if (state.currentStep === "enter-name" && state.libraryType === "provider") {
    return "enter-external-service"
  }
  return STEP_TRANSITIONS[state.currentStep]
}

/**
 * Get previous step based on current step and state
 */
function getPreviousStep(state: WizardState) {
  // Provider type goes back to enter-name from configure-options through external-service
  if (state.currentStep === "configure-options" && state.libraryType === "provider") {
    return "enter-external-service"
  }
  return STEP_BACK_TRANSITIONS[state.currentStep]
}

/**
 * State update helpers with proper typing
 */
function updateState(state: WizardState, updates: Partial<WizardState>) {
  return { ...state, ...updates }
}

/**
 * Wizard state reducer
 */
export function wizardReducer(state: WizardState, action: WizardAction) {
  switch (action.type) {
    case "SET_SELECTION": {
      const selection = action.payload
      const libraryType: LibraryType | null = selection === "init" ? null : selection
      return updateState(state, { selection, libraryType })
    }

    case "SET_LIBRARY_TYPE":
      return updateState(state, { libraryType: action.payload })

    case "SET_LIBRARY_NAME":
      return updateState(state, { libraryName: action.payload })

    case "SET_EXTERNAL_SERVICE":
      return updateState(state, { externalService: action.payload })

    case "SET_OPTION":
      return updateState(state, {
        options: { ...state.options, [action.payload.key]: action.payload.value }
      })

    case "SET_OPTIONS":
      return updateState(state, { options: action.payload })

    case "SET_FILES_TO_CREATE":
      return updateState(state, { filesToCreate: action.payload })

    case "NEXT_STEP":
      return updateState(state, { currentStep: getNextStep(state) })

    case "PREVIOUS_STEP":
      return updateState(state, { currentStep: getPreviousStep(state) })

    case "GO_TO_STEP":
      return updateState(state, { currentStep: action.payload })

    case "START_GENERATION":
      return updateState(state, {
        currentStep: "generating",
        generationStatus: "running",
        generatedFiles: [],
        error: null
      })

    case "ADD_GENERATED_FILE":
      return updateState(state, {
        generatedFiles: [...state.generatedFiles, action.payload]
      })

    case "GENERATION_COMPLETE":
      return updateState(state, {
        currentStep: "complete",
        generationStatus: "success"
      })

    case "GENERATION_ERROR":
      return updateState(state, {
        currentStep: "error",
        generationStatus: "error",
        error: action.payload
      })

    case "RESET":
      return createInitialState(state.librariesRoot)

    default:
      return state
  }
}
