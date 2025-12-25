/**
 * Tags Selector Component
 *
 * Multi-select component for choosing tags from workspace.
 * Pure presentational component - input handling is centralized in parent.
 *
 * @module monorepo-library-generator/cli/ink/components/TagsSelector
 */

import { Box, Text } from 'ink';
import TextInput from 'ink-text-input'
import { colors, statusIcons } from '../theme/colors'

interface TagsSelectorProps {
  /** Available tags from workspace */
  readonly availableTags: readonly string[];
  /** Currently selected tags */
  readonly selectedTags: readonly string[];
  /** Index of focused tag in list */
  readonly focusedIndex: number;
  /** Current interaction mode */
  readonly mode: 'navigation' | 'adding-tag';
  /** Value of new tag input */
  readonly newTagValue: string;
  /** Callback when new tag value changes */
  readonly onNewTagValueChange: (value: string) => void;
  /** Whether this component is active (has focus) */
  readonly isActive: boolean;
}

/**
 * Multi-select tags component with checkboxes and custom tag input
 */
export function TagsSelector({
  availableTags,
  selectedTags,
  focusedIndex,
  mode,
  newTagValue,
  onNewTagValueChange,
  isActive,
}: TagsSelectorProps) {
  // Empty state - no existing tags in workspace
  if (availableTags.length === 0) {
    const isAddingFocused = isActive && focusedIndex === 0

    return (
      <Box flexDirection="column">
        <Text color={colors.muted}>No existing tags found in workspace</Text>

        {/* Add new tag option */}
        <Box>
          <Text color={isAddingFocused ? colors.primary : undefined}>
            {isAddingFocused ? statusIcons.chevronRight : ' '}
          </Text>
          <Text color={colors.info}>+ Add tag: </Text>
          {mode === 'adding-tag' ? (
            <TextInput
              value={newTagValue}
              onChange={onNewTagValueChange}
              placeholder="my-custom-tag"
            />
          ) : (
            <Text color={colors.muted}>(press Enter)</Text>
          )}
        </Box>

        {/* Show added tags */}
        {selectedTags.length > 0 && (
          <Box marginTop={1}>
            <Text color={colors.info}>Added: {selectedTags.join(', ')}</Text>
          </Box>
        )}

        {/* Help text */}
        {isActive && (
          <Box marginTop={1}>
            <Text color={colors.muted}>
              {mode === 'adding-tag'
                ? 'Enter confirm \u2022 Esc cancel'
                : 'Enter add custom tag'}
            </Text>
          </Box>
        )}
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      {/* Tag list with checkboxes */}
      {availableTags.map((tag, index) => {
        const isFocused = isActive && mode === 'navigation' && focusedIndex === index;
        const isSelected = selectedTags.includes(tag)
        const checkbox = isSelected ? statusIcons.completed : statusIcons.pending

        return (
          <Box key={tag}>
            <Text color={isFocused ? colors.primary : undefined}>
              {isFocused ? statusIcons.chevronRight : ' '}
            </Text>
            <Text color={isSelected ? colors.success : colors.muted}>{checkbox}</Text>
            <Text bold={isFocused}> {tag}</Text>
          </Box>
        )
      })}

      {/* Add new tag option */}
      <Box>
        <Text
          color={
            isActive && focusedIndex === availableTags.length ? colors.primary : undefined
          }
        >
          {isActive && focusedIndex === availableTags.length
            ? statusIcons.chevronRight
            : ' '}
        </Text>
        <Text color={colors.info}>+ Add custom tag: </Text>
        {mode === 'adding-tag' ? (
          <TextInput
            value={newTagValue}
            onChange={onNewTagValueChange}
            placeholder="my-custom-tag"
          />
        ) : (
          <Text color={colors.muted}>(press Enter)</Text>
        )}
      </Box>

      {/* Selection summary */}
      {selectedTags.length > 0 && (
        <Box marginTop={1}>
          <Text color={colors.muted}>Selected ({selectedTags.length}): </Text>
          <Text color={colors.info}>{selectedTags.join(', ')}</Text>
        </Box>
      )}

      {/* Context-aware help text */}
      {isActive && (
        <Box marginTop={1}>
          <Text color={colors.muted}>
            {mode === 'adding-tag'
              ? 'Enter confirm \u2022 Esc cancel'
              : '\u2191\u2193 navigate \u2022 Space select \u2022 Enter add custom tag'}
          </Text>
        </Box>
      )}
    </Box>
  )
}
