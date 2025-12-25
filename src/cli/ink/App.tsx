/**
 * Root App Component for React Ink TUI
 *
 * Main entry point for the interactive wizard with Effect integration.
 *
 * @module monorepo-library-generator/cli/ink/App
 */

import { Box } from 'ink';
import { useCallback, useReducer } from 'react';

import { getTargetDirectory } from '../interactive/file-preview';
import type { WizardResult } from '../interactive/types';
import { OperationsProvider } from './bridge/operations-context';
import { Header } from './components/Header';
import { WizardContainer } from './components/WizardContainer';
import { createInitialState, wizardReducer } from './state/types';

interface AppProps {
  readonly librariesRoot: string;
  readonly workspaceRoot: string;
  readonly onComplete: (result: WizardResult | null) => void;
}

export function App({ librariesRoot, workspaceRoot, onComplete }: AppProps) {
  const [state, dispatch] = useReducer(wizardReducer, createInitialState(librariesRoot));

  const handleGenerate = useCallback(() => {
    // When generation is triggered, we notify the parent with the result
    // The actual generation will be handled by the Effect runtime
    if (state.libraryType && state.libraryName) {
      const targetDirectory = getTargetDirectory(
        state.librariesRoot,
        state.libraryType,
        state.libraryName,
      );

      const result: WizardResult = {
        libraryType: state.libraryType,
        libraryName: state.libraryName,
        externalService: state.externalService || undefined,
        targetDirectory,
        options: state.options,
        filesToCreate: state.filesToCreate,
      };

      onComplete(result);
    }
  }, [state, onComplete]);

  return (
    <OperationsProvider>
      <Box flexDirection="column" padding={1}>
        <Header librariesRoot={librariesRoot} />
        <Box marginTop={1}>
          <WizardContainer
            state={state}
            dispatch={dispatch}
            onGenerate={handleGenerate}
            workspaceRoot={workspaceRoot}
          />
        </Box>
      </Box>
    </OperationsProvider>
  );
}
