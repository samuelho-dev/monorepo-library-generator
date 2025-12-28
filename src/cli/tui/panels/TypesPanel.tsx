/**
 * Types Panel Component
 *
 * Panel for selecting library type with hover-to-preview functionality.
 *
 * @module monorepo-library-generator/cli/tui/panels/TypesPanel
 */

import { Box, Text } from 'ink'
import { useCallback, useEffect } from 'react'

import { LIBRARY_TYPES, WIZARD_ACTIONS, type WizardSelection } from '../../core'
import { Panel } from '../components'
import { usePanelFocus } from '../hooks'
import type { TUIAction, TUIState } from '../state'
import { colors, icons } from '../theme/colors'

interface TypesPanelProps {
  readonly state: TUIState
  readonly dispatch: React.Dispatch<TUIAction>
}

// Build combined list: library types + separator + wizard actions
const ALL_ITEMS: ReadonlyArray<{
  type: WizardSelection | 'separator'
  label: string
  icon: string
}> = [
  ...LIBRARY_TYPES.map((t) => ({
    type: t.type as WizardSelection,
    label: t.label,
    icon: t.icon
  })),
  { type: 'separator' as const, label: '', icon: '' },
  ...WIZARD_ACTIONS.map((a) => ({
    type: a.type as WizardSelection,
    label: a.label,
    icon: a.icon
  }))
]

/**
 * Types panel with library type selection
 */
export function TypesPanel({ state, dispatch }: TypesPanelProps) {
  const isActive = state.activePanel === 'types'
  const selectedIndex = state.typesSelectedIndex

  // Handle selection
  const handleSelect = useCallback(() => {
    const item = ALL_ITEMS[selectedIndex]
    if (item.type !== 'separator') {
      dispatch({ type: 'SELECT_TYPE', payload: item.type })
    }
  }, [dispatch, selectedIndex])

  // Panel focus handling
  usePanelFocus({
    panelId: 'types',
    isActive,
    dispatch,
    onNavigate: (direction) => {
      let newIndex = selectedIndex
      if (direction === 'down') {
        newIndex = selectedIndex < ALL_ITEMS.length - 1 ? selectedIndex + 1 : 0
        if (ALL_ITEMS[newIndex].type === 'separator') {
          newIndex = newIndex < ALL_ITEMS.length - 1 ? newIndex + 1 : 0
        }
      } else {
        newIndex = selectedIndex > 0 ? selectedIndex - 1 : ALL_ITEMS.length - 1
        if (ALL_ITEMS[newIndex].type === 'separator') {
          newIndex = newIndex > 0 ? newIndex - 1 : ALL_ITEMS.length - 1
        }
      }
      dispatch({ type: 'SET_TYPES_INDEX', payload: newIndex })
    },
    onSelect: handleSelect
  })

  // Update hovered type for preview
  useEffect(() => {
    const item = ALL_ITEMS[selectedIndex]
    if (item.type !== 'separator') {
      dispatch({ type: 'SET_HOVERED_TYPE', payload: item.type })
    }
  }, [dispatch, selectedIndex])

  return (
    <Panel id="types" isActive={isActive}>
      <Box flexDirection="column">
        {ALL_ITEMS.map((item, index) => {
          if (item.type === 'separator') {
            return (
              <Box key="separator">
                <Text color={colors.muted}>-----------</Text>
              </Box>
            )
          }

          const isSelected = index === selectedIndex
          const isChosen = state.selectedType === item.type

          return (
            <Box key={item.type}>
              <Text color={isSelected ? colors.primary : colors.muted}>
                {isSelected ? icons.selected : icons.unselected}{' '}
              </Text>
              <Text
                color={isChosen ? colors.success : isSelected ? colors.secondary : colors.muted}
              >
                {item.icon} {item.label}
              </Text>
              {isChosen && <Text color={colors.success}> {icons.success}</Text>}
            </Box>
          )
        })}
      </Box>
    </Panel>
  )
}
