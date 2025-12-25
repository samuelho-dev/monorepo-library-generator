/**
 * Generation Progress Component
 *
 * Shows real-time progress during library generation.
 *
 * @module monorepo-library-generator/cli/ink/components/GenerationProgress
 */

import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

import type { LibraryType } from '../../interactive/types';
import { colors, statusIcons } from '../theme/colors';

interface GenerationProgressProps {
  readonly libraryType: LibraryType;
  readonly libraryName: string;
  readonly generatedFiles: readonly string[];
  readonly status: 'idle' | 'running' | 'success' | 'error';
  readonly error?: string | null;
  readonly targetDirectory: string;
}

export function GenerationProgress({
  libraryType,
  libraryName,
  generatedFiles,
  status,
  error,
  targetDirectory,
}: GenerationProgressProps) {
  if (status === 'error') {
    return (
      <Box flexDirection="column">
        <Box>
          <Text color={colors.error}>
            {statusIcons.error} Generation failed
          </Text>
        </Box>
        {error && (
          <Box marginTop={1}>
            <Text color={colors.muted}>{error}</Text>
          </Box>
        )}
      </Box>
    );
  }

  if (status === 'success') {
    return (
      <Box flexDirection="column">
        <Box>
          <Text color={colors.success}>
            {statusIcons.completed} Library generated successfully!
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text color={colors.muted}>Location: </Text>
          <Text color={colors.libraryName}>{targetDirectory}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={colors.muted}>Files created: {generatedFiles.length}</Text>
        </Box>
      </Box>
    );
  }

  // Running state
  return (
    <Box flexDirection="column">
      <Box>
        <Text color={colors.info}>
          <Spinner type="dots" />
        </Text>
        <Text>
          {' '}
          Generating {libraryType} library: <Text color={colors.libraryName}>{libraryName}</Text>
        </Text>
      </Box>

      {generatedFiles.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {generatedFiles.slice(-5).map((file) => (
            <Box key={file}>
              <Text color={colors.success}>{statusIcons.completed} </Text>
              <Text color={colors.file}>{file}</Text>
            </Box>
          ))}
          {generatedFiles.length > 5 && (
            <Text color={colors.muted}>... and {generatedFiles.length - 5} more files</Text>
          )}
        </Box>
      )}
    </Box>
  );
}
