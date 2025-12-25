/**
 * Confirm Prompt Component
 *
 * Final confirmation before generation.
 *
 * @module monorepo-library-generator/cli/ink/components/ConfirmPrompt
 */

import { Box, Text, useInput } from 'ink';
import { useState } from 'react'
import { colors, statusIcons } from '../theme/colors'

interface ConfirmPromptProps {
  readonly targetDirectory: string;
  readonly fileCount: number;
  /** Optional description for what will be created (e.g., for domain type) */
  readonly description?: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function ConfirmPrompt({
  targetDirectory,
  fileCount,
  description,
  onConfirm,
  onCancel,
}: ConfirmPromptProps) {
  const [selected, setSelected] = useState<'yes' | 'no'>('yes')

  useInput((input, key) => {
    if (key.leftArrow || key.rightArrow) {
      setSelected((s) => (s === 'yes' ? 'no' : 'yes'))
    } else if (input === 'y' || input === 'Y') {
      onConfirm()
    } else if (input === 'n' || input === 'N' || key.escape) {
      onCancel()
    } else if (key.return) {
      if (selected === 'yes') {
        onConfirm()
      } else {
        onCancel()
      }
    }
  })

  return (
    <Box flexDirection="column">
      {description && (
        <Box marginBottom={1}>
          <Text color={colors.info}>{description}</Text>
        </Box>
      )}
      <Box marginBottom={1}>
        <Text bold>
          Generate {fileCount} files to <Text color={colors.libraryName}>{targetDirectory}</Text>?
        </Text>
      </Box>

      <Box>
        <Box marginRight={2}>
          <Text
            color={selected === 'yes' ? colors.success : colors.muted}
            bold={selected === 'yes'}
          >
            {selected === 'yes' ? statusIcons.chevronRight : ' '} Yes
          </Text>
        </Box>
        <Box>
          <Text color={selected === 'no' ? colors.error : colors.muted} bold={selected === 'no'}>
            {selected === 'no' ? statusIcons.chevronRight : ' '} No
          </Text>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color={colors.muted}>Use arrow keys or Y/N to select, Enter to confirm</Text>
      </Box>
    </Box>
  )
}
