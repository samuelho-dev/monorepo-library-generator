/**
 * Library Name Input Component
 *
 * Text input for entering the library name.
 * Uses centralized validation from config layer.
 *
 * @module monorepo-library-generator/cli/ink/components/NameInput
 */

import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useState } from 'react';

import type { LibraryType } from '../../interactive/types';
import { useOperations } from '../bridge/operations-context';
import { colors } from '../theme/colors';

interface NameInputProps {
  readonly librariesRoot: string;
  readonly libraryType?: LibraryType;
  readonly onSubmit: (name: string) => void;
}

export function NameInput({ librariesRoot, libraryType, onSubmit }: NameInputProps) {
  const { validation } = useOperations();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleChange = (value: string) => {
    setName(value);
    setError(null);
  };

  useInput((input, key) => {
    if (key.return) {
      const result = validation.validateName(name);
      if (!result.isValid) {
        setError(result.error);
      } else {
        onSubmit(name.trim());
      }
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Enter library name:</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={colors.muted}>
          Will generate to: {librariesRoot}/
          <Text color={colors.libraryType}>{libraryType}</Text>/
          {name ? <Text color={colors.libraryName}>{name}</Text> : <Text color={colors.muted}>&lt;name&gt;</Text>}
        </Text>
      </Box>
      <Box>
        <Text color={colors.primary}>&gt; </Text>
        <TextInput value={name} onChange={handleChange} placeholder="my-library" />
      </Box>
      {error && (
        <Box marginTop={1}>
          <Text color={colors.error}>{error}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color={colors.muted}>Press Enter to continue</Text>
      </Box>
    </Box>
  );
}
