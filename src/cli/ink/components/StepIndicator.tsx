/**
 * Step Indicator Component
 *
 * Displays progress through the wizard steps.
 *
 * @module monorepo-library-generator/cli/ink/components/StepIndicator
 */

import { Box, Text } from 'ink'
import type { WizardState, WizardStep } from '../state/types';
import { colors } from '../theme/colors'

interface StepInfo {
  readonly step: WizardStep;
  readonly label: string;
}

/**
 * Standard wizard steps (without external service)
 */
const STANDARD_STEPS: readonly StepInfo[] = [
  { step: 'select-type', label: 'Select library type' },
  { step: 'enter-name', label: 'Enter library name' },
  { step: 'configure-options', label: 'Configure options' },
  { step: 'preview', label: 'Review & confirm' },
]

/**
 * Steps including external service (for provider type)
 */
const PROVIDER_STEPS: readonly StepInfo[] = [
  { step: 'select-type', label: 'Select library type' },
  { step: 'enter-name', label: 'Enter library name' },
  { step: 'enter-external-service', label: 'Enter external service' },
  { step: 'configure-options', label: 'Configure options' },
  { step: 'preview', label: 'Review & confirm' },
]

interface StepIndicatorProps {
  readonly state: WizardState;
}

export function StepIndicator({ state }: StepIndicatorProps) {
  const steps = state.libraryType === 'provider' ? PROVIDER_STEPS : STANDARD_STEPS;
  const currentIndex = steps.findIndex((s) => s.step === state.currentStep)
  const totalSteps = steps.length;
  const displayStep = currentIndex >= 0 ? currentIndex + 1 : 1

  // Create progress bar
  const barWidth = 10;
  const filled = Math.round((displayStep / totalSteps) * barWidth)
  const empty = barWidth - filled

  const filledBar = '='.repeat(Math.max(0, filled - 1))
  const pointer = filled > 0 ? '>' : '';
  const emptyBar = ' '.repeat(Math.max(0, empty))
  const progressBar = `[${filledBar}${pointer}${emptyBar}]`

  // Get current step label
  const currentStepInfo = steps[currentIndex];
  const stepLabel = currentStepInfo?.label ?? state.currentStep

  return (
    <Box marginBottom={1}>
      <Text color={colors.primary}>{progressBar}</Text>
      <Text>
        {' '}
        Step {displayStep}/{totalSteps}: {stepLabel}
      </Text>
    </Box>
  )
}
