/**
 * Header Component
 *
 * Top header showing workspace information.
 *
 * @module monorepo-library-generator/cli/tui/components/Header
 */

import { Box, Text } from 'ink'

import type { WorkspaceContext } from '../../core'
import { colors } from '../theme/colors'

interface HeaderProps {
  readonly workspace: WorkspaceContext | null
}

/**
 * Header showing workspace info
 */
export function Header({ workspace }: HeaderProps) {
  return (
    <Box flexDirection='column' paddingX={1} paddingY={0} marginBottom={0}>
      <Text bold color={colors.primary}>
        Monorepo Library Generator
      </Text>
      {workspace && (
        <Text>
          <Text color={colors.muted}>Root:</Text>
          <Text color={colors.root}>{workspace.librariesRoot}</Text>
          <Text color={colors.muted}>| Type:</Text>
          <Text color={workspace.isNx ? colors.success : colors.secondary}>
            {workspace.isNx ? 'Nx Workspace' : `${workspace.type} Workspace`}
          </Text>
          <Text color={colors.muted}>| Scope:</Text>
          <Text color={colors.libraryType}>{workspace.scope}</Text>
        </Text>
      )}
    </Box>
  )
}
