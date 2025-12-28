/**
 * Footer Component
 *
 * Bottom footer with keyboard shortcuts.
 *
 * @module monorepo-library-generator/cli/tui/components/Footer
 */

import { Box, Text } from 'ink'
import type { TUIMode } from '../state'
import { colors, type PanelId } from '../theme/colors'

interface FooterProps {
  readonly activePanel: PanelId
  readonly mode: TUIMode
}

/**
 * Keyboard shortcut display
 */
function Shortcut({ keys, description }: { readonly keys: string; readonly description: string }) {
  return (
    <Text>
      <Text color={colors.highlight}>{keys}</Text>
      <Text color={colors.muted}>: {description} </Text>
    </Text>
  )
}

/**
 * Footer with context-sensitive shortcuts
 */
export function Footer({ activePanel, mode }: FooterProps) {
  return (
    <Box paddingX={1} marginTop={0}>
      <Box flexGrow={1}>
        <Shortcut keys="1-3" description="panels" />
        <Shortcut keys="j/k" description="scroll" />

        {activePanel === 'types' && <Shortcut keys="Enter" description="select" />}

        {activePanel === 'options' && (
          <>
            <Shortcut keys="Space" description="toggle" />
            <Shortcut keys="Enter" description="edit" />
          </>
        )}

        <Shortcut keys="G" description="generate" />

        {mode === 'complete' && <Shortcut keys="n" description="new" />}

        <Shortcut keys="q" description="quit" />
      </Box>
    </Box>
  )
}
