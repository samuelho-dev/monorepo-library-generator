/**
 * Status Panel Component
 *
 * Panel showing generation status with spinner/checkmark.
 *
 * @module monorepo-library-generator/cli/tui/panels/StatusPanel
 */

import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'

import { Panel } from '../components'
import type { TUIState } from '../state'
import { colors, icons } from '../theme/colors'

interface StatusPanelProps {
  readonly state: TUIState
}

/**
 * Status panel with generation progress
 */
export function StatusPanel({ state }: StatusPanelProps) {
  const isActive = state.activePanel === 'status'

  return (
    <Panel id="status" isActive={isActive} height={3}>
      <Box flexDirection="row" alignItems="center">
        {state.generationStatus === 'idle' && <Text color={colors.muted}>Ready to generate</Text>}

        {state.generationStatus === 'generating' && (
          <>
            <Text color={colors.info}>
              <Spinner type="dots" />
            </Text>
            <Text color={colors.info}> Generating...</Text>
          </>
        )}

        {state.generationStatus === 'success' && (
          <>
            <Text color={colors.success}>{icons.success} Done!</Text>
            <Text color={colors.muted}> Press 'n' for new or 'q' to quit</Text>
          </>
        )}

        {state.generationStatus === 'error' && (
          <>
            <Text color={colors.error}>{icons.error} Error: </Text>
            <Text color={colors.error}>{state.error ?? 'Unknown error'}</Text>
          </>
        )}
      </Box>
    </Panel>
  )
}
