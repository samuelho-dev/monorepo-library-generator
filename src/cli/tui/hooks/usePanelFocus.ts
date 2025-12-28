/**
 * Panel Focus Hook
 *
 * Hook for managing panel focus and navigation.
 *
 * @module monorepo-library-generator/cli/tui/hooks/usePanelFocus
 */

import { useInput } from 'ink'
import { useCallback } from 'react'

import type { TUIAction } from '../state'
import type { PanelId } from '../theme/colors'

interface UsePanelFocusOptions {
  readonly panelId: PanelId
  readonly isActive: boolean
  readonly dispatch: React.Dispatch<TUIAction>
  readonly onNavigate?: (direction: 'up' | 'down') => void
  readonly onSelect?: () => void
  readonly onToggle?: () => void
  readonly onEdit?: () => void
  readonly disabled?: boolean
}

/**
 * Hook for panel-specific keyboard handling
 */
export function usePanelFocus({
  panelId,
  isActive,
  dispatch,
  onNavigate,
  onSelect,
  onToggle,
  onEdit,
  disabled = false
}: UsePanelFocusOptions) {
  // Handle keyboard input for this panel
  useInput(
    (input, key) => {
      // Only handle input if this panel is active and not disabled
      if (!isActive || disabled) return

      // Navigation with j/k or arrows
      if (input === 'j' || key.downArrow) {
        onNavigate?.('down')
        return
      }
      if (input === 'k' || key.upArrow) {
        onNavigate?.('up')
        return
      }

      // Selection with Enter
      if (key.return) {
        if (onSelect) {
          onSelect()
        } else if (onEdit) {
          onEdit()
        }
        return
      }

      // Toggle with Space
      if (input === ' ') {
        if (onToggle) {
          onToggle()
        } else if (onSelect) {
          onSelect()
        }
        return
      }
    },
    { isActive }
  )

  // Helper to switch focus to this panel
  const focus = useCallback(() => {
    dispatch({ type: 'SET_ACTIVE_PANEL', payload: panelId })
  }, [dispatch, panelId])

  return {
    isActive,
    focus
  }
}

/**
 * Hook for list navigation within a panel
 */
export function useListNavigation(
  items: readonly unknown[],
  selectedIndex: number,
  setSelectedIndex: (index: number) => void
) {
  const navigate = useCallback(
    (direction: 'up' | 'down') => {
      if (direction === 'up') {
        const newIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1
        setSelectedIndex(newIndex)
      } else {
        const newIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0
        setSelectedIndex(newIndex)
      }
    },
    [items.length, selectedIndex, setSelectedIndex]
  )

  return { navigate, selectedIndex }
}
