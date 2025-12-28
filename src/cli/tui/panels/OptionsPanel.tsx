/**
 * Options Panel Component
 *
 * Panel for configuring library options with dynamic form.
 *
 * @module monorepo-library-generator/cli/tui/panels/OptionsPanel
 */

import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'
import { useCallback, useMemo, useState } from 'react'

import { getVisibleOptions, type OptionFieldConfig, validateName } from '../../core'
import { Panel } from '../components'
import { usePanelFocus } from '../hooks'
import { canGenerate, getLibraryTypeForGeneration, type TUIAction, type TUIState } from '../state'
import { colors, icons } from '../theme/colors'

interface OptionsPanelProps {
  readonly state: TUIState
  readonly dispatch: React.Dispatch<TUIAction>
}

/**
 * Options panel with name input and configuration options
 */
export function OptionsPanel({ state, dispatch }: OptionsPanelProps) {
  const isActive = state.activePanel === 'options'
  const [editingField, setEditingField] = useState<string | null>(null)
  const [localNameValue, setLocalNameValue] = useState(state.libraryName)

  // Get library type for options
  const libraryType = state.selectedType ? getLibraryTypeForGeneration(state.selectedType) : null

  // Get visible options for current type
  const visibleOptions = useMemo(() => {
    if (!libraryType) return []
    return getVisibleOptions(libraryType, state.options)
  }, [libraryType, state.options])

  // Build list of all editable fields
  const allFields = useMemo(() => {
    const fields: Array<{ key: string; type: 'name' | 'option'; config?: OptionFieldConfig }> = [
      { key: 'name', type: 'name' }
    ]
    for (const opt of visibleOptions) {
      fields.push({ key: opt.key, type: 'option', config: opt })
    }
    return fields
  }, [visibleOptions])

  // Validation
  const nameValidation = validateName(state.libraryName)

  // Handle field navigation
  const handleNavigate = useCallback(
    (direction: 'up' | 'down') => {
      if (editingField) return
      const currentIndex = state.optionsSelectedIndex
      let newIndex: number
      if (direction === 'down') {
        newIndex = currentIndex < allFields.length - 1 ? currentIndex + 1 : 0
      } else {
        newIndex = currentIndex > 0 ? currentIndex - 1 : allFields.length - 1
      }
      dispatch({ type: 'SET_OPTIONS_INDEX', payload: newIndex })
    },
    [allFields.length, dispatch, editingField, state.optionsSelectedIndex]
  )

  // Handle selection/toggle
  const handleSelect = useCallback(() => {
    const field = allFields[state.optionsSelectedIndex]
    if (!field) return

    if (field.type === 'name') {
      setEditingField('name')
      setLocalNameValue(state.libraryName)
      return
    }

    if (field.config) {
      const { config } = field
      if (config.type === 'boolean') {
        const currentValue = state.options[config.key] as boolean | undefined
        dispatch({
          type: 'SET_OPTION',
          payload: { key: config.key, value: !currentValue }
        })
      } else if (config.type === 'text') {
        setEditingField(config.key)
      } else if (config.type === 'select' && config.options) {
        const currentValue = state.options[config.key] as string | undefined
        const currentIdx = config.options.indexOf(currentValue ?? '')
        const nextIdx = (currentIdx + 1) % config.options.length
        dispatch({
          type: 'SET_OPTION',
          payload: { key: config.key, value: config.options[nextIdx] }
        })
      }
    }
  }, [allFields, dispatch, state.libraryName, state.options, state.optionsSelectedIndex])

  // Handle text input submission
  const handleTextSubmit = useCallback(
    (field: string, value: string) => {
      if (field === 'name') {
        dispatch({ type: 'SET_LIBRARY_NAME', payload: value })
      } else {
        dispatch({
          type: 'SET_OPTION',
          payload: { key: field as keyof typeof state.options, value }
        })
      }
      setEditingField(null)
    },
    [dispatch]
  )

  // Handle escape to cancel editing
  useInput(
    (input, key) => {
      if (key.escape && editingField) {
        setEditingField(null)
      }
    },
    { isActive: isActive && editingField !== null }
  )

  // Panel focus handling
  usePanelFocus({
    panelId: 'options',
    isActive,
    dispatch,
    onNavigate: handleNavigate,
    onSelect: handleSelect,
    disabled: editingField !== null
  })

  if (!state.selectedType) {
    return (
      <Panel id="options" isActive={isActive}>
        <Text color={colors.muted}>Select a type first</Text>
      </Panel>
    )
  }

  return (
    <Panel id="options" isActive={isActive}>
      <Box flexDirection="column">
        {allFields.map((field, index) => {
          const isSelected = index === state.optionsSelectedIndex
          const isEditing = editingField === field.key

          if (field.type === 'name') {
            return (
              <Box key="name" flexDirection="column">
                <Box>
                  <Text color={isSelected ? colors.primary : colors.muted}>
                    {isSelected ? icons.selected : icons.unselected}{' '}
                  </Text>
                  <Text color={colors.secondary}>Name: </Text>
                  {isEditing ? (
                    <TextInput
                      value={localNameValue}
                      onChange={setLocalNameValue}
                      onSubmit={(value) => handleTextSubmit('name', value)}
                      placeholder="my-library"
                    />
                  ) : (
                    <Text color={state.libraryName ? colors.libraryName : colors.placeholder}>
                      {state.libraryName || '<enter name>'}
                    </Text>
                  )}
                </Box>
                {!nameValidation.isValid && state.libraryName && (
                  <Box marginLeft={3}>
                    <Text color={colors.error}>{nameValidation.error}</Text>
                  </Box>
                )}
              </Box>
            )
          }

          if (field.config) {
            const { config } = field
            const value = state.options[config.key]

            if (config.type === 'boolean') {
              return (
                <Box key={config.key}>
                  <Text color={isSelected ? colors.primary : colors.muted}>
                    {isSelected ? icons.selected : icons.unselected}{' '}
                  </Text>
                  <Text color={colors.secondary}>
                    {value ? icons.checked : icons.unchecked} {config.label}
                  </Text>
                </Box>
              )
            }

            if (config.type === 'select' && config.options) {
              return (
                <Box key={config.key}>
                  <Text color={isSelected ? colors.primary : colors.muted}>
                    {isSelected ? icons.selected : icons.unselected}{' '}
                  </Text>
                  <Text color={colors.secondary}>{config.label}: </Text>
                  <Text color={colors.highlight}>{(value as string) ?? config.options[0]}</Text>
                </Box>
              )
            }

            if (config.type === 'text') {
              return (
                <Box key={config.key}>
                  <Text color={isSelected ? colors.primary : colors.muted}>
                    {isSelected ? icons.selected : icons.unselected}{' '}
                  </Text>
                  <Text color={colors.secondary}>{config.label}: </Text>
                  {isEditing ? (
                    <TextInput
                      value={(value as string) ?? ''}
                      onChange={(v) =>
                        dispatch({ type: 'SET_OPTION', payload: { key: config.key, value: v } })
                      }
                      onSubmit={(v) => handleTextSubmit(config.key, v)}
                      placeholder={config.placeholder}
                    />
                  ) : (
                    <Text color={value ? colors.secondary : colors.placeholder}>
                      {(value as string) || config.placeholder || '<empty>'}
                    </Text>
                  )}
                </Box>
              )
            }
          }

          return null
        })}

        {/* Generate status */}
        <Box marginTop={1}>
          <Text color={canGenerate(state) ? colors.success : colors.muted}>
            {canGenerate(state) ? '[G] Ready to generate' : 'Enter name to generate'}
          </Text>
        </Box>
      </Box>
    </Panel>
  )
}
