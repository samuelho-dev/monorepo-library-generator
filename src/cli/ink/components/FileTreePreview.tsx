/**
 * File Tree Preview Component
 *
 * Displays the files that will be created.
 *
 * @module monorepo-library-generator/cli/ink/components/FileTreePreview
 */

import { Box, Text } from 'ink';

import type { FilePreview } from '../../interactive/types';
import { boxChars, colors, } from '../theme/colors';

interface FileTreePreviewProps {
  readonly targetDirectory: string;
  readonly files: readonly FilePreview[];
}

export function FileTreePreview({ targetDirectory, files }: FileTreePreviewProps) {
  // Count files
  const requiredCount = files.filter((f) => !f.isOptional).length;
  const optionalCount = files.filter((f) => f.isOptional).length;
  const totalCount = files.length;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Files to be created:</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={colors.directory}>{targetDirectory}/</Text>
      </Box>

      {files.map((file, index) => {
        const isLast = index === files.length - 1;
        const prefix = isLast ? boxChars.bottomLeft : boxChars.teeRight;

        return (
          <Box key={file.path}>
            <Text color={colors.muted}>{prefix}{boxChars.horizontal} </Text>
            <Text color={file.isOptional ? colors.muted : colors.file}>{file.path}</Text>
            {file.isOptional && <Text color={colors.muted}> (optional)</Text>}
          </Box>
        );
      })}

      <Box marginTop={1}>
        <Text color={colors.muted}>
          Total: {totalCount} files ({requiredCount} required, {optionalCount} optional)
        </Text>
      </Box>
    </Box>
  );
}
