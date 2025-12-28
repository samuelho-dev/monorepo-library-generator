/**
 * Panel Component
 *
 * Wrapper component for TUI panels with focus indicators and borders.
 *
 * @module monorepo-library-generator/cli/tui/components/Panel
 */

import { Box, Text } from 'ink'
import type React from 'react'

import { colors, type PanelId, panelConfig } from '../theme/colors'

interface PanelProps {
  readonly id: PanelId
  readonly isActive: boolean
  readonly children: React.ReactNode
  readonly width?: string | number
  readonly height?: string | number
}

/**
 * Panel wrapper with focus-aware border and title
 */
export function Panel({ id, isActive, children, width, height }: PanelProps) {
  const config = panelConfig[id]
  const borderColor = isActive ? colors.panelActive : colors.panelInactive
  const titleColor = isActive ? colors.primary : colors.muted

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      width={width ?? '100%'}
      height={height ?? '100%'}
      overflow="hidden"
    >
      {/* Panel header */}
      <Box paddingX={1}>
        <Text color={titleColor} bold={isActive}>
          [{config.shortcut}] {config.title}
        </Text>
      </Box>

      {/* Panel content */}
      <Box flexDirection="column" paddingX={1} flexGrow={1} overflow="hidden">
        {children}
      </Box>
    </Box>
  )
}

/**
 * Panel with no border (for status bar)
 */
export function StatusBar({ children }: { readonly children: React.ReactNode }) {
  return (
    <Box paddingX={1} paddingY={0}>
      {children}
    </Box>
  )
}

/**
 * Panel separator line
 */
export function PanelSeparator() {
  return (
    <Box>
      <Text color={colors.muted}>-----------</Text>
    </Box>
  )
}
