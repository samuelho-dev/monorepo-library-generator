/**
 * Progress Indicator UI
 *
 * Step progress bar and wizard header utilities
 *
 * @module monorepo-library-generator/cli/interactive/ui/progress
 */

import type { WizardStep } from '../types';
import { colors, status } from './colors';

/**
 * Step metadata for progress display
 */
interface StepInfo {
  readonly step: WizardStep;
  readonly number: number;
  readonly label: string;
}

/**
 * All wizard steps with display information
 */
const STEPS: ReadonlyArray<StepInfo> = Object.freeze([
  Object.freeze({ step: 'select-type', number: 1, label: 'Select library type' }),
  Object.freeze({ step: 'enter-name', number: 2, label: 'Enter library name' }),
  Object.freeze({ step: 'configure-options', number: 3, label: 'Configure options' }),
  Object.freeze({ step: 'review-confirm', number: 4, label: 'Review & confirm' }),
]);

/**
 * Get step number from step identifier
 */
function getStepNumber(step: WizardStep) {
  // Handle special case for enter-external-service (inserted between 2 and 3)
  if (step === 'enter-external-service') return 2;

  const found = STEPS.find((s) => s.step === step);
  return found?.number ?? 1;
}

/**
 * Get total number of steps
 */
function getTotalSteps(hasExternalService: boolean) {
  return hasExternalService ? 5 : 4;
}

/**
 * Create a progress bar string
 *
 * @example
 * createProgressBar(2, 4) // "[=====>    ]"
 */
export function createProgressBar(current: number, total: number, width: number = 10) {
  const filled = Math.round((current / total) * width);
  const empty = width - filled;

  const filledBar = '='.repeat(Math.max(0, filled - 1));
  const pointer = filled > 0 ? '>' : '';
  const emptyBar = ' '.repeat(Math.max(0, empty));

  return `[${filledBar}${pointer}${emptyBar}]`;
}

/**
 * Format step progress line
 *
 * @example
 * formatStepProgress("select-type", false)
 * // "[==>       ] Step 1/4: Select library type"
 */
export function formatStepProgress(currentStep: WizardStep, hasExternalService: boolean = false) {
  const stepNumber = getStepNumber(currentStep);
  const totalSteps = getTotalSteps(hasExternalService);
  const stepInfo = STEPS.find((s) => s.step === currentStep);
  const label =
    currentStep === 'enter-external-service'
      ? 'Enter external service'
      : (stepInfo?.label ?? currentStep);

  const bar = createProgressBar(stepNumber, totalSteps);
  return `${colors.cyan(bar)} Step ${stepNumber}/${totalSteps}: ${label}`;
}

/**
 * Create wizard header with title and detected path
 *
 * @example
 * createWizardHeader("libs")
 * // ========================================
 * //   Monorepo Library Generator - Wizard
 * // ========================================
 * //
 * // Detected: libs/
 */
export function createWizardHeader(librariesRoot: string) {
  const title = 'Monorepo Library Generator - Wizard';
  const width = 42;
  const border = '='.repeat(width);

  return [
    '',
    border,
    `  ${colors.bold(title)}`,
    border,
    '',
    `${colors.info('Detected:')} ${colors.root(librariesRoot)}/`,
    '',
  ].join('\n');
}

/**
 * Format current target directory display
 */
export function formatTargetDirectory(
  librariesRoot: string,
  libraryType?: string,
  libraryName?: string,
) {
  if (!libraryType) {
    return `${colors.root(librariesRoot)}/${colors.muted('<type>')}/${colors.muted('<name>')}`;
  }
  if (!libraryName) {
    return `${colors.root(librariesRoot)}/${colors.type(libraryType)}/${colors.muted('<name>')}`;
  }
  return `${colors.root(librariesRoot)}/${colors.type(libraryType)}/${colors.name(libraryName)}`;
}

/**
 * Create a step status indicator line
 */
export function formatStepStatus(stepNumber: number, currentStep: number, label: string) {
  if (stepNumber < currentStep) {
    return `${status.completed} ${colors.muted(label)}`;
  }
  if (stepNumber === currentStep) {
    return `${status.inProgress} ${colors.bold(label)}`;
  }
  return `${status.pending} ${colors.muted(label)}`;
}
