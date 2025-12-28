/**
 * TUI State Reducer
 *
 * Reducer for managing TUI state.
 *
 * @module monorepo-library-generator/cli/tui/state/reducer
 */

import type { GeneratorOptions } from '../../core'
import { getNextPanel, getPreviousPanel, initialState, type TUIAction, type TUIState } from './types'

/**
 * TUI state reducer
 */
export function tuiReducer(state: TUIState, action: TUIAction): TUIState {
  switch (action.type) {
    // Initialization
    case 'SET_WORKSPACE':
      return {
        ...state,
        workspace: action.payload
      }

    // Panel navigation
    case 'SET_ACTIVE_PANEL':
      return {
        ...state,
        activePanel: action.payload,
        panelHistory: [...state.panelHistory, state.activePanel]
      }

    case 'NEXT_PANEL':
      return {
        ...state,
        activePanel: getNextPanel(state.activePanel),
        panelHistory: [...state.panelHistory, state.activePanel]
      }

    case 'PREVIOUS_PANEL':
      return {
        ...state,
        activePanel: getPreviousPanel(state.activePanel),
        panelHistory: [...state.panelHistory, state.activePanel]
      }

    // Type selection
    case 'SET_HOVERED_TYPE':
      return {
        ...state,
        hoveredType: action.payload
      }

    case 'SELECT_TYPE':
      return {
        ...state,
        selectedType: action.payload,
        hoveredType: action.payload,
        mode: 'configure',
        // Move to options panel after selection
        activePanel: 'options',
        panelHistory: [...state.panelHistory, state.activePanel]
      }

    case 'SET_TYPES_INDEX':
      return {
        ...state,
        typesSelectedIndex: action.payload
      }

    // Configuration
    case 'SET_LIBRARY_NAME':
      return {
        ...state,
        libraryName: action.payload
      }

    case 'SET_EXTERNAL_SERVICE':
      return {
        ...state,
        externalService: action.payload
      }

    case 'SET_OPTION': {
      const newOptions: GeneratorOptions = {
        ...state.options,
        [action.payload.key]: action.payload.value
      }
      return {
        ...state,
        options: newOptions
      }
    }

    case 'SET_OPTIONS_INDEX':
      return {
        ...state,
        optionsSelectedIndex: action.payload
      }

    // Preview
    case 'SET_FILES_TO_CREATE':
      return {
        ...state,
        filesToCreate: action.payload
      }

    // Generation
    case 'START_GENERATION':
      return {
        ...state,
        mode: 'generating',
        generationStatus: 'generating',
        error: null
      }

    case 'GENERATION_SUCCESS':
      return {
        ...state,
        mode: 'complete',
        generationStatus: 'success'
      }

    case 'GENERATION_ERROR':
      return {
        ...state,
        mode: 'error',
        generationStatus: 'error',
        error: action.payload
      }

    // Reset
    case 'RESET_FOR_NEW':
      return {
        ...initialState,
        workspace: state.workspace // Preserve workspace context
      }

    default:
      return state
  }
}
