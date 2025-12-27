/**
 * Options Form Component
 *
 * Configurable options for library generation.
 * Supports boolean toggles, text inputs, select dropdowns, and multi-select tags.
 * Uses centralized config layer for option definitions.
 *
 * @module monorepo-library-generator/cli/ink/components/OptionsForm
 */

import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'
import { useState } from 'react'
import { tagExists } from '../../../utils/workspace-tags'
import {
  type BooleanOptionConfig,
  getOptionsForType,
  type OptionConfig,
  type TextOptionConfig
} from '../../interactive/config'
import type { LibraryType, WizardOptions } from '../../interactive/types'
import { useWorkspaceTags } from '../hooks/useWorkspaceTags'
import { colors, statusIcons } from '../theme/colors'
import { TagsSelector } from './TagsSelector'

interface OptionsFormProps {
  readonly libraryType?: LibraryType
  readonly options: WizardOptions
  readonly onOptionsChange: (options: WizardOptions) => void
  readonly onSubmit: () => void
  readonly workspaceRoot: string
}

/** Tags component state */
interface TagsState {
  mode: 'navigation' | 'adding-tag'
  focusedIndex: number
  newTagValue: string
}

export function OptionsForm({
  libraryType,
  options,
  onOptionsChange,
  onSubmit,
  workspaceRoot
}: OptionsFormProps) {
  const availableOptions = libraryType ? getOptionsForType(libraryType) : []
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [description, setDescription] = useState(options.description ?? '')
  const [editingField, setEditingField] = useState<string | null>(null)
  const [textInputValue, setTextInputValue] = useState('')

  // Tags multi-select state
  const [tagsState, setTagsState] = useState<TagsState>({
    mode: 'navigation',
    focusedIndex: 0,
    newTagValue: ''
  })

  // Fetch workspace tags
  const { customTags } = useWorkspaceTags(workspaceRoot)

  // Field indices
  const DESCRIPTION_INDEX = availableOptions.length
  const TAGS_INDEX = availableOptions.length + 1
  const SUBMIT_INDEX = availableOptions.length + 2

  // Total items: options + description + tags + submit
  const totalItems = availableOptions.length + 3

  // Get the currently selected option config
  const currentOption =
    selectedIndex < availableOptions.length ? availableOptions[selectedIndex] : null

  // Check if tags field is active (selected and not editing another field)
  const isTagsActive = selectedIndex === TAGS_INDEX && editingField === null

  useInput((input, key) => {
    // Handle text editing mode for description and config text options
    if (editingField !== null && editingField !== 'tags') {
      if (key.return) {
        // Save and exit edit mode
        if (editingField === 'description') {
          onOptionsChange({ ...options, description: description.trim() || undefined })
        } else {
          // It's a text option from config
          onOptionsChange({ ...options, [editingField]: textInputValue.trim() || undefined })
        }
        setEditingField(null)
        setTextInputValue('')
      } else if (key.escape) {
        setEditingField(null)
        setTextInputValue('')
      }
      return
    }

    // Handle tags field input (centralized handling)
    if (isTagsActive) {
      if (tagsState.mode === 'adding-tag') {
        if (key.return && tagsState.newTagValue.trim()) {
          const newTag = tagsState.newTagValue.trim()
          const allExisting = [...(options.selectedTags ?? []), ...customTags]

          if (!tagExists(newTag, allExisting)) {
            onOptionsChange({
              ...options,
              selectedTags: [...(options.selectedTags ?? []), newTag]
            })
          }
          setTagsState({ mode: 'navigation', focusedIndex: 0, newTagValue: '' })
        } else if (key.escape) {
          setTagsState((s) => ({ ...s, mode: 'navigation', newTagValue: '' }))
        }
        return // TextInput handles typing
      }

      // Tags navigation mode
      if (key.upArrow) {
        setTagsState((s) => ({ ...s, focusedIndex: Math.max(0, s.focusedIndex - 1) }))
        return
      } else if (key.downArrow) {
        const maxIdx = customTags.length // Including "Add new tag" option
        setTagsState((s) => ({ ...s, focusedIndex: Math.min(maxIdx, s.focusedIndex + 1) }))
        return
      } else if (input === ' ' && tagsState.focusedIndex < customTags.length) {
        // Toggle tag selection
        const tag = customTags[tagsState.focusedIndex]
        if (tag) {
          const current = options.selectedTags ?? []
          if (current.includes(tag)) {
            onOptionsChange({ ...options, selectedTags: current.filter((t) => t !== tag) })
          } else {
            onOptionsChange({ ...options, selectedTags: [...current, tag] })
          }
        }
        return
      } else if (key.return) {
        if (tagsState.focusedIndex === customTags.length) {
          // Enter "Add new tag" mode
          setTagsState((s) => ({ ...s, mode: 'adding-tag' }))
        } else {
          // Move to next field when pressing Enter on a tag (not adding)
          setSelectedIndex(SUBMIT_INDEX)
        }
        return
      }
    }

    // General navigation (not in tags or editing mode)
    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1))
      // Reset tags state when leaving tags field
      if (selectedIndex === TAGS_INDEX) {
        setTagsState({ mode: 'navigation', focusedIndex: 0, newTagValue: '' })
      }
    } else if (key.downArrow) {
      setSelectedIndex((i) => Math.min(totalItems - 1, i + 1))
      // Reset tags state when leaving tags field
      if (selectedIndex === TAGS_INDEX) {
        setTagsState({ mode: 'navigation', focusedIndex: 0, newTagValue: '' })
      }
    } else if (key.leftArrow || key.rightArrow) {
      // Handle select option cycling
      if (currentOption?.type === 'select') {
        const selectOpt = currentOption
        const currentValue = options[selectOpt.key]
        const valueStr = typeof currentValue === 'string' ? currentValue : ''
        const currentIdx = valueStr ? selectOpt.options.indexOf(valueStr) : -1
        let newIdx: number

        if (key.rightArrow) {
          newIdx = currentIdx < selectOpt.options.length - 1 ? currentIdx + 1 : 0
        } else {
          newIdx = currentIdx > 0 ? currentIdx - 1 : selectOpt.options.length - 1
        }

        onOptionsChange({ ...options, [selectOpt.key]: selectOpt.options[newIdx] })
      }
    } else if (key.return || input === ' ') {
      if (selectedIndex < availableOptions.length && currentOption) {
        // Handle option based on type
        if (currentOption.type === 'boolean') {
          const currentValue = options[currentOption.key]
          onOptionsChange({ ...options, [currentOption.key]: !currentValue })
        } else if (currentOption.type === 'text') {
          const textValue = options[currentOption.key]
          setTextInputValue(typeof textValue === 'string' ? textValue : '')
          setEditingField(currentOption.key)
        } else if (currentOption.type === 'select') {
          // Cycle to next option on Enter
          const selectOpt = currentOption
          const currentValue = options[selectOpt.key]
          const valueStr = typeof currentValue === 'string' ? currentValue : ''
          const currentIdx = valueStr ? selectOpt.options.indexOf(valueStr) : -1
          const newIdx = currentIdx < selectOpt.options.length - 1 ? currentIdx + 1 : 0
          onOptionsChange({ ...options, [selectOpt.key]: selectOpt.options[newIdx] })
        }
      } else if (selectedIndex === DESCRIPTION_INDEX) {
        setEditingField('description')
      } else if (selectedIndex === SUBMIT_INDEX) {
        onSubmit()
      }
      // Tags field handled above in isTagsActive block
    }
  })

  // Render a single option based on its type
  const renderOption = (opt: OptionConfig, index: number) => {
    const isSelected = selectedIndex === index
    const prefix = isSelected ? statusIcons.chevronRight : ' '

    if (opt.type === 'boolean') {
      const boolOpt = opt as BooleanOptionConfig
      const isEnabled = options[boolOpt.key]
      return (
        <Box key={boolOpt.key}>
          <Text color={isSelected ? colors.primary : undefined}>{prefix} </Text>
          <Text color={isEnabled ? colors.success : colors.muted}>
            {isEnabled ? statusIcons.completed : statusIcons.pending}
          </Text>
          <Text> {boolOpt.label}</Text>
          <Text color={colors.muted}> - {boolOpt.description}</Text>
        </Box>
      )
    }

    if (opt.type === 'text') {
      const textOpt = opt as TextOptionConfig
      const value = options[textOpt.key]
      const isEditing = editingField === textOpt.key
      return (
        <Box key={textOpt.key}>
          <Text color={isSelected ? colors.primary : undefined}>{prefix} </Text>
          <Text>{textOpt.label}: </Text>
          {isEditing ? (
            <TextInput
              value={textInputValue}
              onChange={setTextInputValue}
              placeholder={textOpt.placeholder ?? 'Enter value'}
            />
          ) : (
            <Text color={value ? colors.info : colors.muted}>
              {value || `(${textOpt.placeholder ?? 'press Enter to edit'})`}
            </Text>
          )}
        </Box>
      )
    }

    if (opt.type === 'select') {
      const selectOpt = opt
      const value = options[selectOpt.key]
      return (
        <Box key={selectOpt.key}>
          <Text color={isSelected ? colors.primary : undefined}>{prefix} </Text>
          <Text>{selectOpt.label}: </Text>
          <Text color={colors.muted}>{statusIcons.arrow} </Text>
          {selectOpt.options.map((optValue, i) => (
            <Text key={optValue}>
              <Text
                color={value === optValue ? colors.info : colors.muted}
                bold={value === optValue}
              >
                {optValue}
              </Text>
              {i < selectOpt.options.length - 1 && <Text color={colors.muted}> | </Text>}
            </Text>
          ))}
          {isSelected && <Text color={colors.muted}> (use left/right)</Text>}
        </Box>
      )
    }

    return null
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Configure options:</Text>
      </Box>

      {/* Dynamic options from config */}
      {availableOptions.map((opt, index) => renderOption(opt, index))}

      {availableOptions.length > 0 && <Box marginTop={1} />}

      {/* Description field */}
      <Box>
        <Text color={selectedIndex === DESCRIPTION_INDEX ? colors.primary : undefined}>
          {selectedIndex === DESCRIPTION_INDEX ? statusIcons.chevronRight : ' '}{' '}
        </Text>
        <Text>Description: </Text>
        {editingField === 'description' ? (
          <TextInput
            value={description}
            onChange={setDescription}
            placeholder="Optional description"
          />
        ) : (
          <Text color={description ? colors.info : colors.muted}>
            {description || '(press Enter to edit)'}
          </Text>
        )}
      </Box>

      {/* Tags multi-select field */}
      <Box flexDirection="column" marginTop={1}>
        <Box>
          <Text color={selectedIndex === TAGS_INDEX ? colors.primary : undefined}>
            {selectedIndex === TAGS_INDEX ? statusIcons.chevronRight : ' '}{' '}
          </Text>
          <Text>Tags:</Text>
        </Box>
        <Box marginLeft={2}>
          <TagsSelector
            availableTags={customTags}
            selectedTags={options.selectedTags ?? []}
            focusedIndex={tagsState.focusedIndex}
            mode={tagsState.mode}
            newTagValue={tagsState.newTagValue}
            onNewTagValueChange={(val) => setTagsState((s) => ({ ...s, newTagValue: val }))}
            isActive={isTagsActive}
          />
        </Box>
      </Box>

      <Box marginTop={1} />

      {/* Submit button */}
      <Box>
        <Text color={selectedIndex === SUBMIT_INDEX ? colors.primary : undefined}>
          {selectedIndex === SUBMIT_INDEX ? statusIcons.chevronRight : ' '}{' '}
        </Text>
        <Text bold color={selectedIndex === SUBMIT_INDEX ? colors.success : undefined}>
          Continue to preview {statusIcons.arrow}
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color={colors.muted}>
          Use arrow keys to navigate, Enter/Space to toggle, left/right for dropdowns
        </Text>
      </Box>
    </Box>
  )
}
