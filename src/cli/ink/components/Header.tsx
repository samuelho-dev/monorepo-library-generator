/**
 * Wizard Header Component
 *
 * Displays the wizard title and detected workspace.
 *
 * @module monorepo-library-generator/cli/ink/components/Header
 */

import { Box, Text } from 'ink'
import { colors } from '../theme/colors'

interface HeaderProps {
  readonly librariesRoot: string;
}

export function Header({ librariesRoot }: HeaderProps) {
  const title = 'Monorepo Library Generator - Wizard';
  const border = '='.repeat(42)

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={colors.primary}>{border}</Text>
      <Text bold>  {title}</Text>
      <Text color={colors.primary}>{border}</Text>
      <Box marginTop={1}>
        <Text color={colors.info}>Detected: </Text>
        <Text color={colors.librariesRoot}>{librariesRoot}</Text>
        <Text>/</Text>
      </Box>
    </Box>
  )
}
