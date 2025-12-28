/**
 * Scrollable List Hook
 *
 * Manages scroll state for lists with keyboard navigation.
 * Supports vim-style page scrolling (Ctrl+D/U).
 *
 * @module monorepo-library-generator/cli/tui/hooks/useScrollable
 */

import { useInput } from 'ink'
import { useEffect, useState } from 'react'

/**
 * Options for useScrollable hook
 */
export interface UseScrollableOptions {
  /** Total number of items in the list */
  readonly totalItems: number
  /** Number of items visible at once */
  readonly visibleItems: number
  /** Whether this component is currently active/focused */
  readonly isActive: boolean
  /** Currently selected item index */
  readonly selectedIndex: number
}

/**
 * Return value from useScrollable hook
 */
export interface UseScrollableResult {
  /** Current scroll offset (first visible item index) */
  readonly scrollOffset: number
  /** Manually set scroll offset */
  readonly setScrollOffset: (offset: number) => void
  /** Number of items hidden above viewport */
  readonly hiddenAbove: number
  /** Number of items hidden below viewport */
  readonly hiddenBelow: number
  /** Whether to show scroll up indicator */
  readonly showScrollUp: boolean
  /** Whether to show scroll down indicator */
  readonly showScrollDown: boolean
}

/**
 * Hook for managing scrollable list behavior
 *
 * Features:
 * - Auto-scroll to keep selected item visible
 * - Vim-style page scrolling with Ctrl+D (page down) and Ctrl+U (page up)
 * - Scroll indicator state for UI feedback
 * - Hidden item counts for "N more" indicators
 *
 * @param options - Scroll configuration options
 * @returns Scroll state and helpers
 *
 * @example
 * ```tsx
 * function ScrollableList({ items, selectedIndex }) {
 *   const { contentHeight } = useTerminalDimensions()
 *   const visibleCount = Math.max(5, contentHeight - 2)
 *
 *   const {
 *     scrollOffset,
 *     hiddenAbove,
 *     hiddenBelow,
 *     showScrollUp,
 *     showScrollDown
 *   } = useScrollable({
 *     totalItems: items.length,
 *     visibleItems: visibleCount,
 *     isActive: true,
 *     selectedIndex
 *   })
 *
 *   const visibleItems = items.slice(scrollOffset, scrollOffset + visibleCount)
 *
 *   return (
 *     <>
 *       {showScrollUp && <Text>↑ {hiddenAbove} more</Text>}
 *       {visibleItems.map(...)}
 *       {showScrollDown && <Text>↓ {hiddenBelow} more</Text>}
 *     </>
 *   )
 * }
 * ```
 */
export function useScrollable({
  totalItems,
  visibleItems,
  isActive,
  selectedIndex
}: UseScrollableOptions): UseScrollableResult {
  const [scrollOffset, setScrollOffset] = useState(0)
  const [prevSelectedIndex, setPrevSelectedIndex] = useState(selectedIndex)

  // Auto-scroll to keep selected item visible
  // Only adjust scroll when selection actually changes (not on mount)
  useEffect(() => {
    // Skip auto-scroll on mount - only respond to actual selection changes
    if (selectedIndex === prevSelectedIndex) return
    setPrevSelectedIndex(selectedIndex)

    // Ensure visibleItems is valid before calculating
    if (visibleItems <= 0) return

    if (selectedIndex < scrollOffset) {
      // Selected item is above viewport - scroll up
      setScrollOffset(selectedIndex)
    } else if (selectedIndex >= scrollOffset + visibleItems) {
      // Selected item is below viewport - scroll down
      setScrollOffset(Math.max(0, selectedIndex - visibleItems + 1))
    }
  }, [selectedIndex, visibleItems, scrollOffset, prevSelectedIndex])

  // Clamp scroll offset when list size changes
  useEffect(() => {
    const maxOffset = Math.max(0, totalItems - visibleItems)
    if (scrollOffset > maxOffset) {
      setScrollOffset(maxOffset)
    }
  }, [totalItems, visibleItems, scrollOffset])

  // Page scroll with Ctrl+D/U (vim-style)
  useInput(
    (input, key) => {
      if (!isActive) return

      if (key.ctrl && input === 'd') {
        // Page down - scroll by visible items count
        const maxOffset = Math.max(0, totalItems - visibleItems)
        setScrollOffset((prev) => Math.min(maxOffset, prev + visibleItems))
      }

      if (key.ctrl && input === 'u') {
        // Page up - scroll by visible items count
        setScrollOffset((prev) => Math.max(0, prev - visibleItems))
      }
    },
    { isActive }
  )

  // Calculate hidden item counts
  const hiddenAbove = scrollOffset
  const hiddenBelow = Math.max(0, totalItems - scrollOffset - visibleItems)

  return {
    scrollOffset,
    setScrollOffset,
    hiddenAbove,
    hiddenBelow,
    showScrollUp: hiddenAbove > 0,
    showScrollDown: hiddenBelow > 0
  }
}
