/**
 * Library Type Selection Component
 *
 * Allows user to select the type of library to generate.
 * Shows special actions (init, domain) first, then library types.
 *
 * @module monorepo-library-generator/cli/ink/components/TypeSelect
 */

import { Box, Text, useInput } from 'ink';
import { useState } from 'react';

import {
  LIBRARY_TYPES,
  WIZARD_ACTIONS,
  type WizardSelection,
} from '../../interactive/types';
import { colors, statusIcons } from '../theme/colors';

interface TypeSelectProps {
  readonly librariesRoot: string;
  readonly onSelect: (type: WizardSelection) => void;
}

interface SelectItem {
  readonly label: string;
  readonly value: WizardSelection;
  readonly description: string;
  readonly generatesTo?: readonly string[];
  readonly isSeparator?: boolean;
}

export function TypeSelect({ librariesRoot, onSelect }: TypeSelectProps) {
  // Build items list: special actions first, separator, then library types
  const items: SelectItem[] = [
    // Special actions (init, domain)
    ...WIZARD_ACTIONS.map((action) => ({
      label: action.label,
      value: action.type as WizardSelection,
      description: action.description,
      generatesTo: action.generatesTo,
    })),
    // Separator
    { label: '───────────────────────────────────────', value: 'separator' as WizardSelection, description: '', isSeparator: true },
    // Library types
    ...LIBRARY_TYPES.map((info) => ({
      label: info.label,
      value: info.type as WizardSelection,
      description: info.description,
    })),
  ];

  // Filter out separator for navigation (but keep it for display)
  const selectableItems = items.filter((item) => !item.isSeparator);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Ensure selectedItem is always defined
  const selectedItem = selectableItems[selectedIndex];

  useInput((input, key) => {
    if (!selectedItem) return;
    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIndex((i) => Math.min(selectableItems.length - 1, i + 1));
    } else if (key.return) {
      onSelect(selectedItem.value);
    }
  });

  // Map selectable index to display index (accounting for separator)
  const getDisplayIndex = (selectableIdx: number) => {
    // Special actions are at index 0-1, separator at 2, libraries at 3+
    if (selectableIdx < WIZARD_ACTIONS.length) {
      return selectableIdx;
    }
    // After separator
    return selectableIdx + 1;
  };

  const displaySelectedIndex = getDisplayIndex(selectedIndex);

  // Guard against no selectable items
  if (!selectedItem) {
    return null;
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>What would you like to generate?</Text>
      </Box>

      {/* Items list */}
      {items.map((item, displayIdx) => {
        if (item.isSeparator) {
          return (
            <Box key="separator">
              <Text color={colors.muted}>  {item.label}</Text>
            </Box>
          );
        }

        const isSelected = displayIdx === displaySelectedIndex;
        const prefix = isSelected ? statusIcons.chevronRight : ' ';

        return (
          <Box key={item.value}>
            <Text color={isSelected ? colors.primary : undefined}>
              {prefix} {item.label.padEnd(20)}
            </Text>
            <Text color={colors.muted}> - {item.description}</Text>
          </Box>
        );
      })}

      {/* Show what will be generated for selected item */}
      {selectedItem.generatesTo && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={colors.info}>Will generate to:</Text>
          {selectedItem.generatesTo.map((path) => (
            <Text key={path} color={colors.muted}>
              {'  '}
              {statusIcons.arrow} {path.replace('libs/', `${librariesRoot}/`)}
            </Text>
          ))}
        </Box>
      )}

      {/* Show target for regular library types */}
      {!selectedItem.generatesTo && (
        <Box marginTop={1}>
          <Text color={colors.muted}>
            Target: {librariesRoot}/{selectedItem.value}/&lt;name&gt;
          </Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color={colors.muted}>Use arrow keys to navigate, Enter to select</Text>
      </Box>
    </Box>
  );
}
